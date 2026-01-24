import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { scanRepo } from "@/lib/scanner";
import {
  getUserByUsername,
  createScan,
  updateScan,
  saveDetections,
  updateUserDotfiles,
} from "@/lib/db";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { repoUrl } = body;

  if (!repoUrl) {
    return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });
  }

  // Validate URL format
  const urlPattern = /^https?:\/\/(github\.com|gitlab\.com|codeberg\.org)\/[\w-]+\/[\w.-]+/;
  if (!urlPattern.test(repoUrl)) {
    return NextResponse.json(
      { error: "Invalid repository URL. Must be a GitHub, GitLab, or Codeberg repo." },
      { status: 400 }
    );
  }

  // Get user from database
  const user = getUserByUsername(session.user.username);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Create scan record
  const scanId = randomUUID();
  const scan = createScan({
    id: scanId,
    user_id: user.id,
    repo_url: repoUrl,
  });

  // Update scan status to scanning
  updateScan(scanId, { status: "scanning" });

  try {
    // Perform the scan
    const result = await scanRepo({ repoUrl });

    // Update scan with results
    updateScan(scanId, {
      status: "completed",
      files_scanned: result.filesScanned,
      bytes_read: result.bytesRead,
      duration_ms: result.durationMs,
    });

    // Save detections
    const detections = result.tools.map((t) => ({
      tool_id: t.tool,
      category: t.category,
      name: t.name,
      confidence: t.confidence,
      details: t.details,
    }));
    saveDetections(scanId, user.id, detections);

    // Update user's dotfiles URL
    updateUserDotfiles(user.id, repoUrl);

    return NextResponse.json({
      success: true,
      scan: {
        id: scanId,
        status: "completed",
        filesScanned: result.filesScanned,
        bytesRead: result.bytesRead,
        durationMs: result.durationMs,
      },
      tools: result.tools,
      warnings: result.warnings,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    updateScan(scanId, {
      status: "failed",
      error: errorMessage,
    });

    return NextResponse.json(
      { error: "Scan failed", details: errorMessage },
      { status: 500 }
    );
  }
}
