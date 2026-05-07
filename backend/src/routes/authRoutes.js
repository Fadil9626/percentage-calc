const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/login', authController.login);

// Protected routes - All authenticated users can access
router.get('/me', authenticateToken, authController.getCurrentUser);

// Admin only routes
router.get('/users', authenticateToken, requireRole(['ADMIN']), authController.getAllUsers);
router.post('/users', authenticateToken, requireRole(['ADMIN']), authController.createUser);
router.put('/users/:id', authenticateToken, requireRole(['ADMIN']), authController.updateUser);

// ADDED: Delete route connected to the new deleteUser controller function
router.delete('/users/:id', authenticateToken, requireRole(['ADMIN']), authController.deleteUser);

module.exports = router;