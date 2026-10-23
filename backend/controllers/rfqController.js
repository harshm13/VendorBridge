const RFQ = require('../models/rfqModel');

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
        const { title, description, deadline, items } = req.body;
        let quantity = req.body.quantity;

        // If items are provided in the Bill of Materials, sum quantities if quantity is missing
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
            quantity: parseInt(quantity, 10), 
            deadline, 
            created_by, 
            status: 'open',
            items: Array.isArray(items) ? items : []
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

