import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, BarChart, Bar,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import api from '../services/api';
import Layout from '../components/Layout';
import Modal from '../components/Modal';

/* ── Custom Liquid Glass Tooltip for Charts ──────────────── */
const ChartTooltip = ({ active, payload, label, formatCurrency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/50 dark:border-slate-700/50 rounded-xl shadow-xl shadow-slate-200/20 dark:shadow-none p-3 text-sm z-50">
      <p className="font-bold text-slate-800 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-700 pb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-5 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: p.color }} />
            <span className="text-slate-500 dark:text-slate-400 font-medium capitalize text-xs">{p.name}</span>
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Compact Premium Quick Action Card ──────────────────────── */
const ActionCard = ({ title, description, onClick, icon, color }) => {
  const colors = {
    indigo: 'text-indigo-600 bg-indigo-50/50 dark:bg-indigo-500/10 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white',
    rose:   'text-rose-600 bg-rose-50/50 dark:bg-rose-500/10 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white',
    amber:  'text-amber-600 bg-amber-50/50 dark:bg-amber-500/10 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white',
    slate:  'text-slate-600 bg-slate-100/50 dark:bg-slate-800/50 dark:text-slate-300 group-hover:bg-slate-800 group-hover:text-white dark:group-hover:bg-slate-700',
  };

  return (
    <button
      onClick={onClick}
      className="group text-left w-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/20 dark:hover:shadow-none hover:-translate-y-0.5"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors duration-300 ${colors[color]}`}>
        {icon}
      </div>
      <p className="font-bold text-slate-800 dark:text-slate-100 mb-1 text-base">{title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium line-clamp-2">{description}</p>
    </button>
  );
};

/* ── Main dashboard ─────────────────────────────────────────── */
const DashboardPage = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { formatCurrency, settings } = useSettings();

  const [ledger, setLedger]         = useState(null);
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [starting, setStarting]     = useState(false);
  const [chartType, setChartType]   = useState('area');
  const [newLedgerModal, setNewLedgerModal] = useState({ open: false, month: '' });
  const [startError, setStartError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [ledgerRes, histRes] = await Promise.all([
        api.get('/ledgers/current'),
        api.get('/ledgers/history'),
      ]);
      setLedger(ledgerRes.data);
      setHistory(histRes.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNewLedgerModal = () => {
    const base = ledger ? new Date(ledger.month) : new Date();
    base.setMonth(base.getMonth() + 1);
    const defaultMonth = base.toISOString().split('T')[0].slice(0, 7);
    setStartError('');
    setNewLedgerModal({ open: true, month: defaultMonth });
  };

  const startNextMonth = async () => {
    setStarting(true);
    setStartError('');
    try {
      await api.post('/ledgers/current/next', { month: newLedgerModal.month });
      setNewLedgerModal({ open: false, month: '' });
      await fetchData();
    } catch (err) {
      setStartError(err.response?.data?.error || 'Failed to start next month.');
    } finally { setStarting(false); }
  };

  const goTo = (path) => () => navigate(path);

  /* Chart data */
  const chartData = history.map(l => ({
    month: new Date(l.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    Income: parseFloat(l.total_income || 0),
    Expense: parseFloat(l.total_expense || 0),
    Profit: parseFloat(l.net_profit || 0),
  }));

  /* Stats across all history */
  const closedHistory  = history.filter(l => l.status === 'CLOSED');
  const closedMonths   = closedHistory.length;
  const totalProfit    = closedHistory.reduce((s, l) => s + parseFloat(l.net_profit || 0), 0);
  const avgMonthProfit = closedMonths > 0 ? totalProfit / closedMonths : 0;
  const bestMonth      = closedHistory.reduce(
    (best, l) => parseFloat(l.net_profit) > parseFloat(best?.net_profit || 0) ? l : best,
    null
  );

  const monthStr = ledger ? new Date(ledger.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : '';
  const isClosed = ledger?.status === 'CLOSED';

  // Header Actions
  const HeaderActions = () => (
    <div className="flex items-center gap-3">
      {isClosed && hasRole('ADMIN') && (
        <button
          onClick={openNewLedgerModal}
          disabled={starting}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200 dark:shadow-none transition-all hover:-translate-y-0.5 disabled:opacity-50"
        >
          <span>Start Next Month</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
        </button>
      )}
    </div>
  );

  if (loading) return (
    <Layout title="Dashboard">
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-indigo-200/50 border-t-indigo-600 rounded-full animate-spin backdrop-blur-sm" />
      </div>
    </Layout>
  );

  return (
    <Layout 
      title="Overview" 
      subtitle={monthStr ? (
        <div className="flex items-center gap-2">
          <span className="text-sm">Period: {monthStr}</span>
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            isClosed 
              ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' 
              : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
          }`}>
            <span className={`w-1 h-1 rounded-full ${isClosed ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {ledger?.status}
          </span>
        </div>
      ) : 'Loading…'}
      headerAction={<HeaderActions />}
    >
      
      {/* ── Decorative Background Glows ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center opacity-40 dark:opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-400 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-rose-400 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-emerald-400 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 space-y-6 animate-fadeIn">

        {/* ── NEW: Status & Action Panel (Visible when Closed) ─────────────────────────────── */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-all">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Current Ledger Status</p>
            <div className="flex items-center gap-3">
              <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                {monthStr || 'Loading...'}
              </span>
              {ledger && (
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  isClosed 
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isClosed ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  {isClosed ? 'LOCKED & CLOSED' : 'ACTIVE & OPEN'}
                </span>
              )}
            </div>
            {isClosed && (
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                This period is finalized. Start the next month to record new transactions.
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {isClosed && hasRole('ADMIN') && (
              <button
                onClick={openNewLedgerModal}
                disabled={starting}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-lg shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                Open Next Month
              </button>
            )}
          </div>
        </div>

        {/* ── Compact Hero Stat Cards (Glassy Tints) ─────────────────────────────────── */}
        {ledger && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="relative overflow-hidden rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/20 p-5 shadow-sm">
              <div className="relative z-10">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-0.5 uppercase tracking-wider">This Month Income</p>
                <p className="text-2xl font-extrabold tracking-tight text-emerald-900 dark:text-emerald-100">{formatCurrency(ledger.total_income)}</p>
              </div>
              <svg className="absolute -right-2 -bottom-2 w-20 h-20 text-emerald-500/10 dark:text-emerald-400/10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" /></svg>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 backdrop-blur-xl border border-rose-500/20 p-5 shadow-sm">
              <div className="relative z-10">
                <p className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-0.5 uppercase tracking-wider">This Month Expense</p>
                <p className="text-2xl font-extrabold tracking-tight text-rose-900 dark:text-rose-100">{formatCurrency(ledger.total_expense)}</p>
              </div>
              <svg className="absolute -right-2 -bottom-2 w-20 h-20 text-rose-500/10 dark:text-rose-400/10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" /></svg>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 backdrop-blur-xl border border-indigo-500/20 p-5 shadow-sm">
              <div className="relative z-10">
                <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-0.5 uppercase tracking-wider">Net Profit</p>
                <p className="text-2xl font-extrabold tracking-tight text-indigo-900 dark:text-indigo-100">{formatCurrency(ledger.net_profit)}</p>
              </div>
              <svg className="absolute -right-2 -bottom-2 w-20 h-20 text-indigo-500/10 dark:text-indigo-400/10" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
            </div>

          </div>
        )}

        {/* ── Quick Actions ─────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 pl-1">Quick Launch</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {(hasRole('DATA_ENTRY') || hasRole('ADMIN')) && (
              <ActionCard 
                color={isClosed ? "slate" : "indigo"} 
                title="Transactions" 
                description={isClosed ? "Ledger locked. Open next month." : "Record items to the ledger."} 
                onClick={isClosed && hasRole('ADMIN') ? openNewLedgerModal : goTo('/transactions')}
                icon={isClosed ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                )}
              />
            )}
            {hasRole('ADMIN') && (
              <>
                <ActionCard 
                  color="rose" title="Close Month" description="Finalize the current ledger." onClick={goTo('/close-ledger')}
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <ActionCard 
                  color="amber" title="Distributions" description="Review historical profit shares." onClick={goTo('/distributions')}
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                />
                <ActionCard 
                  color="slate" title="Settings" description="Configure global system options." onClick={goTo('/settings')}
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                />
              </>
            )}
          </div>
        </div>

        {/* ── Charts & History Layout ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-2xl shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Financial Trend</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Income vs Expense across all periods</p>
              </div>
              
              <div className="p-1 bg-white/50 dark:bg-slate-800/50 rounded-lg flex items-center shrink-0 border border-slate-200/50 dark:border-slate-700/50">
                {['area', 'bar'].map(t => (
                  <button key={t} type="button" onClick={() => setChartType(t)}
                    className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${
                      chartType === t
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'area' ? (
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, bottom: 0, left: -25 }}>
                      <defs>
                        <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={v => `${settings?.currency_symbol || '$'}${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<ChartTooltip formatCurrency={formatCurrency} />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#475569', paddingTop: '15px' }} />
                      <Area type="monotone" dataKey="Income"  stroke="#10b981" strokeWidth={2} fill="url(#gIncome)"  dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                      <Area type="monotone" dataKey="Expense" stroke="#f43f5e" strokeWidth={2} fill="url(#gExpense)" dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }} />
                      <Area type="monotone" dataKey="Profit"  stroke="#6366f1" strokeWidth={2} fill="url(#gProfit)"  dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 5, right: 0, bottom: 0, left: -25 }} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={v => `${settings?.currency_symbol || '$'}${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<ChartTooltip formatCurrency={formatCurrency} />} cursor={{fill: '#f8fafc'}} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#475569', paddingTop: '15px' }} />
                      <Bar dataKey="Income"  fill="#10b981" radius={[3,3,0,0]} maxBarSize={30} />
                      <Bar dataKey="Expense" fill="#f43f5e" radius={[3,3,0,0]} maxBarSize={30} />
                      <Bar dataKey="Profit"  fill="#6366f1" radius={[3,3,0,0]} maxBarSize={30} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex flex-col items-center justify-center text-center">
                <svg className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                <p className="text-xs text-slate-500 font-medium">No historical data available yet.</p>
              </div>
            )}
          </div>

          {/* All-Time Historical Stats (Sidebar) */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 pl-1">Historical Summary</h2>
            
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Closed Months</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-slate-200">{closedMonths}</p>
              </div>
              <div className="w-10 h-10 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Total Lifetime Profit</p>
                <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">{formatCurrency(totalProfit)}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50/50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 border border-indigo-200/50 dark:border-indigo-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Avg. Monthly Profit</p>
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(avgMonthProfit)}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50/50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-200/50 dark:border-emerald-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Best Month</p>
                <p className="text-lg font-extrabold text-violet-600 dark:text-violet-400">
                  {bestMonth ? new Date(bestMonth.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                </p>
                {bestMonth && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{formatCurrency(bestMonth.net_profit)}</p>}
              </div>
              <div className="w-10 h-10 bg-violet-50/50 dark:bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-500 border border-violet-200/50 dark:border-violet-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ── New ledger month picker modal ── */}
      <Modal
        isOpen={newLedgerModal.open}
        title="Start New Ledger Period"
        onClose={() => setNewLedgerModal({ open: false, month: '' })}
        onConfirm={startNextMonth}
        confirmText={starting ? 'Starting…' : 'Open Ledger'}
        confirmColor="primary"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-100/50 dark:border-indigo-500/20">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-xs font-medium leading-relaxed">
              Choose the month for the new ledger period. It will open as an active cycle ready to receive new income and expense transactions.
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Select Month</label>
            <input
              type="month"
              value={newLedgerModal.month}
              onChange={e => setNewLedgerModal(m => ({ ...m, month: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
            />
          </div>
          {startError && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-500/20">
              <span className="text-rose-500 text-sm">⚠</span>
              <p className="text-xs font-medium text-rose-700 dark:text-rose-400">{startError}</p>
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  );
};

export default DashboardPage;