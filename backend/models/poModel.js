const db = require('../config/db');

const PurchaseOrder = {
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM purchase_orders ORDER BY id DESC');
        return rows;
    },
    getById: async (id) => {
        const [rows] = await db.query('SELECT * FROM purchase_orders WHERE id = ?', [id]);
        return rows[0];
    },
    create: async (poData) => {
        const { quotation_id, vendor_name, rfq_ref, total_amount, currency, status } = poData;
        const year = new Date().getFullYear();
        const [[{ maxId }]] = await db.query('SELECT MAX(id) as maxId FROM purchase_orders');
        const nextId = (maxId || 0) + 1;
        const po_number = `PO-${year}-${String(nextId).padStart(6, '0')}`;

        const [result] = await db.query(
            'INSERT INTO purchase_orders (po_number, quotation_id, vendor_name, rfq_ref, total_amount, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [po_number, quotation_id || null, vendor_name, rfq_ref || 'Direct Requisition', total_amount, currency || 'USD', status || 'pending']
        );
        return { id: result.insertId, po_number };
    },
    updateStatus: async (id, status) => {
        const [result] = await db.query('UPDATE purchase_orders SET status = ? WHERE id = ?', [status, id]);
        return result && result.affectedRows > 0;
    }
};

module.exports = PurchaseOrder;
