const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// The auth middleware falls back to a hardcoded development secret. That is
// fine locally and a hole in production: the fallback string is in the repo, so
// anyone who can read it could sign themselves an ADMIN token. Refuse to start
// rather than run forgeable.
if (process.env.NODE_ENV === 'production') {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret === 'your-secret-key-change-in-production') {
    console.error('FATAL: JWT_SECRET must be set to a unique value of at least 32 characters in production.');
    process.exit(1);
  }
} else if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set — using the insecure development default.');
}

const authRoutes = require('./routes/authRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const shareholderRoutes = require('./routes/shareholderRoutes');
const branchRoutes = require('./routes/branchRoutes');

const app = express();
const PORT = process.env.PORT || 5010;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3030';

// Middleware
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// Login was unthrottled, so a password could be brute-forced at request speed.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// Liveness: the process is up. Deliberately does no work.
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', uptime: Math.round(process.uptime()) });
});

// Readiness: can this instance actually serve? Round-trips the database and
// answers 503 when it can't, instead of reporting healthy and then 500ing.
app.get('/ready', async (req, res) => {
  const started = Date.now();
  try {
    await require('./config/database').query('SELECT 1');
    res.json({ status: 'OK', db: 'up', latency_ms: Date.now() - started });
  } catch (err) {
    res.status(503).json({ status: 'ERROR', db: 'down', error: err.message });
  }
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/ledgers', ledgerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/shareholders', shareholderRoutes);
app.use('/api/branches', branchRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Percentage Calculator API running on port ${PORT}`);
});
