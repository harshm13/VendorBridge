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
        if (!amount || !delivery_days) {
            return res.status(400).json({ success: false, message: 'Amount and delivery days are required' });
        }

        let vendor_id = null;
        let vendor_name = req.body.vendor_name || 'Vendor Partner';

        if (req.user && req.user.id) {
            const vendor = await Vendor.getByUserId(req.user.id);
            if (vendor) {
                vendor_id = vendor.id;
                vendor_name = req.body.vendor_name || vendor.company_name || req.user.name;
            } else if (req.user.role === 'vendor') {
                try {
                    vendor_id = await Vendor.create({
                        name: req.user.name || 'Vendor Partner',
                        email: req.user.email,
                        phone: '',
                        company: req.body.vendor_name || req.user.name || 'Vendor Partner',
                        user_id: req.user.id
                    });
                    vendor_name = req.body.vendor_name || req.user.name || 'Vendor Partner';
                } catch (e) {}
            }
        }

        if (rfq_id) {
            const [rfqRows] = await db.query('SELECT * FROM rfqs WHERE id = ?', [rfq_id]);
            if (rfqRows && rfqRows.length > 0 && rfqRows[0].status === 'closed') {
                return res.status(400).json({ success: false, message: 'Cannot submit quotation for a closed RFQ' });
            }
        }

        const quoteId = await Quotation.create({
            rfq_id: rfq_id ? parseInt(rfq_id, 10) : null,
            vendor_id,
            vendor_name,
            amount: parseFloat(amount),
            currency: currency || 'USD',
            delivery_days: parseInt(delivery_days, 10),
            notes: notes || '',
            items: Array.isArray(req.body.items) ? req.body.items : []
        });

        await Activity.log({
            user_id: req.user?.id || null,
            title: `Quotation #${quoteId} Submitted by ${vendor_name}`,
            category: 'quotation',
            action: `Submitted bid of ${parseFloat(amount).toLocaleString()} (${delivery_days}d SLA) for RFQ#${rfq_id || 'General'}.`
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
