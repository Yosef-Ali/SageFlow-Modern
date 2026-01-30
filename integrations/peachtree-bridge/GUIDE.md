# SageFlow Peachtree Bridge - Deployment Guide

This guide explains how to install the "SageFlow Bridge Agent" on your Windows Server to securely connect your legacy Peachtree (Sage 50) database to the modern Cloud App.

## Prerequisites

1.  **Windows Server/PC** hosting the Peachtree data.
2.  **Peachtree (Sage 50)** installed and running.
3.  **Administrator Access** to the machine.

---

## Step 1: Install Node.js (32-bit)

**CRITICAL**: You MUST install the **32-bit** version of Node.js because Peachtree's ODBC drivers are 32-bit.

1.  Go to [Node.js Download Page](https://nodejs.org/en/download/prebuilt-installer).
2.  Choose **v20.x (LTS)**.
3.  Platform: **Windows**.
4.  Architecture: **x86 (32-bit)**. << IMPORTANT
5.  Run the installer and finish the setup.

---

## Step 2: Configure ODBC DSN

1.  Open **Run** (Win+R) and type: `%systemroot%\syswow64\odbcad32.exe`
    *   *Note: This opens the 32-bit ODBC Administrator.*
2.  Go to the **System DSN** tab.
3.  Click **Add**.
4.  Select **Pervasive ODBC Client Interface** or **Peachtree ODBC**.
5.  **Data Source Name**: `Peachtree`
6.  **Database Name**: Browse to your company folder (e.g., `C:\Sage\Peachtree\Company\mycompany`).
7.  Click **OK** to save.

---

## Step 3: Install the Bridge

1.  Copy the `sageflow-peachtree-bridge` folder to the server (e.g., `C:\sageflow-bridge`).
2.  Open PowerShell as Administrator.
3.  Navigate to the folder:
    ```powershell
    cd C:\sageflow-bridge
    ```
4.  Install dependencies:
    ```powershell
    npm install
    ```
5.  Configure the environment:
    *   Copy `.env.example` to `.env`.
    *   Edit `.env` and set your `BRIDGE_API_KEY` (make up a strong password).
    *   Ensure `PEACHTREE_DSN_NAME` matches the DSN you created in Step 2.

**Test the Agent:**
Run `npm start`. You should see "SageFlow Bridge Agent Running".

---

## Step 4: Setup Cloudflare Tunnel

1.  Download `cloudflared` for Windows (32-bit or 64-bit is fine for this).
2.  Open PowerShell as Admin.
3.  Login:
    ```powershell
    cloudflared tunnel login
    ```
4.  Create the tunnel:
    ```powershell
    cloudflared tunnel create sageflow-bridge
    ```
5.  Route the tunnel (Replace `your-domain.com` with actual):
    ```powershell
    cloudflared tunnel route dns sageflow-bridge bridge.your-domain.com
    ```
6.  Start the tunnel pointing to your local Node app:
    ```powershell
    cloudflared tunnel run --url http://localhost:4000 sageflow-bridge
    ```

---

## Step 5: Verify

From your personal computer (not the server), try to curl the URL:
```bash
curl https://bridge.your-domain.com/health
```
You should get `{"status":"online"}`.

**Success!** Your legacy database is now securely connected to the cloud without opening any firewall ports.
