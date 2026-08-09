const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');

router.get('/', approvalController.getApprovals);
router.put('/:id', approvalController.updateApproval);

module.exports = router;
