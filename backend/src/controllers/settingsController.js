const pool = require('../config/database');

const DEFAULT_CATEGORIES = [
  { name: 'Sales', type: 'INCOME' },
  { name: 'Consulting', type: 'INCOME' },
  { name: 'Other Income', type: 'INCOME' },
  { name: 'Payroll', type: 'EXPENSE' },
  { name: 'Software', type: 'EXPENSE' },
  { name: 'Marketing', type: 'EXPENSE' },
  { name: 'Operations', type: 'EXPENSE' },
  { name: 'Other Expense', type: 'EXPENSE' },
];

/**
 * There is meant to be one settings row. Reading and saving both used "LIMIT 1" with no order, so if
 * a second row ever existed the save could change one row and the next read return the other -
 * the currency "changing back". Both now take the same row: the most recently saved.
 */
const THE_ROW = 'ORDER BY updated_at DESC NULLS LAST, id LIMIT 1';

const getSettings = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM settings ${THE_ROW}`);
    const row = result.rows[0] || {};
    if (!row.categories) row.categories = DEFAULT_CATEGORIES;
    res.json(row);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { currency_code, currency_symbol, currency_name, categories } = req.body;
    const current = await pool.query(`SELECT id FROM settings ${THE_ROW}`);

    if (current.rows.length === 0) {
      const result = await pool.query(
        'INSERT INTO settings (currency_code, currency_symbol, currency_name, categories, updated_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [currency_code, currency_symbol, currency_name, JSON.stringify(categories ?? DEFAULT_CATEGORIES), req.user.id]
      );
      return res.json(result.rows[0]);
    } else {
      const result = await pool.query(
        'UPDATE settings SET currency_code = $1, currency_symbol = $2, currency_name = $3, categories = $4, updated_by = $5 WHERE id = $6 RETURNING *',
        [currency_code, currency_symbol, currency_name, JSON.stringify(categories ?? DEFAULT_CATEGORIES), req.user.id, current.rows[0].id]
      );
      return res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

module.exports = { getSettings, updateSettings };
