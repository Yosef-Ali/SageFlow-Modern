# SageFlow Desktop App - Windows Installation Guide
## Simple Installation Instructions

---

## 📋 Prerequisites

- Windows 10 or Windows 11
- Internet connection

**That's it! No complex tools required.**

---

## 📥 Step 1: Clone the Repository

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

## ⚙️ Step 2: Configure Environment

Create a `.env.local` file in the project root:

```powershell
# Create the file
New-Item -Path ".env.local" -ItemType File
```

Open `.env.local` in Notepad and add these credentials:

```
DATABASE_URL="postgresql://neondb_owner:npg_SHaWjyn4Q5Ts@ep-tiny-cell-ahwvfmq7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
NEXTAUTH_SECRET="sageflow-secret-key-change-in-production-2024"
NEXTAUTH_URL="http://localhost:3000"
```

**Save the file.**

---

## 📦 Step 3: Install & Build

Run these two commands:

```powershell
# 1. Install dependencies
pnpm install

# 2. Build the installer
pnpm electron:build
```

---

## 📁 Step 4: Install the App

Once the build finishes, find your installer at:

```
dist-electron\SageFlow Setup 0.1.0.exe
```

Double-click it to install!

---

## 🔄 Alternative: Download from GitHub

1. Go to: https://github.com/Yosef-Ali/SageFlow-Modern/actions
2. Click the latest **"Build Windows Installer"** run
3. Download the `.exe` from **Artifacts**

---
