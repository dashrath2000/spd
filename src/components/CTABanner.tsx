import Link from 'next/link';
import { Phone, Calendar, CheckCircle, Shield } from 'lucide-react';

export default function CTABanner({ location = 'Thane or Mumbai' }: { location?: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: '20px',
      padding: '3rem 2rem',
      color: '#ffffff',
      margin: '3.5rem 0',
      boxShadow: 'var(--shadow-lg)',
      border: '1px solid #334155',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: '-40px',
        width: '200px',
        height: '200px',
        background: 'radial-gradient(circle, rgba(217, 119, 6, 0.25) 0%, rgba(0,0,0,0) 70%)',
        borderRadius: '50%'
      }} />

      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(217, 119, 6, 0.2)', border: '1px solid #d97706', padding: '0.35rem 1rem', borderRadius: '9999px', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.25rem' }}>
          <Shield size={16} /> Free On-Site Inspection & Customized Budget Plan
        </div>

        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '1rem', lineHeight: 1.25 }}>
          Need renovation services in {location}?
        </h2>

        <p style={{ fontSize: '1.15rem', color: '#cbd5e1', marginBottom: '2rem', lineHeight: 1.6 }}>
          Contact <strong style={{ color: '#fbbf24' }}>SPD Renovation</strong> today for a free site visit, expert 3D interior Consultation, and transparent quotation without any hidden charges.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.5rem', marginBottom: '2rem', fontSize: '0.95rem', color: '#e2e8f0' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle size={18} style={{ color: '#22c55e' }} /> 10-Year Warranty on Waterproofing
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle size={18} style={{ color: '#22c55e' }} /> On-Time Delivery Guarantee
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle size={18} style={{ color: '#22c55e' }} /> Certified Skilled Craftsmen
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
          <a href="tel:+919876543210" className="btn-primary" style={{ padding: '0.95rem 2.25rem', fontSize: '1.05rem' }}>
            <Phone size={20} /> Call +91 98765 43210
          </a>
          <Link href="/contact" className="btn-secondary" style={{ padding: '0.95rem 2.25rem', fontSize: '1.05rem' }}>
            <Calendar size={20} /> Schedule Free Site Visit
          </Link>
        </div>
      </div>
    </div>
  );
}
