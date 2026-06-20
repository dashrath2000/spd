import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Gem, Loader2, Mail, RefreshCw, LogOut, Phone, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';
import type { UserRole } from '../../types';
import { auth } from '../../lib/firebase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, profile, initialized, reloadUser, resendVerification, signOut, loading } = useAuthStore();
  const [cooldown, setCooldown] = useState(0);
  console.log(profile, 'profileprofile')
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Show a full-screen loading spinner while Firebase checks auth state
  // This prevents a flash of the login page on page refresh
  if (!initialized) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center animate-pulse">
          <Gem size={24} className="text-[#C9A84C]" />
        </div>
        <Loader2 size={20} className="text-[#C9A84C]/50 animate-spin" />
        <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-black">
          Verifying Access...
        </p>
      </div>
    );
  }

  // If not logged in → go to login page
  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!user.emailVerified) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C9A84C]/5 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(201,168,76,0.5) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(201,168,76,0.5) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative bg-[#121212] border border-white/10 rounded-3xl p-10 max-w-lg w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#C9A84C]/10">
            <Mail size={36} className="text-[#C9A84C]" />
          </div>

          <h2 className="text-3xl font-serif font-black text-[#C9A84C] tracking-tight mb-2 uppercase">
            Verify Origin
          </h2>
          <p className="text-[11px] text-luxury-text uppercase tracking-widest font-black mb-8 leading-relaxed">
            Vault access requires communication protocol verification. A secure transmission was sent to <strong className="text-white bg-white/5 px-2 py-1 rounded inline-block mt-2 lowercase">{user.email}</strong>.
          </p>

          <div className="space-y-4">
            <Button
              className="w-full h-14 bg-[#C9A84C] hover:bg-[#d4b55a] text-[#0a0a0a] font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-[#C9A84C]/10"
              onClick={async () => {
                await reloadUser();
                // user state is updated asynchronously via Zustand, 
                // but checking the direct firebase auth.currentUser object here for immediate result to avoid stale closure state
                if (auth.currentUser?.emailVerified) {
                  toast.success("Security protocol verified. Access granted.");
                } else {
                  toast.error("Transmission unverified. Check your inbox.");
                }
              }}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              I Have Verified My Email
            </Button>

            <Button
              variant="outline"
              className="w-full h-14 border-white/10 text-white hover:bg-white/5 hover:text-white font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
              onClick={async () => {
                if (cooldown > 0) return;
                try {
                  await resendVerification();
                  setCooldown(15);
                  toast.success("Secure transmission resent.");
                } catch (err: unknown) {
                  toast.error((err as Error).message || "Failed to resend email.");
                }
              }}
              disabled={loading || cooldown > 0}
            >
              {cooldown > 0 ? `Resend Available In ${cooldown}s` : 'Resend Verification Link'}
            </Button>

            <button
              onClick={() => signOut()}
              className="text-[10px] uppercase font-black tracking-widest text-red-400 hover:text-red-300 mt-6 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <LogOut size={14} />
              Abort and Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Plan expiry check (applies to all users)
  if (profile.planExpiry) {
    const now = new Date();
    const expiry = new Date(profile.planExpiry);
    const isExpired = expiry < now;
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const renewalNumber = "+91 8955126172";

    if (isExpired) {
      const isTrial = profile.plan === 'Trial';
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/5 rounded-full blur-[120px]" />
            <div
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage: `linear-gradient(rgba(239,68,68,0.5) 1px, transparent 1px),
                                 linear-gradient(90deg, rgba(239,68,68,0.5) 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
              }}
            />
          </div>

          <div className="relative bg-[#0d0d0d] border border-red-500/20 rounded-[40px] p-12 max-w-xl w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.1)]">
            <div className="w-24 h-24 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-center justify-center mx-auto mb-8 relative">
              <ShieldAlert size={48} className="text-red-500" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />
            </div>

            <h2 className="text-4xl font-serif font-black text-white tracking-tight mb-4 uppercase">
              {isTrial ? 'Trial Finished' : 'Plan Expired'}
            </h2>
            
            <p className="text-sm text-white/80 font-medium mb-6 leading-relaxed max-w-sm mx-auto">
              {isTrial 
                ? 'Your 15-day free trial has ended. We hope you enjoyed the Aurum experience! Please contact us to upgrade to a premium plan.'
                : `Your ${profile.plan || 'Premium'} membership has expired. Please renew your plan to restore access to your shop records.`}
            </p>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-10">
              <p className="text-[10px] uppercase font-black tracking-[0.3em] text-white/40 mb-3">Renewal Support Line</p>
              <a 
                href={`tel:${renewalNumber}`}
                className="text-2xl font-mono font-black text-[#C9A84C] hover:text-[#d4b55a] transition-colors flex items-center justify-center gap-3"
              >
                <Phone size={20} />
                {renewalNumber}
              </a>
            </div>

            <div className="flex flex-col gap-4">
              <a 
                href={`tel:${renewalNumber}`}
                className="w-full h-14 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl transition-all shadow-xl shadow-red-600/20 flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Renew Subscription Now
              </a>
              
              <button
                onClick={() => signOut()}
                className="text-[10px] uppercase font-black tracking-widest text-white/20 hover:text-white/60 transition-colors flex items-center justify-center gap-2 mt-4"
              >
                <LogOut size={14} /> Close Session
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Show a trial warning banner (last 3 days)
    if (profile.plan === 'Trial' && daysLeft <= 3) {
      return (
        <>
          <div className="w-full bg-amber-500/10 border-b border-amber-500/20 py-2 px-6 flex items-center justify-center gap-2 text-amber-400 text-[10px] uppercase font-black tracking-widest">
            ⚠ Trial expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''} — Contact your admin to renew.
          </div>
          {children}
        </>
      );
    }
  }

  // User is authenticated → render the page
  return <>{children}</>;
};
