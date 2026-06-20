import { useState, useRef, useEffect } from 'react';
import {
   Settings,
   Phone,
   Mail,
   Percent,
   Award,
   Trash2,
   HardDriveDownload,
   CloudUpload,
   ChevronRight,
   ShieldCheck,
   Zap,
   Gem,
   CreditCard,
   Sparkles,
   Users,
   Tag,
   Plus,
   X,
   Receipt,
   type LucideIcon
} from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { firestoreService } from '../lib/firestoreService';
import { localDB } from '../lib/localDB';
import { useAuthStore } from '../store/authStore';
import { firebaseConfig } from '../lib/firebase';
import type { UserProfile, UserRole } from '../types';
import { Button, cn } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { indiaStatesAndDistricts } from '../utils/indiaStatesDistricts';

export const SettingsPage = () => {
   const { settings, updateSettings } = useSettingsStore();
   const { profile } = useAuthStore();
   const [activeTab, setActiveTab] = useState<'General' | 'Security' | 'Taxonomy' | 'Loyalty' | 'System' | 'Subscription' | 'Staff' | 'Catalog' | 'Bill'>('General');
   const [newCategory, setNewCategory] = useState('');
   const [isProcessing, setIsProcessing] = useState(false);
   const [staffList, setStaffList] = useState<UserProfile[]>([]);
   const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', role: 'cashier' as UserRole, assignedBranchId: '' });
   const fileInputRef = useRef<HTMLInputElement>(null);
   const logoInputRef = useRef<HTMLInputElement>(null);

   useEffect(() => {
      if (activeTab === 'Staff' && profile?.tenantId) {
         firestoreService.getGlobalCollection<UserProfile>('user_profiles').then(allUsers => {
            setStaffList(allUsers.filter(u => u.tenantId === profile.tenantId));
         });
      }
   }, [activeTab, profile?.tenantId]);

   const handleCreateStaff = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!profile?.tenantId) return;
      setIsProcessing(true);
      try {
         const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               email: newStaff.email,
               password: newStaff.password,
               returnSecureToken: true
            })
         });
         const data = await res.json();
         if (data.error) {
            throw new Error(data.error.message);
         }
         const newUid = data.localId;

         const newUserProfile: UserProfile = {
            uid: newUid,
            tenantId: profile.tenantId,
            assignedBranchId: newStaff.assignedBranchId || undefined,
            role: newStaff.role,
            name: newStaff.name,
            email: newStaff.email,
            createdAt: new Date().toISOString()
         };

         await firestoreService.setGlobalDocument('user_profiles', newUid, newUserProfile);
         setStaffList([...staffList, newUserProfile]);
         setNewStaff({ name: '', email: '', password: '', role: 'cashier', assignedBranchId: '' });
         alert('Staff created successfully');
      } catch (err) {
         const error = err as Error;
         alert(error.message || 'Failed to create staff');
      }
      setIsProcessing(false);
   };

   const handleRemoveStaff = async (uid: string) => {
      if (confirm('Are you sure you want to revoke access?')) {
         await firestoreService.deleteGlobalDocument('user_profiles', uid);
         setStaffList(staffList.filter(s => s.uid !== uid));
      }
   };


   const handleExport = async () => {
      try {
         setIsProcessing(true);
         const data = await localDB.exportAll();
         const exportData = {
            ...data,
            timestamp: new Date().toISOString(),
            version: '10.4.0',
         };

         const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `jewl-pos-manifest-${new Date().toISOString().split('T')[0]}.json`;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
      } catch (error) {
         console.error('Export failed:', error);
         alert('Failed to export data. Check console for details.');
      } finally {
         setIsProcessing(false);
      }
   };

   const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
         try {
            setIsProcessing(true);
            const jsonStr = event.target?.result as string;
            const data = JSON.parse(jsonStr);

            if (!data.settings && !data.products && !data.customers && !data.sales) {
               throw new Error('Invalid manifest file format.');
            }

            if (confirm('WARNING: Synchronizing this manifest will overwrite all current vault data. This action is irreversible. Proceed?')) {
               const collections = [
                  'settings',
                  'products',
                  'customers',
                  'sales',
                  'girvis',
                  'daybook',
                  'sales_orders',
                  'purchase_orders',
                  'suppliers',
                  'karigars',
                  'karigar_transactions',
                  'old_gold_purchases',
                  'owner_loans',
                  'karigar_orders'
               ] as const;

               for (const col of collections) {
                  if (data[col] && Array.isArray(data[col])) {
                     // Clear existing
                     const existingDocs = await localDB.getAllDocuments(col);
                     for (const doc of existingDocs) {
                        if ((doc as { id?: string }).id) {
                           await localDB.deleteDocument(col, (doc as { id?: string }).id!);
                        }
                     }
                     // Set new
                     for (const item of data[col]) {
                        if (item.id) {
                           const id = item.id;
                           const itemCopy = { ...item };
                           delete itemCopy.id;
                           await localDB.setDocument(col, id, itemCopy);
                        }
                     }
                  }
               }

               alert('Manifest restoration successful! Vault state has been synchronized. System will reboot.');
               window.location.reload();
            }
         } catch (error) {
            console.error('Import failed:', error);
            alert('Restoration failed: ' + (error as Error).message);
         } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
         }
      };
      reader.readAsText(file);
   };

   const handleWipeDatabase = async () => {
      if (confirm('CAUTION: This will purge ALL transactions, customers, inventory, orders, daybook entries, and old gold buybacks permanently. Are you absolutely sure?!')) {
         try {
            setIsProcessing(true);
            const collections = [
               'products',
               'customers',
               'sales',
               'girvis',
               'daybook',
               'sales_orders',
               'purchase_orders',
               'suppliers',
               'karigars',
               'karigar_transactions',
               'old_gold_purchases',
               'owner_loans',
               'karigar_orders'
            ] as const;
            for (const col of collections) {
               const docs = await localDB.getAllDocuments(col);
               for (const doc of docs) {
                  if ((doc as { id?: string }).id) {
                     await localDB.deleteDocument(col, (doc as { id?: string }).id!);
                  }
               }
            }
            alert('Vault transaction data successfully purged while keeping your shop details intact. Reloading workspace.');
            window.location.reload();
         } catch (e) {
            const err = e as Error;
            alert('Failed to clear database: ' + err.message);
         } finally {
            setIsProcessing(false);
         }
      }
   };

   const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
         alert('File size exceeds 5MB limit.');
         return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
         const base64 = event.target?.result as string;
         updateSettings({ logo: base64 });
      };
      reader.readAsDataURL(file);
   };



   const tabs: { id: typeof activeTab, icon: LucideIcon, label: string }[] = [
      { id: 'General', icon: Settings, label: 'Identity' },
      { id: 'Staff', icon: Users, label: 'Crew' },
      { id: 'Taxonomy', icon: Percent, label: 'Rate Change' },
      { id: 'Catalog', icon: Tag, label: 'Inventory Core' },
      { id: 'Loyalty', icon: Award, label: 'Affinity' },
      { id: 'Bill', icon: Receipt, label: 'Bill Settings' },
      { id: 'Subscription', icon: CreditCard, label: 'Membership' },
      { id: 'System', icon: Zap, label: 'Protocols' }
   ];

   return (
      <div className="space-y-12 animate-fade-in pb-20 max-w-6xl mx-auto">
         <div className="flex items-end justify-between">
            <div>
               <div className="flex items-center gap-3 mb-2">
                  <ChevronRight size={16} className="text-gold-400" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-luxury-text-muted">Management Core</p>
               </div>
               <h1 className="text-4xl font-serif font-black text-luxury-text tracking-tight leading-none">
                  System <span className="text-gold-400">Governance</span>
               </h1>
            </div>
            <div className="flex gap-4 p-2 bg-luxury-surface border border-luxury-border rounded-2xl">
               <Button variant="outline" className="border-0 bg-transparent text-luxury-text-muted hover:text-gold-400 text-[10px] uppercase font-black tracking-widest px-6 h-10 shadow-none hover:shadow-none">View System Logs</Button>
               <div className="w-[1px] h-6 bg-luxury-border self-center" />
               <Button
                  variant="outline"
                  className="border-0 bg-transparent text-luxury-text-muted hover:text-red-400 text-[10px] uppercase font-black tracking-widest px-6 h-10 shadow-none hover:shadow-none"
                  disabled={isProcessing}
                  onClick={async () => {
                     if (confirm('CAUTION: This will purge all products, customers, transactions, orders, daybook entries, and sales history while preserving your shop profile, logo, settings, and staff. Continue?')) {
                        setIsProcessing(true);
                        try {
                           const collections = [
                              'products',
                              'customers',
                              'sales',
                              'girvis',
                              'daybook',
                              'sales_orders',
                              'purchase_orders',
                              'suppliers',
                              'karigars',
                              'karigar_transactions',
                              'old_gold_purchases',
                              'owner_loans',
                              'karigar_orders'
                           ] as const;
                           for (const col of collections) {
                              const docs = await localDB.getAllDocuments(col);
                              for (const doc of docs) {
                                 if ((doc as { id?: string }).id) {
                                    await localDB.deleteDocument(col, (doc as { id?: string }).id!);
                                 }
                              }
                           }
                           alert('Vault transaction data successfully purged while keeping your shop details intact. Workspace rebooting...');
                           window.location.reload();
                        } catch (e) {
                           const err = e as Error;
                           alert('Failed to reset: ' + err.message);
                        } finally {
                           setIsProcessing(false);
                        }
                     }
                  }}
               >
                  {isProcessing ? 'Resetting...' : 'Reset Environment'}
               </Button>
            </div>
         </div>

         <div className="grid grid-cols-12 gap-12">
            {/* Vertical Navigation Bar */}
            <div className="col-span-3 space-y-3">
               {tabs.map(tab => (
                  <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id)}
                     className={cn(
                        'w-full flex items-center gap-4 px-6 py-5 rounded-3xl transition-all border group',
                        activeTab === tab.id
                           ? 'bg-gold-500/10 border-gold-400/30 text-gold-400 shadow-[0_10px_30px_rgba(201,168,76,0.1)]'
                           : 'bg-luxury-surface border-transparent text-luxury-text-muted hover:bg-luxury-surface/80 hover:text-luxury-text'
                     )}
                  >
                     <tab.icon size={22} className={activeTab === tab.id ? 'animate-pulse' : 'opacity-40 group-hover:opacity-100'} />
                     <span className="font-serif font-black text-lg tracking-tight">{tab.label}</span>
                     {activeTab === tab.id && <div className="ml-auto w-2 h-2 rounded-full bg-gold-400 shadow-lg shadow-gold-500/50" />}
                  </button>
               ))}

               <div className="mt-20 p-8 card-luxury bg-gold-600/5 border-gold-400/20 text-center">
                  <Gem className="mx-auto text-gold-400/20 mb-4" size={48} />
                  <p className="text-[10px] uppercase font-black tracking-widest text-gold-400 leading-relaxed mb-4">Enterprise Encryption Active</p>
                  <Badge variant="outline" className="text-[8px] border-gold-400/10">v.10.4.0</Badge>
               </div>
            </div>

            {/* Settings Form Work Area */}
            <div className="col-span-9 bg-luxury-input border border-luxury-border rounded-[40px] p-12 shadow-inner relative overflow-hidden flex flex-col min-h-[700px]">
               {/* Background Aesthetic */}
               <div className="absolute top-0 right-0 p-8 opacity-5 font-serif font-black text-6xl pointer-events-none select-none italic text-gold-400">{activeTab}</div>
               <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gold-400/5 blur-[100px] rounded-full pointer-events-none" />

               <div className="relative z-10 flex-1 flex flex-col gap-12 animate-fade-in" key={activeTab}>
                  {activeTab === 'General' && (
                     <div className="space-y-12">
                        <div className="grid grid-cols-2 gap-12">
                           <div className="space-y-8">
                              <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted border-l-2 border-gold-400 pl-4 py-1">Business Identity</h4>
                              <div className="space-y-6">
                                 <Input label="Shop Name" value={settings.shopName} onChange={(e) => updateSettings({ shopName: e.target.value })} leftIcon={<Gem size={18} />} className="h-14 font-serif text-lg font-black text-gold-400" />
                                 <Input label="Executive Agent" value={settings.ownerName} onChange={(e) => updateSettings({ ownerName: e.target.value })} className="h-14" />
                                 <Input label="Shop GSTIN (Rate Change)" value={settings.gstin} onChange={(e) => updateSettings({ gstin: e.target.value })} className="h-14 uppercase tracking-widest" />
                              </div>
                           </div>
                           <div className="space-y-8">
                              <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted border-l-2 border-gold-400 pl-4 py-1">Digital Presence</h4>
                              <div className="space-y-6 flex flex-col">
                                 <Input label="Phone Portal" value={settings.phone} onChange={(e) => updateSettings({ phone: e.target.value })} leftIcon={<Phone size={18} />} className="h-14 font-mono font-bold tracking-tight" />
                                 <Input label="Secure Email" value={settings.email} onChange={(e) => updateSettings({ email: e.target.value })} leftIcon={<Mail size={18} />} className="h-14 italic" />
                                 <div className="grid grid-cols-3 gap-4">
                                    <Input label="Country" value={settings.country || ''} onChange={(e) => updateSettings({ country: e.target.value })} className="h-14" />
                                    <div className="space-y-1.5 flex flex-col pt-1">
                                       <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted ml-4">State</label>
                                       <div className="relative">
                                          <select
                                             value={settings.state || ''}
                                             onChange={(e) => updateSettings({ state: e.target.value, district: '' })}
                                             className="w-full h-14 bg-luxury-black border-2 border-luxury-border rounded-2xl px-4 text-luxury-text font-medium text-sm focus:border-gold-400/40 outline-none transition-all appearance-none"
                                          >
                                             <option value="" disabled className="bg-luxury-black text-luxury-text">Select State</option>
                                             {Object.keys(indiaStatesAndDistricts).map(state => (
                                                <option key={state} value={state} className="bg-luxury-black text-luxury-text">{state}</option>
                                             ))}
                                          </select>
                                          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-luxury-text-muted">
                                             <ChevronRight size={16} className="rotate-90" />
                                          </div>
                                       </div>
                                    </div>
                                    <div className="space-y-1.5 flex flex-col pt-1">
                                       <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted ml-4">District</label>
                                       <div className="relative">
                                          <select
                                             value={settings.district || ''}
                                             onChange={(e) => updateSettings({ district: e.target.value })}
                                             disabled={!settings.state}
                                             className="w-full h-14 bg-luxury-black border-2 border-luxury-border rounded-2xl px-4 text-luxury-text font-medium text-sm focus:border-gold-400/40 outline-none transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                             <option value="" disabled className="bg-luxury-black text-luxury-text">Select District</option>
                                             {settings.state && indiaStatesAndDistricts[settings.state]?.map(dist => (
                                                <option key={dist} value={dist} className="bg-luxury-black text-luxury-text">{dist}</option>
                                             ))}
                                          </select>
                                          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-luxury-text-muted">
                                             <ChevronRight size={16} className="rotate-90" />
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="col-span-12 space-y-1.5 flex flex-col">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Shop Address</label>
                                    <textarea
                                       className="w-full h-24 bg-luxury-black border-2 border-luxury-border rounded-2xl p-4 outline-none focus:border-gold-400/40 text-luxury-text font-medium text-sm transition-all shadow-inner"
                                       value={settings.address}
                                       onChange={(e) => updateSettings({ address: e.target.value })}
                                    />
                                 </div>
                                 <div className="col-span-12 space-y-1.5 flex flex-col">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">GoldAPI.io Access Token</label>
                                    <input
                                       type="password"
                                       className="w-full h-14 bg-luxury-black border-2 border-luxury-border rounded-2xl px-4 text-luxury-text font-medium text-sm focus:border-gold-400/40 outline-none transition-all"
                                       placeholder="Enter your GoldAPI.io Key for live metal rates..."
                                       value={settings.goldApiKey || ''}
                                       onChange={(e) => updateSettings({ goldApiKey: e.target.value })}
                                    />
                                    <p className="text-[10px] text-luxury-text-dim pt-1">Get your free API key from <a href="https://goldapi.io" target="_blank" rel="noreferrer" className="text-gold-400 hover:underline">goldapi.io</a> to fetch live current market prices.</p>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="pt-8 mt-8 border-t border-luxury-border space-y-6">
                           <div className="flex justify-between items-center">
                              <div>
                                 <h4 className="text-xl font-serif font-bold text-luxury-text mb-1">Operating Branches</h4>
                                 <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Manage your physical store locations</p>
                              </div>
                           </div>
                           <div className="space-y-4">
                              {settings.branches?.map((branch, i) => (
                                 <div key={branch.id} className="p-6 bg-luxury-surface border border-luxury-border rounded-2xl flex gap-6 items-center group">
                                    <div className="flex-1 space-y-2">
                                       <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Branch ID / Name</label>
                                       <input value={branch.name} onChange={e => { const newB = [...(settings.branches || [])]; newB[i].name = e.target.value; updateSettings({ branches: newB }); }} className="w-full h-12 bg-luxury-black border-2 border-luxury-border rounded-xl px-4 text-luxury-text text-sm focus:border-gold-400/40 outline-none transition-all" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                       <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Physical Address</label>
                                       <input value={branch.address} onChange={e => { const newB = [...(settings.branches || [])]; newB[i].address = e.target.value; updateSettings({ branches: newB }); }} className="w-full h-12 bg-luxury-black border-2 border-luxury-border rounded-xl px-4 text-luxury-text text-sm focus:border-gold-400/40 outline-none transition-all" />
                                    </div>
                                    {!branch.isPrimary && (
                                       <button onClick={() => updateSettings({ branches: settings.branches?.filter(b => b.id !== branch.id) })} className="mt-6 p-3 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                          <Trash2 size={20} />
                                       </button>
                                    )}
                                 </div>
                              ))}
                           </div>
                        </div>

                        <div
                           onClick={() => logoInputRef.current?.click()}
                           className="p-8 bg-gold-400 rounded-3xl flex items-center justify-between shadow-2xl shadow-gold-400/20 group cursor-pointer transition-transform hover:scale-[1.01]"
                        >
                           <input
                              type="file"
                              ref={logoInputRef}
                              onChange={handleLogoUpload}
                              accept="image/*"
                              className="hidden"
                           />
                           <div className="flex gap-6 items-center">
                              <div className="w-16 h-16 bg-luxury-black rounded-2xl flex items-center justify-center text-gold-400 shadow-xl border border-gold-400/20 transition-transform group-hover:rotate-12 overflow-hidden">
                                 {settings.logo ? (
                                    <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
                                 ) : (
                                    <CloudUpload size={24} />
                                 )}
                              </div>
                              <div>
                                 <p className="text-luxury-black font-black uppercase text-xl font-serif tracking-tight mb-1">
                                    {settings.logo ? 'Update Brand Iconography' : 'Upload Brand Iconography'}
                                 </p>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-luxury-black/40">SVG, PNG allowed • Max size 5mb • Preferred aspect 1:1</p>
                              </div>
                           </div>
                           <ChevronRight size={32} className="text-luxury-black/20" />
                        </div>
                     </div>
                  )}

                  {activeTab === 'Staff' && (
                     <div className="space-y-12">
                        <div className="grid grid-cols-2 gap-12">
                           <div className="space-y-8">
                              <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted border-l-2 border-gold-400 pl-4 py-1">Add Crew Member</h4>
                              <form onSubmit={handleCreateStaff} className="space-y-6">
                                 <Input label="Full Name" value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} className="h-14" required />
                                 <Input label="Email Address" type="email" value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} className="h-14" required />
                                 <Input label="Temporary Password" type="password" value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} className="h-14" required minLength={6} />
                                 <div>
                                    <label className="block text-[10px] uppercase font-black tracking-widest text-luxury-text-muted mb-2">Assign Role</label>
                                    <select
                                       className="w-full bg-luxury-black border-2 border-luxury-border rounded-2xl h-14 px-4 outline-none focus:border-gold-400/40 text-luxury-text font-medium text-sm transition-all mb-4"
                                       value={newStaff.role}
                                       onChange={e => setNewStaff({ ...newStaff, role: e.target.value as UserRole })}
                                    >
                                       <option value="cashier" className="bg-luxury-black text-luxury-text">Cashier (POS & Sales only)</option>
                                       <option value="manager" className="bg-luxury-black text-luxury-text">Manager (Inventory & Reports)</option>
                                       <option value="admin" className="bg-luxury-black text-luxury-text">Admin (Full Access)</option>
                                    </select>

                                    <label className="block text-[10px] uppercase font-black tracking-widest text-luxury-text-muted mb-2">Assign Branch Context</label>
                                    <select
                                       className="w-full bg-luxury-black border-2 border-luxury-border rounded-2xl h-14 px-4 outline-none focus:border-gold-400/40 text-luxury-text font-medium text-sm transition-all"
                                       value={newStaff.assignedBranchId}
                                       onChange={e => setNewStaff({ ...newStaff, assignedBranchId: e.target.value })}
                                    >
                                       <option value="" className="bg-luxury-black text-luxury-text">All Branches (Global Access) *</option>
                                       {settings.branches?.map(b => (
                                          <option key={b.id} value={b.id} className="bg-luxury-black text-luxury-text">{b.name}</option>
                                       ))}
                                    </select>
                                    <p className="text-[10px] text-luxury-text-dim hidden">* Global access ignores branch restrictions (typically for Admins)</p>
                                 </div>
                                 <Button type="submit" disabled={isProcessing} className="w-full h-14 bg-gold-400 text-luxury-black hover:bg-gold-500 font-black tracking-widest text-[10px] uppercase">
                                    {isProcessing ? 'Registering...' : 'Create Staff Member'}
                                 </Button>
                              </form>
                           </div>

                           <div className="space-y-8 h-full">
                              <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted border-l-2 border-gold-400 pl-4 py-1">Active Crew</h4>
                              <div className="space-y-4">
                                 {staffList.length === 0 ? (
                                    <p className="text-luxury-text-muted text-xs p-4 bg-luxury-surface rounded-xl border border-luxury-border">No additional staff members found.</p>
                                 ) : (
                                    staffList.map(staff => (
                                       <div key={staff.uid} className="p-4 bg-luxury-surface border border-luxury-border rounded-2xl flex items-center justify-between group">
                                          <div>
                                             <p className="font-bold text-luxury-text text-sm">{staff.name} <span className="text-gold-400 text-xs ml-2">({staff.role})</span></p>
                                             <p className="text-xs text-luxury-text-muted mt-1">{staff.email}</p>
                                          </div>
                                          {staff.uid !== profile?.uid && (
                                             <button onClick={() => handleRemoveStaff(staff.uid)} className="p-2 text-red-400/50 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                             </button>
                                          )}
                                       </div>
                                    ))
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {activeTab === 'Security' && (
                     <div className="space-y-12">
                        <div className="p-10 card-luxury bg-red-400/5 border-red-500/10 flex flex-col items-center text-center">
                           <Trash2 className="text-red-400/30 mb-6" size={64} />
                           <h4 className="text-2xl font-serif font-black text-red-400 mb-4">Initialize Data Wipe</h4>
                           <p className="text-xs uppercase font-black tracking-widest text-luxury-text-muted max-w-sm leading-relaxed mb-8 px-12">
                              Performing this operation will permanently purge all transactions, member profiles, and inventory pieces from the secure vault.
                           </p>
                           <Button
                              variant="outline"
                              onClick={handleWipeDatabase}
                              disabled={isProcessing}
                              className="border-red-500/20 text-red-400 hover:bg-red-500/10 px-12 h-14 font-black uppercase text-[10px] tracking-widest"
                           >
                              {isProcessing ? 'Purging...' : 'Invoke Purge Protocol'}
                           </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                           <div className="p-8 bg-white/5 border border-white/5 rounded-3xl space-y-4">
                              <ShieldCheck className="text-gold-400 mb-4" size={32} />
                              <h5 className="font-serif font-black text-white text-xl uppercase tracking-tighter">Two-Factor Audit</h5>
                              <p className="text-[10px] uppercase font-bold text-luxury-text-dim tracking-widest leading-relaxed">Require administrative token verification for all high-value inventory deletions.</p>
                              <Button variant="ghost" className="w-full text-gold-400 font-black text-[10px] uppercase tracking-widest mt-6 border border-gold-400/20 bg-gold-400/5 hover:bg-gold-400 hover:text-luxury-black py-4 transition-all">Enable Audit Protection</Button>
                           </div>
                           <div className="p-8 bg-white/5 border border-white/5 rounded-3xl space-y-4">
                              <Zap className="text-gold-400 mb-4" size={32} />
                              <h5 className="font-serif font-black text-white text-xl uppercase tracking-tighter">Rapid Snapshot</h5>
                              <p className="text-[10px] uppercase font-bold text-luxury-text-dim tracking-widest leading-relaxed">Automatic local state snapshots every 15 minutes of shop activity.</p>
                              <Button variant="ghost" className="w-full text-gold-400 font-black text-[10px] uppercase tracking-widest mt-6 border border-gold-400/20 bg-gold-400/5 hover:bg-gold-400 hover:text-luxury-black py-4 transition-all">Enable Auto-Snapshots</Button>
                           </div>
                        </div>
                     </div>
                  )}

                  {activeTab === 'Taxonomy' && (
                     <div className="space-y-12">
                        <div className="space-y-6 flex flex-col">
                           <div className="flex items-center justify-between">
                              <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted border-l-2 border-gold-400 pl-4 py-1">Commodity Market Rates (Per Gram/Unit)</h4>
                              <Button
                                 variant="outline"
                                 onClick={() => {
                                    const name = window.prompt('Enter new material name (e.g. Platinum, Brass)');
                                    if (name && name.trim()) {
                                       const newRates = { ...settings.metalRates };
                                       if (!newRates[name.trim()]) {
                                          newRates[name.trim()] = 0;
                                          updateSettings({ metalRates: newRates });
                                       }
                                    }
                                 }}
                                 className="text-[10px] uppercase font-black tracking-widest border-luxury-border-dim hover:border-gold-400 transition-all h-8"
                              >
                                 + Add Custom Material
                              </Button>
                           </div>
                           <div className="grid grid-cols-3 gap-8">
                              {Object.entries(settings.metalRates || {}).map(([metal, rate]) => (
                                 <div key={metal} className="relative group">
                                    <Input
                                       label={`${metal} Rate`}
                                       type="number"
                                       step="0.01"
                                       value={rate}
                                       onChange={(e) => {
                                          const val = Number(e.target.value);
                                          const newRates = { ...settings.metalRates, [metal]: val };
                                          const updates: Partial<typeof settings> = { metalRates: newRates };
                                          if (metal === 'Gold') updates.goldRate = val;
                                          if (metal === 'Silver') updates.silverRate = val;
                                          if (metal === 'Platinum') updates.platinumRate = val;
                                          updateSettings(updates);
                                       }}
                                       onFocus={(e) => e.target.select()}
                                       className="h-16 text-2xl font-bold font-serif text-gold-400 border-luxury-border"
                                    />
                                    {metal !== 'Gold' && metal !== 'Silver' && metal !== 'Diamond' && (
                                       <button
                                          onClick={() => {
                                             if (confirm(`Remove ${metal} from tracked commodities?`)) {
                                                const newRates = { ...settings.metalRates };
                                                delete newRates[metal];
                                                updateSettings({ metalRates: newRates });
                                             }
                                          }}
                                          className="absolute right-4 top-1/2 -translate-y-1/2 text-luxury-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                          title={`Remove ${metal}`}
                                       >
                                          <Trash2 size={16} />
                                       </button>
                                    )}
                                 </div>
                              ))}
                           </div>
                        </div>

                        <div className="space-y-6 flex flex-col pt-8 border-t border-luxury-border-dim">
                           <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted border-l-2 border-gold-400 pl-4 py-1">Rate Change Taxes</h4>
                           <div className="grid grid-cols-3 gap-8">
                              <Input label="Intra-State CGST (%)" type="number" step="0.01" value={settings.cgstPercent} onChange={(e) => updateSettings({ cgstPercent: Number(e.target.value) })} onFocus={(e) => e.target.select()} className="h-16 text-2xl font-bold font-mono" />
                              <Input label="Intra-State SGST (%)" type="number" step="0.01" value={settings.sgstPercent} onChange={(e) => updateSettings({ sgstPercent: Number(e.target.value) })} onFocus={(e) => e.target.select()} className="h-16 text-2xl font-bold font-mono" />
                              <Input label="Inter-State IGST (%)" type="number" step="0.01" value={settings.igstPercent} onChange={(e) => updateSettings({ igstPercent: Number(e.target.value) })} onFocus={(e) => e.target.select()} className="h-16 text-2xl font-bold font-mono text-gold-400" />
                           </div>
                        </div>

                        <div className="p-8 bg-luxury-black rounded-3xl border border-luxury-border space-y-8 flex flex-col mt-8">
                           <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted border-l-2 border-gold-400 pl-4 py-1">Invoicing Architecture</h4>
                           <div className="grid grid-cols-2 gap-8">
                              <Input label="Unique Certificate Prefix" value={settings.invoicePrefix} onChange={(e) => updateSettings({ invoicePrefix: e.target.value })} className="h-14 font-black tracking-[0.2em] font-mono text-sm uppercase" />
                              <Input label="Portfolio Counter Startup" type="number" value={settings.invoiceCounter} onChange={(e) => updateSettings({ invoiceCounter: Number(e.target.value) })} onFocus={(e) => e.target.select()} className="h-14 font-bold" />
                           </div>
                           <div className="space-y-1.5 flex flex-col">
                              <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Rate Change Certificate Footer</label>
                              <textarea
                                 className="textarea-luxury w-full h-24 text-xs italic"
                                 value={settings.receiptFooter}
                                 onChange={(e) => updateSettings({ receiptFooter: e.target.value })}
                              />
                           </div>
                        </div>

                        <div className="p-8 bg-luxury-black rounded-3xl border border-luxury-border space-y-8 flex flex-col mt-8">
                           <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted border-l-2 border-red-400 pl-4 py-1">Girvi (Pawn) Protocols</h4>
                           <div className="grid grid-cols-2 gap-8">
                              <Input
                                 label="Default Threshold (Months)"
                                 type="number"
                                 value={settings.girviDefaultPeriodMonths}
                                 onChange={(e) => updateSettings({ girviDefaultPeriodMonths: Number(e.target.value) })}
                                 onFocus={(e) => e.target.select()}
                                 className="h-14 font-bold"
                                 helperText="Period of inactivity after which a loan is flagged as 'At Risk'"
                              />
                           </div>
                        </div>
                     </div>
                  )}

                  {activeTab === 'Catalog' && (
                     <div className="space-y-12">
                        <div className="space-y-8">
                           <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted border-l-2 border-gold-400 pl-4 py-1">Inventory Categories</h4>
                           <div className="p-8 bg-luxury-input rounded-[32px] border border-luxury-border space-y-8">
                              <div className="flex gap-4">
                                 <Input
                                    placeholder="Enter new category name (e.g. Watch, Coin)..."
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className="h-14 flex-1 font-serif text-lg"
                                    onKeyDown={(e) => {
                                       if (e.key === 'Enter' && newCategory.trim()) {
                                          const current = settings.categories || [];
                                          if (!current.includes(newCategory.trim())) {
                                             updateSettings({ categories: [...current, newCategory.trim()] });
                                             setNewCategory('');
                                          }
                                       }
                                    }}
                                 />
                                 <Button
                                    variant="gold"
                                    className="h-14 px-8 uppercase font-black tracking-widest text-[10px]"
                                    onClick={() => {
                                       if (newCategory.trim()) {
                                          const current = settings.categories || [];
                                          if (!current.includes(newCategory.trim())) {
                                             updateSettings({ categories: [...current, newCategory.trim()] });
                                             setNewCategory('');
                                          }
                                       }
                                    }}
                                 >
                                    <Plus size={18} className="mr-2" /> Add Category
                                 </Button>
                              </div>

                              <div className="flex flex-wrap gap-3 pt-4">
                                 {(settings.categories || []).map((cat) => (
                                    <div
                                       key={cat}
                                       className="group flex items-center gap-2 px-6 py-3 bg-luxury-surface border border-luxury-border rounded-2xl hover:border-gold-400/50 transition-all cursor-default"
                                    >
                                       <Tag size={12} className="text-gold-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                                       <span className="text-xs font-bold text-luxury-text uppercase tracking-tight">{cat}</span>
                                       <button
                                          onClick={() => {
                                             if (confirm(`Remove "${cat}" from your catalog taxonomy? Products in this category will remain, but the category will no longer be available for new stock.`)) {
                                                updateSettings({ categories: settings.categories.filter(c => c !== cat) });
                                             }
                                          }}
                                          className="ml-2 text-luxury-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
                                       >
                                          <X size={14} />
                                       </button>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        </div>

                        <div className="p-8 card-luxury bg-gold-400/5 border-gold-400/10">
                           <div className="flex items-start gap-4">
                              <div className="p-3 bg-gold-400/10 rounded-2xl text-gold-400 mt-1">
                                 <Sparkles size={20} />
                              </div>
                              <div className="space-y-2">
                                 <p className="text-sm font-bold text-luxury-text uppercase tracking-tight">Smart Catalog Governance</p>
                                 <p className="text-xs text-luxury-text-muted leading-relaxed">
                                    Adding categories here will instantly update the selection options in your Inventory & Sales portals.
                                    We recommend maintaining a concise taxonomy for optimal reporting accuracy.
                                 </p>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {activeTab === 'Loyalty' && (
                     <div className="space-y-12 h-full flex flex-col">
                        <div className="grid grid-cols-2 gap-12">
                           <div className="space-y-8">
                              <div className="flex items-center justify-between">
                                 <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted border-l-2 border-gold-400 pl-4 py-1">Affinity Core</h4>
                                 <button
                                    onClick={() => updateSettings({ enableLoyalty: !settings.enableLoyalty })}
                                    className={cn(
                                       'px-4 py-1 rounded-full text-[8px] uppercase font-black tracking-widest transition-all',
                                       settings.enableLoyalty ? 'bg-gold-400 text-luxury-black' : 'bg-luxury-surface text-luxury-text-muted'
                                    )}
                                 >
                                    {settings.enableLoyalty ? 'Program Active' : 'Program Suspended'}
                                 </button>
                              </div>
                              <div className="space-y-8 p-10 bg-luxury-input border border-luxury-border rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col flex-1">
                                 <div className="absolute top-0 right-0 p-8 opacity-5"><Award size={100} /></div>
                                 <Input label="Appreciation Index (Pts per ₹)" type="number" value={settings.loyaltyPointsPerRupee} onChange={(e) => updateSettings({ loyaltyPointsPerRupee: Number(e.target.value) })} onFocus={(e) => e.target.select()} className="h-14 font-bold" />
                                 <Input label="Redemption Valuation (₹/Pt)" type="number" step="0.1" value={settings.loyaltyRedemptionRate} onChange={(e) => updateSettings({ loyaltyRedemptionRate: Number(e.target.value) })} onFocus={(e) => e.target.select()} className="h-14 font-bold text-green-500" />
                              </div>
                           </div>

                           <div className="space-y-8 h-full flex flex-col">
                              <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted border-l-2 border-green-500 pl-4 py-1">Portfolio Projection</h4>
                              <div className="flex-1 p-10 bg-luxury-surface border border-dashed border-luxury-border rounded-[40px] flex flex-col items-center justify-center text-center">
                                 <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center text-green-500 mb-6 animate-bounce">
                                    <Zap size={32} />
                                 </div>
                                 <h5 className="font-serif text-3xl font-black text-luxury-text mb-2 leading-none">Simulation Active</h5>
                                 <p className="text-[9px] uppercase font-black tracking-[0.2em] text-luxury-text-muted mb-10">Based on current retention metrics</p>
                                 <div className="w-full space-y-4">
                                    <div className="flex justify-between items-end border-b border-luxury-border pb-4">
                                       <span className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Member Threshold Growth</span>
                                       <span className="text-lg font-serif font-black text-luxury-text">+14.2%</span>
                                    </div>
                                    <div className="flex justify-between items-end border-b border-luxury-border pb-4">
                                       <span className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Valuation Liability</span>
                                       <span className="text-lg font-serif font-black text-gold-400">₹42,500</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {activeTab === 'Subscription' && (() => {
                     const plan = profile?.plan || 'Trial';
                     const expiry = profile?.planExpiry ? new Date(profile.planExpiry) : null;
                     const isExpired = expiry ? expiry < new Date() : false;
                     const daysLeft = expiry ? Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / 86400000)) : null;
                     const isPremium = plan === 'Premium' || plan === 'Enterprise';
                     const isLightTheme = settings.theme === 'light';

                     return (
                        <div className="space-y-8 animate-fade-in">
                           {/* Plan Status Card */}
                           <div className={`p-10 rounded-[40px] flex items-center justify-between shadow-2xl relative overflow-hidden ${isExpired ? 'bg-red-500/10 border border-red-500/20' :
                              isPremium ? 'bg-gold-400 shadow-gold-400/20' :
                                 'bg-blue-600/10 border border-blue-500/20'
                              }`}>
                              <div className="absolute -right-10 top-0 p-8 opacity-10"><Sparkles size={200} /></div>
                              <div className="relative z-10 space-y-4">
                                 <div className={`inline-block px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 ${isExpired ? 'bg-red-500 text-white' :
                                    isPremium ? 'bg-luxury-black text-gold-400' :
                                       isLightTheme ? 'bg-blue-100 text-blue-800' : 'bg-blue-500/20 text-blue-300'
                                    }`}>
                                    {isExpired ? '⚠ Expired' : plan === 'Trial' ? '⏳ Free Trial' : `${plan} Plan`}
                                 </div>
                                 <h3 className={`text-3xl font-serif font-black leading-none ${isPremium && !isExpired ? 'text-luxury-black' : isLightTheme ? 'text-luxury-text' : 'text-white'}`}>
                                    {isExpired ? 'Access Suspended' : plan === 'Trial' ? '15-Day Free Trial' : `${plan} Membership`}
                                 </h3>
                                 <p className={`text-sm max-w-sm ${isPremium && !isExpired ? 'text-luxury-black/60' : isLightTheme ? 'text-luxury-text-muted' : 'text-white/60'}`}>
                                    {isExpired
                                       ? 'Your plan has expired. Contact your administrator to renew and restore full access.'
                                       : plan === 'Trial'
                                          ? 'Enjoy full access to all Aurum features during your free trial period.'
                                          : 'Full access to enterprise-grade analytics, multi-user vault protocols, and real-time market synchronization.'}
                                 </p>
                              </div>
                           </div>

                           {/* Plan Details */}
                           <div className="grid grid-cols-2 gap-8">
                              <div className="p-8 bg-luxury-surface border border-luxury-border rounded-3xl space-y-3">
                                 <h5 className="font-serif font-black text-luxury-text text-xl uppercase tracking-tighter">Current Plan</h5>
                                 <p className={`text-4xl font-black ${isPremium ? 'text-gold-400' : isExpired ? 'text-red-400' : 'text-blue-400'}`}>{plan}</p>
                                 <p className="text-[10px] uppercase font-bold text-luxury-text-dim tracking-widest leading-relaxed">
                                    {plan === 'Trial' ? 'All features enabled for trial period' : `${plan} tier features are fully unlocked`}
                                 </p>
                              </div>

                              <div className="p-8 bg-luxury-surface border border-luxury-border rounded-3xl space-y-3">
                                 <h5 className="font-serif font-black text-luxury-text text-xl uppercase tracking-tighter">
                                    {isExpired ? 'Expired On' : plan === 'Trial' ? 'Trial Expires' : 'Renews On'}
                                 </h5>
                                 {expiry ? (
                                    <>
                                       <p className={`text-3xl font-black font-mono ${isExpired ? 'text-red-400' : daysLeft !== null && daysLeft <= 3 ? 'text-amber-400' : 'text-luxury-text'}`}>
                                          {expiry.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                       </p>
                                       {!isExpired && daysLeft !== null && (
                                          <p className={`text-[10px] uppercase font-bold tracking-widest leading-relaxed ${daysLeft <= 3 ? 'text-amber-400' : 'text-luxury-text-dim'}`}>
                                             {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
                                          </p>
                                       )}
                                       {isExpired && (
                                          <p className="text-[10px] uppercase font-bold tracking-widest text-red-400">
                                             Please contact admin to renew
                                          </p>
                                       )}
                                    </>
                                 ) : (
                                    <p className="text-3xl font-black text-gold-400">Lifetime</p>
                                 )}
                              </div>
                           </div>

                           {/* Account Info */}
                           <div className="p-8 bg-luxury-black rounded-3xl border border-luxury-border space-y-4">
                              <h5 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-dim border-l-2 border-gold-400 pl-4 py-1">Account Identity</h5>
                              <div className="grid grid-cols-2 gap-6">
                                 <div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted mb-1">Account Holder</p>
                                    <p className="font-bold text-luxury-text">{profile?.name || '-'}</p>
                                 </div>
                                 <div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted mb-1">Registered Email</p>
                                    <p className="font-bold text-luxury-text font-mono text-sm">{profile?.email || '-'}</p>
                                 </div>
                                 <div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted mb-1">Account Created</p>
                                    <p className="font-bold text-luxury-text">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN') : '-'}</p>
                                 </div>
                                 <div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted mb-1">Role</p>
                                    <p className="font-bold text-gold-400 uppercase">{profile?.role || '-'}</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                     );
                  })()}

                  {activeTab === 'Bill' && (
                     <div className="space-y-12">
                        <div className="space-y-8">
                           <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted border-l-2 border-gold-400 pl-4 py-1">Presentation Protocols</h4>
                           <div className="p-8 bg-luxury-input rounded-[32px] border border-luxury-border space-y-8">
                              <div className="grid grid-cols-2 gap-8">
                                 {/* Toggles */}
                                 <div className="flex items-center justify-between p-4 bg-luxury-black rounded-2xl border border-luxury-border-dim">
                                    <div>
                                       <h5 className="font-serif font-black text-sm text-luxury-text">Show Weight</h5>
                                       <p className="text-[9px] uppercase font-bold text-luxury-text-muted mt-1">Include product weight column in bill table</p>
                                    </div>
                                    <button
                                       onClick={() => updateSettings({ billShowWeight: settings.billShowWeight === false ? true : false })}
                                       className={cn(
                                          'px-4 py-1.5 rounded-full text-[8px] uppercase font-black tracking-widest transition-all',
                                          settings.billShowWeight !== false ? 'bg-gold-400 text-luxury-black' : 'bg-luxury-surface text-luxury-text-muted'
                                       )}
                                    >
                                       {settings.billShowWeight !== false ? 'Visible' : 'Hidden'}
                                    </button>
                                 </div>

                                 <div className="flex items-center justify-between p-4 bg-luxury-black rounded-2xl border border-luxury-border-dim">
                                    <div>
                                       <h5 className="font-serif font-black text-sm text-luxury-text">Show Making Charges</h5>
                                       <p className="text-[9px] uppercase font-bold text-luxury-text-muted mt-1">Include making charges column in bill table</p>
                                    </div>
                                    <button
                                       onClick={() => updateSettings({ billShowMakingCharges: !settings.billShowMakingCharges })}
                                       className={cn(
                                          'px-4 py-1.5 rounded-full text-[8px] uppercase font-black tracking-widest transition-all',
                                          settings.billShowMakingCharges ? 'bg-gold-400 text-luxury-black' : 'bg-luxury-surface text-luxury-text-muted'
                                       )}
                                    >
                                       {settings.billShowMakingCharges ? 'Visible' : 'Hidden'}
                                    </button>
                                 </div>

                                 <div className="flex items-center justify-between p-4 bg-luxury-black rounded-2xl border border-luxury-border-dim">
                                    <div>
                                       <h5 className="font-serif font-black text-sm text-luxury-text">Show Stone Charges</h5>
                                       <p className="text-[9px] uppercase font-bold text-luxury-text-muted mt-1">Include stone charges column in bill table</p>
                                    </div>
                                    <button
                                       onClick={() => updateSettings({ billShowStoneCharges: !settings.billShowStoneCharges })}
                                       className={cn(
                                          'px-4 py-1.5 rounded-full text-[8px] uppercase font-black tracking-widest transition-all',
                                          settings.billShowStoneCharges ? 'bg-gold-400 text-luxury-black' : 'bg-luxury-surface text-luxury-text-muted'
                                       )}
                                    >
                                       {settings.billShowStoneCharges ? 'Visible' : 'Hidden'}
                                    </button>
                                 </div>

                                 <div className="flex items-center justify-between p-4 bg-luxury-black rounded-2xl border border-luxury-border-dim">
                                    <div>
                                       <h5 className="font-serif font-black text-sm text-luxury-text">Show HSN Code</h5>
                                       <p className="text-[9px] uppercase font-bold text-luxury-text-muted mt-1">Display HSN number next to items</p>
                                    </div>
                                    <button
                                       onClick={() => updateSettings({ billShowHSN: settings.billShowHSN === false ? true : false })}
                                       className={cn(
                                          'px-4 py-1.5 rounded-full text-[8px] uppercase font-black tracking-widest transition-all',
                                          settings.billShowHSN !== false ? 'bg-gold-400 text-luxury-black' : 'bg-luxury-surface text-luxury-text-muted'
                                       )}
                                    >
                                       {settings.billShowHSN !== false ? 'Visible' : 'Hidden'}
                                    </button>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-8">
                           <h4 className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted border-l-2 border-gold-400 pl-4 py-1">Legal Protocols</h4>
                           <div className="p-8 bg-luxury-input rounded-[32px] border border-luxury-border space-y-6">
                              <div className="space-y-1.5 flex flex-col">
                                 <label className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted">Terms and Conditions (One per line)</label>
                                 <textarea
                                    className="textarea-luxury w-full h-40 text-xs"
                                    value={settings.termsAndConditions || ''}
                                    placeholder="e.g.&#10;1. Weight variations up to 0.01g are standard.&#10;2. Subject to jurisdiction of local courts."
                                    onChange={(e) => updateSettings({ termsAndConditions: e.target.value })}
                                 />
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {activeTab === 'System' && (
                     <div className="space-y-12">
                        <div className="grid grid-cols-2 gap-8">
                           <div className="p-10 card-luxury bg-luxury-surface border-dashed border-luxury-border flex flex-col items-center text-center group cursor-pointer hover:border-gold-400/40 transition-all">
                              <div className="w-20 h-20 bg-luxury-black rounded-3xl mb-6 flex items-center justify-center text-gold-400 group-hover:scale-110 transition-transform shadow-xl border border-luxury-border">
                                 <HardDriveDownload size={32} />
                              </div>
                              <h5 className="font-serif font-black text-xl mb-2 text-luxury-text-muted">Snapshot Data</h5>
                              <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted px-8 leading-relaxed mb-8">Export complete boutique architecture as a secure JSON manifest.</p>
                              <Button
                                 className="w-full py-4 uppercase font-black text-[10px] tracking-widest border-luxury-text-muted group-hover:bg-gold-400 group-hover:text-luxury-black transition-all"
                                 variant="outline"
                                 onClick={handleExport}
                                 disabled={isProcessing}
                              >
                                 {isProcessing ? 'Exporting...' : 'Execute Export'}
                              </Button>
                           </div>
                           <div className="p-10 card-luxury bg-luxury-surface border-dashed border-luxury-border flex flex-col items-center text-center group cursor-pointer hover:border-gold-400/40 transition-all">
                              <div className="w-20 h-20 bg-luxury-black rounded-3xl mb-6 flex items-center justify-center text-gold-400 group-hover:scale-110 transition-transform shadow-xl border border-luxury-border">
                                 <CloudUpload size={32} />
                              </div>
                              <h5 className="font-serif font-black text-xl mb-2 text-luxury-text-muted">Manifest Restoration</h5>
                              <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted px-8 leading-relaxed mb-8">Synchronize vault state from a previous JSON manifest file.</p>
                              <Button
                                 className="w-full py-4 uppercase font-black text-[10px] tracking-widest border-luxury-text-muted group-hover:bg-gold-400 group-hover:text-luxury-black transition-all"
                                 variant="outline"
                                 onClick={() => fileInputRef.current?.click()}
                                 disabled={isProcessing}
                              >
                                 {isProcessing ? 'Restoring...' : 'Select Manifest'}
                              </Button>
                              <input
                                 type="file"
                                 accept=".json"
                                 className="hidden"
                                 ref={fileInputRef}
                                 onChange={handleImport}
                              />
                           </div>
                        </div>

                        <div className="p-10 bg-luxury-input rounded-[40px] border border-luxury-border flex items-center justify-between group overflow-hidden relative">
                           <div className="absolute top-0 right-0 p-8 opacity-5 transition-transform group-hover:scale-110"><Zap size={140} /></div>
                           <div>
                              <div className="flex items-center gap-3 mb-4">
                                 <Badge variant="success" className="animate-pulse py-0.5 px-3 uppercase text-[8px] font-black tracking-widest border-green-500/20">Operational</Badge>
                                 <h4 className="text-2xl font-serif font-black text-luxury-text leading-none">Internal Environment</h4>
                              </div>
                              <p className="text-[10px] uppercase font-bold tracking-widest text-luxury-text-muted mb-8 max-w-sm">All core systems are synchronized and encrypted using 256-bit AES protocol.</p>
                              <div className="flex gap-12 font-mono">
                                 <div>
                                    <p className="text-[8px] uppercase font-black text-luxury-text-muted mb-1">State Efficiency</p>
                                    <p className="text-xl font-black text-gold-400">0.02ms</p>
                                 </div>
                                 <div>
                                    <p className="text-[8px] uppercase font-black text-luxury-text-muted mb-1">Memory Index</p>
                                    <p className="text-xl font-black text-gold-400">12.4 MB</p>
                                 </div>
                                 <div>
                                    <p className="text-[8px] uppercase font-black text-luxury-text-muted/40 mb-1">Peer Encryption</p>
                                    <p className="text-xl font-black text-gold-400 leading-none">High</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}
               </div>

               {/* Bottom Actions */}
               <div className="pt-10 mt-auto flex justify-between items-center border-t border-luxury-border relative z-10">
                  <div className="flex items-center gap-3 text-luxury-text-muted">
                     <ShieldCheck size={16} />
                     <p className="text-[10px] uppercase font-black tracking-widest leading-none">Active Governance Active • Access Level 5</p>
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-luxury-text-muted italic">Securely persisted in Local Encrypted Vault</p>
               </div>
            </div>
         </div>
      </div>
   );
};

// Removed local cn
