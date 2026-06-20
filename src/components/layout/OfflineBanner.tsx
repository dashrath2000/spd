import { WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useAuthStore } from '../../store/authStore';
import { useEffect } from 'react';

/**
 * Thin banner shown at the top of the app when offline.
 * Auto-hides when internet is restored.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const { recheckPlan } = useAuthStore();

  useEffect(() => {
    if (!isOnline) {
      document.documentElement.style.setProperty('--banner-height', '36px');
    } else {
      document.documentElement.style.setProperty('--banner-height', '0px');
    }
    return () => {
      document.documentElement.style.setProperty('--banner-height', '0px');
    };
  }, [isOnline]);

  if (isOnline) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '36px',
        zIndex: 99998,
        background: 'rgba(20,10,0,0.95)',
        borderBottom: '1px solid rgba(255,140,0,0.3)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '0 16px',
        animation: 'slideDown 0.3s ease',
      }}
    >
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .offline-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ff6b35;
          box-shadow: 0 0 0 0 rgba(255,107,53,0.4);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255,107,53,0.4); }
          70% { box-shadow: 0 0 0 8px rgba(255,107,53,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,107,53,0); }
        }
      `}</style>

      <div className="offline-pulse" />
      <WifiOff size={13} color="#ff8c35" />
      <span
        style={{
          color: '#ff8c35',
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Offline Mode — All data saved locally
      </span>

      <button
        onClick={() => recheckPlan()}
        title="Try reconnecting"
        style={{
          background: 'transparent',
          border: '1px solid rgba(255,140,53,0.3)',
          borderRadius: '6px',
          color: '#ff8c35',
          cursor: 'pointer',
          padding: '3px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '10px',
          marginLeft: '8px',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,140,53,0.1)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        }}
      >
        <RefreshCw size={10} />
        Retry
      </button>
    </div>
  );
}
