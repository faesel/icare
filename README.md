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

## Configuration

Click the ⚙ icon on the widget (appears on hover) or right-click the tray icon → Settings.

| Setting | Default | Description |
|---|---|---|
| Countdown duration | 20s | How often you're reminded to blink |
| Break duration | 10s | How long the rest period lasts |
| Start on login | Off | Auto-launch iCare when you log in |

## Licence

MIT
