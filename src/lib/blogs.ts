import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface FAQItem {
  question: string;
  answer: string;
}

export interface TOCItem {
  id: string;
  title: string;
  level: number;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  publishedDate: string;
  author: string;
  category: string;
  tags: string[];
  featuredImage: string;
  featuredImageAlt: string;
  targetKeyword: string;
  seoScore: number;
  readabilityScore: number;
  wordCount: number;
  readingTime: number;
  faqs: FAQItem[];
  tableOfContents: TOCItem[];
  relatedSlugs?: string[];
  canonicalUrl: string;
}

const blogsDirectory = path.join(process.cwd(), 'content/blogs');

export function getPostSlugs(): string[] {
  if (!fs.existsSync(blogsDirectory)) {
    return [];
  }
  return fs.readdirSync(blogsDirectory).filter((file) => file.endsWith('.md'));
}

export function extractTOC(content: string): TOCItem[] {
  const headingLines = content.match(/^#{2,3}\s+.+/gm) || [];
  return headingLines.map((line) => {
    const level = line.startsWith('###') ? 3 : 2;
    const title = line.replace(/^#{2,3}\s+/, '').trim();
    const id = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    return { id, title, level };
  });
}

export function calculateReadingTime(wordCount: number): number {
  const wordsPerMinute = 200;
  return Math.ceil(wordCount / wordsPerMinute);
}

export function getPostBySlug(slug: string): BlogPost | null {
  try {
    const realSlug = slug.replace(/\.md$/, '');
    const fullPath = path.join(blogsDirectory, `${realSlug}.md`);

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    const words = content.trim().split(/\s+/).length;
    const toc = extractTOC(content);

    return {
      slug: realSlug,
      title: data.title || '',
      description: data.description || '',
      content: content,
      publishedDate: data.publishedDate || new Date().toISOString().split('T')[0],
      author: data.author || 'SPD Renovation Team',
      category: data.category || 'Home Renovation',
      tags: data.tags || ['Renovation', 'Home Improvement'],
      featuredImage: data.featuredImage || '/images/blogs/default.webp',
      featuredImageAlt: data.featuredImageAlt || data.title,
      targetKeyword: data.targetKeyword || '',
      seoScore: data.seoScore || 98,
      readabilityScore: data.readabilityScore || 94,
      wordCount: words,
      readingTime: calculateReadingTime(words),
      faqs: data.faqs || [],
      tableOfContents: toc,
      relatedSlugs: data.relatedSlugs || [],
      canonicalUrl: `https://spdrenovation.com/blog/${realSlug}`,
    };
  } catch (error) {
    console.error(`Error loading post ${slug}:`, error);
    return null;
  }
}

export function getAllPosts(): BlogPost[] {
  const slugs = getPostSlugs();
  const posts = slugs
    .map((slug) => getPostBySlug(slug))
    .filter((post): post is BlogPost => post !== null)
    .sort((post1, post2) => (post1.publishedDate > post2.publishedDate ? -1 : 1));

  return posts;
}

export function getPostsByCategory(category: string): BlogPost[] {
  return getAllPosts().filter(
    (post) => post.category.toLowerCase() === category.toLowerCase()
  );
}

export function getRelatedPosts(currentSlug: string, category: string, limit: number = 3): BlogPost[] {
  const allPosts = getAllPosts();
  const related = allPosts.filter(
    (post) => post.slug !== currentSlug && post.category.toLowerCase() === category.toLowerCase()
  );

  if (related.length < limit) {
    const additional = allPosts.filter(
      (post) => post.slug !== currentSlug && post.category.toLowerCase() !== category.toLowerCase()
    );
    return [...related, ...additional].slice(0, limit);
  }

  return related.slice(0, limit);
}
