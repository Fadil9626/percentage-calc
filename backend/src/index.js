const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// The sign-in secret. The placeholder that used to be the fallback is in the repo, so anyone who
// read it could sign themselves an ADMIN token - and the local pm2 setup was running on exactly
// that. A known or short secret now stops the server in every environment. Unset outside
// production, a random one is made for this run (everyone signs in again after a restart).
{
  const secret = process.env.JWT_SECRET;
  const KNOWN = ['your-secret-key-change-in-production', 'changeme', 'secret'];
  if (secret && (secret.length < 32 || KNOWN.includes(secret))) {
    console.error('FATAL: JWT_SECRET is a known or short value. Set a unique one of at least 32 characters in backend/.env.');
    process.exit(1);
  }
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: JWT_SECRET must be set in production.');
      process.exit(1);
    }
    process.env.JWT_SECRET = require('crypto').randomBytes(48).toString('hex');
    console.warn('WARNING: JWT_SECRET is not set - using a random one for this run. Set it in backend/.env.');
  }
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
app.use(express.json({ limit: '100kb' }));

// Login was unthrottled, so a password could be brute-forced at request speed. Only failed
// sign-ins count, and only at /login: the limit used to cover all of /api/auth, so the /me check
// every page makes (and an admin managing users) used up the same 20 and locked people out.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
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
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRoutes);
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
