// Icon generation script for iOS and Android
// Requires: npm install sharp (run when building on Mac)
// Source icon should be 1024x1024 PNG

const sizes = {
  ios: [
    { name: 'AppIcon-20@2x.png', size: 40 },
    { name: 'AppIcon-20@3x.png', size: 60 },
    { name: 'AppIcon-29@2x.png', size: 58 },
    { name: 'AppIcon-29@3x.png', size: 87 },
    { name: 'AppIcon-40@2x.png', size: 80 },
    { name: 'AppIcon-40@3x.png', size: 120 },
    { name: 'AppIcon-60@2x.png', size: 120 },
    { name: 'AppIcon-60@3x.png', size: 180 },
    { name: 'AppIcon-76.png', size: 76 },
    { name: 'AppIcon-76@2x.png', size: 152 },
    { name: 'AppIcon-83.5@2x.png', size: 167 },
    { name: 'AppIcon-1024.png', size: 1024 }
  ],
  android: [
    { name: 'mdpi/ic_launcher.png', size: 48 },
    { name: 'hdpi/ic_launcher.png', size: 72 },
    { name: 'xhdpi/ic_launcher.png', size: 96 },
    { name: 'xxhdpi/ic_launcher.png', size: 144 },
    { name: 'xxxhdpi/ic_launcher.png', size: 192 }
  ]
};

async function generate() {
  try {
    const sharp = require('sharp');
    const fs = require('fs');
    const path = require('path');

    const source = path.resolve(__dirname, '../resources/icon-source.png');
    if (!fs.existsSync(source)) {
      console.log('Place a 1024x1024 icon-source.png in resources/ folder');
      console.log('Then run this script again.');
      return;
    }

    // iOS icons
    const iosDir = path.resolve(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset');
    if (!fs.existsSync(iosDir)) fs.mkdirSync(iosDir, { recursive: true });
    for (const icon of sizes.ios) {
      await sharp(source).resize(icon.size, icon.size).png().toFile(path.join(iosDir, icon.name));
      console.log('iOS:', icon.name);
    }

    // Android icons
    const androidBase = path.resolve(__dirname, '../android/app/src/main/res');
    for (const icon of sizes.android) {
      const dir = path.join(androidBase, 'mipmap-' + icon.name.split('/')[0]);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const file = icon.name.split('/')[1];
      await sharp(source).resize(icon.size, icon.size).png().toFile(path.join(dir, file));
      console.log('Android:', icon.name);
    }

    console.log('All icons generated!');
  } catch (e) {
    console.error('Error:', e.message);
    console.log('Install sharp first: npm install sharp');
  }
}

generate();
