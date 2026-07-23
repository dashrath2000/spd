'use client';

import { TOCItem } from '@/lib/blogs';
import { List, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function TableOfContents({ items }: { items: TOCItem[] }) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -40% 0px' }
    );

    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [items]);

  if (!items || items.length === 0) return null;

  return (
    <nav style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '1.5rem',
      position: 'sticky',
      top: '100px',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#0f172a', fontWeight: 700, fontSize: '1.1rem' }}>
        <List size={20} style={{ color: '#d97706' }} />
        <span>Table of Contents</span>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {items.map((item, index) => {
          const isActive = activeId === item.id;
          return (
            <li
              key={index}
              style={{
                paddingLeft: item.level === 3 ? '1.25rem' : '0rem',
                fontSize: item.level === 3 ? '0.875rem' : '0.925rem'
              }}
            >
              <a
                href={`#${item.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: isActive ? '#d97706' : '#475569',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.2s ease',
                  lineHeight: 1.4
                }}
              >
                <ChevronRight size={14} style={{ color: isActive ? '#d97706' : '#94a3b8', flexShrink: 0 }} />
                <span>{item.title}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
