const { v4: uuidv4 } = require('uuid');
const { calculateDistribution, validateShares } = require('../utils/distribution');
const pool = require('../config/database');
const { mayUse, ledgerFor } = require('../utils/branches');

/**
 * An amount somebody typed, as money: a real, positive number within what the column holds,
 * rounded to cents - or why not. Pure.
 *
 * "abc" used to pass (`"abc" <= 0` is false), become NaN, and be stored: Postgres numeric accepts
 * NaN, and one such row turned the month's totals, and the profit split, into NaN.
 */
const MAX_AMOUNT = 9999999999.99;
const readAmount = (v) => {
  const text = String(v ?? '').trim();
  const n = typeof v === 'number' ? v : Number(text);
  if (text === '' || !Number.isFinite(n)) return { error: 'Amount must be a number' };
  if (n <= 0) return { error: 'Amount must be positive' };
  if (n > MAX_AMOUNT) return { error: 'Amount is too large' };
  return { value: Math.round(n * 100) / 100 };
};

/** A ledger's totals, worked out from its transactions inside the database, in one statement. */
const recomputeTotals = (db, ledgerId) => db.query(
  `UPDATE ledgers l SET total_income = t.inc, total_expense = t.exp, net_profit = t.inc - t.exp
     FROM (SELECT COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0) AS inc,
                  COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0) AS exp
             FROM transactions WHERE ledger_id = $1) t
    WHERE l.id = $1`, [ledgerId]);

/**
 * Change a ledger's transactions and its totals as ONE step, with the ledger locked.
 *
 * Each change used to save the transaction, then recompute the totals separately, swallowing any
 * error: two entries at once could leave stale totals, a failed recompute left totals that
 * disagreed with the transactions while saying "added", and an entry could slip into a ledger
 * while it was being closed. Locking the ledger row makes a close wait for an entry in flight,
 * and an entry wait for a close (and then find it closed).
 *
 * `fn(client, ledger)` runs on an OPEN ledger; it returns the result, or undefined having already
 * answered (a 404, say), in which case nothing is kept.
 */
const onOpenLedger = async (req, ledgerId, res, closedMessage, fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [ledger] } = await client.query('SELECT * FROM ledgers WHERE id = $1 FOR UPDATE', [ledgerId]);
    // A ledger in a branch this person does not work in is answered as if it did not exist.
    if (!ledger || !(await mayUse(req.user, ledger.branch_id))) { await client.query('ROLLBACK'); res.status(404).json({ error: 'Ledger not found' }); return undefined; }
    if (ledger.status === 'CLOSED') { await client.query('ROLLBACK'); res.status(400).json({ error: closedMessage }); return undefined; }
    const result = await fn(client, ledger);
    if (result === undefined) { await client.query('ROLLBACK'); return undefined; }
    await recomputeTotals(client, ledgerId);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get current (latest) ledger or create if none exists
 */
const getCurrentLedger = async (req, res) => {
  try {
    let ledger = await pool.query(
      'SELECT * FROM ledgers WHERE branch_id = $1 ORDER BY created_at DESC LIMIT 1', [req.branchId]
    );

    if (ledger.rows.length === 0) {
      // First run ever: Create new ledger for the current month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthDate = monthStart.toISOString().split('T')[0];

      ledger = await pool.query(
        'INSERT INTO ledgers (month, status, total_income, total_expense, net_profit, branch_id) VALUES ($1::date, $2, $3, $4, $5, $6) RETURNING *',
        [monthDate, 'OPEN', 0, 0, 0, req.branchId]
      );
    }

    res.json(ledger.rows[0]);
  } catch (error) {
    console.error('Get ledger error:', error);
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
};

/**
 * Open next ledger cycle (admin only)
 */
const openNextLedger = async (req, res) => {
  try {
    const latest = await pool.query(
      'SELECT * FROM ledgers WHERE branch_id = $1 ORDER BY created_at DESC LIMIT 1', [req.branchId]
    );

    if (latest.rows.length === 0) {
      return res.status(400).json({ error: 'No existing ledger to cycle from.' });
    }

    const currentLedger = latest.rows[0];

    if (currentLedger.status !== 'CLOSED') {
      return res.status(400).json({ error: 'Current ledger must be closed before opening the next cycle.' });
    }

    // Use provided month or default to next calendar month
    let nextMonthStr;
    if (req.body && req.body.month) {
      // Expect YYYY-MM-DD or YYYY-MM
      nextMonthStr = req.body.month.length === 7 ? `${req.body.month}-01` : req.body.month;
    } else {
      // In UTC throughout, so no time zone can move the first of the month to the day before.
      const [y, m] = String(currentLedger.month).slice(0, 7).split('-').map(Number);
      const nextDate = new Date(Date.UTC(y, m, 1));
      nextMonthStr = nextDate.toISOString().split('T')[0];
    }

    // Prevent duplicate months
    const existing = await pool.query(
      'SELECT id FROM ledgers WHERE month = $1::date AND branch_id = $2',
      [nextMonthStr, req.branchId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A ledger for this month already exists.' });
    }

    const newLedger = await pool.query(
      'INSERT INTO ledgers (month, status, total_income, total_expense, net_profit, branch_id) VALUES ($1::date, $2, $3, $4, $5, $6) RETURNING *',
      [nextMonthStr, 'OPEN', 0, 0, 0, req.branchId]
    );

    res.json({ message: 'New ledger cycle started successfully', ledger: newLedger.rows[0] });
  } catch (error) {
    console.error('Open next ledger error:', error);
    res.status(500).json({ error: 'Failed to open next ledger' });
  }
};

/**
 * Add transaction to open ledger
 */
const addTransaction = async (req, res) => {
  try {
    const { ledger_id, type, description, amount, category } = req.body;

    // Validate input
    if (!ledger_id || !type || !String(description ?? '').trim() || amount === undefined || amount === null || amount === '') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    const money = readAmount(amount);
    if (money.error) return res.status(400).json({ error: money.error });

    const transaction = await onOpenLedger(req, ledger_id, res, 'Cannot add transactions to closed ledger', async (client) => (
      (await client.query(
        'INSERT INTO transactions (ledger_id, type, description, amount, category, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [ledger_id, type, String(description).trim(), money.value, category || null, req.user.id]
      )).rows[0]
    ));
    if (!transaction) return;

    res.status(201).json({
      message: 'Transaction added successfully',
      transaction,
    });
  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
};

/**
 * Delete transaction from open ledger
 */
const deleteTransaction = async (req, res) => {
  try {
    const { ledger_id, id } = req.params;

    const transaction = await onOpenLedger(req, ledger_id, res, 'Cannot delete from closed ledger', async (client) => {
      const { rows: [t] } = await client.query('DELETE FROM transactions WHERE id = $1 AND ledger_id = $2 RETURNING *', [id, ledger_id]);
      if (!t) { res.status(404).json({ error: 'Transaction not found' }); return undefined; }
      return t;
    });
    if (!transaction) return;
    res.json({ message: 'Transaction deleted successfully', transaction });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
};

/**
 * Update (edit) a transaction on an open ledger
 */
const updateTransaction = async (req, res) => {
  try {
    const { ledger_id, id } = req.params;
    const { type, description, amount, category } = req.body;

    if (type !== undefined && !['INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }
    if (description !== undefined && !String(description ?? '').trim()) {
      return res.status(400).json({ error: 'Description cannot be empty' });
    }
    let money = { value: null };
    if (amount !== undefined) {
      money = readAmount(amount);
      if (money.error) return res.status(400).json({ error: money.error });
    }

    const transaction = await onOpenLedger(req, ledger_id, res, 'Cannot edit transactions on a closed ledger', async (client) => {
      const { rows: [t] } = await client.query(
        `UPDATE transactions
           SET type = COALESCE($1, type),
               description = COALESCE($2, description),
               amount = COALESCE($3, amount),
               category = COALESCE($4, category)
         WHERE id = $5 AND ledger_id = $6
         RETURNING *`,
        [type ?? null, description !== undefined ? String(description).trim() : null, money.value, category ?? null, id, ledger_id]
      );
      if (!t) { res.status(404).json({ error: 'Transaction not found' }); return undefined; }
      return t;
    });
    if (!transaction) return;
    res.json({ message: 'Transaction updated successfully', transaction });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
};

/**
 * Get all transactions for a ledger
 */
const getTransactions = async (req, res) => {
  try {
    const { ledger_id } = req.params;
    if (!(await ledgerFor(req, res, ledger_id))) return;

    const result = await pool.query(
      `SELECT t.*, u.name as created_by_name 
       FROM transactions t
       JOIN users u ON t.created_by = u.id
       WHERE t.ledger_id = $1
       ORDER BY t.created_at DESC`,
      [ledger_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

/**
 * Update ledger totals (recalculate from transactions)
 */
const updateLedgerTotals = (ledger_id) => recomputeTotals(pool, ledger_id);

/**
 * Close ledger and calculate profit distribution (admin only)
 * Applies waterfall logic: Priority partners get full percentage, then remaining profit distributed
 */
const closeLedger = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    // FOR UPDATE, and the status check inside the transaction: two admins
    // clicking Close at once previously both read status='OPEN' outside any
    // transaction, both passed the check, and both inserted a full set of
    // distribution rows against the same ledger.
    const ledgerCheck = await client.query('SELECT * FROM ledgers WHERE id = $1 FOR UPDATE', [id]);
    if (ledgerCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ledger not found' });
    }

    const ledger = ledgerCheck.rows[0];
    if (!(await mayUse(req.user, ledger.branch_id))) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ledger not found' });
    }
    if (ledger.status === 'CLOSED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ledger is already closed' });
    }

    // The branch's own shareholders share the branch's profit.
    const usersResult = await client.query(
      'SELECT id, name, share_percentage, is_priority FROM shareholders WHERE is_active = true AND branch_id = $1 ORDER BY is_priority DESC, name ASC',
      [ledger.branch_id]
    );
    const partners = usersResult.rows;

    // Refuse to close on a shareholder set that cannot distribute the profit
    // exactly. Closing is effectively irreversible for the partners who get
    // paid off it, so a misconfiguration must stop here rather than quietly
    // pay out the wrong amounts.
    const validation = validateShares(partners);
    if (!validation.ok) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Cannot close: shareholder percentages are not valid',
        details: validation.errors,
        priority_total: validation.priorityTotal,
        non_priority_total: validation.nonPriorityTotal,
      });
    }

    const calc = calculateDistribution(ledger.net_profit, partners);
    const distributions = calc.distributions;

    // Belt and braces: the maths guarantees this, and if it ever stops being
    // true we would rather fail loudly than pay it out.
    if (Math.abs(calc.residual) > 0.01) {
      await client.query('ROLLBACK');
      return res.status(500).json({
        error: 'Distribution does not balance — ledger not closed',
        net_profit: calc.net_profit,
        allocated: calc.allocated,
        residual: calc.residual,
      });
    }

    await client.query(
      'UPDATE ledgers SET status = $1, closed_by = $2, closed_at = $3 WHERE id = $4',
      ['CLOSED', req.user.id, new Date(), id]
    );

    const distributionData = {
      net_profit: calc.net_profit,
      total_income: ledger.total_income,
      total_expense: ledger.total_expense,
      allocated: calc.allocated,
      distributions,
      calculation_date: new Date().toISOString(),
    };

    const distLedgerResult = await client.query(
      'INSERT INTO distribution_ledger (ledger_id, distribution_data, calculated_by) VALUES ($1, $2, $3) RETURNING id',
      [id, JSON.stringify(distributionData), req.user.id]
    );
    const distribution_ledger_id = distLedgerResult.rows[0].id;

    for (const dist of distributions) {
      await client.query(
        'INSERT INTO distributions (distribution_ledger_id, shareholder_id, share_percentage, net_profit_share) VALUES ($1, $2, $3, $4)',
        [distribution_ledger_id, dist.shareholder_id, dist.share_percentage, dist.net_profit_share]
      );
    }

    await client.query('COMMIT');

    res.json({
      message: 'Ledger closed and distributions calculated',
      ledger: { ...ledger, status: 'CLOSED', closed_by: req.user.id, closed_at: new Date() },
      distributions: distributionData,
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Close ledger error:', error);
    res.status(500).json({ error: 'Failed to close ledger' });
  } finally {
    client.release();
  }
};

/**
 * GET /ledgers/:id/close-preview — what closing this ledger would pay out.
 * Closing is irreversible in practice, so the admin gets to see every partner's
 * amount, the allocated total and any validation problem BEFORE committing.
 */
const previewClose = async (req, res) => {
  try {
    const { id } = req.params;
    const ledger = await ledgerFor(req, res, id);
    if (!ledger) return;

    const partners = (await pool.query(
      'SELECT id, name, share_percentage, is_priority FROM shareholders WHERE is_active = true AND branch_id = $1 ORDER BY is_priority DESC, name ASC',
      [ledger.branch_id]
    )).rows;

    const validation = validateShares(partners);
    const calc = calculateDistribution(ledger.net_profit, partners);

    res.json({
      ledger_id: ledger.id,
      status: ledger.status,
      total_income: ledger.total_income,
      total_expense: ledger.total_expense,
      net_profit: calc.net_profit,
      allocated: calc.allocated,
      residual: calc.residual,
      can_close: validation.ok && ledger.status !== 'CLOSED',
      validation,
      distributions: calc.distributions,
    });
  } catch (error) {
    console.error('Preview close error:', error);
    res.status(500).json({ error: 'Failed to preview distribution' });
  }
};

/**
 * Get all distribution history
 */
const getDistributions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        d.*,
        s.name as shareholder_name,
        dl.ledger_id,
        dl.id as distribution_ledger_id,
        l.month,
        l.label as ledger_label,
        l.total_income,
        l.total_expense,
        l.net_profit,
        dl.distribution_data
       FROM distributions d
       JOIN shareholders s ON d.shareholder_id = s.id
       JOIN distribution_ledger dl ON d.distribution_ledger_id = dl.id
       JOIN ledgers l ON dl.ledger_id = l.id
       WHERE l.branch_id = $1
       ORDER BY l.month DESC, s.is_priority DESC, s.name ASC`,
      [req.branchId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get distributions error:', error);
    res.status(500).json({ error: 'Failed to fetch distributions' });
  }
};

/**
 * Delete a distribution for a given ledger (re-open ledger)
 */
const deleteDistribution = async (req, res) => {
  const { ledger_id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find the distribution_ledger for this ledger
    const dlRes = await client.query(
      'SELECT id FROM distribution_ledger WHERE ledger_id = $1',
      [ledger_id]
    );
    if (dlRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No distribution found for this ledger.' });
    }
    const dlId = dlRes.rows[0].id;

    // Delete distribution_ledger (cascades to distributions)
    await client.query('DELETE FROM distribution_ledger WHERE id = $1', [dlId]);

    // Reopen the ledger
    await client.query(
      `UPDATE ledgers SET status = 'OPEN', closed_by = NULL, closed_at = NULL WHERE id = $1`,
      [ledger_id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Distribution deleted and ledger reopened successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete distribution error:', error);
    res.status(500).json({ error: 'Failed to delete distribution.' });
  } finally {
    client.release();
  }
};

/**
 * Get all ledgers for trend chart
 */
const getAllLedgers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, month, label, status, total_income, total_expense, net_profit
       FROM ledgers
       WHERE branch_id = $1
       ORDER BY month ASC`,
      [req.branchId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get all ledgers error:', error);
    res.status(500).json({ error: 'Failed to fetch ledger history' });
  }
};

/**
 * Get analytics for transactions (grouped by category and type)
 */
const getAnalytics = async (req, res) => {
  try {
    const { ledger_id } = req.query;
    
    let query = `
      SELECT type, COALESCE(category, 'Uncategorized') as category, SUM(amount) as total_amount
      FROM transactions
    `;
    // Always within the branch: one of its ledgers, or all of them.
    const params = [req.branchId];
    query += ` WHERE ledger_id IN (SELECT id FROM ledgers WHERE branch_id = $1)`;
    if (ledger_id && ledger_id !== 'all') {
      query += ` AND ledger_id = $2`;
      params.push(ledger_id);
    }

    query += ` GROUP BY type, COALESCE(category, 'Uncategorized') ORDER BY total_amount DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
};

/**
 * Update ledger month and/or label (admin only)
 */
const updateLedger = async (req, res) => {
  const { id } = req.params;
  const { month, label } = req.body;
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    if (month !== undefined) {
      // A month, as YYYY-MM or YYYY-MM-DD, stored as its first day - and never one another ledger
      // already has (opening the next month refused that; editing a month did not).
      const m = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(String(month));
      if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return res.status(400).json({ error: 'Choose a month, as YYYY-MM.' });
      const first = `${m[1]}-${m[2]}-01`;
      const taken = await pool.query(
        'SELECT id FROM ledgers WHERE month = $1::date AND id <> $2 AND branch_id = (SELECT branch_id FROM ledgers WHERE id = $2)', [first, id]);
      if (taken.rows.length) return res.status(400).json({ error: 'A ledger for this month already exists.' });
      fields.push(`month = $${idx}::date`); values.push(first); idx++;
    }
    if (label !== undefined) { fields.push(`label = $${idx}`);        values.push(label || null); idx++; }
    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update.' });
    values.push(id);
    const result = await pool.query(
      `UPDATE ledgers SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ledger not found.' });
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'A ledger for this month already exists.' });
    console.error('Update ledger error:', error);
    res.status(500).json({ error: 'Failed to update ledger.' });
  }
};

/**
 * Hard-delete an entire ledger (all transactions + distributions cascade)
 */
const deleteLedger = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM ledgers WHERE id = $1 RETURNING id, month',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ledger not found.' });
    }
    res.json({ message: 'Ledger permanently deleted.', ledger: result.rows[0] });
  } catch (error) {
    console.error('Delete ledger error:', error);
    res.status(500).json({ error: 'Failed to delete ledger.' });
  }
};

module.exports = {
  getCurrentLedger,
  openNextLedger,
  addTransaction,
  getTransactions,
  deleteTransaction,
  updateTransaction,
  updateLedgerTotals,
  closeLedger,
  previewClose,
  getDistributions,
  deleteDistribution,
  getAllLedgers,
  getAnalytics,
  updateLedger,
  deleteLedger,
  readAmount,
};