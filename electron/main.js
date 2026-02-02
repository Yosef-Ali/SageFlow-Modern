const { app, BrowserWindow, ipcMain, Menu, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

// Robust manual environment variable loader for Electron Main process
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          // Remove quotes if present
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          process.env[key] = value;
        }
      });
      console.log('✅ Manually loaded credentials from .env.local');
    } catch (err) {
      console.error('❌ Failed to parse .env.local:', err);
    }
  }
}

loadEnv();

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const isMac = process.platform === 'darwin';

let mainWindow = null;

// macOS-specific: Create application menu
function createMenu() {
  const template = [
    // App Menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    // File Menu
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [
              { role: 'startSpeaking' },
              { role: 'stopSpeaking' }
            ]
          }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    // View Menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    },
    // Help Menu
    {
      role: 'help',
      submenu: [
        {
          label: 'SageFlow Documentation',
          click: async () => {
            await shell.openExternal('https://sageflow.app/docs');
          }
        },
        {
          label: 'Report an Issue',
          click: async () => {
            await shell.openExternal('https://github.com/sageflow/sageflow-modern/issues');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  // Window state defaults
  const windowConfig = {
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    title: 'SageFlow Modern',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f172a' : '#ffffff',
    // macOS-specific window styling
    ...(isMac && {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 15, y: 15 },
      vibrancy: 'under-window',
      visualEffectState: 'active',
    }),
    // Windows-specific
    ...(!isMac && {
      frame: true,
      autoHideMenuBar: false,
    }),
  };

  mainWindow = new BrowserWindow(windowConfig);

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from electron/dist (assembled by scripts/assemble.js)
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      // Fallback to root dist
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // macOS: Focus the window
    if (isMac) {
      app.dock.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

app.whenReady().then(() => {
  createMenu();
  createWindow();

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', function () {
  // On macOS, apps stay in dock until explicitly quit
  if (!isMac) {
    app.quit();
  }
});

// macOS: Handle open-url events (for deep linking)
app.on('open-url', (event, url) => {
  event.preventDefault();
  // Handle deep linking here if needed
  console.log('Deep link URL:', url);
});

// IPC handlers for desktop features
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);
ipcMain.handle('app:isDev', () => isDev);

// Theme handling
ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
ipcMain.handle('theme:set', (_, theme) => {
  nativeTheme.themeSource = theme; // 'dark', 'light', or 'system'
});

nativeTheme.on('updated', () => {
  if (mainWindow) {
    mainWindow.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  }
});

// License - Machine ID for hardware fingerprinting
ipcMain.handle('license:getMachineId', async () => {
  const { createHash } = require('crypto');
  const os = require('os');

  // Collect hardware identifiers
  const components = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || 'unknown-cpu',
    os.totalmem().toString(),
    // Network interfaces (first non-internal MAC)
    Object.values(os.networkInterfaces())
      .flat()
      .filter(ni => ni && !ni.internal && ni.mac && ni.mac !== '00:00:00:00:00:00')
      .map(ni => ni.mac)[0] || 'no-mac'
  ];

  // Create deterministic hash
  const fingerprint = createHash('sha256')
    .update(components.join('|'))
    .digest('hex')
    .substring(0, 16)
    .toUpperCase();

  return fingerprint;
});
