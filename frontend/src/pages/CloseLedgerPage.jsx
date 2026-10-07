import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import api from '../services/api';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { printDistribution } from '../utils/printDistribution';

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

const CloseLedgerPage = () => {
  const { formatCurrency, settings } = useSettings();
  const [ledger, setLedger]               = useState(null);
  const [distributions, setDistributions] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [closing, setClosing]             = useState(false);
  const [savingPeriod, setSavingPeriod]   = useState(false);
  const [editPeriod, setEditPeriod]       = useState({ open: false, month: '', error: '' });
  const [modal, setModal]                 = useState({ open: false, type: 'alert', title: '', msg: '', onConfirm: null });

  const closeModal   = () => setModal(m => ({ ...m, open: false }));
  const alertModal   = (title, msg) => setModal({ open: true, type: 'alert', title, msg, onConfirm: null });
  const confirmModal = (title, msg, fn) => setModal({ open: true, type: 'confirm', title, msg, onConfirm: fn });

  const fetchLedger = useCallback(async () => {
    try {
      const r = await api.get('/ledgers/current');
      setLedger(r.data);
    } catch { alertModal('Error', 'Failed to fetch ledger.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  const executeClosure = async () => {
    closeModal();
    setClosing(true);
    try {
      const r = await api.post(`/ledgers/${ledger.id}/close`);
      setDistributions(r.data.distributions);
      setLedger(r.data.ledger);
      alertModal('Success', 'Ledger closed — distributions have been calculated.');
    } catch (err) {
      alertModal('Error', err.response?.data?.error || 'Failed to close ledger.');
    } finally { setClosing(false); }
  };

  const handleCloseClick = () => {
    confirmModal(
      'Confirm Ledger Closure',
      'This action is permanent and cannot be undone. Net profit will be calculated and distributed to all active shareholders based on their assigned percentages.',
      executeClosure
    );
  };

  const handlePrint = () => {
    if (!distributions) return;
    const periodLabel = ledger?.month
      ? new Date(ledger.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      : '';
    printDistribution({
      title: 'Profit Distribution Statement',
      periodLabel,
      currencySymbol: settings?.currency_symbol || '$',
      summary: {
        income: ledger?.total_income,
        expense: ledger?.total_expense,
        net: ledger?.net_profit,
      },
      rows: distributions.distributions.map((d, i) => ({
        name: d.shareholder_name || `Shareholder ${i + 1}`,
        percentage: d.share_percentage,
        amount: d.net_profit_share,
      })),
    });
  };

  const openEditPeriod = () => {
    const m = ledger?.month ? new Date(ledger.month).toISOString().split('T')[0].slice(0, 7) : '';
    setEditPeriod({ open: true, month: m, error: '' });
  };

  const handleSavePeriod = async () => {
    if (!editPeriod.month) { setEditPeriod(p => ({ ...p, error: 'Please select a month.' })); return; }
    setSavingPeriod(true);
    try {
      await api.patch(`/ledgers/${ledger.id}`, { month: `${editPeriod.month}-01` });
      setEditPeriod({ open: false, month: '', error: '' });
      await fetchLedger();
    } catch (err) {
      setEditPeriod(p => ({ ...p, error: err.response?.data?.error || 'Failed to update period.' }));
    } finally { setSavingPeriod(false); }
  };

  if (loading) return (
    <Layout title="Close Month">
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-indigo-200/50 border-t-indigo-600 rounded-full animate-spin backdrop-blur-sm" />
      </div>
    </Layout>
  );

  const isClosed = ledger?.status === 'CLOSED';

  return (
    <Layout title="Close Month" subtitle="Finalize ledger and calculate waterfall distributions">
      
      {/* ── Decorative Background Glows ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center opacity-40 dark:opacity-20">
        <div className="absolute top-[5%] right-[10%] w-[400px] h-[400px] bg-rose-400 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-400 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-emerald-400 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 space-y-6 animate-fadeIn">

        {/* ── Status & Action Panel ─────────────────────────────── */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-all">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Ledger Status</p>
            <div className="flex items-center gap-3">
              <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                {ledger ? new Date(ledger.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : ''}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                isClosed 
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isClosed ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                {isClosed ? 'CLOSED' : 'OPEN'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!isClosed && (
              <button
                onClick={openEditPeriod}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-700/50 rounded-lg transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Change Period
              </button>
            )}
            {!isClosed && (
              <button
                onClick={handleCloseClick}
                disabled={closing}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 rounded-lg shadow-lg shadow-rose-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z" /></svg>
                {closing ? 'Processing…' : 'Close & Distribute'}
              </button>
            )}
          </div>
        </div>

        {/* ── Summary KPI Cards ───────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard 
            title="Total Income" 
            value={formatCurrency(ledger?.total_income)} 
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}
            colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          />
          <MetricCard 
            title="Total Expense" 
            value={formatCurrency(ledger?.total_expense)} 
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>}
            colorClass="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
          />
          <MetricCard 
            title="Net Profit" 
            value={formatCurrency(ledger?.net_profit)} 
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
          />
        </div>

        {/* ── Checklist ───────────────────────────────────── */}
        {!isClosed && !distributions && (
          <div className="bg-indigo-500/10 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-3">Pre-Closure Checklist</p>
            <ul className="space-y-2 text-sm font-medium text-indigo-900/80 dark:text-indigo-200/80">
              {[
                'All income and expense transactions are recorded accurately.',
                'Net profit amount has been verified and confirmed.',
                'Shareholder percentages and priorities are configured correctly in Settings.',
                'I understand that closing is permanent and distributions cannot be altered directly.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Distribution Results Table ─────────────────────────── */}
        {distributions && (
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-2xl shadow-sm overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 border-b border-white/40 dark:border-slate-700/30 bg-white/40 dark:bg-slate-800/40 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Distribution Results</h2>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Waterfall calculation applied to net profit</p>
              </div>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/20 transition-colors shadow-sm shrink-0"
                title="Print / Save as PDF"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print PDF
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/30">
                  <tr>
                    {['Shareholder','Share %','Amount Allocated'].map(h => (
                      <th key={h} className={`px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${h === 'Shareholder' ? 'text-left' : 'text-right'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40 dark:divide-slate-800/50">
                  {distributions.distributions.map((d, i) => (
                    <tr key={i} className="hover:bg-white/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">
                        {d.shareholder_name || `Shareholder ${i + 1}`}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-slate-600 dark:text-slate-400">
                        {parseFloat(d.share_percentage || 0).toFixed(2)}%
                      </td>
                      <td className="px-5 py-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(d.net_profit_share)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-indigo-50/50 dark:bg-indigo-500/10 border-t-2 border-indigo-100 dark:border-indigo-500/20">
                    <td colSpan={2} className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
                      Total Distributed
                    </td>
                    <td className="px-5 py-4 text-right font-black text-indigo-700 dark:text-indigo-400 text-base">
                      {formatCurrency(distributions.distributions.reduce((s, d) => s + parseFloat(d.net_profit_share || 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── Correction tip ───────────────────────────────── */}
        {!isClosed && !distributions && (
          <div className="bg-sky-500/10 backdrop-blur-md border border-sky-500/20 rounded-2xl p-4 flex gap-3">
            <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0 text-sky-600 dark:text-sky-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 mb-0.5">Correcting a closed month?</p>
              <p className="text-xs font-medium text-sky-800/80 dark:text-sky-200/80 leading-relaxed">
                Go to <strong>Distributions</strong>, click the <strong>Delete</strong> icon on the targeted month. This will reopen it and move it back here so you can fix transactions and re-close.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* ── Modals ─────────────────────────────────────── */}
      <Modal isOpen={modal.open} title={modal.title} onClose={closeModal}
        onConfirm={modal.type === 'confirm' ? modal.onConfirm : null}
        confirmText="Yes, Close Ledger" confirmColor="danger"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">{modal.msg}</p>
        </div>
      </Modal>

      {/* Edit Period Modal */}
      <Modal
        isOpen={editPeriod.open}
        title="Change Ledger Period"
        onClose={() => setEditPeriod({ open: false, month: '', error: '' })}
        onConfirm={handleSavePeriod}
        confirmText={savingPeriod ? 'Saving…' : 'Save Period'}
        confirmColor="primary"
      >
        <div className="space-y-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
            Change which month this open ledger belongs to. This updates the period for all transactions and the final distribution report.
          </p>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Select Month</label>
            <input
              type="month"
              value={editPeriod.month}
              onChange={e => setEditPeriod(p => ({ ...p, month: e.target.value, error: '' }))}
              className="w-full px-4 py-3 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
            />
          </div>
          {editPeriod.error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-rose-500 text-sm">⚠</span>
              <p className="text-xs font-medium text-rose-700 dark:text-rose-400">{editPeriod.error}</p>
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  );
};

export default CloseLedgerPage;