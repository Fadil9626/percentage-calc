import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import api from '../services/api';
import Layout from '../components/Layout';
import { useSettings } from '../context/SettingsContext';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#f43f5e', '#84cc16'];
const EXPENSE_COLORS = ['#f43f5e', '#fb923c', '#a855f7', '#eab308', '#ec4899', '#f472b6', '#fb7185', '#9f1239'];

const CustomTooltip = ({ active, payload, formatCurrency }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/50 dark:border-slate-700/50 rounded-2xl shadow-xl shadow-slate-200/20 dark:shadow-none p-4 text-sm z-50">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: payload[0].payload.fill || payload[0].color }} />
          <p className="font-bold text-slate-800 dark:text-slate-200">{payload[0].name || payload[0].payload.name}</p>
        </div>
        <p className="text-slate-600 dark:text-slate-400 font-medium pl-4">
          <span className="font-extrabold text-slate-900 dark:text-white text-base">{formatCurrency(payload[0].value)}</span>
        </p>
      </div>
    );
  }
  return null;
};

/* ── Glassy Metric Card Component ── */
const MetricCard = ({ title, value, subtitle, icon, colorClass }) => (
  <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 rounded-[2rem] shadow-lg shadow-slate-200/5 dark:shadow-none p-6 flex items-center gap-5 transition-all duration-300 hover:bg-white/80 dark:hover:bg-slate-900/80 hover:-translate-y-1">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${colorClass}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{title}</p>
      <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{value}</p>
      {subtitle && <p className="text-xs font-semibold text-slate-400 mt-1">{subtitle}</p>}
    </div>
  </div>
);

const AnalyticsPage = () => {
  const { formatCurrency, settings } = useSettings();
  const [ledgers, setLedgers]     = useState([]);
  const [selectedLedger, setSelectedLedger] = useState('all');
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetchLedgers = useCallback(async () => {
    try {
      const r = await api.get('/ledgers/history');
      setLedgers(r.data);
    } catch { /* silent */ }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/ledgers/analytics', { params: { ledger_id: selectedLedger } });
      setAnalytics(r.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [selectedLedger]);

  useEffect(() => { fetchLedgers(); }, [fetchLedgers]);
  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // Process Data
  const incomes = analytics.filter(a => a.type === 'INCOME').map((a, i) => ({ 
    name: a.category, 
    value: parseFloat(a.total_amount),
    fill: COLORS[i % COLORS.length]
  }));
  
  const expenses = analytics.filter(a => a.type === 'EXPENSE').map((a, i) => ({ 
    name: a.category, 
    value: parseFloat(a.total_amount),
    fill: EXPENSE_COLORS[i % EXPENSE_COLORS.length]
  }));

  // Calculate Metrics
  const totalIncome = incomes.reduce((sum, item) => sum + item.value, 0);
  const totalExpense = expenses.reduce((sum, item) => sum + item.value, 0);
  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0;

  // Top Expenses for Bar Chart
  const topExpenses = [...expenses].sort((a, b) => b.value - a.value).slice(0, 5);

  return (
    <Layout title="Analytics" subtitle="Category breakdown and insights">
      
      {/* ── Decorative Background Glows ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center opacity-40 dark:opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-400 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse"></div>
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-emerald-400 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-rose-400 rounded-full mix-blend-multiply filter blur-[150px] animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 space-y-8">
        
        {/* ── Header Filters ── */}
        <div className="flex items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-50/50 dark:bg-indigo-500/20 border border-white/50 dark:border-slate-700/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm backdrop-blur-md">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">Filter Period</label>
              <select
                value={selectedLedger}
                onChange={e => setSelectedLedger(e.target.value)}
                className="bg-transparent text-sm font-extrabold text-slate-800 dark:text-slate-100 border-none p-0 focus:ring-0 cursor-pointer outline-none"
              >
                {/* FIX: Explicitly set background and text colors on the options so they are readable in dark mode */}
                <option value="all" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold">
                  All Time History
                </option>
                {ledgers.map(l => (
                  <option key={l.id} value={l.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold">
                    {new Date(l.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-indigo-200/50 border-t-indigo-600 rounded-full animate-spin backdrop-blur-sm" />
          </div>
        ) : (
          <>
            {/* ── KPI Summary Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              <MetricCard 
                title="Total Revenue" 
                value={formatCurrency(totalIncome)} 
                icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}
                colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              />
              <MetricCard 
                title="Total Expenses" 
                value={formatCurrency(totalExpense)} 
                icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>}
                colorClass="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              />
              <MetricCard 
                title="Net Profit" 
                value={formatCurrency(netProfit)} 
                icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
              />
              <MetricCard 
                title="Profit Margin" 
                value={`${profitMargin}%`} 
                subtitle="Of total revenue"
                icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>}
                colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
              />
            </div>

            {/* ── Pie Charts ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Income Breakdown Glass Card */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 rounded-[2rem] shadow-2xl shadow-emerald-500/5 dark:shadow-none p-8 flex flex-col transition-all duration-300 hover:bg-white/70 dark:hover:bg-slate-900/70">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Income Sources</h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Revenue stream breakdown</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  </div>
                </div>
                
                {incomes.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60 py-12">
                    <svg className="w-12 h-12 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 12H4" /></svg>
                    <p className="text-slate-500 font-medium">No income data available.</p>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row items-center gap-8 flex-1">
                    <div className="w-full lg:w-1/2 h-[280px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={incomes}
                            cx="50%" cy="50%"
                            innerRadius={75} outerRadius={105}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="rgba(255,255,255,0.4)"
                            strokeWidth={3}
                            cornerRadius={8}
                          >
                            {incomes.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} className="drop-shadow-sm outline-none" />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} cursor={false} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total</span>
                        <span className="text-xl font-black text-slate-800 dark:text-slate-100">
                          {settings?.currency_symbol || '$'}
                          {(totalIncome / 1000).toFixed(1)}k
                        </span>
                      </div>
                    </div>
                    
                    <div className="w-full lg:w-1/2 space-y-3">
                      {incomes.map((inc, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-slate-700/30 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="w-3.5 h-3.5 rounded-full shadow-inner" style={{ backgroundColor: inc.fill }} />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{inc.name}</span>
                          </div>
                          <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{formatCurrency(inc.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Expense Breakdown Glass Card */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 rounded-[2rem] shadow-2xl shadow-rose-500/5 dark:shadow-none p-8 flex flex-col transition-all duration-300 hover:bg-white/70 dark:hover:bg-slate-900/70">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Expense Distribution</h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Where funds are allocated</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                  </div>
                </div>
                
                {expenses.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60 py-12">
                    <svg className="w-12 h-12 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 12H4" /></svg>
                    <p className="text-slate-500 font-medium">No expense data available.</p>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row items-center gap-8 flex-1">
                    <div className="w-full lg:w-1/2 h-[280px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenses}
                            cx="50%" cy="50%"
                            innerRadius={75} outerRadius={105}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="rgba(255,255,255,0.4)"
                            strokeWidth={3}
                            cornerRadius={8}
                          >
                            {expenses.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} className="drop-shadow-sm outline-none" />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} cursor={false} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total</span>
                        <span className="text-xl font-black text-slate-800 dark:text-slate-100">
                           {settings?.currency_symbol || '$'}
                           {(totalExpense / 1000).toFixed(1)}k
                        </span>
                      </div>
                    </div>
                    
                    <div className="w-full lg:w-1/2 space-y-3">
                      {expenses.map((exp, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-slate-700/30 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="w-3.5 h-3.5 rounded-full shadow-inner" style={{ backgroundColor: exp.fill }} />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{exp.name}</span>
                          </div>
                          <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{formatCurrency(exp.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Top Expenses Bar Chart ── */}
            {topExpenses.length > 0 && (
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 rounded-[2rem] shadow-2xl shadow-indigo-500/5 dark:shadow-none p-8 transition-all duration-300 hover:bg-white/70 dark:hover:bg-slate-900/70">
                <div className="mb-8">
                  <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Top Expenses by Volume</h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Largest capital outflows for the selected period</p>
                </div>
                
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topExpenses}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#cbd5e1" opacity={0.2} />
                      <XAxis type="number" tickFormatter={v => `${settings?.currency_symbol || '$'}${(v/1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} cursor={{fill: 'rgba(148, 163, 184, 0.1)'}} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                        {topExpenses.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default AnalyticsPage;