const Invoice = require('../models/invoiceModel');
const db = require('../config/db');

exports.getInvoices = async (req, res, next) => {
    try {
        const invoices = await Invoice.getAll();
        res.status(200).json(invoices);
    } catch (error) {
        next(error);
    }
};

exports.createInvoice = async (req, res, next) => {
    try {
        const { vendor_name, product, quantity, unit_price, purchase_order_id } = req.body;
        if (!vendor_name || !product || !quantity || !unit_price) {
            return res.status(400).json({ success: false, message: 'Vendor name, product, quantity, and unit price are required' });
        }

        if (purchase_order_id) {
            const [poRows] = await db.query('SELECT * FROM purchase_orders WHERE id = ?', [purchase_order_id]);
            if (!poRows[0]) {
                return res.status(404).json({ success: false, message: 'Purchase Order not found' });
            }
        }

        const invoice = await Invoice.create({ vendor_name, product, quantity, unit_price, purchase_order_id });
        res.status(201).json({ success: true, message: 'Invoice generated successfully!', invoice });
    } catch (error) {
        next(error);
    }
};
