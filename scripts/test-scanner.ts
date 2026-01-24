// Quick test script for the scanner
// Run with: npx tsx scripts/test-scanner.ts

import { scanLocalDir } from "../src/lib/scanner";

async function main() {
  const dotfilesPath = process.argv[2] || process.env.HOME + "/dotfiles";

  console.log(`Scanning: ${dotfilesPath}\n`);

  const result = await scanLocalDir(dotfilesPath);

  console.log("=== DETECTED TOOLS ===\n");

  // Group by category
  const byCategory = new Map<string, typeof result.tools>();
  for (const tool of result.tools) {
    const existing = byCategory.get(tool.category) || [];
    existing.push(tool);
    byCategory.set(tool.category, existing);
  }

  for (const [category, tools] of byCategory) {
    console.log(`[${category.toUpperCase()}]`);
    for (const tool of tools) {
      console.log(`  ${tool.name}`);
      if (tool.details && Object.keys(tool.details).length > 0) {
        for (const [key, value] of Object.entries(tool.details)) {
          console.log(`    ${key}: ${value}`);
        }
      }
    }
    console.log();
  }

  console.log("=== STATS ===");
  console.log(`Files scanned: ${result.filesScanned}`);
  console.log(`Bytes read: ${result.bytesRead}`);
  console.log(`Duration: ${result.durationMs}ms`);

  if (result.warnings.length > 0) {
    console.log("\n=== WARNINGS ===");
    for (const warning of result.warnings) {
      console.log(`  ${warning}`);
    }
  }
}

main().catch(console.error);
