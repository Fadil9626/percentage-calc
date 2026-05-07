const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const shareholderRoutes = require('./routes/shareholderRoutes');

const app = express();
const PORT = process.env.PORT || 5010;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3030';

// Middleware
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ledgers', ledgerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/shareholders', shareholderRoutes);

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
