import { useNavigate } from 'react-router-dom';
import { 
  Gem, 
  Zap, 
  ShieldCheck, 
  ChevronRight, 
  Sparkles, 
  BarChart3, 
  Layers, 
  CheckCircle2
} from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#C9A84C]/30 selection:text-[#C9A84C]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center">
              <Gem size={20} className="text-[#C9A84C]" />
            </div>
            <span className="text-xl font-serif font-bold tracking-widest uppercase text-[#C9A84C]">Aurum</span>
          </div>
          
          <div className="hidden md:flex items-center gap-10">
            {['Collections', 'Vault', 'Intelligence', 'Pricing'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-[10px] uppercase font-black tracking-[0.2em] text-white/40 hover:text-[#C9A84C] transition-colors">
                {item}
              </a>
            ))}
          </div>

          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-[#C9A84C]/5 border border-[#C9A84C]/20 text-[#C9A84C] text-[10px] uppercase font-black tracking-widest rounded-full hover:bg-[#C9A84C] hover:text-[#0a0a0a] transition-all duration-300"
          >
            Access Vault
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-40 pb-32 px-8 overflow-hidden min-h-screen flex items-center">
        {/* Background Image with Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=2070" 
            alt="Luxury Jewelry" 
            className="w-full h-full object-cover opacity-40 scale-105 animate-slow-zoom"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 w-full text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8 backdrop-blur-md animate-fade-in-up">
            <Sparkles size={14} className="text-[#C9A84C]" />
            <span className="text-[10px] uppercase font-black tracking-widest text-white/60">The New Standard in Boutique Governance</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-serif font-bold tracking-tight mb-8 leading-[0.9] text-white animate-fade-in-up [animation-delay:200ms]">
            Exquisite <span className="text-[#C9A84C]">Precision</span> <br />
            For Modern <span className="italic">Ateliers</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg text-white/40 mb-12 font-light leading-relaxed animate-fade-in-up [animation-delay:400ms]">
            Step into a world where technology meets craftsmanship. Aurum provides the ultimate Point of Sale solution for luxury jewellery boutiques, engineered for security and elegance.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-in-up [animation-delay:600ms]">
            <button 
              onClick={() => navigate('/login')}
              className="group relative px-10 py-5 bg-[#C9A84C] text-[#0a0a0a] rounded-2xl overflow-hidden shadow-2xl shadow-[#C9A84C]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="relative z-10 flex items-center gap-3 font-black uppercase text-xs tracking-widest">
                Start Your Boutique <ChevronRight size={18} />
              </div>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
            </button>
            
            <button className="px-10 py-5 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-all font-black uppercase text-xs tracking-widest flex items-center gap-3">
              Explore Features
            </button>
          </div>
        </div>

        {/* Floating Decorative Elements */}
        <div className="absolute bottom-20 left-10 hidden lg:block animate-bounce-slow">
           <div className="p-8 bg-[#121212]/40 backdrop-blur-xl border border-white/5 rounded-[32px] shadow-2xl">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 bg-[#C9A84C]/20 rounded-full flex items-center justify-center text-[#C9A84C]">
                    <BarChart3 size={24} />
                 </div>
                 <div>
                    <p className="text-[10px] text-white/40 uppercase font-black">Net Growth</p>
                    <p className="text-2xl font-serif font-bold text-white">+142%</p>
                 </div>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                 <div className="w-[70%] h-full bg-[#C9A84C]" />
              </div>
           </div>
        </div>
      </header>

      {/* Features Grid */}
      <section id="collections" className="py-32 px-8 bg-[#0a0a0a] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C9A84C]/5 blur-[120px] rounded-full" />
        
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: Layers,
                title: 'Exquisite Inventory',
                description: 'Manage carats, grams, and stone settings with forensic accuracy. Every piece is tracked from vault to showcase.'
              },
              {
                icon: Zap,
                title: 'Real-time Intelligence',
                description: 'Metal prices synchronize instantly. Your margins are protected by live market data integration.'
              },
              {
                icon: ShieldCheck,
                title: 'Sovereign Security',
                description: 'End-to-end encryption for every transaction. Multi-tenant isolation ensures your data remains yours alone.'
              }
            ].map((f, i) => (
              <div key={i} className="group p-10 bg-[#121212] border border-white/5 rounded-[40px] hover:border-[#C9A84C]/30 transition-all duration-500">
                <div className="w-16 h-16 bg-[#C9A84C]/5 rounded-2xl flex items-center justify-center text-[#C9A84C] mb-8 group-hover:scale-110 transition-transform duration-500">
                  <f.icon size={32} />
                </div>
                <h3 className="text-2xl font-serif font-bold mb-4 tracking-tight group-hover:text-[#C9A84C] transition-colors">{f.title}</h3>
                <p className="text-white/40 leading-relaxed text-sm">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interface Preview */}
      <section id="vault" className="py-32 px-8 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="relative group">
                 <div className="absolute inset-0 bg-[#C9A84C]/10 blur-[100px] rounded-full transition-opacity opacity-50 group-hover:opacity-100" />
                 <img 
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2070" 
                    alt="Aurum Interface" 
                    className="relative z-10 w-full rounded-[40px] border border-white/10 shadow-2xl transition-transform group-hover:scale-[1.02] duration-700"
                 />
              </div>
              
              <div className="space-y-12">
                 <div>
                    <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6 tracking-tight">
                       The <span className="text-[#C9A84C]">Dashboard</span> <br />
                       Of Excellence.
                    </h2>
                    <p className="text-lg text-white/40 font-light leading-relaxed">
                       Designed for high-performance boutiques. Access key metrics, inventory status, and sales reports in one elegant sanctuary.
                    </p>
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {[
                       { title: 'Global Sync', desc: 'All boutiques in one view' },
                       { title: 'Statutory GST', desc: 'Compliant tax engineering' },
                       { title: 'Member Loyalty', desc: 'Advanced affinity programs' },
                       { title: 'Secure Backup', desc: 'Encrypted state snapshots' }
                    ].map((item, i) => (
                       <div key={i} className="flex gap-4">
                          <CheckCircle2 className="text-[#C9A84C] flex-shrink-0" size={20} />
                          <div>
                             <h4 className="text-[10px] uppercase font-black tracking-widest text-white mb-1">{item.title}</h4>
                             <p className="text-xs text-white/30">{item.desc}</p>
                          </div>
                       </div>
                    ))}
                 </div>

                 <button 
                  onClick={() => navigate('/login')}
                  className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] uppercase font-black tracking-widest hover:bg-[#C9A84C] hover:text-[#0a0a0a] transition-all"
                 >
                    Request Demo Access
                 </button>
              </div>
           </div>
        </div>
      </section>

      {/* Pricing Mockup */}
      <section id="pricing" className="py-32 px-8">
         <div className="max-w-3xl mx-auto text-center mb-20">
            <h2 className="text-4xl font-serif font-bold mb-6 tracking-tight">Tailored for <span className="text-[#C9A84C]">Scale</span></h2>
            <p className="text-white/40 font-light">From individual boutiques to global jewellery chains.</p>
         </div>
         
         <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-12 bg-[#121212] border border-white/5 rounded-[48px] relative overflow-hidden group">
               <div className="relative z-10">
                  <h3 className="text-xl font-serif font-bold mb-2">Boutique Solo</h3>
                  <div className="flex items-baseline gap-1 mb-8">
                     <span className="text-4xl font-black text-[#C9A84C]">₹2,499</span>
                     <span className="text-white/20 text-xs uppercase font-black tracking-widest">/ month</span>
                  </div>
                  <ul className="space-y-4 mb-12">
                     {['Single Terminal', 'Unlimited Inventory', 'GST Ready', 'Basic Reports'].map(li => (
                        <li key={li} className="flex items-center gap-3 text-white/40 text-xs uppercase font-black tracking-widest border-b border-white/5 pb-4">
                           <ChevronRight size={14} className="text-[#C9A84C]" /> {li}
                        </li>
                     ))}
                  </ul>
                  <button onClick={() => navigate('/login')} className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] uppercase font-black tracking-widest group-hover:bg-white group-hover:text-[#0a0a0a] transition-all">Start Free Trial</button>
               </div>
            </div>

            <div className="p-12 bg-[#C9A84C] text-[#0a0a0a] rounded-[48px] relative overflow-hidden group shadow-2xl shadow-[#C9A84C]/20">
               <div className="absolute top-0 right-0 p-8 opacity-20"><Zap size={100} /></div>
               <div className="relative z-10">
                  <h3 className="text-xl font-serif font-bold mb-2">Heritage Enterprise</h3>
                  <div className="flex items-baseline gap-1 mb-8">
                     <span className="text-4xl font-black">₹9,999</span>
                     <span className="text-[#0a0a0a]/40 text-xs uppercase font-black tracking-widest">/ month</span>
                  </div>
                  <ul className="space-y-4 mb-12 text-[#0a0a0a]">
                     {['Multi-Store Sync', 'Advanced Analytics', 'Loyalty Engine', 'Dedicated Support'].map(li => (
                        <li key={li} className="flex items-center gap-3 text-xs uppercase font-black tracking-widest border-b border-[#0a0a0a]/10 pb-4">
                           <CheckCircle2 size={16} /> {li}
                        </li>
                     ))}
                  </ul>
                  <button onClick={() => navigate('/login')} className="w-full py-5 bg-[#0a0a0a] text-white rounded-2xl text-[10px] uppercase font-black tracking-widest shadow-xl">Contact Sales</button>
               </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-3">
              <Gem size={24} className="text-[#C9A84C]" />
              <span className="text-2xl font-serif font-bold tracking-tighter text-white">AURUM.</span>
            </div>
            <p className="text-[10px] uppercase font-black tracking-widest text-white/20">© 2026 Aurum Boutique Systems • v.10.4.0</p>
          </div>
          
          <div className="flex gap-12">
            <div className="space-y-4">
               <p className="text-[10px] uppercase font-black tracking-widest text-white/60">Technology</p>
               <ul className="space-y-2 text-[10px] uppercase font-black tracking-widest text-white/20">
                  <li>Cloud Vault</li>
                  <li>Metal Sync</li>
                  <li>Encryption</li>
               </ul>
            </div>
            <div className="space-y-4">
               <p className="text-[10px] uppercase font-black tracking-widest text-white/60">Company</p>
               <ul className="space-y-2 text-[10px] uppercase font-black tracking-widest text-white/20">
                  <li>Heritage</li>
                  <li>Atelier</li>
                  <li>Privacy</li>
               </ul>
            </div>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slow-zoom {
          0% { transform: scale(1.05); }
          100% { transform: scale(1.15); }
        }
        .animate-slow-zoom {
          animation: slow-zoom 20s ease-in-out infinite alternate;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 6s ease-in-out infinite;
        }
      `}} />
    </div>
  );
};
