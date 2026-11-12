const express = require('express');
const router = express.Router();
const poController = require('../controllers/poController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, poController.getPOs);
router.post('/', authenticateToken, requireRole(['admin', 'procurement_officer', 'manager']), poController.createPO);
router.patch('/:id/status', authenticateToken, requireRole(['admin', 'procurement_officer', 'manager']), poController.updatePOStatus);

module.exports = router;
