const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Creates a portable Windows distribution of SageFlow
 * This avoids the need for Admin privileges (no symlinks, no installer)
 */

const projectRoot = path.join(__dirname, '..');
const portableDir = path.join(projectRoot, 'portable');
const standaloneSource = path.join(projectRoot, '.next', 'standalone');
const standaloneDest = path.join(portableDir, 'standalone');
const staticSource = path.join(projectRoot, '.next', 'static');
const staticDest = path.join(standaloneDest, '.next', 'static');
const publicSource = path.join(projectRoot, 'public');
const publicDest = path.join(standaloneDest, 'public');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`  Skipping ${src} (not found)`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function deleteDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

console.log('');
console.log('===========================================');
console.log('  SageFlow Portable Builder');
console.log('===========================================');
console.log('');

// Step 1: Clean existing standalone in portable
console.log('1. Cleaning previous build...');
deleteDir(standaloneDest);

// Step 2: Check if standalone build exists
if (!fs.existsSync(standaloneSource)) {
  console.log('');
  console.log(' ERROR: Standalone build not found!');
  console.log('');
  console.log(' Please run: pnpm build');
  console.log('');
  process.exit(1);
}

// Step 3: Copy standalone build
console.log('2. Copying standalone server...');
copyDir(standaloneSource, standaloneDest);

// Step 4: Copy static files
console.log('3. Copying static files...');
copyDir(staticSource, staticDest);

// Step 5: Copy public files
console.log('4. Copying public assets...');
copyDir(publicSource, publicDest);

// Step 6: Create .env file in standalone
console.log('5. Creating environment config...');
const envContent = `# SageFlow Portable Configuration
DATABASE_URL=postgresql://neondb_owner:npg_SHaWjyn4Q5Ts@ep-tiny-cell-ahwvfmq7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_SECRET=sageflow-secret-key-change-in-production-2024
NEXTAUTH_URL=http://localhost:3000
`;
fs.writeFileSync(path.join(standaloneDest, '.env'), envContent);

console.log('');
console.log('===========================================');
console.log('  BUILD COMPLETE!');
console.log('===========================================');
console.log('');
console.log('Your portable app is ready in the "portable" folder.');
console.log('');
console.log('To run:');
console.log('  1. Copy the "portable" folder to any Windows PC');
console.log('  2. Make sure Node.js is installed');
console.log('  3. Double-click SageFlow.bat or SageFlow.vbs');
console.log('');
console.log('Contents:');
console.log('  - SageFlow.bat (command-line launcher)');
console.log('  - SageFlow.vbs (silent launcher, no console)');
console.log('  - standalone/ (the app)');
console.log('');
