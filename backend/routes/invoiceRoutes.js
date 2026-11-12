const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, invoiceController.getInvoices);
router.post('/', authenticateToken, requireRole(['admin', 'procurement_officer', 'vendor']), invoiceController.createInvoice);
router.patch('/:id/status', authenticateToken, requireRole(['admin', 'procurement_officer', 'manager']), invoiceController.updateInvoiceStatus);

module.exports = router;
