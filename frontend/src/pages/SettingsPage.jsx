import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import UsersTab from '../components/UsersTab';
import ShareholdersTab from '../components/ShareholdersTab';
import BranchesTab from '../components/BranchesTab';

const CURRENCIES = [
  { code: 'USD', symbol: '$',  name: 'US Dollar' },
  { code: 'EUR', symbol: '€',  name: 'Euro' },
  { code: 'GBP', symbol: '£',  name: 'British Pound' },
  { code: 'SLE', symbol: 'LE', name: 'Sierra Leonean Leone' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'INR', symbol: '₹',  name: 'Indian Rupee' },
  { code: 'NGN', symbol: '₦',  name: 'Nigerian Naira' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
];

const SettingsPage = () => {
  const { settings, updateSettings, loading: settingsLoading } = useSettings();
  const [formData, setFormData]     = useState({ currency_code: 'USD', currency_symbol: '$', currency_name: 'US Dollar' });
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat]         = useState({ name: '', type: 'INCOME' });
  const [saving, setSaving]         = useState(false);
  const [modal, setModal]           = useState({ open: false, title: '', msg: '' });
  const [activeTab, setActiveTab]   = useState('general');

  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  useEffect(() => {
    if (settings && !settingsLoading) {
      setFormData({ 
        currency_code: settings.currency_code || 'USD', 
        currency_symbol: settings.currency_symbol || '$', 
        currency_name: settings.currency_name || 'US Dollar' 
      });
      setCategories(settings.categories || []);
    }
  }, [settings, settingsLoading]);

  const pickCurrency = (c) => setFormData({ currency_code: c.code, currency_symbol: c.symbol, currency_name: c.name });

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({ ...formData, categories });
      setModal({ open: true, title: 'Settings Saved', msg: 'Your configurations have been applied successfully.' });
    } catch {
      setModal({ open: true, title: 'Error', msg: 'Failed to save settings.' });
    } finally { setSaving(false); }
  };

  const addCategory = () => {
    const name = newCat.name.trim();
    if (!name) return;
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase() && c.type === newCat.type)) return;
    setCategories(prev => [...prev, { name, type: newCat.type }]);
    setNewCat(c => ({ ...c, name: '' }));
  };

  const removeCategory = (idx) => setCategories(prev => prev.filter((_, i) => i !== idx));

  return (
    <Layout title="Settings" subtitle="Control your global application workspace">
      
      {/* ── Decorative Background Glows ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center opacity-40 dark:opacity-20">
        <div className="absolute top-[10%] left-[-5%] w-[500px] h-[500px] bg-indigo-500 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[10%] right-[-5%] w-[450px] h-[450px] bg-emerald-500 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 max-w-5xl">
        
        {/* ── Compact Tab Navigation ── */}
        <div className="inline-flex p-1 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-xl mb-8 shadow-sm">
          {[
            { id: 'general', label: 'General', icon: '⚙️' },
            { id: 'users', label: 'Systems Users', icon: '👥' },
            { id: 'shareholders', label: 'Shareholders', icon: '🤝' },
            { id: 'branches', label: 'Branches', icon: '🏢' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="animate-fadeIn">
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 gap-6 max-w-3xl">
              
              {/* ── Currency Card ── */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-2xl shadow-sm overflow-hidden transition-all">
                <button 
                  onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                  className="w-full flex justify-between items-center px-6 py-5 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-sm">
                      <span className="font-bold text-lg">{formData.currency_symbol}</span>
                    </div>
                    <div className="text-left">
                      <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Currency Configuration</h2>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Preset: {formData.currency_name}</p>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isCurrencyOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isCurrencyOpen && (
                  <div className="p-6 pt-2 space-y-6 border-t border-white/40 dark:border-slate-800/50 bg-white/20 dark:bg-slate-900/20">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {CURRENCIES.map(c => (
                        <button key={c.code} type="button" onClick={() => pickCurrency(c)}
                          className={`flex flex-col items-center py-2 px-1 rounded-xl border text-[10px] font-black transition-all ${
                            formData.currency_code === c.code
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                              : 'bg-white/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-white/40 dark:border-slate-700/50 hover:border-indigo-400 dark:hover:border-indigo-500/50'
                          }`}
                        >
                          <span className="text-base mb-0.5">{c.symbol}</span>
                          <span>{c.code}</span>
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Symbol</label>
                          <input type="text" value={formData.currency_symbol} required
                            onChange={e => setFormData(f => ({ ...f, currency_symbol: e.target.value }))}
                            className="w-full px-4 py-2.5 text-sm font-bold border border-white/40 dark:border-slate-700/50 rounded-xl bg-white/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-400 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">ISO Code</label>
                          <input type="text" value={formData.currency_code} required maxLength={4}
                            onChange={e => setFormData(f => ({ ...f, currency_code: e.target.value.toUpperCase() }))}
                            className="w-full px-4 py-2.5 text-sm font-bold border border-white/40 dark:border-slate-700/50 rounded-xl bg-white/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-400 transition-all outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Active Preview:</span>
                        <span className="text-lg font-black text-slate-800 dark:text-slate-100">{formData.currency_symbol}1,250.00</span>
                      </div>

                      <div className="flex justify-end">
                        <button type="submit" disabled={saving} className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50">
                          {saving ? 'Processing...' : 'Update Currency'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* ── Categories Card ── */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-2xl shadow-sm overflow-hidden transition-all">
                <button 
                  onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                  className="w-full flex justify-between items-center px-6 py-5 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    </div>
                    <div className="text-left">
                      <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Ledger Categories</h2>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">{categories.length} Total Tags</p>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isCategoriesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isCategoriesOpen && (
                  <div className="p-6 pt-2 space-y-6 border-t border-white/40 dark:border-slate-800/50 bg-white/20 dark:bg-slate-900/20">
                    <div className="flex gap-2">
                      <select
                        value={newCat.type}
                        onChange={e => setNewCat(c => ({ ...c, type: e.target.value }))}
                        className="px-3 py-2 text-[10px] font-black border border-white/40 dark:border-slate-700/50 rounded-xl bg-white/50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
                      >
                        <option value="INCOME">INCOME</option>
                        <option value="EXPENSE">EXPENSE</option>
                      </select>
                      <input
                        type="text"
                        value={newCat.name}
                        onChange={e => setNewCat(c => ({ ...c, name: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                        placeholder="Tag name..."
                        className="flex-1 px-4 py-2 text-sm font-bold border border-white/40 dark:border-slate-700/50 rounded-xl bg-white/50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-400 transition-all"
                      />
                      <button type="button" onClick={addCategory} className="px-4 py-2 text-xs font-black text-white bg-indigo-600 rounded-xl shadow-md">
                        + Add
                      </button>
                    </div>

                    {['INCOME','EXPENSE'].map(type => {
                      const list = categories.filter(c => c.type === type);
                      const isInc = type === 'INCOME';
                      return (
                        <div key={type} className="space-y-3">
                          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isInc ? 'text-emerald-600' : 'text-rose-600'}`}>{type} TAGS</p>
                          <div className="flex flex-wrap gap-2">
                            {list.map((c, i) => (
                              <span key={c.name + i} className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-[11px] font-bold rounded-lg border backdrop-blur-md transition-all ${
                                isInc ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-rose-500/10 text-rose-700 border-rose-500/20'
                              }`}>
                                {c.name}
                                <button onClick={() => removeCategory(categories.indexOf(c))} className="w-4 h-4 rounded-md flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                                  ×
                                </button>
                              </span>
                            ))}
                            {list.length === 0 && <span className="text-[10px] font-bold text-slate-400 uppercase italic">No active tags</span>}
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex justify-end pt-4 border-t border-white/20 dark:border-slate-800/50">
                      <button type="button" onClick={handleSubmit} disabled={saving} className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-slate-900 dark:bg-indigo-600 rounded-xl shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50">
                        {saving ? 'Processing...' : 'Save Workspace Settings'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'shareholders' && <ShareholdersTab />}
          {activeTab === 'branches' && <BranchesTab />}
        </div>
      </div>

      <Modal isOpen={modal.open} title={modal.title} onClose={() => setModal(m => ({ ...m, open: false }))}>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">{modal.msg}</p>
      </Modal>
    </Layout>
  );
};

export default SettingsPage;