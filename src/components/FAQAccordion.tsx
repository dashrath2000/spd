'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { FAQItem } from '@/lib/blogs';

export default function FAQAccordion({ faqs }: { faqs: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!faqs || faqs.length === 0) return null;

  return (
    <section style={{ marginTop: '3.5rem', marginBottom: '3.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <div style={{ background: '#fef3c7', color: '#d97706', padding: '0.5rem', borderRadius: '10px' }}>
          <HelpCircle size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Frequently Asked Questions
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#64748b', margin: 0 }}>
            Common renovation queries in Thane, Mumbai, and Navi Mumbai
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease'
              }}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                style={{
                  width: '100%',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: isOpen ? '#fffbeb' : '#ffffff',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: isOpen ? '#92400e' : '#0f172a',
                  transition: 'background 0.2s ease'
                }}
              >
                <span>{faq.question}</span>
                <ChevronDown
                  size={20}
                  style={{
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.25s ease',
                    color: isOpen ? '#d97706' : '#64748b',
                    flexShrink: 0
                  }}
                />
              </button>

              {isOpen && (
                <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #fef3c7', background: '#ffffff', color: '#334155', lineHeight: 1.7, fontSize: '1rem' }}>
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
