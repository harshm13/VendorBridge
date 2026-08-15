const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, approvalController.getApprovals);
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), approvalController.updateApproval);

module.exports = router;
