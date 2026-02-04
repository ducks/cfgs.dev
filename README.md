# cfgs.dev

Discover what tools developers use. Like prosettings.net, but for nerds.

Users login via GitHub or GitLab, point to their dotfiles repo, and we
auto-detect their terminal, shell, editor, window manager, and more.

## Features

- OAuth login with GitHub and GitLab
- Automatic dotfiles scanning and tool detection
- Detects: WezTerm, Alacritty, Kitty, Zsh, Bash, Fish, Nushell, Neovim, Vim,
  VSCode, Emacs, Hyprland, Sway, i3, AwesomeWM, tmux, Zellij, Starship, and more
- Extracts details like fonts, colorschemes, and plugin managers
- Profile pages showing detected tools by category
- Browse page for discovering other setups

## Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure OAuth (see below)
# Then start dev server
npm run dev
```

## Environment Variables

```
AUTH_SECRET=           # openssl rand -base64 32
GITHUB_CLIENT_ID=      # From GitHub OAuth app
GITHUB_CLIENT_SECRET=  # From GitHub OAuth app
GITLAB_CLIENT_ID=      # Optional
GITLAB_CLIENT_SECRET=  # Optional
```

Create a GitHub OAuth app at https://github.com/settings/developers with
callback URL `http://localhost:3000/api/auth/callback/github` for local dev.

## Deployment

Tag a release to trigger the GitHub Actions build:

```bash
git tag 20260124
git push origin 20260124
```

This creates a release with `cfgs-dev.tar.gz` containing the built app. Deploy
by extracting and running `npm start`.

## TODO

- [ ] Search (users, tools, or both)
- [x] Link to user's dotfiles repo on their profile page
- [ ] Multi-tool filtering (show users with both Neovim AND Kitty)
- [ ] Similar setups (find users with similar tool combinations)

## Stack

- Next.js 16 with App Router
- Auth.js (NextAuth v5)
- SQLite via better-sqlite3
- Tailwind CSS
