import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Modal from './Modal';

const ShareholdersTab = () => {
  const [shareholders, setShareholders] = useState([]);
  const [loading, setLoading]           = useState(true);
  
  // Create / Edit State
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [saving, setSaving]             = useState(false);
  const [formData, setFormData]         = useState({ name: '', email: '', share_percentage: 0, is_priority: false, is_active: true });
  
  // Delete State
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, name: '' });
  const [deleting, setDeleting]           = useState(false);

  // History Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [historyShareholder, setHistoryShareholder] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [availableMonths, setAvailableMonths] = useState([]);

  // Alert State
  const [alert, setAlert]               = useState({ open: false, title: '', msg: '' });

  const showAlert  = (title, msg) => setAlert({ open: true, title, msg });
  const closeAlert = () => setAlert(a => ({ ...a, open: false }));

  const fetchShareholders = useCallback(async () => {
    try {
      const r = await api.get('/shareholders');
      setShareholders(r.data);
    } catch { showAlert('Error', 'Failed to fetch shareholders.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchShareholders(); }, [fetchShareholders]);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', share_percentage: 0, is_priority: false, is_active: true });
    setIsModalOpen(true);
  };

  const openEdit = (s) => {
    setEditingId(s.id);
    setFormData({ name: s.name, email: s.email || '', share_percentage: s.share_percentage, is_priority: s.is_priority, is_active: s.is_active });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) { showAlert('Validation', 'Name is required.'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/shareholders/${editingId}`, formData);
      } else {
        await api.post('/shareholders', formData);
      }
      setIsModalOpen(false);
      fetchShareholders();
    } catch (err) {
      showAlert('Error', err.response?.data?.error || 'Failed to save shareholder.');
    } finally { setSaving(false); }
  };

  // Add Delete Handler
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/shareholders/${confirmDelete.id}`);
      setConfirmDelete({ open: false, id: null, name: '' });
      fetchShareholders();
    } catch (err) {
      showAlert('Error', err.response?.data?.error || 'Failed to delete shareholder. They may be tied to existing historical records.');
      setConfirmDelete({ open: false, id: null, name: '' });
    } finally { 
      setDeleting(false); 
    }
  };

  // Open Sidebar and fetch data
  const openHistory = async (shareholder) => {
    setHistoryShareholder(shareholder);
    setIsSidebarOpen(true);
    setHistoryLoading(true);
    try {
      const res = await api.get('/ledgers/distributions');
      const userHistory = res.data.filter(d => d.shareholder_id === shareholder.id);
      setHistoryData(userHistory);
      
      const months = [...new Set(userHistory.map(d => d.month))].sort().reverse();
      setAvailableMonths(months);
      setSelectedMonth('ALL');
    } catch (err) {
      showAlert('Error', 'Failed to load historical data.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatMonth = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  };

  // Waterfall Validation Logic
  const activeShareholders = shareholders.filter(s => s.is_active);
  const priorityPct = activeShareholders.filter(s => s.is_priority).reduce((s, sh) => s + parseFloat(sh.share_percentage || 0), 0);
  const standardPct = activeShareholders.filter(s => !s.is_priority).reduce((s, sh) => s + parseFloat(sh.share_percentage || 0), 0);

  // Share of net profit. The API sends effective_percentage; this recomputes it
  // the same way as a fallback so the column can't render blank against an
  // older response. Priority shares come off the top, so they are already a
  // share of profit; standard shares divide whatever is left.
  const effPct = (sh) => {
    if (sh.effective_percentage !== undefined && sh.effective_percentage !== null) {
      return parseFloat(sh.effective_percentage);
    }
    const nominal = parseFloat(sh.share_percentage || 0);
    if (nominal <= 0) return 0;
    if (sh.is_priority) return nominal;
    return standardPct > 0 ? (nominal / standardPct) * (100 - priorityPct) : 0;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-4 border-indigo-200/50 border-t-indigo-600 rounded-full animate-spin backdrop-blur-sm" />
    </div>
  );

  const displayedHistory = selectedMonth === 'ALL' 
    ? historyData 
    : historyData.filter(d => d.month === selectedMonth);

  return (
    <div className="animate-fadeIn">
      {/* ── Warning Banner (Glassy) ── */}
      {Math.abs(standardPct - 100) > 0.01 && (
        <div className="mb-6 flex items-start gap-3 bg-amber-500/10 backdrop-blur-md border border-amber-500/20 rounded-2xl px-5 py-4 shadow-sm">
          <span className="text-amber-500 text-lg mt-0.5">⚠️</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-0.5">Standard Pool: {standardPct.toFixed(2)}%</p>
            <p className="text-xs font-medium text-amber-700/80 dark:text-amber-300/80 leading-relaxed">Standard active shareholders must sum to exactly 100% to fully distribute the remaining profit.</p>
          </div>
        </div>
      )}

      {/* Explains the two percentage columns. Without this the table shows a
          partner two different numbers with no indication which one is theirs. */}
      {priorityPct > 0 && (
        <div className="mb-6 flex items-start gap-3 bg-indigo-500/5 backdrop-blur-md border border-indigo-500/15 rounded-2xl px-5 py-4">
          <span className="text-indigo-500 text-lg mt-0.5">ℹ️</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 mb-0.5">
              How the waterfall splits
            </p>
            <p className="text-xs font-medium text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
              Priority shareholders take {priorityPct.toFixed(2)}% off the top. Standard shareholders then share
              the remaining {(100 - priorityPct).toFixed(2)}% by their exact percentages —
              so 15% of the pool works out to {(15 / (standardPct || 100) * (100 - priorityPct)).toFixed(2)}% of
              total net profit. <strong className="font-bold">Share %</strong> is the agreed split of the pool;
              <strong className="font-bold"> Of Profit</strong> is the same split expressed against the whole.
            </p>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Shareholder Directory</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white/40 dark:bg-slate-800/40 border border-white/50 dark:border-slate-700/50 px-2 py-0.5 rounded-md">
              {shareholders.length} Registered
            </span>
            
            {priorityPct > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20 shadow-sm backdrop-blur-sm">
                Priority: {priorityPct.toFixed(2)}%
              </span>
            )}
            
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shadow-sm backdrop-blur-sm ${
              Math.abs(standardPct - 100) < 0.01 
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
            }`}>
              Standard: {standardPct.toFixed(2)}%
            </span>
          </div>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 border border-white/10 shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Shareholder
        </button>
      </div>

      {/* ── Main Data Table (Liquid Glass) ── */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-2xl shadow-sm overflow-hidden transition-all">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/40 dark:bg-slate-800/40 border-b border-white/40 dark:border-slate-700/30">
              <tr>
                {['Name','Contact / Status','Share % (of pool)','Of Total Profit','Tier','Actions'].map(h => (
                  <th key={h} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${h === 'Actions' ? 'text-right' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40 dark:divide-slate-800/50 bg-white/20 dark:bg-slate-900/20">
              {shareholders.map((s, i) => {
                const barColors = ['bg-indigo-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'];
                const barColor = barColors[i % barColors.length];
                
                return (
                  <tr key={s.id} className="hover:bg-white/50 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0 ${barColor}`}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.email || '—'}</p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${s.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-500 dark:text-slate-400 w-12">{parseFloat(s.share_percentage || 0).toFixed(2)}%</span>
                        <div className="flex-1 max-w-[60px] bg-slate-200/50 dark:bg-slate-800/50 rounded-full h-1">
                          <div className={`h-1 rounded-full ${barColor} opacity-50`} style={{ width: `${Math.min(parseFloat(s.share_percentage || 0), 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    {/* What the stored percentage actually pays. For a standard
                        partner it describes the pool left after the priority
                        cut, not the profit — so 15% stored is 12.75% received.
                        Shown as its own column because they are different
                        numbers and only this one reaches a bank account. */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100 w-14 tabular-nums">
                          {effPct(s).toFixed(2)}%
                        </span>
                        <div className="flex-1 max-w-[60px] bg-slate-200/50 dark:bg-slate-800/50 rounded-full h-1">
                          <div className={`h-1 rounded-full ${barColor}`} style={{ width: `${Math.min(effPct(s), 100)}%` }} />
                        </div>
                        {!s.is_priority && Math.abs(effPct(s) - parseFloat(s.share_percentage || 0)) > 0.005 && (
                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap"
                            title={`${parseFloat(s.share_percentage || 0).toFixed(2)}% of the ${(100 - priorityPct).toFixed(2)}% remaining after the priority share`}>
                            of pool
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {s.is_priority
                        ? <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20">Priority</span>
                        : <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 py-0.5">Standard</span>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openHistory(s)} title="Payout History"
                          className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 border border-white/50 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-700/50 rounded-md transition-all shadow-sm"
                        >
                          History
                        </button>
                        <button onClick={() => openEdit(s)} title="Edit Shareholder"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-500/10 dark:hover:text-indigo-400 rounded-md transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* ADDED DELETE BUTTON */}
                        <button onClick={() => setConfirmDelete({ open: true, id: s.id, name: s.name })} title="Delete Shareholder"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 dark:hover:text-rose-400 rounded-md transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {shareholders.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm font-medium text-slate-400 dark:text-slate-500">No shareholders registered.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        isOpen={confirmDelete.open}
        title="Delete Shareholder"
        onClose={() => setConfirmDelete({ open: false, id: null, name: '' })}
        onConfirm={handleDelete}
        confirmText={deleting ? 'Deleting…' : 'Delete Shareholder'}
        confirmColor="danger"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Are you sure you want to completely remove <span className="font-bold text-slate-900 dark:text-white">{confirmDelete.name}</span>?
          </p>
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-500/20">
            <svg className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div className="text-xs font-medium text-rose-700 dark:text-rose-300 space-y-1.5">
              <p><strong>Warning:</strong> Deleting a shareholder will cause errors if they have existing historical payouts attached to their ID.</p>
              <p>Consider editing them and setting their status to <strong>Inactive</strong> instead to keep historical payout data intact while preventing future distributions.</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Form Modal for Create/Edit ── */}
      <Modal
        isOpen={isModalOpen}
        title={editingId ? 'Edit Shareholder' : 'Add Shareholder'}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleSave}
        confirmText={saving ? 'Saving…' : 'Save Shareholder'}
        confirmColor="primary"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Full Name <span className="text-rose-400">*</span></label>
            <input type="text" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Email <span className="font-normal lowercase text-slate-400">(optional)</span></label>
            <input type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Share Percentage (%)</label>
            <input type="number" value={formData.share_percentage} min="0" max="100" step="0.01"
              onChange={e => setFormData(f => ({ ...f, share_percentage: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none" />
          </div>
          <div className="space-y-2 pt-2">
            {[
              { key: 'is_priority', label: 'Priority Shareholder', desc: 'Guarantees payout before remaining profit is pooled.' },
              { key: 'is_active',   label: 'Active Status',        desc: 'Inactive members do not receive distributions.' },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all">
                <input type="checkbox" checked={formData[key]} onChange={e => setFormData(f => ({ ...f, [key]: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 text-indigo-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900 focus:ring-indigo-500" />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{label}</p>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Modal>

      {/* ── Slide Navigation Panel (Drawer) for History ── */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div 
        className={`fixed inset-y-0 right-0 w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col border-l border-white/60 dark:border-slate-700/50 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/40 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Payout Ledger
            </h3>
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">{historyShareholder?.name}</p>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Filter by Month</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2.5 text-sm font-semibold border border-white/50 dark:border-slate-700/50 rounded-xl bg-white/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none shadow-inner"
            >
              <option value="ALL">All History</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{formatMonth(m)}</option>
              ))}
            </select>
          </div>

          <div className="border border-white/50 dark:border-slate-700/50 rounded-2xl overflow-hidden bg-white/40 dark:bg-slate-800/30 shadow-sm">
            {historyLoading ? (
               <div className="flex justify-center p-12">
                 <div className="w-8 h-8 border-4 border-indigo-200/50 border-t-indigo-600 rounded-full animate-spin backdrop-blur-sm" />
               </div>
            ) : displayedHistory.length === 0 ? (
               <div className="p-12 text-center opacity-60">
                 <svg className="w-10 h-10 mx-auto text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                 </svg>
                 <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {selectedMonth === 'ALL' ? 'No history found.' : 'No payouts for selected month.'}
                 </p>
               </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-white/50 dark:bg-slate-800/50 border-b border-white/50 dark:border-slate-700/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider">Ledger Period</th>
                    <th className="px-4 py-3 font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider text-right">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40 dark:divide-slate-700/30">
                  {displayedHistory.map(row => (
                    <tr key={row.id} className="hover:bg-white/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-xs block">{formatMonth(row.month)}</span>
                        {row.ledger_label && <span className="text-[10px] text-slate-500 block mt-0.5">{row.ledger_label}</span>}
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 inline-block bg-slate-100/50 dark:bg-slate-800/50 px-1.5 rounded">
                          {parseFloat(row.share_percentage).toFixed(2)}% Share
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-black text-emerald-600 dark:text-emerald-400 text-right">
                        {parseFloat(row.net_profit_share).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={alert.open} title={alert.title} onClose={closeAlert}><p>{alert.msg}</p></Modal>
    </div>
  );
};

export default ShareholdersTab;