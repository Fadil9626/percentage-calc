import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Modal from './Modal';
import { useBranch } from '../context/BranchContext';

const ROLES = ['ADMIN', 'PARTNER', 'DATA_ENTRY'];

const RoleBadge = ({ role }) => {
  const styles = {
    ADMIN:      'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
    PARTNER:    'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
    DATA_ENTRY: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${styles[role] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
      {role}
    </span>
  );
};

const UsersTab = () => {
  const { branches, branchId } = useBranch();
  const branchName = (id) => branches.find((b) => b.id === id)?.name;
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  
  // Edit/Create State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData]     = useState({ email: '', password: '', name: '', role: 'DATA_ENTRY' });
  const [saving, setSaving]         = useState(false);
  
  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete]           = useState(null);
  const [deleting, setDeleting]                   = useState(false);

  // Generic Alert Modal State
  const [modal, setModal]           = useState({ open: false, title: '', msg: '' });

  const alertModal = (title, msg) => setModal({ open: true, title, msg });
  const closeAlert = () => setModal(m => ({ ...m, open: false }));

  const fetchUsers = useCallback(async () => {
    try {
      const r = await api.get('/auth/users');
      setUsers(r.data);
    } catch { alertModal('Error', 'Failed to fetch users.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreate = () => {
    setEditingUser(null);
    // A new staff member starts in the branch being viewed; change it below.
    setFormData({ email: '', password: '', name: '', role: 'DATA_ENTRY', branch_ids: branchId ? [branchId] : [] });
    setIsModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setFormData({ email: user.email, password: '', name: user.name, role: user.role, branch_ids: user.branch_ids || [] });
    setIsModalOpen(true);
  };

  const openDelete = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || (!editingUser && !formData.password)) {
      alertModal('Validation', 'Name and password are required.');
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        await api.put(`/auth/users/${editingUser.id}`, { name: formData.name, role: formData.role, branch_ids: formData.branch_ids });
      } else {
        await api.post('/auth/users', formData);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      alertModal('Error', err.response?.data?.error || 'Failed to save user.');
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/auth/users/${userToDelete.id}`);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      alertModal('Error', err.response?.data?.error || 'Failed to delete user.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Header action */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">System Users</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage system accounts and access roles. ({users.length} total)</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New User
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                {['Name','Email','Role','Branches','Status',''].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{u.name}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{u.email}</td>
                  <td className="px-6 py-4"><RoleBadge role={u.role} /></td>
                  <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400" data-user-branches={u.email}>
                    {u.role === 'ADMIN' ? 'All branches' : (u.branch_ids || []).map(branchName).filter(Boolean).join(', ') || <span className="text-rose-500">None</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(u)}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors"
                      >Edit</button>
                      <button onClick={() => openDelete(u)}
                        className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-3 py-1.5 rounded-lg transition-colors"
                      >Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-16 text-center text-sm text-slate-400 dark:text-slate-500">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        title={editingUser ? 'Edit User' : 'Create User'}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleSave}
        confirmText={saving ? 'Saving…' : editingUser ? 'Save Changes' : 'Create User'}
        confirmColor="primary"
      >
        <div className="space-y-4">
          {!editingUser && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Email</label>
              <input type="email" value={formData.email} required
                onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 transition-all"
              />
            </div>
          )}
          {!editingUser && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Password</label>
              <input type="password" value={formData.password} required
                onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 transition-all"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Display Name</label>
            <input type="text" value={formData.name} required
              onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(r => (
                <button key={r} type="button"
                  onClick={() => setFormData(f => ({ ...f, role: r }))}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    formData.role === r
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-none'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >{r.replace('_',' ')}</button>
              ))}
            </div>
          </div>
          {/* Admins work in every branch; everybody else only in the ones ticked here. */}
          {formData.role === 'ADMIN' ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">Admins work in every branch.</p>
          ) : (
            <div data-branch-choices>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Works in</label>
              <div className="flex flex-wrap gap-2">
                {branches.map((b) => {
                  const on = (formData.branch_ids || []).includes(b.id);
                  return (
                    <label key={b.id} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border cursor-pointer transition-all ${
                      on ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-300'
                         : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                      <input type="checkbox" checked={on} className="accent-indigo-600"
                        onChange={() => setFormData((f) => ({ ...f, branch_ids: on ? f.branch_ids.filter((x) => x !== b.id) : [...(f.branch_ids || []), b.id] }))} />
                      {b.name}{b.is_active ? '' : ' (off)'}
                    </label>
                  );
                })}
              </div>
              {(formData.branch_ids || []).length === 0 && <p className="text-xs text-rose-500 mt-1.5">Tick at least one branch.</p>}
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        title="Delete User"
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        confirmText={deleting ? 'Deleting...' : 'Delete User'}
        confirmColor="danger" // Use 'danger' or 'primary' depending on what your Modal component accepts
      >
        <div className="text-slate-600 dark:text-slate-400 text-sm">
          Are you sure you want to delete <strong>{userToDelete?.name}</strong>? This action cannot be undone and will permanently remove their access to the system.
        </div>
      </Modal>

      {/* Alert modal */}
      <Modal isOpen={modal.open} title={modal.title} onClose={closeAlert}>
        <p>{modal.msg}</p>
      </Modal>
    </div>
  );
};

export default UsersTab;