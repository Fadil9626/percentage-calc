import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';
import { useSettings } from '../context/SettingsContext';
import { useBranch } from '../context/BranchContext';

const monthName = (m) => {
  if (!m) return '';
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const Tile = ({ label, value, tone }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
    <p className={`mt-1.5 text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
  </div>
);

const StatusPill = ({ row }) => {
  if (!row.ledger_id) return <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Not opened</span>;
  const closed = row.status === 'CLOSED';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${closed
      ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
      : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${closed ? 'bg-slate-400' : 'bg-emerald-500'}`} />
      {closed ? 'Closed' : 'Open'}
    </span>
  );
};

/**
 * All branches side by side for one month: what each took in, spent and made, and whether its
 * month is closed. "Open" switches the app to that branch.
 */
const BranchOverviewPage = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const { chooseBranch } = useBranch();
  const [data, setData] = useState(null);
  const [month, setMonth] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (m) => {
    try {
      const { data: d } = await api.get('/branches/summary', { params: m ? { month: m } : {} });
      setData(d); setMonth(d.month || ''); setError('');
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load the branches.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = (id) => { navigate('/dashboard'); chooseBranch(id); };

  // The bar shows each branch's share of the profit made (branches at a loss show none).
  const positive = (data?.branches || []).reduce((a, r) => a + Math.max(0, Number(r.net)), 0);
  const net = Number(data?.totals?.net || 0);

  return (
    <Layout title="All Branches" subtitle="Every branch side by side for one month">
      {error && <p className="mb-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {!data ? (
        !error && (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )
      ) : (
        <div className="space-y-6 max-w-6xl" data-branch-overview>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{month ? monthName(month) : 'No months yet'}</h2>
            {data.months.length > 0 && (
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Month
                <select data-overview-month value={month} onChange={(e) => load(e.target.value)}
                  className="text-sm font-semibold pl-3 pr-8 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-400">
                  {data.months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
                </select>
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Tile label="Income, all branches" value={formatCurrency(data.totals.income)} tone="text-emerald-600 dark:text-emerald-400" />
            <Tile label="Expenses, all branches" value={formatCurrency(data.totals.expense)} tone="text-rose-600 dark:text-rose-400" />
            <Tile label="Profit, all branches" value={formatCurrency(data.totals.net)}
              tone={net < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'} />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    {['Branch', 'Status', 'Entries', 'Income', 'Expenses', 'Profit', 'Share of profit', ''].map((h, i) => (
                      <th key={h || i} className={`px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${i >= 2 && i <= 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {data.branches.map((r) => {
                    const n = Number(r.net);
                    const share = positive > 0 && n > 0 ? (n / positive) * 100 : 0;
                    return (
                      <tr key={r.id} data-overview-row={r.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200">
                          {r.name}
                          {!r.is_active && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Switched off</span>}
                        </td>
                        <td className="px-5 py-4"><StatusPill row={r} /></td>
                        <td className="px-5 py-4 text-right tabular-nums text-slate-500 dark:text-slate-400">{r.ledger_id ? r.entries : '—'}</td>
                        <td className="px-5 py-4 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(r.income)}</td>
                        <td className="px-5 py-4 text-right tabular-nums text-rose-600 dark:text-rose-400">{formatCurrency(r.expense)}</td>
                        <td data-overview-net className={`px-5 py-4 text-right tabular-nums font-semibold ${n < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>{formatCurrency(r.net)}</td>
                        <td className="px-5 py-4 min-w-[160px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${share}%` }} />
                            </div>
                            <span className="w-10 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">{share ? `${share.toFixed(0)}%` : '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => open(r.id)}
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors">
                            Open
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Each branch splits its own profit among its own shareholders when its month is closed. These totals are for comparison only.
          </p>
        </div>
      )}
    </Layout>
  );
};

export default BranchOverviewPage;
