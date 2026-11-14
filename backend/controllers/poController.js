const PurchaseOrder = require('../models/poModel');
const Activity = require('../models/activityModel');
const db = require('../config/db');

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
        if (!vendor_name || typeof vendor_name !== 'string' || !vendor_name.trim()) {
            return res.status(400).json({ success: false, message: 'Vendor name is required' });
        }

        const numTotal = parseFloat(total_amount);
        if (isNaN(numTotal) || numTotal <= 0) {
            return res.status(400).json({ success: false, message: 'Total amount must be a positive number' });
        }

        let parsedQuoteId = null;
        if (quotation_id !== undefined && quotation_id !== null && quotation_id !== '') {
            parsedQuoteId = parseInt(quotation_id, 10);
            if (isNaN(parsedQuoteId) || parsedQuoteId <= 0) {
                return res.status(400).json({ success: false, message: 'Invalid quotation ID format' });
            }
            const [quoteRows] = await db.query('SELECT * FROM quotations WHERE id = ?', [parsedQuoteId]);
            if (!quoteRows || quoteRows.length === 0) {
                return res.status(404).json({ success: false, message: 'Referenced quotation not found' });
            }
            if (quoteRows[0].status === 'rejected') {
                return res.status(400).json({ success: false, message: 'Cannot issue Purchase Order for a rejected quotation' });
            }
        }

        const allowedInitialStatuses = ['pending', 'issued', 'approved'];
        const cleanStatus = status && allowedInitialStatuses.includes(status) ? status : 'issued';
        const cleanCurrency = currency && typeof currency === 'string' ? currency.trim().toUpperCase() : 'USD';

        const po = await PurchaseOrder.create({
            quotation_id: parsedQuoteId,
            vendor_name: vendor_name.trim(),
            rfq_ref: rfq_ref ? String(rfq_ref).trim() : 'Direct Requisition',
            total_amount: numTotal,
            currency: cleanCurrency,
            status: cleanStatus
        });

        await Activity.log({
            user_id: req.user?.id || null,
            title: `${po.po_number} Issued`,
            category: 'po',
            action: `Cryptographically stamped PO for ${vendor_name.trim()} (${rfq_ref || 'Direct'}).`
        });

        res.status(201).json({ success: true, message: 'Purchase Order created successfully!', po });
    } catch (error) {
        next(error);
    }
};

exports.updatePOStatus = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Valid positive Purchase Order ID is required' });
        }

        const { status } = req.body;
        const validStatuses = ['pending', 'issued', 'approved', 'completed'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid PO status. Allowed: ${validStatuses.join(', ')}` });
        }

        const existingPo = await PurchaseOrder.getById(id);
        if (!existingPo) {
            return res.status(404).json({ success: false, message: 'Purchase Order not found' });
        }

        if (existingPo.status === status) {
            return res.status(200).json({ success: true, message: `Purchase Order status is already ${status}.` });
        }

        if (existingPo.status === 'completed' && status !== 'completed') {
            return res.status(400).json({ success: false, message: 'Completed Purchase Orders cannot be reverted to earlier states' });
        }

        const ok = await PurchaseOrder.updateStatus(id, status);
        if (!ok) {
            return res.status(404).json({ success: false, message: 'Purchase Order not found' });
        }

        await Activity.log({
            user_id: req.user?.id || null,
            title: `PO #${id} marked ${status.toUpperCase()}`,
            category: 'po',
            action: `Purchase order lifecycle status updated from ${existingPo.status} to ${status}.`
        });

        res.status(200).json({ success: true, message: `Purchase Order status updated to ${status}.` });
    } catch (error) {
        next(error);
    }
};
