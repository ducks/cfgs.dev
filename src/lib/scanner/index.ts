import { simpleGit, SimpleGit } from "simple-git";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { minimatch } from "minimatch";
import { ScanContext, ScanResult, Detection, FileEntry, Detector } from "./types";
import { allDetectors } from "./detectors";

const MAX_FILE_SIZE = 100 * 1024; // 100KB max per file
const MAX_TOTAL_BYTES = 10 * 1024 * 1024; // 10MB total

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
    // Clone the repository
    const git: SimpleGit = simpleGit();
    await git.clone(ctx.repoUrl, tempDir, ["--depth", "1"]);

    // Get all files
    const files = await getFiles(tempDir);

    // Track which tools we've already detected to avoid duplicates
    const detectedTools = new Set<string>();

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
        // Skip if we already detected this tool
        if (detectedTools.has(detector.id)) continue;

        const detection = detector.detect(fileEntry);
        if (detection) {
          detections.push(detection);
          detectedTools.add(detector.id);
        }
      }
    }
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
  const detectedTools = new Set<string>();

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
      if (detectedTools.has(detector.id)) continue;

      const detection = detector.detect(fileEntry);
      if (detection) {
        detections.push(detection);
        detectedTools.add(detector.id);
      }
    }
  }

  return {
    tools: detections,
    filesScanned,
    bytesRead,
    durationMs: Date.now() - startTime,
    warnings,
  };
}

export * from "./types";
