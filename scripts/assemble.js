const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '../dist');
const dest = path.join(__dirname, '../electron/dist');
const publicSource = path.join(__dirname, '../public');
const publicDest = path.join(dest, 'public');

/**
 * Copy directory recursively
 */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (err) {
        console.warn(`Skipping file: ${srcPath} - ${err.message}`);
      }
    }
  }
}

console.log('Cleaning destination...');
if (fs.existsSync(path.join(__dirname, '../electron/dist'))) {
  fs.rmSync(path.join(__dirname, '../electron/dist'), { recursive: true, force: true });
}

console.log('Copying Vite build (dist)...');
copyDir(source, path.join(__dirname, '../electron/dist'));

console.log('Assembly complete for Electron.');
