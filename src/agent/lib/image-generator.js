import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export async function generateBlogImages({ slug, keyword, location }) {
  console.log(`🖼️ Processing WebP images (1200x630) for static site images/ folder: "${keyword}"...`);

  const outputDir = path.join(process.cwd(), 'images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const featuredPath = path.join(outputDir, `${slug}-featured.webp`);

  // Source generated PNG images or generate sharp canvas WebP graphic
  const brainDir = '/Users/dashrathprajapati/.gemini/antigravity-ide/brain/daac7190-8c9a-4706-a6ff-290595693a98';
  
  await createOrConvertImage(`${brainDir}/home_renovation_featured_1784826498379.png`, featuredPath, keyword, '#0d145c');

  return {
    featuredImage: `images/${slug}-featured.webp`,
    featuredImageAlt: `${keyword} - Modern renovation project in ${location} by SPD Renovation`
  };
}

async function createOrConvertImage(sourcePngPath, targetWebpPath, fallbackTitle, themeColor) {
  if (fs.existsSync(sourcePngPath)) {
    await sharp(sourcePngPath)
      .resize(1200, 630, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(targetWebpPath);
  } else {
    const svgOverlay = `
      <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${themeColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:#E65100;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#grad)" />
        <text x="600" y="300" font-family="sans-serif" font-size="48" font-weight="bold" fill="#ffffff" text-anchor="middle">${fallbackTitle}</text>
        <text x="600" y="370" font-family="sans-serif" font-size="26" fill="#FF833A" text-anchor="middle">SPD Electriction &amp; Renovation • Thane | Mumbai | Navi Mumbai</text>
      </svg>
    `;

    await sharp(Buffer.from(svgOverlay))
      .webp({ quality: 90 })
      .toFile(targetWebpPath);
  }
}
