import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { BRANCH_KEY } from '../services/api';
import { useAuth } from './AuthContext';

const BranchContext = createContext(null);

const readStored = () => { try { return localStorage.getItem(BRANCH_KEY); } catch { return null; } };
const store = (id) => { try { id ? localStorage.setItem(BRANCH_KEY, id) : localStorage.removeItem(BRANCH_KEY); } catch {} };

/**
 * The branch being worked in. Every request carries it (see services/api.js), so the dashboard,
 * transactions, closing and payouts all show that branch alone.
 *
 * The branches come from the server: every branch for an admin, only their own for staff. A
 * remembered branch that is no longer one of them (switched off, or taken away) falls back to the
 * first one, so nobody is left looking at a branch they cannot use.
 */
export const BranchProvider = ({ children }) => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(readStored);
  const [loaded, setLoaded] = useState(false);

  const fetchBranches = useCallback(async () => {
    try {
      const { data } = await api.get('/branches');
      setBranches(data);
      // Work in an active branch where there is one; a switched-off one only if it was picked.
      const usable = data.filter((b) => b.is_active);
      const stored = readStored();
      const keep = data.find((b) => b.id === stored) ? stored : (usable[0] || data[0])?.id || null;
      store(keep);
      setBranchId(keep);
    } catch (e) {
      console.error('Failed to fetch branches:', e);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (user?.id) { setLoaded(false); fetchBranches(); }
    else { setBranches([]); setLoaded(false); }
  }, [user?.id, fetchBranches]);

  // Stored first, so the requests made by the pages that reload next already carry it.
  const chooseBranch = (id) => { store(id); setBranchId(id); };

  const branch = branches.find((b) => b.id === branchId) || null;

  return (
    <BranchContext.Provider value={{ branches, branch, branchId, chooseBranch, fetchBranches, loaded }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) throw new Error('useBranch must be used within a BranchProvider');
  return context;
};
