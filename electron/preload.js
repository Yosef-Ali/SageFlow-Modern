const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  isDev: () => ipcRenderer.invoke('app:isDev'),
  platform: process.platform,

  // Theme support
  getTheme: () => ipcRenderer.invoke('theme:get'),
  setTheme: (theme) => ipcRenderer.invoke('theme:set', theme),
  onThemeChange: (callback) => {
    ipcRenderer.on('theme:changed', (_, theme) => callback(theme));
  },

  // License & Machine ID
  getMachineId: () => ipcRenderer.invoke('license:getMachineId'),

  // PTB Import/Export
  ptb: {
    import: () => ipcRenderer.invoke('ptb:import'),
    importFromPath: (filePath) => ipcRenderer.invoke('ptb:importFromPath', filePath),
    export: (data) => ipcRenderer.invoke('ptb:export', data),
    exportToPath: (data, outputPath) => ipcRenderer.invoke('ptb:exportToPath', { data, outputPath }),
    onProgress: (callback) => {
      ipcRenderer.on('ptb:progress', (_, progress) => callback(progress));
    },
  },

  // Check if running in Electron
  isElectron: true,
});

// Detect versions on DOM load
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type]);
  }
});
