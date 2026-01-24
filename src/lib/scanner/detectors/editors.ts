import { Detector, Detection, FileEntry } from "../types";

// Neovim detector
export const neovimDetector: Detector = {
  id: "editor.neovim",
  name: "Neovim",
  category: "editor",
  patterns: [
    "**/.config/nvim/init.lua",
    "**/.config/nvim/init.vim",
    "**/nvim/init.lua",
    "**/nvim/init.vim",
    "**/nvim/lua/**/*.lua",
  ],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "editor.neovim",
      category: "editor",
      name: "Neovim",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    // Detect plugin manager
    if (file.content.includes("lazy.nvim") || file.content.match(/require\s*\(\s*['"]lazy['"]\s*\)/)) {
      detection.details!.pluginManager = "lazy.nvim";
    } else if (file.content.includes("packer")) {
      detection.details!.pluginManager = "packer";
    } else if (file.content.includes("vim-plug") || file.content.includes("Plug '")) {
      detection.details!.pluginManager = "vim-plug";
    }

    // Detect colorscheme
    const colorMatch = file.content.match(/colorscheme\s+(\w+)/);
    if (colorMatch) {
      detection.details!.colorscheme = colorMatch[1];
    }

    // Detect LSP
    if (file.content.includes("nvim-lspconfig") || file.content.includes("lspconfig")) {
      detection.details!.lsp = "nvim-lspconfig";
    }

    // Detect treesitter
    if (file.content.includes("nvim-treesitter")) {
      detection.details!.treesitter = "true";
    }

    // Detect telescope
    if (file.content.includes("telescope")) {
      detection.details!.fuzzyFinder = "telescope";
    }

    return detection;
  },
};

// Vim detector
export const vimDetector: Detector = {
  id: "editor.vim",
  name: "Vim",
  category: "editor",
  patterns: ["**/.vimrc", "**/vimrc", "**/.vim/**"],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;
    // Skip if this looks like neovim
    if (file.path.includes("nvim")) return null;

    const detection: Detection = {
      tool: "editor.vim",
      category: "editor",
      name: "Vim",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    // Detect plugin manager
    if (file.content.includes("vim-plug") || file.content.includes("Plug '")) {
      detection.details!.pluginManager = "vim-plug";
    } else if (file.content.includes("Vundle")) {
      detection.details!.pluginManager = "Vundle";
    }

    // Detect colorscheme
    const colorMatch = file.content.match(/colorscheme\s+(\w+)/);
    if (colorMatch) {
      detection.details!.colorscheme = colorMatch[1];
    }

    return detection;
  },
};

// VS Code detector
export const vscodeDetector: Detector = {
  id: "editor.vscode",
  name: "VS Code",
  category: "editor",
  patterns: [
    "**/.vscode/settings.json",
    "**/.vscode/extensions.json",
    "**/vscode/settings.json",
  ],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "editor.vscode",
      category: "editor",
      name: "VS Code",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    try {
      const config = JSON.parse(file.content);

      // Extract theme
      if (config["workbench.colorTheme"]) {
        detection.details!.theme = config["workbench.colorTheme"];
      }

      // Extract font
      if (config["editor.fontFamily"]) {
        detection.details!.font = config["editor.fontFamily"];
      }

      // Extract icon theme
      if (config["workbench.iconTheme"]) {
        detection.details!.iconTheme = config["workbench.iconTheme"];
      }
    } catch {
      // JSON parse error, still detected by path
    }

    return detection;
  },
};

// Emacs detector
export const emacsDetector: Detector = {
  id: "editor.emacs",
  name: "Emacs",
  category: "editor",
  patterns: [
    "**/.emacs",
    "**/.emacs.d/init.el",
    "**/emacs/init.el",
    "**/.doom.d/config.el",
  ],
  detect: (file: FileEntry): Detection | null => {
    if (!file.content) return null;

    const detection: Detection = {
      tool: "editor.emacs",
      category: "editor",
      name: "Emacs",
      confidence: "high",
      evidence: [{ kind: "path", value: file.path }],
      details: {},
    };

    // Detect Doom Emacs
    if (file.path.includes("doom") || file.content.includes("doom!")) {
      detection.details!.distribution = "Doom Emacs";
    }

    // Detect Spacemacs
    if (file.content.includes("spacemacs")) {
      detection.details!.distribution = "Spacemacs";
    }

    return detection;
  },
};

export const editorDetectors: Detector[] = [
  neovimDetector,
  vimDetector,
  vscodeDetector,
  emacsDetector,
];
