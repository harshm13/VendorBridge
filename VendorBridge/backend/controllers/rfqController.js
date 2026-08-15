const RFQ = require('../models/rfqModel');

exports.getRFQs = async (req, res, next) => {
    try {
        const rfqs = await RFQ.getAll();
        res.status(200).json(rfqs);
    } catch (error) {
        next(error);
    }
};

exports.createRFQ = async (req, res, next) => {
    try {
        const { title, description, quantity, deadline } = req.body;
        if (!title || !description || !quantity || !deadline) {
            return res.status(400).json({ success: false, message: 'Title, description, quantity, and deadline are required' });
        }

        const created_by = req.user ? req.user.id : 1;
        const rfqId = await RFQ.create({ title, description, quantity, deadline, created_by, status: 'open' });
        res.status(201).json({ success: true, message: 'RFQ created successfully!', id: rfqId });
    } catch (error) {
        next(error);
    }
};
