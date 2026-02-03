import { NextRequest, NextResponse } from "next/server";
import { getUserByUsername, getDetectionsForUser } from "@/lib/db";

interface BadgeParams {
  params: Promise<{ username: string }>;
}

// Generate shields.io style SVG badge
function generateBadge(
  label: string,
  tools: string[],
  style: "flat" | "flat-square" = "flat"
): string {
  const toolsText = tools.length > 0 ? tools.join(" · ") : "no tools";

  // Calculate widths based on text length (approximate)
  const labelWidth = label.length * 7 + 12;
  const toolsWidth = Math.min(toolsText.length * 6.5 + 12, 400);
  const totalWidth = labelWidth + toolsWidth;

  const radius = style === "flat" ? "3" : "0";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${toolsText}">
  <title>${label}: ${toolsText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="${radius}" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${toolsWidth}" height="20" fill="#4c1"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="${labelWidth / 2}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(labelWidth - 10) * 10}">${label}</text>
    <text x="${labelWidth / 2}" y="140" transform="scale(.1)" fill="#fff" textLength="${(labelWidth - 10) * 10}">${label}</text>
    <text aria-hidden="true" x="${labelWidth * 10 + toolsWidth * 5}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(toolsWidth - 10) * 10}">${toolsText}</text>
    <text x="${labelWidth * 10 + toolsWidth * 5}" y="140" transform="scale(.1)" fill="#fff" textLength="${(toolsWidth - 10) * 10}">${toolsText}</text>
  </g>
</svg>`;
}

export async function GET(request: NextRequest, { params }: BadgeParams) {
  const { username } = await params;
  const { searchParams } = new URL(request.url);

  // Options
  const category = searchParams.get("category"); // filter by category
  const style = (searchParams.get("style") as "flat" | "flat-square") || "flat";
  const label = searchParams.get("label") || "setup";

  // Look up user
  const user = getUserByUsername(username);
  if (!user) {
    const svg = generateBadge("cfgs.dev", ["user not found"], style);
    return new NextResponse(svg, {
      status: 404,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache",
      },
    });
  }

  // Get detections
  let detections = getDetectionsForUser(user.id);

  // Filter by category if specified
  if (category) {
    detections = detections.filter((d) => d.category === category);
  }

  // Extract tool names (deduplicated, limited to prevent huge badges)
  const toolNames = [...new Set(detections.map((d) => d.name))].slice(0, 6);

  const svg = generateBadge(label, toolNames, style);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "ETag": `"${username}-${detections.length}-${Date.now().toString(36)}"`,
    },
  });
}
