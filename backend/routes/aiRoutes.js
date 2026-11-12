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
        const currency = req.query.currency || 'USD';
        const quotes = await Quotation.getByRfqId(rfqId);
        const rfq = await RFQ.getById(rfqId);

        const analysis = await aiService.analyzeQuotations(rfq, quotes, currency);
        res.status(200).json({ success: true, analysis });
    } catch (error) {
        next(error);
    }
});

// Estimate budget for a draft RFQ
router.post('/estimate', authenticateToken, async (req, res, next) => {
    try {
        const { title, quantity, description, currency } = req.body;
        const estimation = await aiService.estimateRfqBudget(title || '', quantity || 1, description || '', currency || 'USD');
        res.status(200).json({ success: true, estimation });
    } catch (error) {
        next(error);
    }
});

// Parse natural language prompt into structured RFQ + BoM
router.post('/parse-prompt', authenticateToken, async (req, res, next) => {
    try {
        const { prompt, currency } = req.body;
        if (!prompt || !prompt.trim()) {
            return res.status(400).json({ success: false, message: 'Prompt text is required' });
        }
        const parsed = await aiService.parseRfqPrompt(prompt, currency || 'USD');
        res.status(200).json({ success: true, parsed });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
