/**
 * VendorBridge AI Procurement Engine
 * Dual-mode intelligence:
 * 1. High-speed local heuristic & NLP parser (zero API key required, multi-currency)
 * 2. Optional external LLM integration (Gemini / OpenAI) when configured
 */

const https = require('https');

const CURRENCY_SYMBOLS = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    AED: 'AED ',
    JPY: '¥',
    SGD: 'S$'
};

const FX_FROM_USD = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    INR: 84,
    AED: 3.67,
    JPY: 152,
    SGD: 1.34
};

function formatCurrency(amount, currency = 'USD') {
    const code = (currency || 'USD').toUpperCase();
    const sym = CURRENCY_SYMBOLS[code] || '$';
    return `${sym}${Math.round(amount).toLocaleString('en-US')}`;
}

class AIService {
    constructor() {
        this.openAiKey = process.env.OPENAI_API_KEY || null;
        this.geminiKey = process.env.GEMINI_API_KEY || null;
    }

    hasExternalApiKey() {
        return !!(this.openAiKey || this.geminiKey);
    }

    async callGeminiJSON(prompt) {
        if (!this.geminiKey) return null;
        const body = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
        });
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(this.geminiKey)}`;
        return new Promise((resolve) => {
            const req = https.request(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
                timeout: 4500
            }, (res) => {
                let raw = '';
                res.on('data', c => raw += c);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(raw);
                        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                        resolve(text ? JSON.parse(text) : null);
                    } catch {
                        resolve(null);
                    }
                });
            });
            req.on('error', () => resolve(null));
            req.on('timeout', () => { req.destroy(); resolve(null); });
            req.write(body);
            req.end();
        });
    }

    async analyzeQuotations(rfq, quotations = [], currency = 'USD') {
        if (!quotations || quotations.length === 0) {
            return {
                recommendation: 'No quotations available to analyze for this requisition yet.',
                bestQuoteId: null,
                quotes: []
            };
        }

        const minPrice = Math.min(...quotations.map(q => parseFloat(q.amount) || 1));
        const minDays = Math.min(...quotations.map(q => parseInt(q.delivery_days, 10) || 1));

        const scoredQuotes = quotations.map(q => {
            const price = parseFloat(q.amount) || 0;
            const days = parseInt(q.delivery_days, 10) || 1;
            const priceScore = price > 0 ? (minPrice / price) * 60 : 0;
            const deliveryScore = days > 0 ? (minDays / days) * 40 : 0;
            const totalScore = Math.round(priceScore + deliveryScore);

            return {
                id: q.id,
                vendor_name: q.vendor_name,
                amount: price,
                currency: q.currency || currency,
                delivery_days: days,
                notes: q.notes,
                priceScore: Math.round((priceScore / 60) * 100),
                deliveryScore: Math.round((deliveryScore / 40) * 100),
                score: totalScore,
                isRecommended: false
            };
        });

        scoredQuotes.sort((a, b) => b.score - a.score);
        scoredQuotes[0].isRecommended = true;

        const topPick = scoredQuotes[0];
        const secondPick = scoredQuotes[1];
        const spreadNote = secondPick
            ? ` Outperforms runner-up "${secondPick.vendor_name}" (${secondPick.score}/100) on combined cost-to-SLA efficiency.`
            : '';

        const summary = `AI Recommendation: "${topPick.vendor_name}" offers the optimal multi-factor balance (${formatCurrency(topPick.amount, topPick.currency || currency)}, ${topPick.delivery_days} days turnaround), scoring ${topPick.score}/100.${spreadNote}`;

        return {
            rfq_id: rfq ? rfq.id : null,
            rfq_title: rfq ? rfq.title : 'RFQ',
            recommendation: summary,
            topVendor: topPick.vendor_name,
            bestQuoteId: topPick.id,
            quotes: scoredQuotes
        };
    }

    async estimateRfqBudget(title, quantity, description = '', currency = 'USD') {
        const qty = Math.max(1, parseInt(quantity, 10) || 1);
        const fx = FX_FROM_USD[(currency || 'USD').toUpperCase()] || 1;
        let unitUsd = 180;
        const lower = `${title} ${description}`.toLowerCase();

        if (lower.includes('laptop') || lower.includes('macbook') || lower.includes('workstation') || lower.includes('computer')) {
            unitUsd = 1750;
        } else if (lower.includes('server') || lower.includes('rack') || lower.includes('cluster') || lower.includes('infrastructure')) {
            unitUsd = 6200;
        } else if (lower.includes('switch') || lower.includes('router') || lower.includes('network')) {
            unitUsd = 2800;
        } else if (lower.includes('monitor') || lower.includes('display')) {
            unitUsd = 520;
        } else if (lower.includes('chair') || lower.includes('desk') || lower.includes('furniture')) {
            unitUsd = 390;
        } else if (lower.includes('printer') || lower.includes('paper') || lower.includes('toner')) {
            unitUsd = 140;
        } else if (lower.includes('software') || lower.includes('license') || lower.includes('cloud')) {
            unitUsd = 450;
        }

        const unitEst = Math.round(unitUsd * fx);
        const expectedTotal = qty * unitEst;
        const minBudget = Math.round(expectedTotal * 0.85);
        const maxBudget = Math.round(expectedTotal * 1.2);

        return {
            currency: (currency || 'USD').toUpperCase(),
            estimatedUnitCost: unitEst,
            estimatedTotal: expectedTotal,
            suggestedBudgetRange: `${formatCurrency(minBudget, currency)} – ${formatCurrency(maxBudget, currency)}`,
            recommendedDeliveryDays: qty > 50 ? 14 : 7,
            advice: 'Include multi-year SLA terms, freight incoterms (DDP/CIF), and staggered batch milestone penalties.'
        };
    }

    async parseRfqPrompt(promptText, currency = 'USD') {
        const text = (promptText || '').trim();
        const curr = (currency || 'USD').toUpperCase();
        const fx = FX_FROM_USD[curr] || 1;

        if (this.geminiKey && text.length > 10) {
            const llm = await this.callGeminiJSON(
                `Extract a procurement RFQ JSON from this request: "${text}". Return strict JSON with keys: title (string), category (one of: "IT Hardware & Infrastructure", "Cloud & Data Center", "Workspace & Facilities", "Operations & Logistics", "SaaS & Enterprise Licensing"), deadlineDays (number, default 21), items (array of {name, unit, qty, target_price} in ${curr}).`
            );
            if (llm && Array.isArray(llm.items) && llm.items.length > 0) {
                const days = parseInt(llm.deadlineDays, 10) || 21;
                return {
                    source: 'gemini',
                    title: llm.title || 'Global Procurement Requisition',
                    category: llm.category || 'IT Hardware & Infrastructure',
                    description: text,
                    deadline: new Date(Date.now() + days * 86400000).toISOString().split('T')[0],
                    items: llm.items.map(it => ({
                        name: String(it.name || 'Item'),
                        unit: String(it.unit || 'Units'),
                        qty: Math.max(1, parseInt(it.qty, 10) || 1),
                        target_price: Math.max(0, parseFloat(it.target_price) || 0)
                    }))
                };
            }
        }

        const lower = text.toLowerCase();
        // Extract explicit deadline days or weeks from text
        let deadlineDays = 21;
        const weekMatch = lower.match(/(\d+)\s*week/);
        const dayMatch = lower.match(/(\d+)\s*day/);
        if (weekMatch) deadlineDays = parseInt(weekMatch[1], 10) * 7;
        else if (dayMatch) deadlineDays = parseInt(dayMatch[1], 10);

        const dateMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
        const deadline = dateMatch
            ? dateMatch[1]
            : new Date(Date.now() + deadlineDays * 86400000).toISOString().split('T')[0];

        // Extract quantity hints before keywords
        const extractQty = (regex, fallback) => {
            const m = lower.match(regex);
            return m ? Math.max(1, parseInt(m[1], 10)) : fallback;
        };

        const items = [];
        let title = 'Enterprise Procurement Requisition';
        let category = 'IT Hardware & Infrastructure';

        if (lower.includes('laptop') || lower.includes('workstation') || lower.includes('macbook')) {
            title = 'Global Engineering Laptop & Workstation Fleet';
            category = 'IT Hardware & Infrastructure';
            const q = extractQty(/(\d+)\s+(?:high[- ]performance\s+)?(?:developer\s+)?(?:laptop|workstation|macbook)/, 25);
            items.push({ name: 'Developer Workstation (32GB RAM, 1TB NVMe)', unit: 'Units', qty: q, target_price: Math.round(1800 * fx) });
        }
        if (lower.includes('monitor') || lower.includes('display')) {
            if (title === 'Enterprise Procurement Requisition') title = 'Ultra-Wide Commercial Display Rollout';
            const q = extractQty(/(\d+)\s+(?:portable\s+|ultra[- ]?wide\s+|4k\s+|34[- ]?inch\s+)?(?:curved\s+)?(?:monitor|display)/, 15);
            items.push({ name: '34-inch UHD IPS Commercial Monitor', unit: 'Pcs', qty: q, target_price: Math.round(520 * fx) });
        }
        if (lower.includes('server') || lower.includes('rack') || lower.includes('cluster')) {
            title = 'Data Center & Edge Compute Infrastructure';
            category = 'Cloud & Data Center';
            const q = extractQty(/(\d+)\s+(?:enterprise\s+)?(?:2u\s+)?(?:rack\s+)?server/, 10);
            items.push({ name: '2U Enterprise Rack Server (128GB ECC)', unit: 'Units', qty: q, target_price: Math.round(6400 * fx) });
        }
        if (lower.includes('switch') || lower.includes('router')) {
            category = 'Cloud & Data Center';
            const q = extractQty(/(\d+)\s+(?:48[- ]port\s+)?(?:managed\s+|gigabit\s+|poe\s+)*(?:switch|router)/, 4);
            items.push({ name: '48-Port Managed PoE+ Network Switch', unit: 'Units', qty: q, target_price: Math.round(2900 * fx) });
        }
        if (lower.includes('chair') || lower.includes('desk') || lower.includes('furniture')) {
            title = 'Ergonomic Studio & Workspace Expansion';
            category = 'Workspace & Facilities';
            if (lower.includes('chair')) {
                const q = extractQty(/(\d+)\s+(?:ergonomic\s+)?(?:mesh\s+)?(?:executive\s+)?chair/, 40);
                items.push({ name: 'Ergonomic Mesh Lumbar Chair', unit: 'Pcs', qty: q, target_price: Math.round(350 * fx) });
            }
            if (lower.includes('desk')) {
                const q = extractQty(/(\d+)\s+(?:motorized\s+|standing\s+|height[- ]adjustable\s+)*desk/, 25);
                items.push({ name: 'Motorized Height-Adjustable Desk', unit: 'Pcs', qty: q, target_price: Math.round(520 * fx) });
            }
        }

        if (items.length === 0) {
            const firstNum = extractQty(/\b(\d+)\b/, 20);
            items.push({ name: text.slice(0, 60) || 'Custom Procurement Line Item', unit: 'Units', qty: firstNum, target_price: Math.round(250 * fx) });
        }

        return {
            source: 'heuristic_nlp',
            title,
            category,
            description: text,
            deadline,
            items
        };
    }
}

module.exports = new AIService();
