const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const Quotation = require('../models/quotationModel');
const RFQ = require('../models/rfqModel');
const { authenticateToken } = require('../middleware/auth');

// Analyze quotes for a given RFQ
router.get('/analyze/:rfqId', authenticateToken, async (req, res, next) => {
    try {
        const rfqId = parseInt(req.params.rfqId, 10);
        const quotes = await Quotation.getByRfqId(rfqId);
        const [rfqRows] = await (require('../config/db')).query('SELECT * FROM rfqs WHERE id = ?', [rfqId]);
        const rfq = rfqRows ? rfqRows[0] : null;

        const analysis = await aiService.analyzeQuotations(rfq, quotes);
        res.status(200).json({ success: true, analysis });
    } catch (error) {
        next(error);
    }
});

// Estimate budget for a draft RFQ
router.post('/estimate', authenticateToken, async (req, res, next) => {
    try {
        const { title, quantity, description } = req.body;
        const estimation = await aiService.estimateRfqBudget(title || '', quantity || 1, description || '');
        res.status(200).json({ success: true, estimation });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
