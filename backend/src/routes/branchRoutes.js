const express = require('express');
const branchController = require('../controllers/branchController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// The branches you work in (every branch, for an admin).
router.get('/', authenticateToken, branchController.list);
// Admin only: add a branch, rename it, switch it off or on.
router.post('/', authenticateToken, requireRole(['ADMIN']), branchController.create);
router.put('/:id', authenticateToken, requireRole(['ADMIN']), branchController.update);

module.exports = router;
