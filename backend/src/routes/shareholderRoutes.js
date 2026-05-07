const express = require('express');
const shareholderController = require('../controllers/shareholderController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all shareholders (Accessible to any authenticated user)
router.get('/', authenticateToken, shareholderController.getAllShareholders);

// Create a new shareholder (Admin only)
router.post('/', authenticateToken, requireRole(['ADMIN']), shareholderController.createShareholder);

// Update an existing shareholder (Admin only)
router.put('/:id', authenticateToken, requireRole(['ADMIN']), shareholderController.updateShareholder);

// NEW: Delete a shareholder (Admin only)
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), shareholderController.deleteShareholder);

module.exports = router;