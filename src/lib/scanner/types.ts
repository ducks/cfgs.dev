// Tool categories and IDs
export type ToolCategory =
  | "shell"
  | "terminal"
  | "editor"
  | "wm"
  | "multiplexer"
  | "prompt"
  | "font"
  | "colorscheme"
  | "bar"
  | "launcher"
  | "notifications"
  | "vcs"
  | "compositor"
  | "filemanager"
  | "tool";

export type ToolId = string; // e.g., "terminal.wezterm", "shell.zsh"

// Evidence for why we detected something
export type EvidenceKind = "path" | "marker" | "structured";

export interface Evidence {
  kind: EvidenceKind;
  value: string;
  path?: string;
}

// A single tool detection
export interface Detection {
  tool: ToolId;
  category: ToolCategory;
  name: string; // Human readable name
  confidence: "high" | "medium" | "low";
  evidence: Evidence[];
  details?: Record<string, string>; // e.g., { font: "Berkeley Mono", theme: "Gruvbox" }
}

// File entry from scanning
export interface FileEntry {
  path: string; // repo-relative
  size: number;
  content?: string; // loaded on demand
}

// Scan context
export interface ScanContext {
  repoUrl: string;
  branch?: string;
  maxBytes?: number;
}

// Final scan result
export interface ScanResult {
  tools: Detection[];
  filesScanned: number;
  bytesRead: number;
  durationMs: number;
  warnings: string[];
}

// Detector interface
export interface Detector {
  id: string;
  name: string;
  category: ToolCategory;
  // File patterns to match (glob-like)
  patterns: string[];
  // Detect from file content
  detect: (file: FileEntry) => Detection | null;
}
