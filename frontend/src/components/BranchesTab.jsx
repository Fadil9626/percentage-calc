import React, { useState } from 'react';
import api from '../services/api';
import Modal from './Modal';
import { useBranch } from '../context/BranchContext';

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 transition-all outline-none';

/**
 * Branches: add one, rename it, switch it off or on. Each branch keeps its own months, its own
 * shareholders and its own profit split. Switching a branch off keeps everything it holds; staff
 * just stop seeing it.
 */
const BranchesTab = () => {
  const { branches, branchId, fetchBranches } = useBranch();
  const [editing, setEditing] = useState(null); // null = closed, {} = new, branch = rename
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ open: false, title: '', msg: '' });

  const openNew = () => { setEditing({}); setName(''); };
  const openRename = (b) => { setEditing(b); setName(b.name); };

  const save = async () => {
    setSaving(true);
    try {
      if (editing.id) await api.put(`/branches/${editing.id}`, { name });
      else await api.post('/branches', { name });
      setEditing(null);
      await fetchBranches();
    } catch (err) {
      setModal({ open: true, title: 'Not saved', msg: err.response?.data?.error || 'The branch could not be saved.' });
    } finally { setSaving(false); }
  };

  const toggle = async (b) => {
    try {
      await api.put(`/branches/${b.id}`, { is_active: !b.is_active });
      await fetchBranches();
    } catch (err) {
      setModal({ open: true, title: 'Not changed', msg: err.response?.data?.error || 'The branch could not be changed.' });
    }
  };

  return (
    <div data-branches-tab>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Branches</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Each branch has its own months, its own shareholders and its own profit split.
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all hover:-translate-y-0.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Branch
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                {['Branch', 'Months', 'Shareholders', 'Status', ''].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {branches.map((b) => (
                <tr key={b.id} data-branch-row={b.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                    {b.name}
                    {b.id === branchId && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-indigo-500">Viewing</span>}
                  </td>
                  <td className="px-6 py-4 tabular-nums text-slate-500 dark:text-slate-400">{b.months ?? 0}</td>
                  <td className="px-6 py-4 tabular-nums text-slate-500 dark:text-slate-400">{b.shareholders ?? 0}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${b.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${b.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      {b.is_active ? 'Active' : 'Switched off'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openRename(b)}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors"
                      >Rename</button>
                      <button onClick={() => toggle(b)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${b.is_active
                          ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                          : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'}`}
                      >{b.is_active ? 'Switch off' : 'Switch on'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
        A switched-off branch keeps all its months and payouts. Admins can still open it; staff no longer see it.
      </p>

      <Modal
        isOpen={!!editing}
        title={editing?.id ? 'Rename Branch' : 'New Branch'}
        onClose={() => setEditing(null)}
        onConfirm={save}
        confirmText={saving ? 'Saving…' : editing?.id ? 'Save' : 'Add Branch'}
        confirmColor="primary"
      >
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Branch name</label>
        <input data-branch-name-input type="text" value={name} autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), save())}
          className={inputCls}
        />
        {!editing?.id && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
            The new branch starts with no shareholders. Add them under Shareholders with this branch picked at the top.
          </p>
        )}
      </Modal>

      <Modal isOpen={modal.open} title={modal.title} onClose={() => setModal((m) => ({ ...m, open: false }))}>
        <p className="text-sm text-slate-600 dark:text-slate-300">{modal.msg}</p>
      </Modal>
    </div>
  );
};

export default BranchesTab;
