const express = require('express');
const ledgerController = require('../controllers/ledgerController');
const { authenticateToken, requireRole } = require('../middleware/auth');
// Which branch a branch-wide request is about (the app sends the one picked in the header).
const { branchScope } = require('../utils/branches');

const router = express.Router();

// All authenticated users can view current ledger
router.get('/current', authenticateToken, branchScope, ledgerController.getCurrentLedger);

// Admin only - open next ledger cycle
router.post('/current/next', authenticateToken, requireRole(['ADMIN']), branchScope, ledgerController.openNextLedger);

// Data Entry and Admin can add transactions
router.post('/current/transactions', authenticateToken, requireRole(['DATA_ENTRY', 'ADMIN']), ledgerController.addTransaction);

// All authenticated users can view transactions
router.get('/:ledger_id/transactions', authenticateToken, ledgerController.getTransactions);

// Data Entry and Admin can delete transactions
router.delete('/:ledger_id/transactions/:id', authenticateToken, requireRole(['DATA_ENTRY', 'ADMIN']), ledgerController.deleteTransaction);

// Data Entry and Admin can edit transactions
router.patch('/:ledger_id/transactions/:id', authenticateToken, requireRole(['DATA_ENTRY', 'ADMIN']), ledgerController.updateTransaction);

// Admin only - preview what closing would pay out, before committing to it
router.get('/:id/close-preview', authenticateToken, requireRole(['ADMIN']), ledgerController.previewClose);

// Admin only - Close ledger and calculate distributions
router.post('/:id/close', authenticateToken, requireRole(['ADMIN']), ledgerController.closeLedger);

// Admin only. The old comment here claimed "all authenticated users, with
// role-based filtering" — there is no filtering in the query, so opening this
// up would show every partner every other partner's earnings. Partner access
// needs a shareholder-scoped endpoint, which needs a users->shareholders link
// the schema doesn't have yet.
router.get('/distributions', authenticateToken, requireRole(['ADMIN']), branchScope, ledgerController.getDistributions);

// Admin only - delete a distribution and reopen the ledger
router.delete('/distributions/:ledger_id', authenticateToken, requireRole(['ADMIN']), ledgerController.deleteDistribution);

// All authenticated users can view ledger history for charts
router.get('/history', authenticateToken, branchScope, ledgerController.getAllLedgers);

// Admin only - update ledger month/label
router.patch('/:id', authenticateToken, requireRole(['ADMIN']), ledgerController.updateLedger);

// Admin only - permanently delete a ledger and all its data
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), ledgerController.deleteLedger);

// Admin and Data Entry can view analytics
router.get('/analytics', authenticateToken, requireRole(['ADMIN', 'DATA_ENTRY']), branchScope, ledgerController.getAnalytics);

module.exports = router;
