# SageFlow Desktop App - Windows Installation Guide
## Complete Instructions for Installing on Windows

---

## 📋 Prerequisites

Before you begin, make sure the Windows PC has:
- Windows 10 or Windows 11
- Internet connection
- Administrator access (for installing tools)

---

## 🔧 Step 1: Install Required Tools

### 1.1 Install Git (to clone the repository)

1. Download Git from: https://git-scm.com/download/windows
2. Run the installer
3. Click "Next" through all options (defaults are fine)
4. Click "Install"

### 1.2 Install Node.js

1. Download Node.js LTS from: https://nodejs.org/
2. Run the installer
3. Check "Automatically install necessary tools"
4. Click "Next" and "Install"

**OR using PowerShell (as Administrator):**
```powershell
winget install OpenJS.NodeJS.LTS
```

### 1.3 Install pnpm (Package Manager)

Open PowerShell and run:
```powershell
npm install -g pnpm
```

### 1.4 Install Rust (Required for Tauri)

1. Download Rust from: https://www.rust-lang.org/tools/install
2. Run `rustup-init.exe`
3. Press Enter to use default installation
4. **IMPORTANT:** Close and reopen PowerShell after installation

**OR using PowerShell (as Administrator):**
```powershell
winget install Rustlang.Rustup
```

### 1.5 Install Visual Studio Build Tools (CRITICAL - Required for Rust)

This is the most important step. Without it, Rust cannot compile.

**Option A: Full Visual Studio (Recommended if you have the space)**

1. Download from: https://visualstudio.microsoft.com/vs/community/
2. Run the installer
3. Select **"Desktop development with C++"** workload
4. Make sure these are checked:
   - MSVC v143 - VS 2022 C++ x64/x86 build tools
   - Windows 10/11 SDK
   - C++ CMake tools for Windows
5. Click "Install" (requires about 7GB)

**Option B: Build Tools Only (Smaller download)**

1. Download from: https://aka.ms/vs/17/release/vs_BuildTools.exe
2. Run the installer
3. Click "Modify" or "Install"
4. Select **"Desktop development with C++"**
5. In the right panel, make sure these are checked:
   - ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools (Latest)
   - ✅ Windows 11 SDK (or Windows 10 SDK)
6. Click "Install"

**After Installation:**
```powershell
# Restart your computer or PowerShell
# Then verify MSVC is installed:
where.exe link.exe
# Should show: C:\Program Files\Microsoft Visual Studio\...\link.exe
```

### 1.6 Verify WebView2 (Usually pre-installed on Windows 10/11)

If not installed, download from: https://developer.microsoft.com/microsoft-edge/webview2/

---

## ⚠️ IMPORTANT: After Installing All Tools

**You MUST restart your computer** (or at minimum close and reopen PowerShell) before proceeding. This ensures all PATH variables are properly set.

---

## 📥 Step 2: Clone the Repository

Open PowerShell and run:

```powershell
# Navigate to where you want the project
cd C:\Projects

# Clone the repository
git clone https://github.com/Yosef-Ali/SageFlow-Modern.git

# Enter the project folder
cd SageFlow-Modern
```

---

## ⚙️ Step 3: Configure Environment

Create a `.env.local` file in the project root:

```powershell
# Create the file
New-Item -Path ".env.local" -ItemType File
```

Open `.env.local` in Notepad and add:

```
DATABASE_URL="postgresql://neondb_owner:npg_SHaWjyn4Q5Ts@ep-tiny-cell-ahwvfmq7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
NEXTAUTH_SECRET="sageflow-secret-key-change-in-production-2024"
NEXTAUTH_URL="http://localhost:3000"
```

**Replace the values with your actual database credentials.**

---

## 📦 Step 4: Install Dependencies

```powershell
pnpm install
```

This may take a few minutes.

---

## 🏗️ Step 5: Build the Windows Installer

```powershell
pnpm tauri:build
```

This will:
1. Build the Next.js application
2. Compile the Tauri/Rust code
3. Create a Windows installer

**Note:** The first build takes 10-20 minutes (downloads and compiles Rust dependencies).

---

## 📁 Step 6: Find Your Installer

After the build completes, find your installer at:

```
src-tauri\target\release\bundle\nsis\SageFlow-Accounting_0.1.0_x64-setup.exe
```

---

## 🖥️ Step 7: Install the Application

1. Double-click `SageFlow-Accounting_0.1.0_x64-setup.exe`
2. Follow the installation wizard
3. Choose installation location (or use default)
4. Click "Install"
5. Launch SageFlow from the Start Menu or Desktop shortcut

---

## 🔄 Alternative: Use GitHub Actions (No Local Build Required)

If you don't want to build locally:

1. Go to: https://github.com/Yosef-Ali/SageFlow-Modern
2. Click **Actions** tab
3. Click **"Build Windows Installer"** workflow
4. Click **"Run workflow"** button
5. Wait for the build to complete
6. Download the `.exe` from **Artifacts**

---

## ❓ Troubleshooting

### "Rust not found" error
- Close and reopen PowerShell after installing Rust
- Run: `rustup --version` to verify installation

### "MSVC not found" error
- Install Visual Studio Build Tools with "Desktop development with C++"

### "WebView2 not found" error
- Download and install WebView2 from Microsoft

### Build fails with errors
Try cleaning and rebuilding:
```powershell
cd src-tauri
cargo clean
cd ..
pnpm tauri:build
```

### Database connection error
- Make sure your PostgreSQL database is accessible from your network
- Verify the DATABASE_URL in `.env.local` is correct

---

## 📞 Support

For issues, create a GitHub issue at:
https://github.com/Yosef-Ali/SageFlow-Modern/issues

---

## Quick Reference Commands

```powershell
# Clone repository
git clone https://github.com/Yosef-Ali/SageFlow-Modern.git

# Navigate to project
cd SageFlow-Modern

# Install dependencies
pnpm install

# Development mode (for testing)
pnpm tauri:dev

# Build Windows installer
pnpm tauri:build

# Location of installer after build
src-tauri\target\release\bundle\nsis\SageFlow-Accounting_0.1.0_x64-setup.exe
```

---

**Last Updated:** January 2026
**Version:** 0.1.0
