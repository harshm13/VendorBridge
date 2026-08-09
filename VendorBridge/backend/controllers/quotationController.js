const Quotation = require('../models/quotationModel');

exports.getQuotations = async (req, res) => {
    try {
        const quotations = await Quotation.getAll();
        res.status(200).json(quotations);
    } catch (error) {
        console.error('Error fetching quotations:', error);
        res.status(500).json({ message: 'Server error fetching quotations' });
    }
};

exports.createQuotation = async (req, res) => {
    try {
        const { rfq_id, vendor_id, vendor_name, amount, delivery_days, notes } = req.body;
        if (!vendor_name || !amount || !delivery_days) {
            return res.status(400).json({ message: 'Vendor name, amount, and delivery days are required' });
        }

        const quoteId = await Quotation.create({ rfq_id, vendor_id, vendor_name, amount, delivery_days, notes });
        res.status(201).json({ message: 'Quotation submitted successfully!', id: quoteId });
    } catch (error) {
        console.error('Error submitting quotation:', error);
        res.status(500).json({ message: 'Server error submitting quotation' });
    }
};
