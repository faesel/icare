# iCare — Blink Reminder Desktop App

## Mandatory Rules

> **No Copilot Attribution:** GitHub Copilot must **never** be mentioned as a contributor, co-author, or collaborator anywhere in this project. This includes — but is not limited to — git commit trailers (`Co-authored-by`), `package.json` contributors/author fields, README credits, licence headers, changelog entries, and any other metadata. All commits must be authored solely by human contributors. This rule is non-negotiable and applies to every phase of development.

## Problem Statement

Prolonged screen use causes people to blink less frequently, leading to dry eyes, eye strain, and discomfort. Users need a subtle, always-visible desktop reminder to prompt them to blink at regular intervals.

## Proposed Approach

Build a cross-platform (macOS & Windows) Electron app that renders a small, always-on-top floating widget displaying a countdown timer. When the countdown reaches zero the widget flashes red to prompt the user to blink, then automatically resets. A lightweight settings panel allows the user to configure the countdown duration. The app will use Electron's `BrowserWindow` with `alwaysOnTop`, frameless window mode, and a compact footprint to stay unobtrusive.

**Tech stack:** Electron + TypeScript + HTML/CSS. No heavy UI framework — vanilla DOM is sufficient for a widget this small.

### Visual Theme — Retro Digital Timer

The widget adopts a retro LCD / LED clock aesthetic inspired by classic bedside alarm clocks and stopwatches:

- **Font:** Use a seven-segment-style web font such as [Digital-7](https://www.dafont.com/digital-7.font) or [DSEG](https://github.com/keshikan/DSEG) (OFL-licensed). Bundle the font in `assets/fonts/`.
- **Colour palette:**
  - **Default state:** Bright green digits (`#33ff33`) on a near-black background (`#0a0a0a`) — classic green-phosphor CRT look.
  - **Alert state:** Digits and background pulse red (`#ff0000` / `#330000`).
  - **Dimmed segments:** Unlit segments rendered at ~8 % opacity to mimic the ghost segments on a real LCD.
- **Container styling:**
  - Subtle inner bevel / inset shadow to simulate a recessed LCD panel.
  - Thin rounded-corner border (`1px solid #222`) with a faint outer glow matching the digit colour.
  - Optional very subtle scanline overlay (CSS repeating-linear-gradient) for extra retro feel — respects `prefers-reduced-motion`.
- **Colon separator** between minutes and seconds blinks every second (toggles opacity) as on a real digital clock.
- **Settings panel** inherits the dark background and green accent colour to keep the retro aesthetic consistent, but uses a legible sans-serif font for labels and controls.

---

## Tasks

### 1. Project scaffolding

- Initialise the Electron + TypeScript project with `npm init` and install core dependencies (`electron`, `typescript`, `ts-node`, `electron-builder`).
- Create the folder structure: `src/main/`, `src/renderer/`, `src/shared/`, `docs/`, `assets/`.
- Add `tsconfig.json` for both main and renderer processes.
- Add npm scripts: `dev`, `build`, `package:mac`, `package:win`.

**Verification:** `npm run dev` launches a blank Electron window without errors.

---

### 2. Frameless always-on-top window

- Create the main process (`src/main/index.ts`) that opens a `BrowserWindow` with:
  - `alwaysOnTop: true`
  - `frame: false` (frameless)
  - `transparent: true`
  - `resizable: false`
  - Small default size (e.g. 180 × 60 px)
  - `skipTaskbar: true` (Windows) / dock-hidden on macOS
- Enable dragging via `-webkit-app-region: drag` on the widget body.
- Position the window in the bottom-right corner by default.

**Verification:** `npm run dev` shows a small, frameless, always-on-top window that can be dragged around the desktop and floats above other applications.

---

### 3. Countdown timer display

- Build the renderer HTML/CSS (`src/renderer/index.html`, `src/renderer/styles.css`) showing a countdown in `MM:SS` format centred in the widget.
- Implement the timer logic in `src/renderer/timer.ts`:
  - Accepts a duration in seconds.
  - Counts down every second, updating the DOM.
  - Emits an event (or calls a callback) when the countdown reaches zero.
  - Auto-resets and restarts after reaching zero.
- Use a default countdown of **20 seconds** (the 20-20-20 rule).

**Verification:** Launch the app; the timer counts down from 00:20 to 00:00, then resets and starts again.

---

### 4. Three-state timer cycle

The widget operates as a state machine with three states and explicit user interaction to transition from alert to break:

```
┌─────────────┐      timer hits 0      ┌─────────────────┐     user clicks     ┌─────────────────┐
│  COUNTDOWN   │ ────────────────────▶ │   ALERT (flash)  │ ──────────────────▶ │   BREAK (rest)   │
│  (green, MM:SS) │                      │ (red pulse, ∞)   │                      │ (blue/amber, MM:SS) │
└─────────────┘                        └─────────────────┘                      └─────────────────┘
       ▲                                                                                │
       │                              break countdown hits 0                            │
       └────────────────────────────────────────────────────────────────────────────────┘
```

**State 1 — Countdown (default)**
- Green digits count down from the configured duration.
- When the timer reaches zero, transition to the Alert state.

**State 2 — Alert (red flash)**
- Widget flashes red (CSS pulse animation) indefinitely — it does **not** auto-advance.
- Display "Blink!" text and a clearly visible **"Start Break"** button (exempt from `-webkit-app-region: drag`).
- Optional system notification as a secondary prompt.
- The alert persists until the user clicks the button, ensuring they consciously acknowledge the reminder.

**State 3 — Break (rest period)**
- Triggered by the user clicking "Start Break".
- Widget switches to a calmer theme (e.g. amber or blue-tinted digits) and displays "Rest your eyes…" with a countdown of the configured break duration.
- When the break countdown reaches zero, automatically transition back to State 1 (Countdown) and restart the cycle.

**Verification:** Countdown reaches zero → widget flashes red indefinitely → user clicks "Start Break" → widget shows break countdown → break ends → regular countdown restarts.

---

### 5. Settings panel

- Add a small gear/cog icon button in the widget (exempt from `-webkit-app-region: drag`).
- Clicking the icon opens a secondary `BrowserWindow` (or expands the widget) with settings:
  - **Countdown duration** — dropdown or input: 10s, 20s (default), 30s, 45s, 60s, custom.
  - **Flash duration** — slider: 1–5 seconds (default 3).
  - **Break duration** — dropdown or input: 5s, 10s (default), 15s, 20s, 30s, custom. This is the rest period after the flash alert during which the widget displays "Rest your eyes…" before the countdown restarts.
  - **Start on login** — toggle (macOS: `app.setLoginItemSettings`, Windows: registry via Electron).
  - **Pause / Resume** — button to temporarily disable the timer.
- Persist settings to a JSON file in `app.getPath('userData')` via `electron-store` or a simple read/write utility.
- Communicate setting changes from the settings window to the main widget via IPC (`ipcMain` / `ipcRenderer`).

**Verification:** Change countdown to 10 s in settings → close settings → widget now counts down from 00:10. Restart the app → setting persists.

---

### 6. System tray integration

- Add a system tray icon with a context menu:
  - **Show / Hide** — toggle widget visibility.
  - **Pause / Resume** — toggle timer.
  - **Settings** — open the settings panel.
  - **Quit** — exit the app.
- On macOS, hide the dock icon (`app.dock.hide()`).

**Verification:** Tray icon is visible; all context menu actions work correctly on both macOS and Windows.

---

### 7. Cross-platform packaging

- Configure `electron-builder` in `package.json` for:
  - **macOS:** DMG and/or `.app` bundle (arm64 + x64 universal).
  - **Windows:** NSIS installer and/or portable `.exe`.
- Add app icons for both platforms in `assets/` (`.icns` for macOS, `.ico` for Windows).
- Test the built artefacts on macOS and Windows (or Windows VM).

**Verification:** `npm run package:mac` produces a working `.dmg`; `npm run package:win` produces a working `.exe` installer. Both launch and function correctly.

---

### 8. Polish and edge cases

- Handle screen resolution / DPI scaling so the widget renders crisply on Retina / HiDPI displays.
- Ensure the widget respects multiple-monitor setups and remembers its position.
- Add a close (×) button that minimises to tray rather than quitting.
- Gracefully handle sleep/wake and screen lock (pause timer, resume on unlock).

**Verification:** Move the widget to a secondary monitor, restart the app → widget appears in the same position. Put the machine to sleep and wake → timer resumes without duplicated intervals.

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| `alwaysOnTop` behaviour varies across OS and window managers | Widget may be hidden behind fullscreen apps on some setups | Use Electron's `setAlwaysOnTop(true, 'floating')` on macOS for stronger z-ordering; test on both platforms |
| Frameless transparent windows have rendering quirks on Windows | Visual artefacts or non-draggable areas | Test early on Windows; fall back to a minimal frame if transparency is unreliable |
| Auto-start on login requires platform-specific handling | Feature may silently fail on one OS | Use `app.setLoginItemSettings` for macOS; for Windows, use Electron's built-in support and verify in Task Manager |
| Timer drift over long sessions using `setInterval` | Countdown becomes inaccurate | Use a target-time approach (store end timestamp, calculate remaining on each tick) rather than decrementing a counter |
| Large Electron bundle size for a small utility | Users may find a 150 MB+ app excessive for a timer | Consider enabling Electron's ASAR compression; strip unused locales; document the trade-off |

---

## Security

| Concern | Assessment |
|---|---|
| Node integration in renderer | Disable `nodeIntegration`, enable `contextIsolation`, and use a `preload.ts` script to expose only the required IPC channels via `contextBridge` |
| Settings file storage | Settings stored in `userData` — no credentials or PII involved; low risk |
| Auto-update | Not in initial scope; if added later, use `electron-updater` with code-signed releases to prevent tampered binaries |
| Third-party dependencies | Keep dependencies minimal (Electron + electron-builder + electron-store at most); audit with `npm audit` before each release |
| No network access required | The app is entirely offline; no external API calls, no telemetry — minimal attack surface |

---

## Accessibility

| Area | Approach |
|---|---|
| Colour contrast | Timer text will use high-contrast colours (white on dark background, or dark on light) meeting WCAG 2.1 AA (4.5:1 ratio minimum) |
| Red flash | Ensure the flash animation does not rely solely on colour — add a text cue ("Blink!") during the alert for colour-blind users |
| Keyboard navigation | Settings panel must be fully keyboard-navigable (Tab, Enter, Escape to close) |
| Screen reader | Settings panel inputs labelled with `<label>` elements; ARIA attributes on custom controls if any |
| Motion sensitivity | Respect `prefers-reduced-motion`: replace the flashing animation with a static colour change and/or a system notification |
| Focus management | When the settings panel opens, focus moves to the first control; on close, focus returns to the widget |

---

## User Guidance

| Element | Guidance |
|---|---|
| Gear icon | Tooltip: "Settings" on hover |
| Countdown display | Tooltip: "Time until next blink reminder" |
| Pause button (tray + settings) | Tooltip: "Pause the blink reminder" / "Resume the blink reminder" |
| Countdown duration input | Inline help text: "How often you'd like to be reminded to blink (in seconds)" |
| Flash duration slider | Inline help text: "How long the red flash alert lasts" |
| Break duration input | Inline help text: "How long to rest your eyes before the next countdown begins" |
| Start on login toggle | Inline help text: "Automatically launch iCare when you log in" |
| Empty/first-run state | On first launch, briefly expand the widget to show: "👋 iCare will remind you to blink every 20 seconds. Click the ⚙ to customise." |
| Close (×) button | Tooltip: "Minimise to tray (right-click tray icon to quit)" |
