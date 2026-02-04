import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { scanRepo, ScanError } from "@/lib/scanner";
import {
  getUserByUsername,
  getOrCreateUnclaimedUser,
  createScan,
  updateScan,
  saveDetections,
  updateUserDotfiles,
} from "@/lib/db";
import { randomUUID } from "crypto";
import { scanQueue } from "@/lib/scanner/queue";
import { rateLimiter } from "@/lib/rateLimit";

// Extract username and provider from repo URL
function parseRepoUrl(repoUrl: string): { username: string; provider: string; repo: string } | null {
  const match = repoUrl.match(/^https?:\/\/(github\.com|gitlab\.com|codeberg\.org)\/([\w-]+)\/([\w.-]+)/);
  if (!match) return null;

  const [, host, username, repo] = match;
  const provider = host === "github.com" ? "github" : host === "gitlab.com" ? "gitlab" : "codeberg";
  return { username, provider, repo };
}

// Fetch user info from GitHub API
async function fetchGitHubUser(username: string): Promise<{ id: string; avatar_url: string; name: string | null } | null> {
  try {
    const res = await fetch(`https://api.github.com/users/${username}`, {
      headers: { "User-Agent": "cfgs.dev" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { id: String(data.id), avatar_url: data.avatar_url, name: data.name };
  } catch {
    return null;
  }
}

// Fetch user info from GitLab API
async function fetchGitLabUser(username: string): Promise<{ id: string; avatar_url: string; name: string | null } | null> {
  try {
    const res = await fetch(`https://gitlab.com/api/v4/users?username=${username}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { id: String(data[0].id), avatar_url: data[0].avatar_url, name: data[0].name };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const body = await request.json();
  const { repoUrl } = body;

  if (!repoUrl) {
    return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });
  }

  // Validate and parse URL
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid repository URL. Must be a GitHub, GitLab, or Codeberg repo." },
      { status: 400 }
    );
  }

  // Rate limiting - use session username if logged in, otherwise repo username
  const rateLimitKey = `scan:${session?.user?.username || parsed.username}`;
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

  // Get or create user
  let user = getUserByUsername(parsed.username);

  if (!user) {
    // Fetch user info from provider API
    let providerUser: { id: string; avatar_url: string; name: string | null } | null = null;

    if (parsed.provider === "github") {
      providerUser = await fetchGitHubUser(parsed.username);
    } else if (parsed.provider === "gitlab") {
      providerUser = await fetchGitLabUser(parsed.username);
    }

    if (!providerUser) {
      return NextResponse.json(
        { error: `Could not find user "${parsed.username}" on ${parsed.provider}` },
        { status: 404 }
      );
    }

    // Create unclaimed user
    user = getOrCreateUnclaimedUser(
      parsed.username,
      parsed.provider,
      providerUser.id,
      providerUser.avatar_url,
      providerUser.name || undefined
    );
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
      username: user.username,
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
