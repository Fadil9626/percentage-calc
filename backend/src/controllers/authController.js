const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { generateToken } = require('../middleware/auth');

/**
 * Login user with email and password
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Get user from database
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * Get all users (admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * Create new user (admin only)
 */
const createUser = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Email, password, name, and role required' });
    }

    // Validate role
    const validRoles = ['ADMIN', 'PARTNER', 'DATA_ENTRY'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, name, role]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

/**
 * Update user (admin only)
 */
const ROLES = ['ADMIN', 'DATA_ENTRY'];

/** Would this change leave nobody able to administer the system? */
const wouldLeaveNoAdmin = async (id, { role, is_active }) => {
  const losesAdmin = (role !== undefined && role !== 'ADMIN') || is_active === false;
  if (!losesAdmin) return false;
  const { rows: [u] } = await pool.query('SELECT role, is_active FROM users WHERE id = $1', [id]);
  if (!u || u.role !== 'ADMIN' || !u.is_active) return false;
  const { rows: [n] } = await pool.query("SELECT COUNT(*)::int AS n FROM users WHERE role = 'ADMIN' AND is_active AND id <> $1", [id]);
  return n.n === 0;
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, is_active } = req.body;

    // Any text was accepted as a role: "admin" or a typo left the person locked out of everything.
    if (role !== undefined && !ROLES.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${ROLES.join(', ')}` });
    }
    if (is_active !== undefined && typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be true or false' });
    }
    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }
    // Demoting or switching off the only active admin left nobody able to manage users or close months.
    if (await wouldLeaveNoAdmin(id, { role, is_active })) {
      return res.status(400).json({ error: 'This is the only active admin. Make someone else an admin first.' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, name, role, is_active`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

/**
 * Delete a system user
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Optional safety check: Prevent a user from deleting their own active session
    // (Requires req.user to be populated by your auth middleware)
    if (req.user && req.user.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own active account.' });
    }

    if (await wouldLeaveNoAdmin(id, { is_active: false })) {
      return res.status(400).json({ error: 'This is the only active admin. Make someone else an admin first.' });
    }

    // Delete the user from the database
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'User deleted successfully.', deletedUser: result.rows[0] });
  } catch (error) {
    // Somebody who has entered transactions or closed a month is part of the record and cannot be
    // removed from it; this used to come back as a bare "Failed to delete user."
    if (error.code === '23503') {
      return res.status(400).json({ error: 'This user has entered transactions or closed months, so they cannot be deleted. Deactivate them instead.' });
    }
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
};

/**
 * Get current user profile
 */
const getCurrentUser = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role FROM users WHERE id = $1 AND is_active = true',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

module.exports = {
  login,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getCurrentUser,
};