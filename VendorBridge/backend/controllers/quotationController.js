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
        let vendor_name = req.body.vendor_name || 'Unknown Vendor';
        
        if (req.user && req.user.id) {
            const vendor = await Vendor.getByUserId(req.user.id);
            if (!vendor && req.user.role === 'vendor') {
                return res.status(403).json({ success: false, message: 'Vendor profile not found for this user' });
            }
            if (vendor) {
                vendor_id = vendor.id;
                vendor_name = vendor.company_name;
            }
        }

        const [rfqRows] = await db.query('SELECT * FROM rfqs WHERE id = ?', [rfq_id]);
        if (!rfqRows[0]) {
             return res.status(404).json({ success: false, message: 'RFQ not found' });
        }
        if (rfqRows[0].status !== 'open') {
             return res.status(400).json({ success: false, message: 'Cannot submit quotation for a closed or draft RFQ' });
        }

        const quoteId = await Quotation.create({ rfq_id, vendor_id, vendor_name, amount, delivery_days, notes });
        res.status(201).json({ success: true, message: 'Quotation submitted successfully!', id: quoteId });
    } catch (error) {
        next(error);
    }
};
