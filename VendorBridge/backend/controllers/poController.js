const PurchaseOrder = require('../models/poModel');

exports.getPOs = async (req, res) => {
    try {
        const pos = await PurchaseOrder.getAll();
        res.status(200).json(pos);
    } catch (error) {
        console.error('Error fetching purchase orders:', error);
        res.status(500).json({ message: 'Server error fetching purchase orders' });
    }
};

exports.createPO = async (req, res) => {
    try {
        const { quotation_id, vendor_name, rfq_ref, total_amount, status } = req.body;
        if (!vendor_name || !total_amount) {
            return res.status(400).json({ message: 'Vendor name and total amount are required' });
        }

        const po = await PurchaseOrder.create({ quotation_id, vendor_name, rfq_ref, total_amount, status });
        res.status(201).json({ message: 'Purchase Order created successfully!', po });
    } catch (error) {
        console.error('Error creating purchase order:', error);
        res.status(500).json({ message: 'Server error creating purchase order' });
    }
};
