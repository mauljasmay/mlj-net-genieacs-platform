const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICON_DIR = path.join(__dirname, '../public/icons');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function convertIcons() {
  for (const size of sizes) {
    const svgPath = path.join(ICON_DIR, `icon-${size}x${size}.svg`);
    const pngPath = path.join(ICON_DIR, `icon-${size}x${size}.png`);
    if (!fs.existsSync(svgPath)) {
      console.log(`Skipping ${size} - SVG not found`);
      continue;
    }
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(pngPath);
    console.log(`Converted: icon-${size}x${size}.png`);
  }

  // Also convert favicon
  const faviconSvg = path.join(__dirname, '../public/favicon.svg');
  if (fs.existsSync(faviconSvg)) {
    await sharp(faviconSvg).resize(32, 32).png().toFile(path.join(__dirname, '../public/favicon.ico'));
    console.log('Converted: favicon.ico');
  }

  console.log('All icons converted!');
}

convertIcons().catch(console.error);
