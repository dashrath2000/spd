import dotenv from 'dotenv';
import { selectNextKeyword, savePublishedTopic } from './lib/keyword-researcher.js';
import { generateArticle } from './lib/content-generator.js';
import { generateBlogImages } from './lib/image-generator.js';
import { performQualityAudit } from './lib/quality-checker.js';
import { publishArticle } from './lib/publisher.js';
import { triggerSearchEngineIndexing } from './lib/indexer.js';
import { generateSocialPosts } from './lib/social-sharer.js';

dotenv.config();

export async function runAgent() {
  console.log(`
====================================================================
🤖 SPD RENOVATION AUTONOMOUS SEO BLOGGING AGENT
====================================================================
Execution Timestamp: ${new Date().toISOString()}
Target Service Areas: Thane | Mumbai | Navi Mumbai
====================================================================
`);

  // 1. Keyword & Topic Research
  console.log('📌 STEP 1: Researching un-used renovation keywords...');
  const keywordTarget = selectNextKeyword();
  console.log(`🎯 Selected Target Keyword: "${keywordTarget.keyword}" (${keywordTarget.category} in ${keywordTarget.location})`);

  // 2. Article Generation (Gemini API)
  console.log('\n✍️ STEP 2: Writing 2500+ word human-crafted SEO article...');
  const article = await generateArticle(keywordTarget);
  console.log(`✅ Generated Article Title: "${article.title}"`);
  console.log(`📊 Total Word Count: ${article.content.trim().split(/\s+/).length} words`);

  // 3. Image Generation & WebP Processing (1200x630)
  console.log('\n🎨 STEP 3: Generating WebP images (1200x630) & alt text...');
  const images = await generateBlogImages({
    slug: article.slug,
    keyword: article.targetKeyword,
    location: keywordTarget.location
  });

  // 4. Quality Audit & SEO Check
  console.log('\n🔍 STEP 4: Conducting Quality & SEO Audit (>95 SEO / >90 Readability)...');
  const audit = performQualityAudit(article);

  // 5. Auto-Publishing & Sitemap Update
  console.log('\n🚀 STEP 5: Publishing article & updating sitemap.xml...');
  const publishResult = await publishArticle(article, images);

  // 6. Search Engine Indexing Trigger
  console.log('\n📡 STEP 6: Sending indexing pings to Google & Bing...');
  const indexResult = await triggerSearchEngineIndexing(publishResult.url);

  // 7. Social Media Generation
  console.log('\n📱 STEP 7: Generating social media posts...');
  const socialPosts = generateSocialPosts(article);

  // 8. Prevent Duplicate Future Generation
  savePublishedTopic(article);

  console.log(`
====================================================================
✅ AUTONOMOUS BLOG PUBLISHING COMPLETE!
====================================================================
Title: ${article.title}
Slug: ${article.slug}
Published URL: ${publishResult.url}
SEO Score: ${audit.seoScore}/100
Readability Score: ${audit.readabilityScore}/100
Publish Status: SUCCESS
====================================================================
`);

  return {
    Title: article.title,
    Slug: article.slug,
    MetaDescription: article.description,
    CompleteMarkdown: article.content,
    JSONSchema: {
      articleSchema: `https://schema.org/Article`,
      faqSchema: `https://schema.org/FAQPage`,
      breadcrumbSchema: `https://schema.org/BreadcrumbList`
    },
    Images: images,
    Tags: article.tags,
    Category: article.category,
    SEOScore: audit.seoScore,
    ReadabilityScore: audit.readabilityScore,
    PublishStatus: 'PUBLISHED',
    SocialPosts: socialPosts
  };
}

// Allow direct CLI execution
if (import.meta.url === `file://${process.argv[1]}` || process.argv.includes('--run-now')) {
  runAgent().catch(err => {
    console.error('❌ Agent execution error:', err);
    process.exit(1);
  });
}
