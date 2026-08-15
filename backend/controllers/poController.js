const PurchaseOrder = require('../models/poModel');

exports.getPOs = async (req, res, next) => {
    try {
        const pos = await PurchaseOrder.getAll();
        res.status(200).json(pos);
    } catch (error) {
        next(error);
    }
};

exports.createPO = async (req, res, next) => {
    try {
        const { quotation_id, vendor_name, rfq_ref, total_amount, status } = req.body;
        if (!vendor_name || !total_amount) {
            return res.status(400).json({ success: false, message: 'Vendor name and total amount are required' });
        }

        const po = await PurchaseOrder.create({ quotation_id, vendor_name, rfq_ref, total_amount, status });
        res.status(201).json({ success: true, message: 'Purchase Order created successfully!', po });
    } catch (error) {
        next(error);
    }
};
