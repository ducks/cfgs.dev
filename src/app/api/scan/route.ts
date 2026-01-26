import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { scanRepo, ScanError } from "@/lib/scanner";
import {
  getUserByUsername,
  createScan,
  updateScan,
  saveDetections,
  updateUserDotfiles,
} from "@/lib/db";
import { randomUUID } from "crypto";
import { scanQueue } from "@/lib/scanner/queue";
import { rateLimiter } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting check
  const rateLimitKey = `scan:${session.user.username}`;
  const rateLimit = rateLimiter.check(rateLimitKey);

  if (!rateLimit.allowed) {
    const resetDate = new Date(rateLimit.resetAt);
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: "You have exceeded the maximum number of scans per hour (5)",
        resetAt: resetDate.toISOString(),
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": resetDate.toISOString(),
        },
      }
    );
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

  // Check scan queue limits
  const queueCheck = scanQueue.canStartScan(user.id);
  if (!queueCheck.allowed) {
    return NextResponse.json(
      {
        error: "Too many concurrent scans",
        message: queueCheck.reason,
      },
      { status: 429 }
    );
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

  // Track scan in queue
  scanQueue.startScan(scanId, user.id);

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

    // Remove from queue
    scanQueue.endScan(scanId);

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
    // Remove from queue on error
    scanQueue.endScan(scanId);

    // Handle categorized scan errors
    if (error instanceof ScanError) {
      updateScan(scanId, {
        status: "failed",
        error: error.message,
      });

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode }
      );
    }

    // Handle generic errors
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
