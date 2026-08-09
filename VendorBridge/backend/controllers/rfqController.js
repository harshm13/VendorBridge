const RFQ = require('../models/rfqModel');

exports.getRFQs = async (req, res) => {
    try {
        const rfqs = await RFQ.getAll();
        res.status(200).json(rfqs);
    } catch (error) {
        console.error('Error fetching RFQs:', error);
        res.status(500).json({ message: 'Server error fetching RFQs' });
    }
};

exports.createRFQ = async (req, res) => {
    try {
        const { title, description, quantity, deadline, created_by } = req.body;
        if (!title || !description || !quantity || !deadline) {
            return res.status(400).json({ message: 'Title, description, quantity, and deadline are required' });
        }

        const rfqId = await RFQ.create({ title, description, quantity, deadline, created_by, status: 'open' });
        res.status(201).json({ message: 'RFQ created successfully!', id: rfqId });
    } catch (error) {
        console.error('Error creating RFQ:', error);
        res.status(500).json({ message: 'Server error creating RFQ' });
    }
};
