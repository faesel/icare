import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { AppSettings, DEFAULT_SETTINGS } from '../shared/settings';

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isPaused = false;

// --- Settings persistence ---

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings(): AppSettings {
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function saveSettings(settings: AppSettings): Promise<void> {
  await fs.promises.writeFile(settingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
}

function validateSettings(input: unknown): AppSettings | null {
  if (typeof input !== 'object' || input === null) return null;
  const s = input as Record<string, unknown>;

  return {
    countdownDuration: typeof s.countdownDuration === 'number'
      ? Math.max(1, Math.min(86400, Math.floor(s.countdownDuration))) : DEFAULT_SETTINGS.countdownDuration,
    breakDuration: typeof s.breakDuration === 'number'
      ? Math.max(1, Math.min(86400, Math.floor(s.breakDuration))) : DEFAULT_SETTINGS.breakDuration,
    launchOnLogin: typeof s.launchOnLogin === 'boolean' ? s.launchOnLogin : DEFAULT_SETTINGS.launchOnLogin,
    shakeOnAlert: typeof s.shakeOnAlert === 'boolean' ? s.shakeOnAlert : DEFAULT_SETTINGS.shakeOnAlert,
    soundOnAlert: typeof s.soundOnAlert === 'boolean' ? s.soundOnAlert : DEFAULT_SETTINGS.soundOnAlert,
    soundOnBreakEnd: typeof s.soundOnBreakEnd === 'boolean' ? s.soundOnBreakEnd : DEFAULT_SETTINGS.soundOnBreakEnd,
  };
}

let currentSettings = loadSettings();

// --- App icon ---

function getAppIcon(): Electron.NativeImage {
  const iconFile = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  return nativeImage.createFromPath(
    path.join(__dirname, '..', '..', 'assets', 'icons', iconFile)
  );
}

// --- Windows ---

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 200,
    height: 70,
    icon: getAppIcon(),
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow.setPosition(width - 220, height - 90);

  if (process.platform === 'darwin') {
    mainWindow.setAlwaysOnTop(true, 'floating');
  }

  mainWindow.loadFile(path.join(__dirname, '..', '..', 'src', 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Once loaded, send current settings
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('settings:updated', currentSettings);
  });
}

function createSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 320,
    height: 470,
    icon: getAppIcon(),
    frame: true,
    resizable: false,
    alwaysOnTop: true,
    minimizable: false,
    maximizable: false,
    title: 'iCare Settings',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  settingsWindow.setMenu(null);
  settingsWindow.loadFile(path.join(__dirname, '..', '..', 'src', 'renderer', 'settings.html'));

  settingsWindow.webContents.on('did-finish-load', () => {
    settingsWindow?.webContents.send('settings:current', currentSettings);
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// --- System tray ---

function createTray(): void {
  const icon = getAppIcon().resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  tray.setToolTip('iCare — Blink Reminder');
  updateTrayMenu();
}

function updateTrayMenu(): void {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: mainWindow?.isVisible() ? 'Hide Timer' : 'Show Timer',
      click: () => {
        if (mainWindow?.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow?.show();
        }
        updateTrayMenu();
      },
    },
    {
      label: isPaused ? 'Resume' : 'Pause',
      click: () => {
        isPaused = !isPaused;
        mainWindow?.webContents.send(isPaused ? 'timer:pause' : 'timer:resume');
        updateTrayMenu();
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => createSettingsWindow(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// --- IPC handlers ---

ipcMain.on('settings:get', (event) => {
  event.sender.send('settings:current', currentSettings);
});

ipcMain.on('settings:set', (_event, settings: unknown) => {
  const validated = validateSettings(settings);
  if (!validated) return;

  currentSettings = validated;
  saveSettings(currentSettings);

  // Only set login items in packaged builds — unpacked dev builds lack the required entitlement
  if (app.isPackaged) {
    try {
      app.setLoginItemSettings({ openAtLogin: currentSettings.launchOnLogin });
    } catch {
      // Silently ignore — permission may not be granted
    }
  }

  // Notify the main widget
  mainWindow?.webContents.send('settings:updated', currentSettings);

  // Close settings window
  settingsWindow?.close();
});

ipcMain.on('settings:open', () => {
  createSettingsWindow();
});

ipcMain.on('settings:close', () => {
  settingsWindow?.close();
});

// --- App lifecycle ---



app.whenReady().then(() => {
  createMainWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
