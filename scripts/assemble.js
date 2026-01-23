const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const source = path.join(__dirname, '../.next/standalone');
const dest = path.join(__dirname, '../electron/standalone');
const staticSource = path.join(__dirname, '../.next/static');
const staticDest = path.join(dest, '.next/static');
const publicSource = path.join(__dirname, '../public');
const publicDest = path.join(dest, 'public');

/**
 * Copy directory recursively, handling symlinks properly for Windows compatibility
 */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Check if it's a symbolic link
    if (entry.isSymbolicLink()) {
      try {
        // Resolve the symlink to get the real path
        const realPath = fs.realpathSync(srcPath);
        const stat = fs.statSync(realPath);

        if (stat.isDirectory()) {
          // Copy the directory the symlink points to
          copyDir(realPath, destPath);
        } else {
          // Copy the file the symlink points to
          fs.copyFileSync(realPath, destPath);
        }
      } catch (err) {
        // Skip broken symlinks
        console.warn(`Skipping broken symlink: ${srcPath}`);
      }
    } else if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (err) {
        // Handle EPERM errors on Windows (locked files, etc.)
        if (err.code === 'EPERM' || err.code === 'EBUSY') {
          console.warn(`Skipping locked file: ${srcPath}`);
        } else {
          throw err;
        }
      }
    }
  }
}

console.log('Cleaning destination...');
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}

console.log('Copying standalone build...');
copyDir(source, dest);

console.log('Copying static files...');
copyDir(staticSource, staticDest);

console.log('Copying public files...');
copyDir(publicSource, publicDest);

console.log('Installing production dependencies in standalone...');
try {
  // Only install if package.json exists (it should from standalone build)
  if (fs.existsSync(path.join(dest, 'package.json'))) {
    execSync('npm install --production --no-bin-links', { cwd: dest, stdio: 'inherit' });
  }
} catch (error) {
  console.error('Failed to install dependencies:', error);
  process.exit(1);
}

console.log('Assembly complete.');
