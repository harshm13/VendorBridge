const Invoice = require('../models/invoiceModel');
const PurchaseOrder = require('../models/poModel');
const Activity = require('../models/activityModel');
const db = require('../config/db');

exports.getInvoices = async (req, res, next) => {
    try {
        const invoices = await Invoice.getAll();
        const pos = await PurchaseOrder.getAll();
        const poMap = new Map(pos.map(p => [p.id, p]));

        // Enrich invoices with real 3-Way Match variance computation
        const enriched = invoices.map(inv => {
            const linkedPo = inv.purchase_order_id ? poMap.get(inv.purchase_order_id) : null;
            if (!linkedPo) {
                return {
                    ...inv,
                    po_number: null,
                    three_way_match: {
                        status: 'unlinked',
                        variance_pct: 0,
                        po_amount: null,
                        invoice_subtotal: parseFloat(inv.subtotal) || 0,
                        message: 'Standalone invoice (not linked to a PO).'
                    }
                };
            }
            const poAmt = parseFloat(linkedPo.total_amount) || 0;
            const invSub = parseFloat(inv.subtotal) || 0;
            const diff = Math.abs(invSub - poAmt);
            const variancePct = poAmt > 0 ? Number(((diff / poAmt) * 100).toFixed(2)) : 0;
            const passed = variancePct <= 1.0;

            return {
                ...inv,
                po_number: linkedPo.po_number,
                three_way_match: {
                    status: passed ? 'passed' : 'variance',
                    variance_pct: variancePct,
                    po_amount: poAmt,
                    invoice_subtotal: invSub,
                    message: passed
                        ? `PO ${linkedPo.po_number}, GRN, and Invoice match within tolerance (${variancePct}% variance).`
                        : `Billing discrepancy detected: Invoice subtotal differs from ${linkedPo.po_number} by ${variancePct}%.`
                }
            };
        });

        res.status(200).json(enriched);
    } catch (error) {
        next(error);
    }
};

exports.createInvoice = async (req, res, next) => {
    try {
        const { vendor_name, product, quantity, unit_price, purchase_order_id, tax_rate, tax_label, currency } = req.body;
        if (!vendor_name || typeof vendor_name !== 'string' || !vendor_name.trim()) {
            return res.status(400).json({ success: false, message: 'Vendor name is required' });
        }
        if (!product || typeof product !== 'string' || !product.trim()) {
            return res.status(400).json({ success: false, message: 'Product / Line Item description is required' });
        }

        const numQty = parseInt(quantity, 10);
        if (isNaN(numQty) || numQty <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity must be a positive integer' });
        }

        const numPrice = parseFloat(unit_price);
        if (isNaN(numPrice) || numPrice < 0) {
            return res.status(400).json({ success: false, message: 'Unit price must be a non-negative number' });
        }

        let linkedPo = null;
        let parsedPoId = null;
        if (purchase_order_id !== undefined && purchase_order_id !== null && purchase_order_id !== '') {
            parsedPoId = parseInt(purchase_order_id, 10);
            if (isNaN(parsedPoId) || parsedPoId <= 0) {
                return res.status(400).json({ success: false, message: 'Invalid Purchase Order ID format' });
            }

            const [poRows] = await db.query('SELECT * FROM purchase_orders WHERE id = ?', [parsedPoId]);
            if (!poRows || !poRows[0]) {
                return res.status(404).json({ success: false, message: 'Referenced Purchase Order not found' });
            }
            linkedPo = poRows[0];
            if (linkedPo.status === 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot generate tax invoice for a pending, unapproved Purchase Order'
                });
            }
        }

        const cleanCurrency = currency && typeof currency === 'string' ? currency.trim().toUpperCase() : (linkedPo?.currency || 'USD');
        const numTaxRate = tax_rate !== undefined && tax_rate !== null ? parseFloat(tax_rate) : 18;

        const invoice = await Invoice.create({
            vendor_name: vendor_name.trim(),
            product: product.trim(),
            quantity: numQty,
            unit_price: numPrice,
            purchase_order_id: parsedPoId,
            tax_rate: isNaN(numTaxRate) ? 18 : numTaxRate,
            tax_label: tax_label ? String(tax_label).trim() : 'GST',
            currency: cleanCurrency
        });

        await Activity.log({
            user_id: req.user?.id || null,
            title: `Invoice ${invoice.invoice_number} Generated`,
            category: 'invoice',
            action: `${vendor_name.trim()} billed ${invoice.total_amount.toLocaleString()} (${invoice.tax_label} ${invoice.tax_rate}%).`
        });

        res.status(201).json({ success: true, message: 'Invoice generated successfully!', invoice });
    } catch (error) {
        next(error);
    }
};

exports.updateInvoiceStatus = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Valid positive Invoice ID is required' });
        }

        const { status } = req.body;
        const validStatuses = ['generated', 'paid'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid invoice status. Allowed: ${validStatuses.join(', ')}` });
        }

        const existingInv = await Invoice.getById(id);
        if (!existingInv) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        if (existingInv.status === status) {
            return res.status(200).json({ success: true, message: `Invoice is already marked as ${status}.` });
        }

        if (existingInv.status === 'paid' && status !== 'paid') {
            return res.status(400).json({ success: false, message: 'Settled Paid invoices cannot be reverted' });
        }

        const ok = await Invoice.updateStatus(id, status);
        if (!ok) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        await Activity.log({
            user_id: req.user?.id || null,
            title: `Invoice #${id} Settled (${status.toUpperCase()})`,
            category: 'invoice',
            action: `Payment settlement status updated from ${existingInv.status} to ${status}.`
        });

        res.status(200).json({ success: true, message: `Invoice marked as ${status}.` });
    } catch (error) {
        next(error);
    }
};
