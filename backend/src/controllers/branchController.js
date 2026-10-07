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

module.exports = { list, create, update, nameProblem };
