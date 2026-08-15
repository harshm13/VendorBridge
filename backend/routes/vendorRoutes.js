const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, vendorController.getVendors);
router.post('/', authenticateToken, requireRole(['admin']), vendorController.createVendor);

module.exports = router;
