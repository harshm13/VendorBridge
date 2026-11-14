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
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Valid positive RFQ ID is required' });
        }
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

        if (!title || typeof title !== 'string' || title.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Title is required (minimum 3 characters)' });
        }

        if (!description || typeof description !== 'string' || description.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'Description is required (minimum 5 characters)' });
        }

        if (!deadline || isNaN(Date.parse(deadline))) {
            return res.status(400).json({ success: false, message: 'Valid deadline date is required' });
        }

        let validatedItems = [];
        if (Array.isArray(items) && items.length > 0) {
            for (const item of items) {
                const iName = item.name ? String(item.name).trim() : '';
                const iQty = parseInt(item.qty, 10);
                const iPrice = parseFloat(item.target_price);
                if (!iName) {
                    return res.status(400).json({ success: false, message: 'Each BoM line item must have a name' });
                }
                if (isNaN(iQty) || iQty <= 0) {
                    return res.status(400).json({ success: false, message: `Invalid quantity for item "${iName}"` });
                }
                validatedItems.push({
                    name: iName,
                    unit: item.unit ? String(item.unit).trim() : 'Units',
                    qty: iQty,
                    target_price: !isNaN(iPrice) && iPrice >= 0 ? iPrice : 0
                });
            }
            const calculatedQty = validatedItems.reduce((sum, item) => sum + item.qty, 0);
            if (!quantity || quantity <= 0) {
                quantity = calculatedQty;
            }
        }

        const numQty = parseInt(quantity, 10);
        if (isNaN(numQty) || numQty <= 0) {
            return res.status(400).json({ success: false, message: 'Total quantity must be a positive integer' });
        }

        const cleanCurrency = currency && typeof currency === 'string' ? currency.trim().toUpperCase() : 'USD';
        const created_by = req.user ? req.user.id : 1;
        const rfqId = await RFQ.create({
            title: title.trim(),
            description: description.trim(),
            category: category ? String(category).trim() : 'IT Hardware & Infrastructure',
            quantity: numQty,
            currency: cleanCurrency,
            deadline: new Date(deadline).toISOString().slice(0, 10),
            created_by,
            status: 'open',
            items: validatedItems
        });

        await Activity.log({
            user_id: created_by,
            title: `RFQ#${rfqId} Published: ${title.trim()}`,
            category: 'rfq',
            action: `Broadcasted ${numQty} units (${category || 'General'}) with deadline ${deadline}.`
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
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Valid positive RFQ ID is required' });
        }

        const { status } = req.body;
        if (!status || !['open', 'closed', 'draft'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid RFQ status. Allowed: open, closed, draft' });
        }

        const existingRfq = await RFQ.getById(id);
        if (!existingRfq) {
            return res.status(404).json({ success: false, message: 'RFQ not found' });
        }

        if (existingRfq.status === status) {
            return res.status(200).json({ success: true, message: `RFQ#${id} is already ${status}.` });
        }

        const ok = await RFQ.updateStatus(id, status);
        if (!ok) {
            return res.status(404).json({ success: false, message: 'RFQ not found' });
        }

        await Activity.log({
            user_id: req.user?.id || null,
            title: `RFQ#${id} marked ${status.toUpperCase()}`,
            category: 'rfq',
            action: `Requisition status transitioned from ${existingRfq.status} to ${status}.`
        });

        res.status(200).json({ success: true, message: `RFQ#${id} marked as ${status}.` });
    } catch (error) {
        next(error);
    }
};
