{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_22
    nodePackages.typescript
  ];

  shellHook = ''
    echo "cfgs.dev development environment"
    echo "Node.js: $(node --version)"
    echo ""
    echo "Commands:"
    echo "  npm run dev    - Start development server"
    echo "  npm run build  - Build for production"
    echo "  npm run start  - Start production server"
    echo ""
    echo "Setup:"
    echo "  1. Copy .env.example to .env"
    echo "  2. Create GitHub OAuth app at https://github.com/settings/developers"
    echo "  3. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET"
    echo "  4. Generate AUTH_SECRET: openssl rand -base64 32"
  '';
}
