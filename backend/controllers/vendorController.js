const Vendor = require('../models/vendorModel');

exports.getVendors = async (req, res, next) => {
    try {
        const vendors = await Vendor.getAll();
        res.status(200).json(vendors);
    } catch (error) {
        next(error);
    }
};

exports.createVendor = async (req, res, next) => {
    try {
        const { name, email, phone, company, gst_number, address } = req.body;
        if (!name || !email || !phone) {
            return res.status(400).json({ success: false, message: 'Name, email, and phone are required' });
        }

        const vendorId = await Vendor.create({ name, email, phone, company, gst_number, address });
        res.status(201).json({ success: true, message: 'Vendor added successfully!', id: vendorId });
    } catch (error) {
        next(error);
    }
};
