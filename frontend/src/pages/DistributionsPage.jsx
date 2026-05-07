import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { downloadCSV } from '../utils/exportCsv';

/* ── Compact Glassy Metric Card ── */
const MetricCard = ({ title, value, icon, colorClass }) => (
  <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all duration-300 hover:bg-white/80 dark:hover:bg-slate-900/80 hover:-translate-y-0.5">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">{title}</p>
      <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">{value}</p>
    </div>
  </div>
);

const DistributionsPage = () => {
  const { formatCurrency } = useSettings();
  const { hasRole } = useAuth();
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [collapsed, setCollapsed]         = useState({});
  const [alert, setAlert]                 = useState({ open: false, title: '', msg: '' });
  const [confirm, setConfirm]             = useState({ open: false, ledger_id: null, month: '' });
  const [editModal, setEditModal]         = useState({ open: false, ledger_id: null, month: '', label: '' });
  const [saving, setSaving]               = useState(false);
  const [deleting, setDeleting]           = useState(false);

  const toggleMonth = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const fetchDistributions = useCallback(async () => {
    try {
      const r = await api.get('/ledgers/distributions');
      setDistributions(r.data);
    } catch {
      setAlert({ open: true, title: 'Error', msg: 'Failed to fetch distributions.' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDistributions(); }, [fetchDistributions]);

  const handleExport = () => {
    if (distributions.length === 0) return;
    const exportData = distributions.map(d => ({
      Month: d.ledger_label || (d.month ? new Date(d.month).toISOString().split('T')[0] : ''),
      Shareholder: d.shareholder_name,
      'Share %': d.share_percentage,
      Amount: d.net_profit_share,
      'Calculated At': d.calculated_at ? new Date(d.calculated_at).toISOString().split('T')[0] : '',
    }));
    downloadCSV(exportData, 'historical_distributions.csv');
  };

  /* ── Edit ledger ── */
  const openEdit = (e, ledger_id, month, ledger_label) => {
    e.stopPropagation();
    const dateStr = month ? new Date(month).toISOString().split('T')[0].slice(0, 7) : '';
    setEditModal({ open: true, ledger_id, month: dateStr, label: ledger_label || '' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const monthDate = editModal.month ? `${editModal.month}-01` : undefined;
      await api.patch(`/ledgers/${editModal.ledger_id}`, {
        month: monthDate,
        label: editModal.label,
      });
      setEditModal({ open: false, ledger_id: null, month: '', label: '' });
      await fetchDistributions();
    } catch (err) {
      setAlert({ open: true, title: 'Error', msg: err.response?.data?.error || 'Failed to update.' });
    } finally { setSaving(false); }
  };

  /* ── Hard-delete entire ledger ── */
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/ledgers/${confirm.ledger_id}`);
      setConfirm({ open: false, ledger_id: null, month: '' });
      await fetchDistributions();
    } catch (err) {
      setAlert({ open: true, title: 'Error', msg: err.response?.data?.error || 'Failed to delete.' });
      setConfirm({ open: false, ledger_id: null, month: '' });
    } finally { setDeleting(false); }
  };

  /* ── Group by ledger ── */
  const totalDistributed = distributions.reduce((s, d) => s + parseFloat(d.net_profit_share || 0), 0);

  const byMonth = distributions.reduce((acc, d) => {
    const key = d.ledger_id;
    if (!acc[key]) acc[key] = { ledger_id: d.ledger_id, month: d.month, ledger_label: d.ledger_label, rows: [] };
    acc[key].rows.push(d);
    return acc;
  }, {});

  const monthGroups = Object.values(byMonth).sort((a, b) => new Date(b.month) - new Date(a.month));

  const getDisplayName = ({ month, ledger_label }) =>
    ledger_label || new Date(month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  // Custom Header Action for the Layout
  const HeaderActions = () => (
    distributions.length > 0 && (
      <button onClick={handleExport}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/50 rounded-lg border border-slate-200/50 dark:border-slate-700/50 transition-colors backdrop-blur-md shadow-sm"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export CSV
      </button>
    )
  );

  if (loading) return (
    <Layout title="Distributions">
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-indigo-200/50 border-t-indigo-600 rounded-full animate-spin backdrop-blur-sm" />
      </div>
    </Layout>
  );

  return (
    <Layout 
      title="Distributions" 
      subtitle="Historical profit shares from closed ledgers"
      headerAction={<HeaderActions />}
    >

      {/* ── Decorative Background Glows ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center opacity-40 dark:opacity-20">
        <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-violet-400 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-400 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[30%] left-[30%] w-[300px] h-[300px] bg-emerald-400 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 space-y-6 animate-fadeIn">

        {/* ── Summary KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard 
            title="Total Distributed" 
            value={formatCurrency(totalDistributed)} 
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
          />
          <MetricCard 
            title="Closed Periods" 
            value={monthGroups.length} 
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          />
          <MetricCard 
            title="Total Shares Paid" 
            value={distributions.length} 
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
          />
        </div>

        {/* ── Expandable Month Cards ── */}
        {monthGroups.length === 0 ? (
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-2xl shadow-sm py-20 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-slate-100/50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">No distributions yet.</p>
            <p className="text-xs text-slate-500 font-medium">Close a month to see historical results here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {monthGroups.map(({ ledger_id, month, ledger_label, rows }) => {
              const monthTotal  = rows.reduce((s, d) => s + parseFloat(d.net_profit_share || 0), 0);
              const displayName = getDisplayName({ month, ledger_label });
              const maxShare    = Math.max(...rows.map(d => parseFloat(d.net_profit_share || 0)));
              const isOpen      = !!collapsed[ledger_id];

              return (
                <div key={ledger_id} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-2xl shadow-sm overflow-hidden transition-all">

                  {/* ── Compact Month Header (Clickable) ── */}
                  <button
                    onClick={() => toggleMonth(ledger_id)}
                    className="w-full px-5 py-3 border-b border-white/40 dark:border-slate-700/30 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 flex items-center justify-between transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shadow-inner flex-shrink-0">
                        {new Date(month).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{displayName}</h3>
                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                          {rows.length} payout{rows.length !== 1 ? 's' : ''} recorded
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">Total</p>
                        <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(monthTotal)}</p>
                      </div>

                      {hasRole('ADMIN') && (
                        <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                          <button
                            onClick={(e) => openEdit(e, ledger_id, month, ledger_label)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-400 rounded-md transition-all"
                            title="Edit Period Name"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirm({ open: true, ledger_id, month: displayName }); }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 rounded-md transition-all"
                            title="Delete Entire Record"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      )}

                      <svg
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* ── Shareholder Rows (Expanded) ── */}
                  {isOpen && (
                    <div className="divide-y divide-white/40 dark:divide-slate-800/50 bg-white/30 dark:bg-slate-900/30">
                      {rows.map((d, i) => {
                        const pct = maxShare > 0 ? (parseFloat(d.net_profit_share) / maxShare) * 100 : 0;
                        const barColors = ['bg-emerald-500', 'bg-indigo-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500'];
                        const barColor  = barColors[i % barColors.length];
                        
                        return (
                          <div key={d.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/50 dark:hover:bg-slate-800/40 transition-colors">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0 ${barColor}`}>
                              {d.shareholder_name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{d.shareholder_name}</p>
                                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                  <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                                    {parseFloat(d.share_percentage || 0).toFixed(2)}%
                                  </span>
                                  <span className="text-sm font-black text-slate-800 dark:text-slate-100 w-24 text-right">
                                    {formatCurrency(d.net_profit_share)}
                                  </span>
                                </div>
                              </div>
                              <div className="w-full bg-slate-200/50 dark:bg-slate-800/50 rounded-full h-1">
                                <div className={`h-1 rounded-full ${barColor} transition-all duration-1000 ease-out`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── Edit Modal ── */}
      <Modal
        isOpen={editModal.open}
        title="Edit Period Details"
        onClose={() => setEditModal({ open: false, ledger_id: null, month: '', label: '' })}
        onConfirm={handleSave}
        confirmText={saving ? 'Saving…' : 'Save Changes'}
        confirmColor="primary"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Period Date
            </label>
            <input
              type="month"
              value={editModal.month}
              onChange={e => setEditModal(m => ({ ...m, month: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Custom Display Name <span className="font-normal text-slate-400 lowercase">(optional)</span>
            </label>
            <input
              type="text"
              value={editModal.label}
              onChange={e => setEditModal(m => ({ ...m, label: e.target.value }))}
              placeholder="e.g. Q1 2026, Year-End Bonus…"
              className="w-full px-3 py-2.5 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
            />
            <p className="text-[10px] font-medium text-slate-400 mt-1.5">Overrides the default "Month Year" display name.</p>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal
        isOpen={confirm.open}
        title="Permanently Delete"
        onClose={() => setConfirm({ open: false, ledger_id: null, month: '' })}
        onConfirm={handleDelete}
        confirmText={deleting ? 'Deleting…' : 'Delete Everything'}
        confirmColor="danger"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            You are about to permanently delete <span className="font-bold text-slate-900 dark:text-white">{confirm.month}</span>.
          </p>
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-500/20">
            <svg className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div className="text-xs font-medium text-rose-700 dark:text-rose-300 space-y-1.5">
              <p><strong>This cannot be undone.</strong> The following will be deleted forever:</p>
              <ul className="list-disc list-inside opacity-90 pl-1">
                <li>All income & expense transactions</li>
                <li>The distribution record</li>
                <li>The ledger period itself</li>
              </ul>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── General Alert ── */}
      <Modal isOpen={alert.open} title={alert.title} onClose={() => setAlert(a => ({ ...a, open: false }))}>
        <p className="text-sm text-slate-600 dark:text-slate-300">{alert.msg}</p>
      </Modal>

    </Layout>
  );
};

export default DistributionsPage;