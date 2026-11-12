const express = require('express');
const router = express.Router();
const rfqController = require('../controllers/rfqController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, rfqController.getRFQs);
router.get('/:id', authenticateToken, rfqController.getRFQById);
router.post('/', authenticateToken, requireRole(['admin', 'procurement_officer']), rfqController.createRFQ);
router.patch('/:id/status', authenticateToken, requireRole(['admin', 'procurement_officer', 'manager']), rfqController.updateRFQStatus);

module.exports = router;
