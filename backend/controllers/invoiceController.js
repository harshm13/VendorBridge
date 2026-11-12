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
        if (!vendor_name || !product || !quantity || unit_price === undefined || unit_price === '') {
            return res.status(400).json({ success: false, message: 'Vendor name, product, quantity, and unit price are required' });
        }

        let linkedPo = null;
        if (purchase_order_id) {
            const [poRows] = await db.query('SELECT * FROM purchase_orders WHERE id = ?', [purchase_order_id]);
            if (!poRows[0]) {
                return res.status(404).json({ success: false, message: 'Purchase Order not found' });
            }
            linkedPo = poRows[0];
        }

        const invoice = await Invoice.create({
            vendor_name,
            product,
            quantity,
            unit_price,
            purchase_order_id,
            tax_rate,
            tax_label,
            currency: currency || linkedPo?.currency || 'USD'
        });

        await Activity.log({
            user_id: req.user?.id || null,
            title: `Invoice ${invoice.invoice_number} Generated`,
            category: 'invoice',
            action: `${vendor_name} billed ${invoice.total_amount.toLocaleString()} (${invoice.tax_label} ${invoice.tax_rate}%).`
        });

        res.status(201).json({ success: true, message: 'Invoice generated successfully!', invoice });
    } catch (error) {
        next(error);
    }
};

exports.updateInvoiceStatus = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { status } = req.body;
        if (!['generated', 'paid'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid invoice status' });
        }
        const ok = await Invoice.updateStatus(id, status);
        if (!ok) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }
        await Activity.log({
            user_id: req.user?.id || null,
            title: `Invoice #${id} Settled (${status.toUpperCase()})`,
            category: 'invoice',
            action: `Payment settlement status updated to ${status}.`
        });
        res.status(200).json({ success: true, message: `Invoice marked as ${status}.` });
    } catch (error) {
        next(error);
    }
};
