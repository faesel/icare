# iCare 👁️

A retro-styled desktop blink reminder. iCare sits as a small, always-on-top widget displaying a seven-segment countdown timer. When the countdown reaches zero, the widget flashes red to remind you to blink — then gives you a configurable break to rest your eyes.

## Features

- **Retro LCD aesthetic** — green-phosphor seven-segment digits with ghost segments, scanlines, and a blinking colon
- **Three-state cycle** — Countdown → Alert (flash red, wait for click) → Break (rest your eyes) → repeat
- **Configurable** — countdown duration, break duration, start on login
- **System tray** — show/hide, pause/resume, settings, quit
- **Cross-platform** — macOS and Windows
- **Lightweight** — frameless, transparent, always-on-top, no dock/taskbar clutter

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build only (no launch)
npm run build
```

## Packaging

```bash
# macOS (DMG)
npm run package:mac

# Windows (NSIS installer)
npm run package:win
```

## Creating a Release

Releases are built automatically via GitHub Actions. To create a new release:

### 1. Tag the version

```bash
# Update the version in package.json first, then:
git add package.json
git commit -m "chore: bump version to 1.0.1"
git tag v1.0.1
git push origin main --tags
```

### 2. Create the GitHub release

Using the GitHub CLI:

```bash
gh release create v1.0.1 --title "v1.0.1" --notes "Release notes here"
```

Or via the GitHub web UI:

1. Go to **https://github.com/faesel/icare/releases**
2. Click **Draft a new release**
3. Choose the tag you just pushed (e.g. `v1.0.1`)
4. Add a title and description
5. Click **Publish release**

### 3. What happens next

Once the release is published, the CI workflow (`.github/workflows/release.yml`) automatically:

- **macOS job** — builds on `macos-latest`, packages a `.dmg`, and uploads it to the release
- **Windows job** — builds on `windows-latest`, packages an `.exe` NSIS installer, and uploads it to the release

Both jobs run in parallel. After a few minutes the built artefacts will appear as downloadable assets on the release page.

## Configuration

Click the ⚙ icon on the widget (appears on hover) or right-click the tray icon → Settings.

| Setting | Default | Description |
|---|---|---|
| Countdown duration | 20s | How often you're reminded to blink |
| Break duration | 10s | How long the rest period lasts |
| Start on login | Off | Auto-launch iCare when you log in |

## Licence

MIT
