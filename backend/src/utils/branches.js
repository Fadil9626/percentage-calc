/**
 * Branches: which ones a person may work in, and which one a request is about.
 *
 *   Admins work in every branch. Data-entry staff work in the branches they are given
 *   (user_branches), and only the active ones.
 *
 * A request names its branch with `branch_id` (the app sends the branch picked in the header with
 * every request). Anything addressed by a ledger - its transactions, closing it - takes its branch
 * from the ledger, and is refused the same way if that branch is not the person's.
 */
const pool = require('../config/database');

const isAdmin = (user) => user?.role === 'ADMIN';

/** The ids of the branches this person may work in. */
async function allowedBranchIds(user) {
  if (isAdmin(user)) {
    return (await pool.query('SELECT id FROM branches ORDER BY created_at')).rows.map((r) => r.id);
  }
  return (await pool.query(
    `SELECT b.id FROM user_branches ub JOIN branches b ON b.id = ub.branch_id
      WHERE ub.user_id = $1 AND b.is_active ORDER BY b.created_at`, [user.id])).rows.map((r) => r.id);
}

async function mayUse(user, branchId) {
  if (!branchId) return false;
  if (isAdmin(user)) return (await pool.query('SELECT 1 FROM branches WHERE id = $1', [branchId])).rowCount === 1;
  return (await allowedBranchIds(user)).includes(branchId);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Middleware: work out the branch this request is about, and check the person may use it.
 * Named in `branch_id` (query or body); with none named, the first branch they may use.
 * Sets req.branchId.
 */
const branchScope = async (req, res, next) => {
  try {
    const asked = req.query.branch_id || req.body?.branch_id || null;
    if (asked && !UUID.test(String(asked))) return res.status(400).json({ error: 'That is not a branch.' });
    if (asked) {
      if (!(await mayUse(req.user, asked))) return res.status(403).json({ error: 'You do not work in that branch.' });
      req.branchId = asked;
      return next();
    }
    const mine = await allowedBranchIds(req.user);
    if (!mine.length) return res.status(403).json({ error: 'You have not been given a branch yet. Ask an admin.' });
    req.branchId = mine[0];
    next();
  } catch (e) {
    console.error('Branch check error:', e);
    res.status(500).json({ error: 'Could not check the branch' });
  }
};

/**
 * The ledger, if it exists and is in a branch this person works in; otherwise answers 404 (the
 * same answer as "no such ledger", so nobody learns what other branches hold) and returns null.
 */
async function ledgerFor(req, res, ledgerId, db = pool) {
  if (!UUID.test(String(ledgerId))) { res.status(404).json({ error: 'Ledger not found' }); return null; }
  const { rows: [ledger] } = await db.query('SELECT * FROM ledgers WHERE id = $1', [ledgerId]);
  if (!ledger || !(await mayUse(req.user, ledger.branch_id))) { res.status(404).json({ error: 'Ledger not found' }); return null; }
  return ledger;
}

module.exports = { isAdmin, allowedBranchIds, mayUse, branchScope, ledgerFor, UUID };
