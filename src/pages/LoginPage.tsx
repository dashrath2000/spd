import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Gem, Eye, EyeOff, Mail, Lock, AlertCircle, Loader2, User, MapPin, Phone, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { indiaStatesAndDistricts } from '../utils/indiaStatesDistricts';

export const LoginPage = () => {
  const { signIn, signUp, loading, user, initialized } = useAuthStore();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  // Location States
  const [country] = useState('India');
  const [shopState, setShopState] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  // If already logged in, redirect to the app immediately
  useEffect(() => {
    if (initialized && user) {
      navigate('/pos', { replace: true });
    }
  }, [user, initialized, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        // Check plan from store state after login
        const p = useAuthStore.getState().profile;
        if (p?.plan === 'Trial' && p.planExpiry) {
          const daysLeft = Math.max(0, Math.ceil((new Date(p.planExpiry).getTime() - Date.now()) / 86400000));
          toast(`⏳ You are on a 15-day free trial. ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining.`, {
            duration: 6000,
            style: { background: '#1a1a1a', color: '#F5A623', border: '1px solid rgba(245,166,35,0.3)', fontWeight: 'bold', fontSize: '11px' }
          });
        } else {
          toast.success('Welcome back to Aurum!');
        }
        navigate('/pos', { replace: true });
      } else {
        if (!name.trim() || !shopName.trim()) {
          throw new Error('Please enter both your name and shop name.');
        }
        await signUp(email, password, name, shopName, { 
          country, 
          state: shopState, 
          district, 
          address, 
          phone 
        });
        toast(`🎉 Welcome! Your 15-day free trial has started. Enjoy full access!`, {
          duration: 8000,
          style: { background: '#1a1a1a', color: '#F5A623', border: '1px solid rgba(245,166,35,0.3)', fontWeight: 'bold', fontSize: '11px' }
        });
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setError('');
    setEmail('');
    setPassword('');
    setName('');
    setShopName('');
    setShopState('');
    setDistrict('');
    setAddress('');
    setPhone('');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#C9A84C]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#C9A84C]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C9A84C]/3 rounded-full blur-3xl" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(201,168,76,0.5) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(201,168,76,0.5) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-lg mx-4 py-12">
        {/* Gold accent border */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#C9A84C]/20 via-transparent to-[#C9A84C]/10 blur-sm" />

        <div className="relative bg-[#121212] border border-white/10 rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">

          {/* Logo + Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center mb-4 shadow-lg shadow-[#C9A84C]/10">
              <Gem size={28} className="text-[#C9A84C]" />
            </div>
            <h1 className="text-2xl font-bold text-[#C9A84C] tracking-widest uppercase font-serif">
              Aurum
            </h1>
            <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] font-black mt-1">
              Jewellery Shop POS
            </p>
            <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-[#C9A84C]/40 to-transparent mt-4" />
          </div>

          {/* Mode Title */}
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-white/90 uppercase tracking-widest text-sm">
              {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1 font-black">
              {mode === 'signin' ? 'Sign in to access your shop' : 'Set up your shop access'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-red-400 font-bold uppercase tracking-wide leading-relaxed">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                {/* Real Name */}
                <div className="relative">
                  <label className="block text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">
                    Executive Name
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                    <input
                      id="auth-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dashrath Prajapati"
                      required={mode === 'signup'}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/40 focus:bg-white/8 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Shop Name */}
                <div className="relative">
                  <label className="block text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">
                    Shop Name
                  </label>
                  <div className="relative">
                    <Gem size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                    <input
                      id="auth-shopname"
                      type="text"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. Aurum Jewels"
                      required={mode === 'signup'}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/40 focus:bg-white/8 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div className="relative">
                  <label className="block text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                    <input
                      id="auth-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      required={mode === 'signup'}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/40 focus:bg-white/8 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Country (Fixed) & State */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">
                      Country
                    </label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                      <input
                        id="auth-country"
                        type="text"
                        value={country}
                        disabled
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white/50 focus:outline-none focus:border-[#C9A84C]/40 focus:bg-white/8 transition-all duration-200"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">
                      State
                    </label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                      <select
                        id="auth-state"
                        value={shopState}
                        onChange={(e) => {
                          setShopState(e.target.value);
                          setDistrict('');
                        }}
                        required={mode === 'signup'}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]/40 focus:bg-white/8 transition-all duration-200 appearance-none"
                      >
                        <option value="" disabled>Select State</option>
                        {Object.keys(indiaStatesAndDistricts).map(state => (
                          <option key={state} value={state} className="text-black">{state}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-white/40">
                        <ChevronRight size={14} className="rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* District */}
                <div className="relative">
                  <label className="block text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">
                    District
                  </label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                    <select
                      id="auth-district"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      required={mode === 'signup'}
                      disabled={!shopState}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]/40 focus:bg-white/8 transition-all duration-200 appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>Select District</option>
                      {shopState && indiaStatesAndDistricts[shopState]?.map(dist => (
                        <option key={dist} value={dist} className="text-black">{dist}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-white/40">
                      <ChevronRight size={14} className="rotate-90" />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="relative">
                  <label className="block text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">
                    Shop Address
                  </label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-4 text-white/20" />
                    <textarea
                      id="auth-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Full shop address..."
                      required={mode === 'signup'}
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/40 focus:bg-white/8 transition-all duration-200 resize-none"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div className="relative">
              <label className="block text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@aurumjewels.com"
                  required
                  autoComplete="email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/40 focus:bg-white/8 transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div className="relative">
              <label className="block text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                  required
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-12 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/40 focus:bg-white/8 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#C9A84C] hover:bg-[#d4b55a] disabled:opacity-50 disabled:cursor-not-allowed text-[#0a0a0a] font-black uppercase tracking-widest text-[11px] py-4 rounded-xl transition-all duration-200 active:scale-[0.98] shadow-lg shadow-[#C9A84C]/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{mode === 'signin' ? 'Signing In...' : 'Creating Account...'}</span>
                </>
              ) : (
                <span>{mode === 'signin' ? 'Sign In to Shop' : 'Create Account'}</span>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <div className="w-full h-[1px] bg-white/5 mb-5" />
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-black">
              {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
            </p>
            <button
              id="auth-toggle-mode-btn"
              onClick={toggleMode}
              className="mt-2 text-[11px] text-[#C9A84C] hover:text-[#d4b55a] font-black uppercase tracking-widest transition-colors"
            >
              {mode === 'signin' ? 'Create New Account →' : '← Back to Sign In'}
            </button>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-[9px] text-white/15 uppercase tracking-widest font-black">
            Secured by Firebase Authentication
          </p>
        </div>
      </div>
    </div>
  );
};
