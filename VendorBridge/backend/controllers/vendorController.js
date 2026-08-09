const Vendor = require('../models/vendorModel');

exports.getVendors = async (req, res) => {
    try {
        const vendors = await Vendor.getAll();
        res.status(200).json(vendors);
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ message: 'Server error fetching vendors' });
    }
};

exports.createVendor = async (req, res) => {
    try {
        const { name, email, phone, company, gst_number, address } = req.body;
        if (!name || !email || !phone) {
            return res.status(400).json({ message: 'Name, email, and phone are required' });
        }

        const vendorId = await Vendor.create({ name, email, phone, company, gst_number, address });
        res.status(201).json({ message: 'Vendor added successfully!', id: vendorId });
    } catch (error) {
        console.error('Error creating vendor:', error);
        res.status(500).json({ message: 'Server error creating vendor' });
    }
};
