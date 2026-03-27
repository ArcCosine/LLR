import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SRC = 'public/favicon.svg';
const DEST_DIR = 'public';

async function generate() {
  const svgBuffer = fs.readFileSync(SRC);
  
  // PNG icons
  const sizes = [
    { name: 'favicon-96x96.png', size: 96 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'web-app-manifest-192x192.png', size: 192 },
    { name: 'web-app-manifest-512x512.png', size: 512 },
  ];

  for (const { name, size } of sizes) {
    console.log(`Generating ${name}...`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(DEST_DIR, name));
  }

  // favicon.ico (simplified: just 32x32 PNG renamed to .ico)
  console.log('Generating favicon.ico...');
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(DEST_DIR, 'favicon.ico'));

  console.log('Done!');
}

generate().catch(console.error);
