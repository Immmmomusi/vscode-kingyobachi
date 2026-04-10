# CLAUDE.md - vscode-kingyobachi

## Project Overview

A goldfish bowl that runs as a VSCode extension. Watch pixel-art goldfish swim around in a tank.
The concept is "a relaxing aquarium to gaze at when you're tired of coding." Gameplay is kept to a minimum -- just watch and occasionally feed the fish.

UI reference: vscode-pets (https://github.com/tonybaloney/vscode-pets)

## Tech Stack

- **Language**: TypeScript
- **Build**: webpack (separate builds for extension + webview)
- **Package Manager**: npm
- **VSCode API**: WebviewViewProvider (sidebar)
- **Rendering**: HTML5 Canvas (pixel art)
- **State Persistence**: `vscode.ExtensionContext.globalState`

## Directory Structure

```
vscode-kingyobachi/
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── webpack.config.js
├── docs/                    # Detailed design documents
│   ├── game-design.md       # Growth/care logic details
│   ├── message-protocol.md  # Extension <-> Webview communication spec
│   └── coding-standards.md  # Coding conventions
├── src/
│   ├── extension/           # VSCode Extension side (Node.js)
│   ├── webview/             # Webview side (browser, Canvas rendering)
│   └── shared/              # Shared types, constants, message definitions
├── media/                   # VSCode icons and pixel-art sprite assets
└── dist/                    # Build output
```

## Development Phases

### Phase 1: Minimal Tank Display
Display a Canvas-based tank in the Explorer sidebar via WebviewViewProvider. Goal: a placeholder rectangle swimming around.

### Phase 2: Goldfish Animation
Create pixel-art sprite sheets (starting with a single orange color). Swimming AI and bubble particles.

### Phase 3: Feeding & Growth
Persist state with globalState. Hunger level and growth. Feeding command and animation.

### Phase 4: Expansion
Add goldfish color variations (red-and-white).

### Phase 5: Polish
Notifications, settings UI, README, Marketplace publishing preparation.

## Mandatory Rules

- **CSP required**: Webviews must use `nonce`-based Content Security Policy
- **`imageSmoothingEnabled = false`**: Always set this when drawing on Canvas to keep pixel art crisp
- **`globalState.update()` must be awaited**: It is async, so always use `await`
- **Stop animation when Webview is hidden**: Monitor via `onDidChangeViewState` to save resources
- **Build with placeholder assets first**: Keep sprite structure swappable for later replacement
- **UI text in Japanese**: Externalize messages into constants for future i18n
- **Coding conventions**: Follow the rules in `docs/coding-standards.md`

## Design Documents

- `docs/game-design.md` - Goldfish state, time progression, feeding, growth
- `docs/message-protocol.md` - Extension <-> Webview message type definitions
