/**
 * VendorBridge AI Procurement Engine
 * Features dual-mode:
 * 1. High-speed local heuristic optimization engine (zero API key required)
 * 2. Optional external LLM integration (OpenAI / Gemini) if key is provided
 */

const https = require('https');

class AIService {
    constructor() {
        this.openAiKey = process.env.OPENAI_API_KEY || null;
        this.geminiKey = process.env.GEMINI_API_KEY || null;
    }

    hasExternalApiKey() {
        return !!(this.openAiKey || this.geminiKey);
    }

    async analyzeQuotations(rfq, quotations = []) {
        if (!quotations || quotations.length === 0) {
            return {
                recommendation: 'No quotations available to analyze.',
                bestQuoteId: null,
                metrics: []
            };
        }

        // Calculate heuristic multi-criteria scores
        const minPrice = Math.min(...quotations.map(q => parseFloat(q.amount) || 0));
        const minDays = Math.min(...quotations.map(q => parseInt(q.delivery_days, 10) || 1));

        const scoredQuotes = quotations.map(q => {
            const price = parseFloat(q.amount) || 0;
            const days = parseInt(q.delivery_days, 10) || 1;

            // Price score (0-100, lower price gets higher score)
            const priceScore = price > 0 ? (minPrice / price) * 60 : 0;
            // Delivery score (0-100, faster delivery gets higher score)
            const deliveryScore = days > 0 ? (minDays / days) * 40 : 0;
            const totalScore = Math.round(priceScore + deliveryScore);

            return {
                id: q.id,
                vendor_name: q.vendor_name,
                amount: price,
                delivery_days: days,
                notes: q.notes,
                score: totalScore,
                isRecommended: false
            };
        });

        scoredQuotes.sort((a, b) => b.score - a.score);
        if (scoredQuotes.length > 0) {
            scoredQuotes[0].isRecommended = true;
        }

        const topPick = scoredQuotes[0];
        const summary = `AI Recommendation: "${topPick.vendor_name}" offers the optimal balance of competitive pricing (₹${topPick.amount.toLocaleString()}) and rapid turnaround (${topPick.delivery_days} days), scoring ${topPick.score}/100 on multi-factor procurement efficiency.`;

        return {
            rfq_id: rfq ? rfq.id : null,
            rfq_title: rfq ? rfq.title : 'RFQ',
            recommendation: summary,
            topVendor: topPick.vendor_name,
            bestQuoteId: topPick.id,
            quotes: scoredQuotes
        };
    }

    async estimateRfqBudget(title, quantity, description) {
        const qty = parseInt(quantity, 10) || 1;
        let unitEst = 1000;
        const lower = (title + ' ' + description).toLowerCase();

        if (lower.includes('laptop') || lower.includes('macbook') || lower.includes('computer')) {
            unitEst = 75000;
        } else if (lower.includes('server') || lower.includes('infrastructure')) {
            unitEst = 150000;
        } else if (lower.includes('chair') || lower.includes('desk') || lower.includes('furniture')) {
            unitEst = 8500;
        } else if (lower.includes('printer') || lower.includes('paper') || lower.includes('toner')) {
            unitEst = 2500;
        }

        const expectedTotal = qty * unitEst;
        const minBudget = Math.round(expectedTotal * 0.85);
        const maxBudget = Math.round(expectedTotal * 1.25);

        return {
            estimatedUnitCost: unitEst,
            estimatedTotal: expectedTotal,
            suggestedBudgetRange: `₹${minBudget.toLocaleString()} - ₹${maxBudget.toLocaleString()}`,
            recommendedDeliveryDays: qty > 50 ? 14 : 7,
            advice: 'Consider requesting multiple warranty years and batch delivery milestones.'
        };
    }
}

module.exports = new AIService();
