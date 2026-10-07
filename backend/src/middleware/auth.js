const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware to authenticate JWT token from Authorization header
 * Attaches user object to req.user if token is valid
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract Bearer token

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(403).json({ error: 'Invalid token' });
    }
    // The token alone used to be trusted for its whole 24 hours: a user switched off, deleted or
    // moved from ADMIN to DATA_ENTRY kept their old access until it ran out. The account is read
    // on every request, and its role - not the one written in the token - is what counts.
    try {
      const { rows: [account] } = await pool.query('SELECT id, email, name, role, is_active FROM users WHERE id = $1', [user.id]);
      if (!account || !account.is_active) return res.status(401).json({ error: 'Your account is not active. Please sign in again.' });
      req.user = { ...user, email: account.email, name: account.name, role: account.role };
      next();
    } catch (e) {
      console.error('Auth check error:', e);
      res.status(500).json({ error: 'Could not check your sign-in' });
    }
  });
};

/**
 * Middleware factory to check if user has required role(s)
 * @param {string[]} allowedRoles - Array of roles that are permitted
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required_roles: allowedRoles,
        user_role: req.user.role,
      });
    }

    next();
  };
};

/**
 * Generate JWT token for user
 * @param {Object} user - User object from database
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      share_percentage: user.share_percentage,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

module.exports = {
  authenticateToken,
  requireRole,
  generateToken,
  JWT_SECRET,
};
