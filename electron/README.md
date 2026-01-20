# Electron Assets

This directory contains Electron-specific files:

- `main.js` - Main process entry point
- `preload.js` - Preload script for secure IPC
- `icon.ico` - Windows application icon (to be added)
- `icon.icns` - macOS application icon (to be added)
- `icon.png` - Linux application icon (to be added)

## Icon Requirements

To complete the Electron setup, you need to provide app icons:

1. **Windows (icon.ico)**: 256x256 pixels, ICO format
2. **macOS (icon.icns)**: 512x512 or 1024x1024 pixels, ICNS format  
3. **Linux (icon.png)**: 512x512 pixels, PNG format

You can generate these from a single 1024x1024 PNG using tools like:
- [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder)
- [png2icons](https://github.com/nickygerritsen/png2icons)

## Running Electron

```bash
# Development (runs Next.js dev server + Electron)
pnpm electron:dev

# Build Windows installer
pnpm electron:build

# Build for all platforms
pnpm electron:build:all
```
