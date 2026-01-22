const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;
let serverProcess;

function createWindow() {
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
    show: false,
    backgroundColor: '#1a1a1a',
  });

  // Build menu (same as before)
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { label: 'New Invoice', accelerator: 'CmdOrCtrl+N', click: () => { mainWindow?.webContents.send('navigate', '/dashboard/invoices/new'); } },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About SageFlow',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About SageFlow',
              message: 'SageFlow Accounting',
              detail: `Version: ${app.getVersion()}\n\nModern accounting software for Ethiopian businesses.\n\n© ${new Date().getFullYear()} SageFlow`,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  return new Promise(async (resolve, reject) => {
    if (isDev) {
      // In dev, assume server is running on port 3000
      resolve('http://localhost:3000');
      return;
    }

    // In production, spawn the standalone server
    // The standalone build should be copied to resources/standalone
    const resourcesPath = process.resourcesPath;
    const serverPath = path.join(resourcesPath, 'standalone', 'server.js');

    console.log('Starting server from:', serverPath);

    if (!fs.existsSync(serverPath)) {
      dialog.showErrorBox('Error', `Server file not found at: ${serverPath}`);
      reject(new Error('Server file not found'));
      return;
    }

    // Find a free port
    const getPort = (await import('get-port')).default;
    const port = await getPort({ port: 3000 });

    // Spawn the node process
    serverProcess = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        PORT: port,
        NODE_ENV: 'production',
        hostname: 'localhost'
      },
      cwd: path.join(resourcesPath, 'standalone') // Set working directory to standalone folder
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`Server: ${data}`);
      // Check for ready signal (Next.js typically logs "Listening on port...")
      if (data.toString().includes('Listening on') || data.toString().includes('Ready in')) {
        // Give it a moment to fully initialize
        setTimeout(() => resolve(`http://localhost:${port}`), 1000);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`Server Error: ${data}`);
    });

    serverProcess.on('close', (code) => {
      console.log(`Server exited with code ${code}`);
    });

    // Fallback: If no "Listening" log is detected, resolve after 5 seconds anyway
    setTimeout(() => resolve(`http://localhost:${port}`), 5000);
  });
}

app.whenReady().then(async () => {
  try {
    const url = await startNextServer();
    createWindow();
    mainWindow.loadURL(url);
  } catch (error) {
    dialog.showErrorBox('Startup Error', `Failed to start application server: ${error.message}`);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
