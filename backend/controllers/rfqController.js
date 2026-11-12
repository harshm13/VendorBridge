const RFQ = require('../models/rfqModel');
const Activity = require('../models/activityModel');

exports.getRFQs = async (req, res, next) => {
    try {
        const rfqs = await RFQ.getAll();
        res.status(200).json(rfqs);
    } catch (error) {
        next(error);
    }
};

exports.getRFQById = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const rfq = await RFQ.getById(id);
        if (!rfq) {
            return res.status(404).json({ success: false, message: 'RFQ not found' });
        }
        res.status(200).json(rfq);
    } catch (error) {
        next(error);
    }
};

exports.createRFQ = async (req, res, next) => {
    try {
        const { title, description, category, deadline, items, currency } = req.body;
        let quantity = req.body.quantity;

        if (Array.isArray(items) && items.length > 0) {
            const calculatedQty = items.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0);
            if (!quantity || quantity <= 0) {
                quantity = calculatedQty;
            }
        }

        if (!title || !description || !quantity || !deadline) {
            return res.status(400).json({ success: false, message: 'Title, description, quantity, and deadline are required' });
        }

        const created_by = req.user ? req.user.id : 1;
        const rfqId = await RFQ.create({
            title,
            description,
            category: category || 'IT Hardware & Infrastructure',
            quantity: parseInt(quantity, 10),
            currency: currency || 'USD',
            deadline,
            created_by,
            status: 'open',
            items: Array.isArray(items) ? items : []
        });

        await Activity.log({
            user_id: created_by,
            title: `RFQ#${rfqId} Published: ${title}`,
            category: 'rfq',
            action: `Broadcasted ${quantity} units (${category || 'General'}) with deadline ${deadline}.`
        });

        res.status(201).json({
            success: true,
            message: 'RFQ created successfully with Bill of Materials specification!',
            id: rfqId
        });
    } catch (error) {
        next(error);
    }
};

exports.updateRFQStatus = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { status } = req.body;
        if (!['open', 'closed', 'draft'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid RFQ status' });
        }
        const ok = await RFQ.updateStatus(id, status);
        if (!ok) {
            return res.status(404).json({ success: false, message: 'RFQ not found' });
        }
        await Activity.log({
            user_id: req.user?.id || null,
            title: `RFQ#${id} marked ${status.toUpperCase()}`,
            category: 'rfq',
            action: `Requisition status transitioned to ${status}.`
        });
        res.status(200).json({ success: true, message: `RFQ#${id} marked as ${status}.` });
    } catch (error) {
        next(error);
    }
};
