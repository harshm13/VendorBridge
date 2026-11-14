const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');

// Analyze quotes for a given RFQ
router.get('/analyze/:rfqId', authenticateToken, aiController.analyzeQuotations);

// Estimate budget for a draft RFQ
router.post('/estimate', authenticateToken, aiController.estimateBudget);

// Parse natural language prompt into structured RFQ + BoM
router.post('/parse-prompt', authenticateToken, aiController.parsePrompt);

module.exports = router;
