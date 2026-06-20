import { RefreshCw, AlertTriangle, Phone, Mail } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export function PlanExpiredScreen() {
  const { profile, recheckPlan, signOut } = useAuthStore();
  const isOnline = useOnlineStatus();

  const expiryDate = profile?.planExpiry
    ? new Date(profile.planExpiry).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : 'Unknown';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0f00 50%, #0a0a0a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        padding: '24px',
      }}
    >
      {/* Gold glow background */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: '24px',
          padding: '48px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(255,80,80,0.1)',
            border: '2px solid rgba(255,80,80,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 28px',
          }}
        >
          <AlertTriangle size={36} color="#ff5050" />
        </div>

        {/* Title */}
        <h1
          style={{
            color: '#C9A84C',
            fontSize: '22px',
            fontWeight: '800',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          Subscription Expired
        </h1>

        {/* Subtitle */}
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: '1.7', marginBottom: '8px' }}>
          Your plan expired on{' '}
          <span style={{ color: '#C9A84C', fontWeight: '600' }}>{expiryDate}</span>.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: '1.7', marginBottom: '32px' }}>
          Please contact support to renew your subscription and regain access to all features.
        </p>

        {/* Contact info */}
        <div
          style={{
            background: 'rgba(201,168,76,0.06)',
            border: '1px solid rgba(201,168,76,0.15)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', justifyContent: 'center' }}>
            <Phone size={14} color="#C9A84C" />
            <span style={{ color: '#C9A84C', fontSize: '13px', fontWeight: '600' }}>+91 98765 43210</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
            <Mail size={14} color="#C9A84C" />
            <span style={{ color: '#C9A84C', fontSize: '13px', fontWeight: '600' }}>support@jewlpos.in</span>
          </div>
        </div>

        {/* Retry button — only shown when online */}
        {isOnline ? (
          <button
            onClick={() => recheckPlan()}
            style={{
              background: 'linear-gradient(135deg, #C9A84C, #E8C96A)',
              color: '#000',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 32px',
              fontSize: '13px',
              fontWeight: '800',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto 16px',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(201,168,76,0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            <RefreshCw size={15} />
            Check Again
          </button>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginBottom: '16px' }}>
            🔴 No internet connection — connect to check plan status
          </p>
        )}

        <button
          onClick={() => signOut()}
          style={{
            background: 'transparent',
            color: 'rgba(255,255,255,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '10px 24px',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'color 0.2s',
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
