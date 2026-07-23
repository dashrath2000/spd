import fs from 'fs';
import path from 'path';
import slugify from 'slugify';

const DB_PATH = path.join(process.cwd(), 'src/agent/database/published-topics.json');

export const CATEGORIES = [
  'Home Renovation',
  'Kitchen Renovation',
  'Bathroom Renovation',
  'Office Renovation',
  'Interior Design',
  'Painting',
  'Civil Work',
  'POP & False Ceiling',
  'Waterproofing',
  'Flooring',
  'Construction Tips'
];

export const KEYWORD_BANK = [
  { keyword: 'Home renovation in Thane', category: 'Home Renovation', location: 'Thane' },
  { keyword: 'Kitchen renovation cost Mumbai', category: 'Kitchen Renovation', location: 'Mumbai' },
  { keyword: 'Bathroom remodeling Thane', category: 'Bathroom Renovation', location: 'Thane' },
  { keyword: 'False ceiling contractor Thane', category: 'POP & False Ceiling', location: 'Thane' },
  { keyword: 'Interior designer Thane West', category: 'Interior Design', location: 'Thane' },
  { keyword: 'House renovation tips Mumbai', category: 'Construction Tips', location: 'Mumbai' },
  { keyword: 'Waterproofing contractor Navi Mumbai', category: 'Waterproofing', location: 'Navi Mumbai' },
  { keyword: 'Office interior renovation Vashi', category: 'Office Renovation', location: 'Navi Mumbai' },
  { keyword: 'Civil work contractor Thane East', category: 'Civil Work', location: 'Thane' },
  { keyword: 'Living room wall painting Mumbai', category: 'Painting', location: 'Mumbai' },
  { keyword: 'Vitrified tile flooring cost Thane', category: 'Flooring', location: 'Thane' },
  { keyword: 'Modular kitchen layout Mumbai high-rise', category: 'Kitchen Renovation', location: 'Mumbai' },
  { keyword: 'Small bathroom renovation cost Thane', category: 'Bathroom Renovation', location: 'Thane' },
  { keyword: 'Commercial office fitout Mumbai', category: 'Office Renovation', location: 'Mumbai' },
  { keyword: 'Terrace waterproofing solution Navi Mumbai', category: 'Waterproofing', location: 'Navi Mumbai' }
];

export function getPublishedDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    return { lastUpdated: new Date().toISOString(), publishedCount: 0, topics: [] };
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

export function savePublishedTopic(topicData) {
  const db = getPublishedDatabase();
  db.topics.push({
    title: topicData.title,
    slug: topicData.slug,
    keyword: topicData.targetKeyword,
    category: topicData.category,
    publishedDate: new Date().toISOString()
  });
  db.publishedCount = db.topics.length;
  db.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

export function selectNextKeyword() {
  const db = getPublishedDatabase();
  const publishedSlugs = new Set(db.topics.map(t => t.slug));
  const publishedKeywords = new Set(db.topics.map(t => t.keyword.toLowerCase()));

  for (const item of KEYWORD_BANK) {
    if (!publishedKeywords.has(item.keyword.toLowerCase())) {
      const suggestedSlug = slugify(item.keyword, { lower: true, strict: true });
      if (!publishedSlugs.has(suggestedSlug)) {
        return item;
      }
    }
  }

  // Fallback: Generate dynamic topic if predefined bank is exhausted
  const randomCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const locations = ['Thane', 'Mumbai', 'Navi Mumbai'];
  const loc = locations[Math.floor(Math.random() * locations.length)];
  const dynamicKeyword = `${randomCategory} guide ${loc} ${new Date().getFullYear()}`;

  return {
    keyword: dynamicKeyword,
    category: randomCategory,
    location: loc
  };
}
