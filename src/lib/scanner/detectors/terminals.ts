import { Detector, Detection, FileEntry } from "../types";
import * as toml from "toml";

// WezTerm detector
export const weztermDetector: Detector = {
  id: "terminal.wezterm",
  name: "WezTerm",
  category: "terminal",
  patterns: ["**/.wezterm.lua", "**/wezterm/*.lua", "**/wezterm.lua"],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "terminal.wezterm",
      category: "terminal",
      name: "WezTerm",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    // Extract font
    const fontMatch = file.content.match(/font\s*=\s*wezterm\.font\s*['"](.*?)['"]/);
    if (fontMatch) {
      detection.details!.font = fontMatch[1];
    }

    // Extract color scheme
    const colorMatch = file.content.match(/color_scheme\s*=\s*['"](.*?)['"]/);
    if (colorMatch) {
      detection.details!.colorscheme = colorMatch[1];
    }

    return detection;
  },
};

// Alacritty detector
export const alacrittyDetector: Detector = {
  id: "terminal.alacritty",
  name: "Alacritty",
  category: "terminal",
  patterns: [
    "**/.config/alacritty/alacritty.toml",
    "**/.config/alacritty/alacritty.yml",
    "**/alacritty/alacritty.toml",
    "**/alacritty.toml",
  ],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "terminal.alacritty",
      category: "terminal",
      name: "Alacritty",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    // Try to parse TOML for details
    if (file.path.endsWith(".toml")) {
      try {
        const config = toml.parse(file.content);
        if (config.font?.normal?.family) {
          detection.details!.font = config.font.normal.family;
        }
        if (config.colors?.primary?.background) {
          detection.details!.background = config.colors.primary.background;
        }
      } catch {
        // Ignore parse errors
      }
    }

    return detection;
  },
};

// Kitty detector
export const kittyDetector: Detector = {
  id: "terminal.kitty",
  name: "Kitty",
  category: "terminal",
  patterns: ["**/.config/kitty/kitty.conf", "**/kitty/kitty.conf", "**/kitty.conf"],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "terminal.kitty",
      category: "terminal",
      name: "Kitty",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    // Extract font family
    const fontMatch = file.content.match(/font_family\s+(.+)/);
    if (fontMatch) {
      detection.details!.font = fontMatch[1].trim();
    }

    // Extract include for theme
    const themeMatch = file.content.match(/include\s+.*?([^/]+)\.conf/);
    if (themeMatch) {
      detection.details!.theme = themeMatch[1];
    }

    return detection;
  },
};

export const terminalDetectors: Detector[] = [
  weztermDetector,
  alacrittyDetector,
  kittyDetector,
];
