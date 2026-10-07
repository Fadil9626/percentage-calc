const pool = require('../config/database');
const { effectiveShares } = require('../utils/distribution');

// A share percentage is money. Nothing checked this before, so a typo of 600
// instead of 60 would be stored and paid out.
const validatePercentage = (v) => {
  if (v === undefined || v === null || v === '') return null;   // optional; defaults to 0
  const n = Number(v);
  if (!Number.isFinite(n)) return 'Share percentage must be a number';
  if (n < 0) return 'Share percentage cannot be negative';
  if (n > 100) return 'Share percentage cannot exceed 100';
  return null;
};

const getAllShareholders = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shareholders ORDER BY is_priority DESC, name ASC');
    // effective_percentage: what the stored figure actually works out to as a
    // share of net profit. A non-priority partner's percentage describes the
    // pool left after the priority cut, not the profit, so the two differ and
    // only one of them is what lands in their account.
    res.json(effectiveShares(result.rows));
  } catch (error) {
    console.error('Get shareholders error:', error);
    res.status(500).json({ error: 'Failed to fetch shareholders' });
  }
};

const createShareholder = async (req, res) => {
  try {
    const { name, email, share_percentage, is_priority } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const pctError = validatePercentage(share_percentage);
    if (pctError) return res.status(400).json({ error: pctError });

    const result = await pool.query(
      'INSERT INTO shareholders (name, email, share_percentage, is_priority) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email || null, share_percentage || 0, is_priority || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create shareholder error:', error);
    res.status(500).json({ error: 'Failed to create shareholder' });
  }
};

const updateShareholder = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, share_percentage, is_priority, is_active } = req.body;
    
    const updates = [];
    const values = [];
    let count = 1;
    
    if (name !== undefined) { updates.push(`name = $${count++}`); values.push(name); }
    if (email !== undefined) { updates.push(`email = $${count++}`); values.push(email); }
    if (share_percentage !== undefined) {
      // Cleared in the form, it arrived as "" and went to the database, which refused it: a 500.
      if (share_percentage === '' || share_percentage === null) return res.status(400).json({ error: 'Enter a share percentage (0 to 100).' });
      const pctError = validatePercentage(share_percentage);
      if (pctError) return res.status(400).json({ error: pctError });
      updates.push(`share_percentage = $${count++}`); values.push(share_percentage);
    }
    if (is_priority !== undefined) { updates.push(`is_priority = $${count++}`); values.push(is_priority); }
    if (is_active !== undefined) { updates.push(`is_active = $${count++}`); values.push(is_active); }
    
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    
    values.push(id);
    const result = await pool.query(
      `UPDATE shareholders SET ${updates.join(', ')} WHERE id = $${count} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Shareholder not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update shareholder error:', error);
    res.status(500).json({ error: 'Failed to update shareholder' });
  }
};

// NEW: Delete Shareholder Function
const deleteShareholder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM shareholders WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Shareholder not found' });
    }
    
    res.json({ message: 'Shareholder deleted successfully', deleted: result.rows[0] });
  } catch (error) {
    console.error('Delete shareholder error:', error);
    
    // Check for PostgreSQL Foreign Key Violation (Error Code 23503)
    // This happens if the shareholder is already linked to a historical ledger distribution
    if (error.code === '23503') {
      return res.status(400).json({ 
        error: 'Cannot delete shareholder because they have existing historical payouts. Please edit them and set their status to "Inactive" instead.' 
      });
    }
    
    res.status(500).json({ error: 'Failed to delete shareholder' });
  }
};

module.exports = { 
  getAllShareholders, 
  createShareholder, 
  updateShareholder, 
  deleteShareholder 
};