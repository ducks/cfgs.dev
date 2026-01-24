import { Detector, Detection, FileEntry } from "../types";

// Hyprland detector
export const hyprlandDetector: Detector = {
  id: "wm.hyprland",
  name: "Hyprland",
  category: "wm",
  patterns: [
    "**/.config/hypr/hyprland.conf",
    "**/hypr/hyprland.conf",
    "**/hypr/*.conf",
  ],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "wm.hyprland",
      category: "wm",
      name: "Hyprland",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    // Detect terminal
    const termMatch = file.content.match(/\$terminal\s*=\s*(.+)/);
    if (termMatch) {
      detection.details!.terminal = termMatch[1].trim();
    }

    // Detect launcher
    const launcherMatch = file.content.match(/\$launcher\s*=\s*(.+)/);
    if (launcherMatch) {
      detection.details!.launcher = launcherMatch[1].trim();
    }

    // Detect bar from exec-once
    if (file.content.includes("waybar")) {
      detection.details!.bar = "waybar";
    } else if (file.content.includes("polybar")) {
      detection.details!.bar = "polybar";
    }

    // Detect notifications
    if (file.content.includes("dunst")) {
      detection.details!.notifications = "dunst";
    } else if (file.content.includes("mako")) {
      detection.details!.notifications = "mako";
    }

    return detection;
  },
};

// Sway detector
export const swayDetector: Detector = {
  id: "wm.sway",
  name: "Sway",
  category: "wm",
  patterns: [
    "**/.config/sway/config",
    "**/sway/config",
  ],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "wm.sway",
      category: "wm",
      name: "Sway",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    // Detect bar
    if (file.content.includes("waybar")) {
      detection.details!.bar = "waybar";
    } else if (file.content.includes("swaybar")) {
      detection.details!.bar = "swaybar";
    }

    return detection;
  },
};

// i3 detector
export const i3Detector: Detector = {
  id: "wm.i3",
  name: "i3",
  category: "wm",
  patterns: [
    "**/.config/i3/config",
    "**/.i3/config",
    "**/i3/config",
  ],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "wm.i3",
      category: "wm",
      name: "i3",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    // Detect bar
    if (file.content.includes("polybar")) {
      detection.details!.bar = "polybar";
    } else if (file.content.includes("i3bar") || file.content.includes("bar {")) {
      detection.details!.bar = "i3bar";
    }

    // Detect gaps (i3-gaps)
    if (file.content.includes("gaps inner") || file.content.includes("gaps outer")) {
      detection.details!.variant = "i3-gaps";
    }

    return detection;
  },
};

// AwesomeWM detector
export const awesomeDetector: Detector = {
  id: "wm.awesome",
  name: "AwesomeWM",
  category: "wm",
  patterns: [
    "**/.config/awesome/rc.lua",
    "**/awesome/rc.lua",
    "**/awesome/*.lua",
  ],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "wm.awesome",
      category: "wm",
      name: "AwesomeWM",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    // Detect theme
    const themeMatch = file.content.match(/beautiful\.init.*?([^\/]+)\/theme/);
    if (themeMatch) {
      detection.details!.theme = themeMatch[1];
    }

    return detection;
  },
};

// bspwm detector
export const bspwmDetector: Detector = {
  id: "wm.bspwm",
  name: "bspwm",
  category: "wm",
  patterns: [
    "**/.config/bspwm/bspwmrc",
    "**/bspwm/bspwmrc",
  ],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    return {
      tool: "wm.bspwm",
      category: "wm",
      name: "bspwm",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };
  },
};

export const wmDetectors: Detector[] = [
  hyprlandDetector,
  swayDetector,
  i3Detector,
  awesomeDetector,
  bspwmDetector,
];
