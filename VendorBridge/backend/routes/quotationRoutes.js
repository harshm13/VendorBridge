const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, quotationController.getQuotations);
router.post('/', authenticateToken, requireRole(['admin', 'vendor']), quotationController.createQuotation);

module.exports = router;
