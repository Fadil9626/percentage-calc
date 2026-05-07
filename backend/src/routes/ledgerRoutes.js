const express = require('express');
const ledgerController = require('../controllers/ledgerController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All authenticated users can view current ledger
router.get('/current', authenticateToken, ledgerController.getCurrentLedger);

// Admin only - open next ledger cycle
router.post('/current/next', authenticateToken, requireRole(['ADMIN']), ledgerController.openNextLedger);

// Data Entry and Admin can add transactions
router.post('/current/transactions', authenticateToken, requireRole(['DATA_ENTRY', 'ADMIN']), ledgerController.addTransaction);

// All authenticated users can view transactions
router.get('/:ledger_id/transactions', authenticateToken, ledgerController.getTransactions);

// Data Entry and Admin can delete transactions
router.delete('/:ledger_id/transactions/:id', authenticateToken, requireRole(['DATA_ENTRY', 'ADMIN']), ledgerController.deleteTransaction);

// Data Entry and Admin can edit transactions
router.patch('/:ledger_id/transactions/:id', authenticateToken, requireRole(['DATA_ENTRY', 'ADMIN']), ledgerController.updateTransaction);

// Admin only - Close ledger and calculate distributions
router.post('/:id/close', authenticateToken, requireRole(['ADMIN']), ledgerController.closeLedger);

// All authenticated users can view distributions (with role-based filtering)
router.get('/distributions', authenticateToken, requireRole(['ADMIN']), ledgerController.getDistributions);

// Admin only - delete a distribution and reopen the ledger
router.delete('/distributions/:ledger_id', authenticateToken, requireRole(['ADMIN']), ledgerController.deleteDistribution);

// All authenticated users can view ledger history for charts
router.get('/history', authenticateToken, ledgerController.getAllLedgers);

// Admin only - update ledger month/label
router.patch('/:id', authenticateToken, requireRole(['ADMIN']), ledgerController.updateLedger);

// Admin only - permanently delete a ledger and all its data
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), ledgerController.deleteLedger);

// Admin and Data Entry can view analytics
router.get('/analytics', authenticateToken, requireRole(['ADMIN', 'DATA_ENTRY']), ledgerController.getAnalytics);

module.exports = router;
