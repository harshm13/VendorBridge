const Quotation = require('../models/quotationModel');
const Vendor = require('../models/vendorModel');
const Activity = require('../models/activityModel');
const db = require('../config/db');

exports.getQuotations = async (req, res, next) => {
    try {
        const quotations = await Quotation.getAll();
        res.status(200).json(quotations);
    } catch (error) {
        next(error);
    }
};

exports.createQuotation = async (req, res, next) => {
    try {
        const { rfq_id, amount, currency, delivery_days, notes } = req.body;
        if (amount === undefined || amount === null || delivery_days === undefined || delivery_days === null) {
            return res.status(400).json({ success: false, message: 'Amount and delivery days are required' });
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Quotation amount must be a positive number' });
        }

        const numDeliveryDays = parseInt(delivery_days, 10);
        if (isNaN(numDeliveryDays) || numDeliveryDays <= 0) {
            return res.status(400).json({ success: false, message: 'Delivery lead time must be a positive integer' });
        }

        let parsedRfqId = null;
        let rfqCurrency = null;
        if (rfq_id !== undefined && rfq_id !== null && rfq_id !== '') {
            parsedRfqId = parseInt(rfq_id, 10);
            if (isNaN(parsedRfqId) || parsedRfqId <= 0) {
                return res.status(400).json({ success: false, message: 'Invalid RFQ ID format' });
            }

            const [rfqRows] = await db.query('SELECT * FROM rfqs WHERE id = ?', [parsedRfqId]);
            if (!rfqRows || rfqRows.length === 0) {
                return res.status(404).json({ success: false, message: 'Referenced RFQ tender not found' });
            }

            const rfq = rfqRows[0];
            if (rfq.status !== 'open') {
                return res.status(400).json({
                    success: false,
                    message: `Cannot submit quotation for RFQ with status '${rfq.status}'. Only OPEN RFQs accept bids.`
                });
            }
            rfqCurrency = rfq.currency;
        }

        let vendor_id = null;
        let vendor_name = req.body.vendor_name ? String(req.body.vendor_name).trim() : 'Vendor Partner';

        if (req.user && req.user.id) {
            const vendor = await Vendor.getByUserId(req.user.id);
            if (vendor) {
                vendor_id = vendor.id;
                vendor_name = req.body.vendor_name ? String(req.body.vendor_name).trim() : (vendor.company_name || req.user.name);
            } else if (req.user.role === 'vendor') {
                try {
                    vendor_id = await Vendor.create({
                        name: req.user.name || 'Vendor Partner',
                        email: req.user.email,
                        phone: '',
                        company: req.body.vendor_name ? String(req.body.vendor_name).trim() : (req.user.name || 'Vendor Partner'),
                        user_id: req.user.id
                    });
                    vendor_name = req.body.vendor_name ? String(req.body.vendor_name).trim() : (req.user.name || 'Vendor Partner');
                } catch (e) {}
            }
        }

        const cleanCurrency = currency && typeof currency === 'string' ? currency.trim().toUpperCase() : (rfqCurrency || 'USD');

        const quoteId = await Quotation.create({
            rfq_id: parsedRfqId,
            vendor_id,
            vendor_name,
            amount: numAmount,
            currency: cleanCurrency,
            delivery_days: numDeliveryDays,
            notes: notes ? String(notes).trim() : '',
            items: Array.isArray(req.body.items) ? req.body.items : []
        });

        await Activity.log({
            user_id: req.user?.id || null,
            title: `Quotation #${quoteId} Submitted by ${vendor_name}`,
            category: 'quotation',
            action: `Submitted bid of ${numAmount.toLocaleString()} (${numDeliveryDays}d SLA) for RFQ#${parsedRfqId || 'General'}.`
        });

        res.status(201).json({
            success: true,
            message: 'Quotation submitted successfully with Line Item breakdown! Approval request generated for Manager review.',
            id: quoteId
        });
    } catch (error) {
        next(error);
    }
};
