import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, ArrowRight, Tag } from 'lucide-react';
import { BlogPost } from '@/lib/blogs';

export default function BlogCard({ post }: { post: BlogPost }) {
  return (
    <article style={{
      background: '#ffffff',
      borderRadius: '16px',
      overflow: 'hidden',
      border: '1px solid #e2e8f0',
      boxShadow: 'var(--shadow-sm)',
      transition: 'all 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }} className="blog-card-hover">
      <div style={{ position: 'relative', width: '100%', height: '220px', backgroundColor: '#f1f5f9' }}>
        <Image
          src={post.featuredImage}
          alt={post.featuredImageAlt || post.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{ objectFit: 'cover' }}
          priority={false}
        />
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(4px)',
          color: '#ffffff',
          padding: '0.3rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase'
        }}>
          {post.category}
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.825rem', color: '#64748b', marginBottom: '0.75rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={14} style={{ color: '#d97706' }} />
            {post.publishedDate}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Clock size={14} style={{ color: '#d97706' }} />
            {post.readingTime} min read ({post.wordCount} words)
          </span>
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.35, marginBottom: '0.75rem', color: '#0f172a' }}>
          <Link href={`/blog/${post.slug}`} style={{ color: 'inherit', transition: 'color 0.2s' }}>
            {post.title}
          </Link>
        </h3>

        <p style={{ fontSize: '0.925rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.25rem', flexGrow: 1 }}>
          {post.description.length > 130 ? `${post.description.substring(0, 130)}...` : post.description}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
          {post.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} style={{
              fontSize: '0.725rem',
              color: '#475569',
              background: '#f1f5f9',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <Tag size={10} />
              {tag}
            </span>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
            SEO Score: {post.seoScore}/100
          </span>
          <Link href={`/blog/${post.slug}`} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: '#d97706',
            fontWeight: 700,
            fontSize: '0.9rem'
          }}>
            Read Full Guide <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
