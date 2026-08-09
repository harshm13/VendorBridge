const Invoice = require('../models/invoiceModel');

exports.getInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.getAll();
        res.status(200).json(invoices);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ message: 'Server error fetching invoices' });
    }
};

exports.createInvoice = async (req, res) => {
    try {
        const { vendor_name, product, quantity, unit_price, purchase_order_id } = req.body;
        if (!vendor_name || !product || !quantity || !unit_price) {
            return res.status(400).json({ message: 'Vendor name, product, quantity, and unit price are required' });
        }

        const invoice = await Invoice.create({ vendor_name, product, quantity, unit_price, purchase_order_id });
        res.status(201).json({ message: 'Invoice generated successfully!', invoice });
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ message: 'Server error generating invoice' });
    }
};
