import Link from 'next/link';
import { Hammer, MapPin, Phone, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{ background: '#0f172a', color: '#94a3b8', paddingTop: '4rem', paddingBottom: '2.5rem', borderTop: '1px solid #1e293b' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '3rem', marginBottom: '3.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: '#d97706', color: '#fff', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Hammer size={20} />
              </div>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
                SPD <span style={{ color: '#d97706' }}>Renovation</span>
              </span>
            </div>
            <p style={{ fontSize: '0.925rem', lineHeight: 1.7, marginBottom: '1.5rem', color: '#cbd5e1' }}>
              Premier full-service home renovation, interior design, civil execution, waterproofing, painting, and false ceiling contractor serving Thane, Mumbai, and Navi Mumbai.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0' }}>
                <MapPin size={16} style={{ color: '#d97706' }} />
                <span>Thane West, Mumbai Metropolitan Region, Maharashtra</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0' }}>
                <Phone size={16} style={{ color: '#d97706' }} />
                <span>+91 98765 43210</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0' }}>
                <Mail size={16} style={{ color: '#d97706' }} />
                <span>contact@spdrenovation.com</span>
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Renovation Services</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.9rem' }}>
              <li><Link href="/services#home" style={{ color: '#cbd5e1', transition: 'color 0.2s' }}>Full Home Renovation</Link></li>
              <li><Link href="/services#kitchen" style={{ color: '#cbd5e1', transition: 'color 0.2s' }}>Modular Kitchen Remodeling</Link></li>
              <li><Link href="/services#bathroom" style={{ color: '#cbd5e1', transition: 'color 0.2s' }}>Bathroom Renovation & Waterproofing</Link></li>
              <li><Link href="/services#office" style={{ color: '#cbd5e1', transition: 'color 0.2s' }}>Office & Commercial Interiors</Link></li>
              <li><Link href="/services#false-ceiling" style={{ color: '#cbd5e1', transition: 'color 0.2s' }}>POP & False Ceiling Installation</Link></li>
              <li><Link href="/services#painting" style={{ color: '#cbd5e1', transition: 'color 0.2s' }}>Interior & Exterior Painting</Link></li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Service Locations</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.9rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={14} style={{ color: '#d97706' }} /> Home Renovation in Thane West & East</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={14} style={{ color: '#d97706' }} /> Kitchen Remodeling Mumbai Suburban</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={14} style={{ color: '#d97706' }} /> Bathroom Waterproofing Navi Mumbai</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={14} style={{ color: '#d97706' }} /> Office Interior Contractor Vashi & Belapur</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={14} style={{ color: '#d97706' }} /> Painting & Civil Work Ghodbunder Road</li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Quality Assurance</h4>
            <div style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '12px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d97706', fontWeight: 700, marginBottom: '0.5rem' }}>
                <ShieldCheck size={20} />
                <span>100% Guaranteed Quality</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                Transparent pricing, on-time project completion, skilled workforce, and high-grade materials for long-lasting renovation results.
              </p>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', fontSize: '0.875rem' }}>
          <div>
            © {new Date().getFullYear()} SPD Renovation. All rights reserved. Built for top organic Google ranking in Thane & Mumbai.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/blog" style={{ color: '#cbd5e1' }}>Renovation Blog</Link>
            <Link href="/contact" style={{ color: '#cbd5e1' }}>Free Site Visit</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
