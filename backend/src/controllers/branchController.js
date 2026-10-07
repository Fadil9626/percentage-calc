/**
 * Branches: listing the ones you work in, and (admins) adding, renaming and switching them off.
 *
 * A branch that is switched off keeps all its months and payouts; it just no longer appears for
 * data-entry staff. The last active branch cannot be switched off - there would be nowhere to work.
 */
const pool = require('../config/database');
const { isAdmin } = require('../utils/branches');

const nameProblem = (v) => {
  const n = String(v ?? '').trim();
  if (n.length < 2) return 'A branch name needs at least two letters.';
  if (n.length > 100) return 'Keep the branch name under 100 characters.';
  return null;
};

/** The branches this person works in: every branch for an admin (with whether each is active). */
const list = async (req, res) => {
  try {
    const { rows } = isAdmin(req.user)
      ? await pool.query(
          `SELECT b.id, b.name, b.is_active,
                  (SELECT COUNT(*)::int FROM ledgers l WHERE l.branch_id = b.id) AS months,
                  (SELECT COUNT(*)::int FROM shareholders s WHERE s.branch_id = b.id AND s.is_active) AS shareholders
             FROM branches b ORDER BY b.created_at`)
      : await pool.query(
          `SELECT b.id, b.name, b.is_active FROM user_branches ub JOIN branches b ON b.id = ub.branch_id
            WHERE ub.user_id = $1 AND b.is_active ORDER BY b.created_at`, [req.user.id]);
    res.json(rows);
  } catch (e) {
    console.error('List branches error:', e);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
};

const create = async (req, res) => {
  try {
    const why = nameProblem(req.body?.name);
    if (why) return res.status(400).json({ error: why });
    const { rows: [b] } = await pool.query('INSERT INTO branches (name) VALUES ($1) RETURNING *', [String(req.body.name).trim()]);
    res.status(201).json(b);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'There is already a branch with that name.' });
    console.error('Create branch error:', e);
    res.status(500).json({ error: 'Failed to create branch' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, is_active } = req.body || {};
    const sets = []; const values = [];
    if (name !== undefined) {
      const why = nameProblem(name);
      if (why) return res.status(400).json({ error: why });
      values.push(String(name).trim()); sets.push(`name = $${values.length}`);
    }
    if (is_active !== undefined) {
      if (typeof is_active !== 'boolean') return res.status(400).json({ error: 'is_active must be true or false' });
      if (is_active === false) {
        const { rows: [n] } = await pool.query('SELECT COUNT(*)::int AS n FROM branches WHERE is_active AND id <> $1', [id]);
        if (n.n === 0) return res.status(400).json({ error: 'This is the only active branch. Add or switch on another first.' });
      }
      values.push(is_active); sets.push(`is_active = $${values.length}`);
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to change.' });
    values.push(id);
    const { rows: [b] } = await pool.query(`UPDATE branches SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
    if (!b) return res.status(404).json({ error: 'Branch not found' });
    res.json(b);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'There is already a branch with that name.' });
    if (e.code === '22P02') return res.status(404).json({ error: 'Branch not found' });
    console.error('Update branch error:', e);
    res.status(500).json({ error: 'Failed to update branch' });
  }
};

/**
 * Admin: every branch side by side for one month - income, expenses, profit and whether the month
 * is closed - with the totals across them. `month` is YYYY-MM; without it, the latest month any
 * branch has. A branch with nothing for that month still appears, with no ledger.
 */
const summary = async (req, res) => {
  try {
    const { rows: monthRows } = await pool.query(
      `SELECT DISTINCT to_char(month, 'YYYY-MM') AS m FROM ledgers ORDER BY m DESC`);
    const months = monthRows.map((r) => r.m);
    let month = req.query.month;
    if (month !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month))) {
      return res.status(400).json({ error: 'Give the month as YYYY-MM.' });
    }
    month = month || months[0] || null;
    const { rows } = await pool.query(
      `SELECT b.id, b.name, b.is_active,
              l.id AS ledger_id, l.status, l.label,
              COALESCE(l.total_income, 0)::text  AS income,
              COALESCE(l.total_expense, 0)::text AS expense,
              COALESCE(l.net_profit, 0)::text    AS net,
              (SELECT COUNT(*)::int FROM transactions t WHERE t.ledger_id = l.id) AS entries
         FROM branches b
         LEFT JOIN ledgers l ON l.branch_id = b.id AND to_char(l.month, 'YYYY-MM') = $1
        ORDER BY b.created_at`, [month]);
    // Totals in cents, so adding up many branches never drifts.
    const cents = (v) => Math.round(Number(v) * 100);
    const sum = (k) => (rows.reduce((a, r) => a + cents(r[k]), 0) / 100).toFixed(2);
    res.json({
      month, months, branches: rows,
      totals: { income: sum('income'), expense: sum('expense'), net: sum('net') },
    });
  } catch (e) {
    console.error('Branch summary error:', e);
    res.status(500).json({ error: 'Failed to build the branch summary' });
  }
};

module.exports = { list, create, update, summary, nameProblem };
