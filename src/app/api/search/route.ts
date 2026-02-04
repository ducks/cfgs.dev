import { NextRequest, NextResponse } from "next/server";
import { parseSearchQuery } from "@/lib/search";
import {
  searchUsersByUsername,
  getUsersByMultipleTools,
  searchTools,
  getDetectionsForUser,
} from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  const parsed = parseSearchQuery(query);

  if (parsed.type === "tools" && parsed.toolIds.length > 0) {
    // Search for users with these tools
    const users = getUsersByMultipleTools(parsed.toolIds);

    // Get detections for each user for preview
    const usersWithSetups = users.map(user => {
      const detections = getDetectionsForUser(user.id);
      return {
        id: user.id,
        username: user.username,
        avatar_url: user.avatar_url,
        provider: user.provider,
        claimed: !!user.claimed,
        dotfiles_url: user.dotfiles_url,
        tools: detections.slice(0, 6).map(d => ({ name: d.name, category: d.category })),
        toolCount: detections.length,
      };
    });

    return NextResponse.json({
      type: "tools",
      query: parsed.originalQuery,
      matchedTools: parsed.toolNames,
      results: usersWithSetups,
    });
  }

  if (parsed.type === "username" && parsed.username) {
    // Search for users by username
    const users = searchUsersByUsername(parsed.username);

    // Get detections for each user for preview
    const usersWithSetups = users.map(user => {
      const detections = getDetectionsForUser(user.id);
      return {
        id: user.id,
        username: user.username,
        avatar_url: user.avatar_url,
        provider: user.provider,
        claimed: !!user.claimed,
        dotfiles_url: user.dotfiles_url,
        tools: detections.slice(0, 6).map(d => ({ name: d.name, category: d.category })),
        toolCount: detections.length,
      };
    });

    // Also search for tools matching the query
    const tools = searchTools(parsed.username);

    return NextResponse.json({
      type: "mixed",
      query: parsed.originalQuery,
      users: usersWithSetups,
      tools: tools,
    });
  }

  return NextResponse.json({
    type: "empty",
    query: parsed.originalQuery,
    results: [],
  });
}
