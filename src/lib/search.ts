import { getAllTools } from "./db";

// Stopwords to filter out from queries
const STOPWORDS = new Set([
  "show", "me", "find", "search", "for", "everyone", "users", "using",
  "with", "and", "or", "the", "a", "an", "who", "that", "have", "has",
  "use", "all", "people", "developers", "devs",
]);

// Common aliases for tool names
const ALIASES: Record<string, string> = {
  "nvim": "neovim",
  "vim": "neovim", // Could also map to Vim, but Neovim is more common
  "zsh": "zsh",
  "tmux": "tmux",
  "term": "terminal",
  "wez": "wezterm",
  "alac": "alacritty",
};

export interface ParsedQuery {
  type: "username" | "tools" | "mixed";
  username?: string;
  toolIds: string[];
  toolNames: string[];
  originalQuery: string;
}

export function parseSearchQuery(query: string): ParsedQuery {
  const originalQuery = query.trim();

  if (!originalQuery) {
    return { type: "tools", toolIds: [], toolNames: [], originalQuery };
  }

  // Get all known tools from database
  const allTools = getAllTools();
  const toolMap = new Map<string, { tool_id: string; name: string }>();

  // Build lookup maps (lowercase name -> tool info)
  for (const tool of allTools) {
    toolMap.set(tool.name.toLowerCase(), { tool_id: tool.tool_id, name: tool.name });
    // Also map by the short name (after the dot in tool_id)
    const shortName = tool.tool_id.split(".")[1];
    if (shortName && !toolMap.has(shortName.toLowerCase())) {
      toolMap.set(shortName.toLowerCase(), { tool_id: tool.tool_id, name: tool.name });
    }
  }

  // Tokenize: split on spaces, +, commas, &
  const tokens = originalQuery
    .toLowerCase()
    .split(/[\s,+&]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0)
    .filter(t => !STOPWORDS.has(t));

  // Apply aliases
  const normalizedTokens = tokens.map(t => ALIASES[t] || t);

  // Try to match tokens to tools
  const matchedTools: Array<{ tool_id: string; name: string }> = [];
  const unmatchedTokens: string[] = [];

  for (const token of normalizedTokens) {
    const tool = toolMap.get(token);
    if (tool) {
      // Avoid duplicates
      if (!matchedTools.some(t => t.tool_id === tool.tool_id)) {
        matchedTools.push(tool);
      }
    } else {
      unmatchedTokens.push(token);
    }
  }

  // Determine query type
  // If we matched tools, it's a tool search
  if (matchedTools.length > 0) {
    return {
      type: "tools",
      toolIds: matchedTools.map(t => t.tool_id),
      toolNames: matchedTools.map(t => t.name),
      originalQuery,
    };
  }

  // If single token with no tool match, treat as username search
  if (unmatchedTokens.length === 1 || tokens.length === 1) {
    return {
      type: "username",
      username: originalQuery, // Use original query for username search
      toolIds: [],
      toolNames: [],
      originalQuery,
    };
  }

  // Multiple unmatched tokens - try username search with original query
  return {
    type: "username",
    username: originalQuery,
    toolIds: [],
    toolNames: [],
    originalQuery,
  };
}
