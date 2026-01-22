const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const source = path.join(__dirname, '../.next/standalone');
const dest = path.join(__dirname, '../electron/standalone');
const staticSource = path.join(__dirname, '../.next/static');
const staticDest = path.join(dest, '.next/static');
const publicSource = path.join(__dirname, '../public');
const publicDest = path.join(dest, 'public');

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
      fs.copyFileSync(srcPath, destPath);
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
