import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
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

/* ── UI Components ──────────────────────────────────────── */
const Pill = ({ children, color = 'slate' }) => {
  const cls = { 
    slate: 'bg-slate-100/50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200/50 dark:border-slate-700/50', 
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20', 
    rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20' 
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cls[color]}`}>{children}</span>;
};

// Icons for the table actions
const EditIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const TransactionsPage = () => {
  const { hasRole } = useAuth();
  const { formatCurrency, incomeCategories, expenseCategories, settings } = useSettings();

  const [ledger, setLedger]             = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [formData, setFormData]         = useState({ type: 'INCOME', description: '', amount: '', category: '' });
  const [editTx, setEditTx]             = useState({ open: false, id: null, type: 'INCOME', description: '', amount: '', category: '', error: '' });
  const [modal, setModal]               = useState({ open: false, type: 'alert', title: '', msg: '', onConfirm: null });

  const closeModal = () => setModal(m => ({ ...m, open: false }));
  const alertModal = (title, msg) => setModal({ open: true, type: 'alert', title, msg, onConfirm: null });
  const confirmModal = (title, msg, onConfirm) => setModal({ open: true, type: 'confirm', title, msg, onConfirm });

  const fetchLedger = useCallback(async () => {
    try {
      const r = await api.get('/ledgers/current');
      setLedger(r.data);
    } catch { alertModal('Error', 'Failed to load ledger'); }
    finally { setLoading(false); }
  }, []);

  const fetchTransactions = useCallback(async () => {
    if (!ledger) return;
    try {
      const r = await api.get(`/ledgers/${ledger.id}/transactions`);
      setTransactions(r.data);
    } catch { /* silent */ }
  }, [ledger]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);
  useEffect(() => { if (ledger) fetchTransactions(); }, [ledger, fetchTransactions]);

  const handleExport = () => {
    if (transactions.length === 0) return;
    const exportData = transactions.map(tx => ({
      Date: tx.created_at ? new Date(tx.created_at).toISOString().split('T')[0] : '',
      Type: tx.type,
      Category: tx.category || '',
      Description: tx.description,
      Amount: tx.amount,
      CreatedBy: tx.created_by_name
    }));
    downloadCSV(exportData, `transactions_${ledger.month}.csv`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) {
      alertModal('Validation', 'Please fill in description and amount.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/ledgers/current/transactions', {
        ledger_id: ledger.id, ...formData, amount: parseFloat(formData.amount),
      });
      setFormData({ type: 'INCOME', description: '', amount: '', category: '' });
      await fetchLedger();
      alertModal('Success', 'Transaction added successfully.');
    } catch (err) {
      alertModal('Error', err.response?.data?.error || 'Failed to add transaction.');
    } finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    confirmModal(
      'Delete Transaction',
      'This will permanently remove the transaction and recalculate ledger totals.',
      async () => {
        try {
          await api.delete(`/ledgers/${ledger.id}/transactions/${id}`);
          await fetchLedger();
          closeModal();
        } catch (err) {
          alertModal('Error', err.response?.data?.error || 'Failed to delete.');
        }
      }
    );
  };

  const openEdit = (tx) => setEditTx({
    open: true, id: tx.id,
    type: tx.type, description: tx.description,
    amount: parseFloat(tx.amount).toFixed(2),
    category: tx.category || '',
    error: '', saving: false,
  });

  const handleEditSave = async () => {
    if (!editTx.description || !editTx.amount) {
      setEditTx(e => ({ ...e, error: 'Description and amount are required.' }));
      return;
    }
    setEditTx(e => ({ ...e, saving: true, error: '' }));
    try {
      await api.patch(`/ledgers/${ledger.id}/transactions/${editTx.id}`, {
        type: editTx.type,
        description: editTx.description,
        amount: parseFloat(editTx.amount),
        category: editTx.category,
      });
      setEditTx(e => ({ ...e, open: false }));
      await fetchLedger();
    } catch (err) {
      setEditTx(e => ({ ...e, error: err.response?.data?.error || 'Failed to update.', saving: false }));
    }
  };

  const isClosed = ledger?.status === 'CLOSED';
  const monthStr = ledger ? new Date(ledger.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : '';

  // Custom Header Action for Layout
  const HeaderActions = () => (
    <div className="flex items-center gap-3">
      {transactions.length > 0 && (
        <button onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/50 rounded-lg border border-slate-200/50 dark:border-slate-700/50 transition-colors backdrop-blur-md shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      )}
    </div>
  );

  if (loading) return (
    <Layout title="Transactions">
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-indigo-200/50 border-t-indigo-600 rounded-full animate-spin backdrop-blur-sm" />
      </div>
    </Layout>
  );

  return (
    <Layout
      title="Transactions"
      subtitle={monthStr ? (
        <div className="flex items-center gap-2">
          <span className="text-sm">Period: {monthStr}</span>
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            isClosed 
              ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' 
              : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
          }`}>
            <span className={`w-1 h-1 rounded-full ${isClosed ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {isClosed ? 'CLOSED' : 'OPEN'}
          </span>
        </div>
      ) : 'Loading…'}
      headerAction={<HeaderActions />}
    >
      
      {/* ── Decorative Background Glows ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center opacity-40 dark:opacity-20">
        <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-emerald-400 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-rose-400 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[30%] left-[30%] w-[300px] h-[300px] bg-indigo-400 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 space-y-6 animate-fadeIn">

        {/* ── Compact Glassy Stat Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* ── Add Form (Glassy) ───────────────────────────────────── */}
          {!isClosed && (hasRole('DATA_ENTRY') || hasRole('ADMIN')) && (
            <div className="xl:col-span-1">
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-2xl shadow-sm p-5 sticky top-6 transition-all">
                
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Add Record</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Segmented Control for Type */}
                  <div className="p-1 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-lg flex items-center border border-white/50 dark:border-slate-700/50 shadow-inner">
                    {['INCOME','EXPENSE'].map(t => (
                      <button key={t} type="button"
                        onClick={() => setFormData(f => ({ ...f, type: t }))}
                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${
                          formData.type === t
                            ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Amount (Hero Input) */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Amount</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">
                        {settings?.currency_symbol || '$'}
                      </span>
                      <input type="number" value={formData.amount} required min="0.01" step="0.01"
                        onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))}
                        placeholder="0.00"
                        className="w-full pl-8 pr-3.5 py-2.5 text-sm font-bold border border-white/40 dark:border-slate-700/50 rounded-xl bg-white/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:bg-white/80 dark:focus:bg-slate-900/80 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:font-normal outline-none shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Description</label>
                    <input type="text" value={formData.description} required
                      onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                      placeholder="What was this for?"
                      className="w-full px-3.5 py-2.5 text-xs font-semibold border border-white/40 dark:border-slate-700/50 rounded-xl bg-white/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:bg-white/80 dark:focus:bg-slate-900/80 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none shadow-inner"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Category <span className="font-normal lowercase">(Optional)</span></label>
                    <input type="text" value={formData.category} list="category-suggestions"
                      onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                      placeholder="Select or type category"
                      className="w-full px-3.5 py-2.5 text-xs font-semibold border border-white/40 dark:border-slate-700/50 rounded-xl bg-white/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:bg-white/80 dark:focus:bg-slate-900/80 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none shadow-inner"
                    />
                    <datalist id="category-suggestions">
                      {(formData.type === 'INCOME' ? incomeCategories : expenseCategories).map(name => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>

                  <button type="submit" disabled={saving}
                    className="w-full py-3 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-md shadow-indigo-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 mt-2 border border-white/10"
                  >
                    {saving ? 'Processing...' : 'Save Transaction'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── Transactions Table (Glassy) ─────────────────────────── */}
          <div className={isClosed || !(hasRole('DATA_ENTRY') || hasRole('ADMIN')) ? 'xl:col-span-3' : 'xl:col-span-2'}>
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-2xl shadow-sm overflow-hidden h-full flex flex-col transition-all">
              
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/40 dark:border-slate-700/30 bg-white/40 dark:bg-slate-800/40 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Ledger Records</h2>
                  {isClosed && <Pill color="rose">Closed</Pill>}
                </div>
              </div>

              {/* Table Content */}
              <div className="flex-1 overflow-x-auto">
                {transactions.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center opacity-60">
                    <div className="w-12 h-12 bg-slate-100/50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-bold">No transactions recorded yet.</p>
                    <p className="text-xs text-slate-500 mt-1">Add a new transaction to see it here.</p>
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-white/40 dark:border-slate-700/30">
                        <th className="px-5 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date & Details</th>
                        <th className="px-5 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</th>
                        <th className="px-5 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Amount</th>
                        {!isClosed && (hasRole('DATA_ENTRY') || hasRole('ADMIN')) && (
                          <th className="px-5 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/40 dark:divide-slate-800/50 bg-white/30 dark:bg-slate-900/30">
                      {transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-white/50 dark:hover:bg-slate-800/40 transition-colors group">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-1.5 h-1.5 rounded-full shadow-sm shrink-0 ${tx.type === 'INCOME' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-0.5">{tx.description}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                  {new Date(tx.created_at).toLocaleDateString()} • {tx.created_by_name}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-medium">
                            {tx.category ? <Pill>{tx.category}</Pill> : <span className="text-slate-400">—</span>}
                          </td>
                          <td className={`px-5 py-3.5 font-black text-right text-sm tracking-tight ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </td>
                          
                          {!isClosed && (hasRole('DATA_ENTRY') || hasRole('ADMIN')) && (
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEdit(tx)} title="Edit"
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-500/10 dark:hover:text-indigo-400 rounded-md transition-all"
                                >
                                  <EditIcon />
                                </button>
                                <button onClick={() => handleDelete(tx.id)} title="Delete"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 dark:hover:text-rose-400 rounded-md transition-all"
                                >
                                  <DeleteIcon />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────── */}
      <Modal isOpen={modal.open} title={modal.title}
        onClose={closeModal}
        onConfirm={modal.type === 'confirm' ? modal.onConfirm : null}
        confirmText="Delete" confirmColor="danger"
      >
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{modal.msg}</p>
      </Modal>

      <Modal
        isOpen={editTx.open}
        title="Edit Transaction"
        onClose={() => setEditTx(e => ({ ...e, open: false }))}
        onConfirm={handleEditSave}
        confirmText={editTx.saving ? 'Saving…' : 'Save Changes'}
        confirmColor="primary"
      >
        <div className="space-y-4">
          <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center border border-slate-200 dark:border-slate-700">
            {['INCOME','EXPENSE'].map(t => (
              <button key={t} type="button"
                onClick={() => setEditTx(e => ({ ...e, type: t, category: '' }))}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${
                  editTx.type === t
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Category</label>
            <input type="text" value={editTx.category} list="edit-category-suggestions"
              onChange={e => setEditTx(f => ({ ...f, category: e.target.value }))}
              placeholder="e.g. Sales, Rent…"
              className="w-full px-3.5 py-2.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
            />
            <datalist id="edit-category-suggestions">
              {(editTx.type === 'INCOME' ? incomeCategories : expenseCategories).map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Description <span className="text-rose-400">*</span></label>
            <input type="text" value={editTx.description} required
              onChange={e => setEditTx(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Amount <span className="text-rose-400">*</span></label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">
                 {settings?.currency_symbol || '$'}
              </span>
              <input type="number" value={editTx.amount} required min="0.01" step="0.01"
                onChange={e => setEditTx(f => ({ ...f, amount: e.target.value }))}
                className="w-full pl-8 pr-3.5 py-2.5 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
              />
            </div>
          </div>
          {editTx.error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-rose-500 text-sm">⚠</span>
              <p className="text-xs font-medium text-rose-700 dark:text-rose-400">{editTx.error}</p>
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  );
};

export default TransactionsPage;