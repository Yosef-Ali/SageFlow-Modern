# SageFlow Desktop App (Tauri)

This document explains how to build SageFlow as a native desktop application using Tauri. Tauri produces **significantly smaller installers** (~5-10MB) compared to Electron (~100MB+) by using the system's native WebView.

## Prerequisites

### For Development (Mac/Linux)

1. **Rust** - Install from [rustup.rs](https://rustup.rs)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **System Dependencies (macOS)**
   ```bash
   xcode-select --install
   ```

3. **System Dependencies (Ubuntu/Debian)**
   ```bash
   sudo apt update
   sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
   ```

### For Building Windows Installer (from Windows)

1. **Rust for Windows**
   - Download and install from [rustup.rs](https://rustup.rs)
   - Or run in PowerShell:
   ```powershell
   winget install Rustlang.Rustup
   ```

2. **WebView2** (usually pre-installed on Windows 10/11)
   - If not installed: [Download WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2)

3. **Visual Studio Build Tools**
   - Download [Build Tools for Visual Studio](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   - Install "Desktop development with C++"

## Quick Start

### Install Dependencies

```bash
# Install Node.js dependencies (includes Tauri CLI)
pnpm install
```

### Development Mode

Start the app in development mode (hot reload enabled):

```bash
pnpm tauri:dev
```

This will:
1. Start the Next.js development server
2. Open the Tauri window pointing to localhost:3000

### Build for Current Platform

Build an installer for your current operating system:

```bash
pnpm tauri:build
```

Output will be in: `src-tauri/target/release/bundle/`

### Build for Windows (from Windows PC)

```bash
pnpm tauri:build:win
```

Output: `src-tauri/target/release/bundle/nsis/SageFlow-Accounting_0.1.0_x64-setup.exe`

## App Icons

### Generate Icons from a Source Image

1. Create a 1024x1024 PNG source image named `app-icon.png`
2. Run the icon generator:

```bash
pnpm tauri:icons src-tauri/icons/app-icon.png
```

This will generate all required sizes automatically.

### Manual Icon Placement

If you have pre-made icons, place them in `src-tauri/icons/`:
- `icon.ico` - Windows icon (256x256)
- `icon.icns` - macOS icon
- `32x32.png` - Small icon
- `128x128.png` - Medium icon
- `128x128@2x.png` - Retina icon

## Building on Windows (Complete Guide)

### Step 1: Clone the Repository

```powershell
git clone https://github.com/Yosef-Ali/SageFlow-Modern.git
cd SageFlow-Modern
```

### Step 2: Install Prerequisites

```powershell
# Install Rust
winget install Rustlang.Rustup

# Restart your terminal, then verify
rustup --version
cargo --version

# Install Node.js (if not installed)
winget install OpenJS.NodeJS.LTS

# Install pnpm
npm install -g pnpm
```

### Step 3: Install Project Dependencies

```powershell
pnpm install
```

### Step 4: Set Up Environment Variables

Create a `.env.local` file with your database connection:

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
```

### Step 5: Build the Windows Installer

```powershell
pnpm tauri:build
```

### Step 6: Find Your Installer

The installer will be at:
```
src-tauri\target\release\bundle\nsis\SageFlow-Accounting_0.1.0_x64-setup.exe
```

## Installer Properties

The Windows installer (NSIS):
- **Size**: ~5-10MB (compared to ~100MB for Electron)
- **Install Location**: Per-user (no admin required)
- **Creates**: Desktop shortcut, Start Menu entry
- **Uninstaller**: Included in Add/Remove Programs

## Troubleshooting

### "WebView2 not found" on Windows
Download and install WebView2 Runtime from Microsoft.

### Build fails with Rust errors
```bash
rustup update
cargo clean
pnpm tauri:build
```

### Next.js build errors
Ensure all environment variables are set in `.env.local`.

### Icons not showing
Regenerate icons with:
```bash
pnpm tauri:icons your-icon.png
```

## Comparison: Tauri vs Electron

| Feature | Tauri | Electron |
|---------|-------|----------|
| Installer Size | ~5-10 MB | ~100+ MB |
| Memory Usage | Lower | Higher |
| WebView | System Native | Bundled Chromium |
| Language | Rust + Web | JavaScript |
| Windows Support | ✅ | ✅ |
| macOS Support | ✅ | ✅ |
| Linux Support | ✅ | ✅ |

## Configuration

Main configuration is in `src-tauri/tauri.conf.json`:

- **Window settings**: Size, title, etc.
- **Bundle settings**: App ID, icons, installer options
- **Security**: CSP, allowed features
- **Build commands**: What to run before building
