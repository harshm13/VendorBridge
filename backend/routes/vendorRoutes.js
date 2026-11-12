const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, vendorController.getVendors);
router.post('/', authenticateToken, requireRole(['admin', 'procurement_officer']), vendorController.createVendor);
router.put('/:id', authenticateToken, requireRole(['admin', 'procurement_officer']), vendorController.updateVendor);

module.exports = router;
