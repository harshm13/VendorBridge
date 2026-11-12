const PurchaseOrder = require('../models/poModel');
const Activity = require('../models/activityModel');

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
        const { quotation_id, vendor_name, rfq_ref, total_amount, currency, status } = req.body;
        if (!vendor_name || !total_amount) {
            return res.status(400).json({ success: false, message: 'Vendor name and total amount are required' });
        }

        const po = await PurchaseOrder.create({ quotation_id, vendor_name, rfq_ref, total_amount, currency, status });
        await Activity.log({
            user_id: req.user?.id || null,
            title: `${po.po_number} Issued`,
            category: 'po',
            action: `Cryptographically stamped PO for ${vendor_name} (${rfq_ref || 'Direct'}).`
        });

        res.status(201).json({ success: true, message: 'Purchase Order created successfully!', po });
    } catch (error) {
        next(error);
    }
};

exports.updatePOStatus = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { status } = req.body;
        if (!['pending', 'issued', 'approved', 'completed'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid PO status' });
        }
        const ok = await PurchaseOrder.updateStatus(id, status);
        if (!ok) {
            return res.status(404).json({ success: false, message: 'Purchase Order not found' });
        }
        await Activity.log({
            user_id: req.user?.id || null,
            title: `PO #${id} marked ${status.toUpperCase()}`,
            category: 'po',
            action: `Purchase order lifecycle status updated to ${status}.`
        });
        res.status(200).json({ success: true, message: `Purchase Order status updated to ${status}.` });
    } catch (error) {
        next(error);
    }
};
