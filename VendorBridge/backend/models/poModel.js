const db = require('../config/db');

const PurchaseOrder = {
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM purchase_orders ORDER BY id DESC');
        return rows;
    },
    create: async (poData) => {
        const { quotation_id, vendor_name, rfq_ref, total_amount, status } = poData;
        const po_number = `PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
        const [result] = await db.query(
            'INSERT INTO purchase_orders (po_number, quotation_id, vendor_name, rfq_ref, total_amount, status) VALUES (?, ?, ?, ?, ?, ?)',
            [po_number, quotation_id || null, vendor_name, rfq_ref || 'RFQ001', total_amount, status || 'pending']
        );
        return { id: result.insertId, po_number };
    }
};

module.exports = PurchaseOrder;
