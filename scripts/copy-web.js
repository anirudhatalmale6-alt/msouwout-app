const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../../msouwout-site');
const destDir = path.resolve(__dirname, '../www');
const injectDir = path.resolve(__dirname, '../www-inject');

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

const NATIVE_CSS = `
<style id="capacitor-native-styles">
/* Native app enhancements - only active inside Capacitor */
body.capacitor-native {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
body.capacitor-native ::-webkit-scrollbar { display: none; }
body.capacitor-native { scrollbar-width: none; }
body.capacitor-native .koutye-bar,
body.capacitor-native [data-web-only] { display: none !important; }
body.capacitor-native input, body.capacitor-native textarea {
  -webkit-user-select: text;
  user-select: text;
}
</style>
`;

const NATIVE_SCRIPT = `<script src="capacitor-bridge.js"></script>
<script>
if(window.Capacitor&&Capacitor.isNativePlatform()){document.body.classList.add('capacitor-native')}
</script>`;

console.log('Copying MsouWout web files to www/...');
if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true });
copyDir(srcDir, destDir);

// Copy inject files
if (fs.existsSync(injectDir)) {
  const injectFiles = fs.readdirSync(injectDir);
  for (const file of injectFiles) {
    fs.copyFileSync(path.join(injectDir, file), path.join(destDir, file));
  }
  console.log(`Injected ${injectFiles.length} bridge files`);
}

// Inject native CSS and bridge script into all HTML files
const htmlFiles = fs.readdirSync(destDir).filter(f => f.endsWith('.html'));
let injected = 0;
for (const file of htmlFiles) {
  const filePath = path.join(destDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Add native CSS before </head>
  if (content.includes('</head>')) {
    content = content.replace('</head>', NATIVE_CSS + '</head>');
  }

  // Add bridge script before </body>
  if (content.includes('</body>')) {
    content = content.replace('</body>', NATIVE_SCRIPT + '</body>');
  }

  fs.writeFileSync(filePath, content);
  injected++;
}

console.log(`Injected native enhancements into ${injected} HTML files`);
console.log('Done! Web files ready for Capacitor');
