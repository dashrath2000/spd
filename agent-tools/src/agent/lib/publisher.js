import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateArticleHTML } from './html-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../..');

export async function publishArticle(article, images) {
  console.log(`🚀 Publishing static HTML article: "${article.title}"...`);

  const htmlFilename = `${article.slug}.html`;
  const filePath = path.join(projectRoot, htmlFilename);

  // 1. Generate full HTML page
  const fullHTML = generateArticleHTML(article, images);
  fs.writeFileSync(filePath, fullHTML, 'utf-8');
  console.log(`✅ HTML Article saved to root: ${filePath}`);

  // 2. Update blog.html post grid
  await updateBlogListingPage(article, images);

  // 3. Update sitemap.xml
  await updateSitemapXML(article.slug, article.rawDateIso || new Date().toISOString().split('T')[0]);

  const canonicalUrl = `https://www.spdrenovation.in/${htmlFilename}`;

  return {
    success: true,
    slug: article.slug,
    filePath,
    url: canonicalUrl
  };
}

async function updateBlogListingPage(article, images) {
  const blogHtmlPath = path.join(projectRoot, 'blog.html');
  if (!fs.existsSync(blogHtmlPath)) return;

  let blogContent = fs.readFileSync(blogHtmlPath, 'utf-8');

  const readingTimeText = article.readingTime ? `${article.readingTime} min` : '8 min';

  const newPostCard = `
                <!-- Post Card: ${article.title} -->
                <a href="${article.slug}.html" class="post-card reveal">
                    <div class="post-card-thumb" style="background: url('${images.featuredImage}') center/cover no-repeat;">
                        <span class="post-card-category">${article.category}</span>
                    </div>
                    <div class="post-card-body">
                        <div class="post-card-meta">
                            <span><i class="fa-solid fa-calendar"></i> ${article.publishedDate}</span>
                            <span><i class="fa-solid fa-clock"></i> ${readingTimeText}</span>
                        </div>
                        <h3 class="post-card-title">${article.title}</h3>
                        <p class="post-card-excerpt">${article.description}</p>
                        <span class="post-card-link">Read More <i class="fa-solid fa-arrow-right"></i></span>
                    </div>
                </a>`;

  if (blogContent.includes('<div class="post-grid">')) {
    blogContent = blogContent.replace('<div class="post-grid">', `<div class="post-grid">\n${newPostCard}`);
    fs.writeFileSync(blogHtmlPath, blogContent, 'utf-8');
    console.log('✅ blog.html updated with new article card');
  }
}

async function updateSitemapXML(slug, publishedDate) {
  const sitemapPath = path.join(projectRoot, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) return;

  let sitemap = fs.readFileSync(sitemapPath, 'utf-8');
  const newUrlEntry = `
  <url>
    <loc>https://www.spdrenovation.in/${slug}.html</loc>
    <lastmod>${publishedDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

  if (!sitemap.includes(`${slug}.html`)) {
    sitemap = sitemap.replace('</urlset>', `${newUrlEntry}\n</urlset>`);
    fs.writeFileSync(sitemapPath, sitemap, 'utf-8');
    console.log('✅ sitemap.xml updated with new article URL');
  }
}
