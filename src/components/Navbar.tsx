'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Hammer, Phone, Menu, X, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="header-glass">
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '80px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, #d97706, #b45309)',
            color: '#fff',
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
          }}>
            <Hammer size={24} />
          </div>
          <div>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', display: 'block', lineHeight: 1 }}>
              SPD <span style={{ color: '#d97706' }}>Renovation</span>
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Thane • Mumbai • Navi Mumbai
            </span>
          </div>
        </Link>

        <nav style={{ display: 'none', gap: '2rem', alignItems: 'center', '@media (min-width: 768px)': { display: 'flex' } } as any} className="desktop-nav">
          <Link href="/" style={{ fontWeight: 600, color: '#1e293b', transition: 'color 0.2s' }}>Home</Link>
          <Link href="/services" style={{ fontWeight: 600, color: '#1e293b', transition: 'color 0.2s' }}>Services</Link>
          <Link href="/projects" style={{ fontWeight: 600, color: '#1e293b', transition: 'color 0.2s' }}>Projects</Link>
          <Link href="/blog" style={{ fontWeight: 600, color: '#d97706', transition: 'color 0.2s' }}>Renovation Blog</Link>
          <Link href="/contact" style={{ fontWeight: 600, color: '#1e293b', transition: 'color 0.2s' }}>Contact</Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="tel:+919876543210" className="btn-primary" style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}>
            <Phone size={16} />
            <span>Call +91 98765 43210</span>
          </a>
        </div>
      </div>
    </header>
  );
}
