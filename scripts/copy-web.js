const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../../msouwout-site');
const destDir = path.resolve(__dirname, '../www');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === '.nojekyll' || entry.name === 'CNAME') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Copying MsouWout web files to www/...');
if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true });
copyDir(srcDir, destDir);
console.log('Done! Web files copied to www/');
