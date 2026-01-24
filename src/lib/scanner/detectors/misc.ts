import { Detector, Detection, FileEntry } from "../types";
import * as toml from "toml";

// Starship prompt detector
export const starshipDetector: Detector = {
  id: "prompt.starship",
  name: "Starship",
  category: "prompt",
  patterns: [
    "**/.config/starship.toml",
    "**/starship/starship.toml",
    "**/starship.toml",
  ],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "prompt.starship",
      category: "prompt",
      name: "Starship",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    try {
      const config = toml.parse(file.content);
      // Count enabled modules
      const modules = Object.keys(config).filter(k => k !== "$schema");
      detection.details!.modules = modules.length.toString();
    } catch {
      // Ignore parse errors
    }

    return detection;
  },
};

// Tmux detector
export const tmuxDetector: Detector = {
  id: "multiplexer.tmux",
  name: "tmux",
  category: "multiplexer",
  patterns: ["**/.tmux.conf", "**/tmux/tmux.conf", "**/tmux.conf"],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "multiplexer.tmux",
      category: "multiplexer",
      name: "tmux",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    // Detect TPM (tmux plugin manager)
    if (file.content.includes("tpm") || file.content.includes("tmux-plugins")) {
      detection.details!.pluginManager = "tpm";
    }

    // Detect prefix key
    const prefixMatch = file.content.match(/set\s+-g\s+prefix\s+(\S+)/);
    if (prefixMatch) {
      detection.details!.prefix = prefixMatch[1];
    }

    return detection;
  },
};

// Zellij detector
export const zellijDetector: Detector = {
  id: "multiplexer.zellij",
  name: "Zellij",
  category: "multiplexer",
  patterns: [
    "**/.config/zellij/config.kdl",
    "**/zellij/config.kdl",
  ],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    return {
      tool: "multiplexer.zellij",
      category: "multiplexer",
      name: "Zellij",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };
  },
};

// Waybar detector
export const waybarDetector: Detector = {
  id: "bar.waybar",
  name: "Waybar",
  category: "bar",
  patterns: [
    "**/.config/waybar/config",
    "**/.config/waybar/config.jsonc",
    "**/waybar/config",
    "**/waybar/config.jsonc",
  ],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "bar.waybar",
      category: "bar",
      name: "Waybar",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    // Try to detect position
    if (file.content.includes('"position": "top"') || file.content.includes('"position":"top"')) {
      detection.details!.position = "top";
    } else if (file.content.includes('"position": "bottom"')) {
      detection.details!.position = "bottom";
    }

    return detection;
  },
};

// Polybar detector
export const polybarDetector: Detector = {
  id: "bar.polybar",
  name: "Polybar",
  category: "bar",
  patterns: [
    "**/.config/polybar/config",
    "**/.config/polybar/config.ini",
    "**/polybar/config",
    "**/polybar/config.ini",
  ],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    return {
      tool: "bar.polybar",
      category: "bar",
      name: "Polybar",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };
  },
};

// Rofi detector
export const rofiDetector: Detector = {
  id: "launcher.rofi",
  name: "Rofi",
  category: "launcher",
  patterns: [
    "**/.config/rofi/config.rasi",
    "**/rofi/config.rasi",
    "**/rofi/*.rasi",
  ],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "launcher.rofi",
      category: "launcher",
      name: "Rofi",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    // Detect theme
    const themeMatch = file.content.match(/@theme\s+"([^"]+)"/);
    if (themeMatch) {
      detection.details!.theme = themeMatch[1];
    }

    return detection;
  },
};

// Wofi detector
export const wofiDetector: Detector = {
  id: "launcher.wofi",
  name: "Wofi",
  category: "launcher",
  patterns: [
    "**/.config/wofi/config",
    "**/.config/wofi/style.css",
    "**/wofi/config",
    "**/wofi/style.css",
  ],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    return {
      tool: "launcher.wofi",
      category: "launcher",
      name: "Wofi",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };
  },
};

// Dunst detector
export const dunstDetector: Detector = {
  id: "notifications.dunst",
  name: "Dunst",
  category: "notifications",
  patterns: [
    "**/.config/dunst/dunstrc",
    "**/dunst/dunstrc",
  ],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    return {
      tool: "notifications.dunst",
      category: "notifications",
      name: "Dunst",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };
  },
};

// Git config detector
export const gitDetector: Detector = {
  id: "tool.git",
  name: "Git",
  category: "shell", // Using shell as misc category
  patterns: [
    "**/.gitconfig",
    "**/git/config",
    "**/gitconfig",
  ],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "tool.git",
      category: "shell",
      name: "Git",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    // Extract editor
    const editorMatch = file.content.match(/editor\s*=\s*(.+)/);
    if (editorMatch) {
      detection.details!.editor = editorMatch[1].trim();
    }

    // Extract default branch
    const branchMatch = file.content.match(/defaultBranch\s*=\s*(.+)/);
    if (branchMatch) {
      detection.details!.defaultBranch = branchMatch[1].trim();
    }

    return detection;
  },
};

export const miscDetectors: Detector[] = [
  starshipDetector,
  tmuxDetector,
  zellijDetector,
  waybarDetector,
  polybarDetector,
  rofiDetector,
  wofiDetector,
  dunstDetector,
  gitDetector,
];
