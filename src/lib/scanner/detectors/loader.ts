import { Detector, Detection, FileEntry, ToolCategory } from "../types";
import * as toml from "toml";

import terminalsConfig from "./config/terminals.json";
import shellsConfig from "./config/shells.json";
import editorsConfig from "./config/editors.json";
import wmConfig from "./config/wm.json";
import miscConfig from "./config/misc.json";

interface ContentFlag {
  match: string;
  value: string;
  pathMatch?: boolean;
}

interface DetectorConfig {
  id: string;
  name: string;
  category: string;
  patterns: string[];
  skipIf?: string[];
  extract?: Record<string, string>;
  extractJson?: Record<string, string>;
  extractToml?: Record<string, string>;
  contentFlags?: Record<string, ContentFlag[]>;
}

function getNestedValue(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function createDetector(config: DetectorConfig): Detector {
  return {
    id: config.id,
    name: config.name,
    category: config.category as ToolCategory,
    patterns: config.patterns,
    detect: (file: FileEntry): Detection | null => {
      if (!file.content) return null;

      // Check skipIf conditions
      if (config.skipIf) {
        for (const skip of config.skipIf) {
          if (file.path.includes(skip)) return null;
        }
      }

      const detection: Detection = {
        tool: config.id,
        category: config.category as ToolCategory,
        name: config.name,
        confidence: "high",
        evidence: [{ kind: "path", value: file.path }],
        details: {},
      };

      // Regex extraction
      if (config.extract) {
        for (const [key, pattern] of Object.entries(config.extract)) {
          const match = file.content.match(new RegExp(pattern));
          if (match?.[1]) {
            detection.details![key] = match[1].trim();
          }
        }
      }

      // JSON extraction
      if (config.extractJson && file.path.endsWith(".json")) {
        try {
          const parsed = JSON.parse(file.content);
          for (const [key, path] of Object.entries(config.extractJson)) {
            const value = getNestedValue(parsed, path);
            if (value) detection.details![key] = value;
          }
        } catch {
          // Ignore parse errors
        }
      }

      // TOML extraction
      if (config.extractToml && file.path.endsWith(".toml")) {
        try {
          const parsed = toml.parse(file.content);
          for (const [key, path] of Object.entries(config.extractToml)) {
            const value = getNestedValue(parsed, path);
            if (value) detection.details![key] = value;
          }
        } catch {
          // Ignore parse errors
        }
      }

      // Content flags (first match wins per key)
      if (config.contentFlags) {
        for (const [key, flags] of Object.entries(config.contentFlags)) {
          for (const flag of flags) {
            const target = flag.pathMatch ? file.path : file.content;
            if (target.includes(flag.match)) {
              detection.details![key] = flag.value;
              break;
            }
          }
        }
      }

      return detection;
    },
  };
}

function loadConfigs(configs: DetectorConfig[]): Detector[] {
  return configs.map(createDetector);
}

export const terminalDetectors = loadConfigs(terminalsConfig as unknown as DetectorConfig[]);
export const shellDetectors = loadConfigs(shellsConfig as unknown as DetectorConfig[]);
export const editorDetectors = loadConfigs(editorsConfig as unknown as DetectorConfig[]);
export const wmDetectors = loadConfigs(wmConfig as unknown as DetectorConfig[]);
export const miscDetectors = loadConfigs(miscConfig as unknown as DetectorConfig[]);

export const allDetectors: Detector[] = [
  ...terminalDetectors,
  ...shellDetectors,
  ...editorDetectors,
  ...wmDetectors,
  ...miscDetectors,
];
