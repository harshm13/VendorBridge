const Quotation = require('../models/quotationModel');
const Vendor = require('../models/vendorModel');
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
        const { rfq_id, amount, delivery_days, notes } = req.body;
        if (!amount || !delivery_days) {
            return res.status(400).json({ success: false, message: 'Amount and delivery days are required' });
        }

        let vendor_id = null;
        let vendor_name = req.body.vendor_name || 'Vendor Partner';
        
        if (req.user && req.user.id) {
            const vendor = await Vendor.getByUserId(req.user.id);
            if (vendor) {
                vendor_id = vendor.id;
                vendor_name = vendor.company_name || req.body.vendor_name || req.user.name;
            } else if (req.user.role === 'vendor') {
                // If vendor profile row is missing, auto-create one
                try {
                    vendor_id = await Vendor.create({
                        name: req.user.name || 'Vendor Partner',
                        email: req.user.email,
                        phone: '',
                        company: req.body.vendor_name || req.user.name || 'Vendor Partner',
                        user_id: req.user.id
                    });
                    vendor_name = req.body.vendor_name || req.user.name || 'Vendor Partner';
                } catch (e) {
                    // Fallback to name
                }
            }
        }

        if (rfq_id) {
            const [rfqRows] = await db.query('SELECT * FROM rfqs WHERE id = ?', [rfq_id]);
            if (rfqRows && rfqRows.length > 0) {
                if (rfqRows[0].status === 'closed') {
                    return res.status(400).json({ success: false, message: 'Cannot submit quotation for a closed RFQ' });
                }
            }
        }

        const quoteId = await Quotation.create({ 
            rfq_id: rfq_id ? parseInt(rfq_id, 10) : null, 
            vendor_id, 
            vendor_name, 
            amount: parseFloat(amount), 
            delivery_days: parseInt(delivery_days, 10), 
            notes: notes || '' 
        });

        res.status(201).json({ 
            success: true, 
            message: 'Quotation submitted successfully! Approval request has been generated for Manager review.', 
            id: quoteId 
        });
    } catch (error) {
        next(error);
    }
};
