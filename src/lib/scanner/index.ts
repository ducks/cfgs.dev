import { simpleGit, SimpleGit } from "simple-git";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { minimatch } from "minimatch";
import { ScanContext, ScanResult, Detection, FileEntry, Detector } from "./types";
import { allDetectors } from "./detectors";

const MAX_FILE_SIZE = 100 * 1024; // 100KB max per file
const MAX_TOTAL_BYTES = 10 * 1024 * 1024; // 10MB total
const CLONE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class ScanError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "ScanError";
  }
}

// Recursively get all files in a directory
async function getFiles(dir: string, base: string = ""): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(base, entry.name);

    if (entry.isDirectory()) {
      // Skip .git and node_modules
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      files.push(...(await getFiles(fullPath, relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

// Check if a file path matches any detector patterns
function matchesAnyPattern(filePath: string, detectors: Detector[]): Detector[] {
  const matching: Detector[] = [];

  for (const detector of detectors) {
    for (const pattern of detector.patterns) {
      if (minimatch(filePath, pattern, { dot: true })) {
        matching.push(detector);
        break;
      }
    }
  }

  return matching;
}

// Scan a repository
export async function scanRepo(ctx: ScanContext): Promise<ScanResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  const detections: Detection[] = [];
  let filesScanned = 0;
  let bytesRead = 0;

  // Create temp directory
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cfgs-scan-"));

  try {
    // Clone the repository with timeout
    const git: SimpleGit = simpleGit({ timeout: { block: CLONE_TIMEOUT_MS } });

    try {
      await git.clone(ctx.repoUrl, tempDir, ["--depth", "1"]);
    } catch (cloneError: unknown) {
      const errorMessage = cloneError instanceof Error ? cloneError.message : String(cloneError);

      // Categorize git clone errors
      if (errorMessage.includes("not found") || errorMessage.includes("404")) {
        throw new ScanError("Repository not found", "REPO_NOT_FOUND", 404);
      }
      if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
        throw new ScanError("Repository clone timed out after 5 minutes", "CLONE_TIMEOUT", 408);
      }
      if (errorMessage.includes("authentication") || errorMessage.includes("credentials")) {
        throw new ScanError("Repository is private or requires authentication", "AUTH_REQUIRED", 403);
      }
      if (errorMessage.includes("permission denied")) {
        throw new ScanError("Permission denied accessing repository", "PERMISSION_DENIED", 403);
      }

      // Generic clone error
      throw new ScanError(`Failed to clone repository: ${errorMessage}`, "CLONE_FAILED", 500);
    }

    // Get all files
    const files = await getFiles(tempDir);

    // Track detections by tool ID to merge details from multiple files
    const detectionsByTool = new Map<string, Detection>();

    for (const filePath of files) {
      // Find matching detectors for this file
      const matchingDetectors = matchesAnyPattern(filePath, allDetectors);

      if (matchingDetectors.length === 0) continue;

      const fullPath = path.join(tempDir, filePath);

      // Check file size
      const stats = await fs.stat(fullPath);
      if (stats.size > MAX_FILE_SIZE) {
        warnings.push(`Skipped large file: ${filePath} (${stats.size} bytes)`);
        continue;
      }

      if (bytesRead + stats.size > MAX_TOTAL_BYTES) {
        warnings.push("Reached max bytes limit");
        break;
      }

      // Read file content
      const content = await fs.readFile(fullPath, "utf-8");
      bytesRead += stats.size;
      filesScanned++;

      const fileEntry: FileEntry = {
        path: filePath,
        size: stats.size,
        content,
      };

      // Run matching detectors
      for (const detector of matchingDetectors) {
        const detection = detector.detect(fileEntry);
        if (detection) {
          const existing = detectionsByTool.get(detector.id);
          if (existing) {
            // Merge details from this file into existing detection
            // Only add new keys, don't overwrite existing values
            if (detection.details) {
              existing.details = existing.details || {};
              for (const [key, value] of Object.entries(detection.details)) {
                if (!(key in existing.details)) {
                  existing.details[key] = value;
                }
              }
            }
          } else {
            // First detection for this tool
            detectionsByTool.set(detector.id, detection);
          }
        }
      }
    }

    // Convert map to array
    detections.push(...detectionsByTool.values());
  } finally {
    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  return {
    tools: detections,
    filesScanned,
    bytesRead,
    durationMs: Date.now() - startTime,
    warnings,
  };
}

// Scan a local directory (for testing)
export async function scanLocalDir(dirPath: string): Promise<ScanResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  const detections: Detection[] = [];
  let filesScanned = 0;
  let bytesRead = 0;

  const files = await getFiles(dirPath);
  const detectionsByTool = new Map<string, Detection>();

  for (const filePath of files) {
    const matchingDetectors = matchesAnyPattern(filePath, allDetectors);

    if (matchingDetectors.length === 0) continue;

    const fullPath = path.join(dirPath, filePath);

    const stats = await fs.stat(fullPath);
    if (stats.size > MAX_FILE_SIZE) {
      warnings.push(`Skipped large file: ${filePath}`);
      continue;
    }

    if (bytesRead + stats.size > MAX_TOTAL_BYTES) {
      warnings.push("Reached max bytes limit");
      break;
    }

    const content = await fs.readFile(fullPath, "utf-8");
    bytesRead += stats.size;
    filesScanned++;

    const fileEntry: FileEntry = {
      path: filePath,
      size: stats.size,
      content,
    };

    for (const detector of matchingDetectors) {
      const detection = detector.detect(fileEntry);
      if (detection) {
        const existing = detectionsByTool.get(detector.id);
        if (existing) {
          if (detection.details) {
            existing.details = existing.details || {};
            for (const [key, value] of Object.entries(detection.details)) {
              if (!(key in existing.details)) {
                existing.details[key] = value;
              }
            }
          }
        } else {
          detectionsByTool.set(detector.id, detection);
        }
      }
    }
  }

  detections.push(...detectionsByTool.values());

  return {
    tools: detections,
    filesScanned,
    bytesRead,
    durationMs: Date.now() - startTime,
    warnings,
  };
}

export * from "./types";
