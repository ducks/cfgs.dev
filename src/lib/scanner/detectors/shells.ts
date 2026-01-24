import { Detector, Detection, FileEntry } from "../types";

// Zsh detector
export const zshDetector: Detector = {
  id: "shell.zsh",
  name: "Zsh",
  category: "shell",
  patterns: ["**/.zshrc", "**/.zprofile", "**/.zshenv", "**/zshrc", "**/zsh/.zshrc"],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "shell.zsh",
      category: "shell",
      name: "Zsh",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    // Detect oh-my-zsh
    if (file.content.includes("oh-my-zsh") || file.content.includes("ZSH_THEME")) {
      detection.details!.framework = "oh-my-zsh";
      const themeMatch = file.content.match(/ZSH_THEME\s*=\s*['"](.*?)['"]/);
      if (themeMatch) {
        detection.details!.theme = themeMatch[1];
      }
    }

    // Detect zinit
    if (file.content.includes("zinit") || file.content.includes("zplugin")) {
      detection.details!.framework = "zinit";
    }

    // Detect starship
    if (file.content.includes("starship init")) {
      detection.details!.prompt = "starship";
    }

    // Detect powerlevel10k
    if (file.content.includes("powerlevel10k") || file.content.includes("p10k")) {
      detection.details!.prompt = "powerlevel10k";
    }

    return detection;
  },
};

// Bash detector
export const bashDetector: Detector = {
  id: "shell.bash",
  name: "Bash",
  category: "shell",
  patterns: ["**/.bashrc", "**/.bash_profile", "**/.profile", "**/bashrc"],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "shell.bash",
      category: "shell",
      name: "Bash",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    // Detect starship
    if (file.content.includes("starship init")) {
      detection.details!.prompt = "starship";
    }

    return detection;
  },
};

// Fish detector
export const fishDetector: Detector = {
  id: "shell.fish",
  name: "Fish",
  category: "shell",
  patterns: ["**/.config/fish/config.fish", "**/fish/config.fish"],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "shell.fish",
      category: "shell",
      name: "Fish",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    // Detect fisher
    if (file.content.includes("fisher")) {
      detection.details!.pluginManager = "fisher";
    }

    // Detect starship
    if (file.content.includes("starship init")) {
      detection.details!.prompt = "starship";
    }

    return detection;
  },
};

// Nushell detector
export const nushellDetector: Detector = {
  id: "shell.nushell",
  name: "Nushell",
  category: "shell",
  patterns: [
    "**/.config/nushell/config.nu",
    "**/nushell/config.nu",
    "**/nushell/*.nu",
  ],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "shell.nushell",
      category: "shell",
      name: "Nushell",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    // Detect starship
    if (file.content.includes("starship")) {
      detection.details!.prompt = "starship";
    }

    return detection;
  },
};

export const shellDetectors: Detector[] = [
  zshDetector,
  bashDetector,
  fishDetector,
  nushellDetector,
];
