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

function saveSettings(settings: AppSettings): void {
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
}

let currentSettings = loadSettings();

// --- Windows ---

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 200,
    height: 70,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
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
    frame: true,
    resizable: false,
    alwaysOnTop: true,
    minimizable: false,
    maximizable: false,
    title: 'iCare Settings',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
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
  // Simple 16x16 tray icon (green circle)
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAOklEQVQ4T2Nk+M/wn4EBBZiYmBgZsckzMjIy4lXAQIwBDKMGMIwaQHIYjIYBaWFAcjLCFY+kZAQAx4UJEab33xUAAAAASUVORK5CYII=',
      'base64'
    )
  );

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

ipcMain.on('settings:set', (_event, settings: AppSettings) => {
  currentSettings = { ...DEFAULT_SETTINGS, ...settings };
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

// Hide dock icon immediately (before app is ready) to avoid the brief flash
if (process.platform === 'darwin' && app.dock) {
  app.dock.hide();
}

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
