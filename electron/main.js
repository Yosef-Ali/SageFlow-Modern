const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'SageFlow Accounting',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false, // Don't show until ready
    backgroundColor: '#1a1a1a', // Match dark mode background
  });

  // Build menu
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Invoice',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('navigate', '/dashboard/invoices/new'),
        },
        { type: 'separator' },
        {
          label: 'Export Data',
          click: () => mainWindow.webContents.send('navigate', '/dashboard/settings/import-export'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ type: 'separator' }, { role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: 'Data',
      submenu: [
        {
          label: 'Import from Peachtree',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => mainWindow.webContents.send('navigate', '/dashboard/settings/peachtree-sync'),
        },
        {
          label: 'Sync Status',
          click: () => mainWindow.webContents.send('navigate', '/dashboard/settings/sync-history'),
        },
        { type: 'separator' },
        {
          label: 'Import/Export',
          click: () => mainWindow.webContents.send('navigate', '/dashboard/settings/import-export'),
        },
        {
          label: 'Backup Database',
          click: () => mainWindow.webContents.send('navigate', '/dashboard/settings/backup'),
        },
      ],
    },
    {
      label: 'Go',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+D',
          click: () => mainWindow.webContents.send('navigate', '/dashboard'),
        },
        {
          label: 'Invoices',
          accelerator: 'CmdOrCtrl+I',
          click: () => mainWindow.webContents.send('navigate', '/dashboard/invoices'),
        },
        {
          label: 'Customers',
          accelerator: 'CmdOrCtrl+U',
          click: () => mainWindow.webContents.send('navigate', '/dashboard/customers'),
        },
        {
          label: 'Banking',
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow.webContents.send('navigate', '/dashboard/banking'),
        },
        { type: 'separator' },
        {
          label: 'Reports',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow.webContents.send('navigate', '/dashboard/reports'),
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About SageFlow',
          click: async () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About SageFlow',
              message: 'SageFlow Accounting',
              detail: `Version: ${app.getVersion()}\nA modern accounting solution for Ethiopian businesses.\n\n© ${new Date().getFullYear()} SageFlow`,
            });
          },
        },
        { type: 'separator' },
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://sageflow.app/docs');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Load the app
  if (isDev) {
    // In development, load from Next.js dev server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from the built files
    mainWindow.loadURL('http://localhost:3000');
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // On macOS, re-create a window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle certificate errors for local development
if (isDev) {
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
  });
}
