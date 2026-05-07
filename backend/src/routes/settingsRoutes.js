const express = require('express');
const settingsController = require('../controllers/settingsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, settingsController.getSettings);
router.put('/', authenticateToken, requireRole(['ADMIN']), settingsController.updateSettings);

module.exports = router;
