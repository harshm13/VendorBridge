const db = require('../config/db');

const Approval = {
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM approvals ORDER BY id DESC');
        return rows;
    },
    countPending: async () => {
        const [rows] = await db.query("SELECT COUNT(*) as count FROM approvals WHERE status = 'pending'");
        return rows[0].count;
    },
    updateStatus: async (id, status, remarks, approved_by) => {
        const [result] = await db.query(
            'UPDATE approvals SET status = ?, remarks = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
            [status, remarks || '', approved_by || 1, id]
        );

        if (status === 'approved') {
            const [approvals] = await db.query('SELECT * FROM approvals WHERE id = ?', [id]);
            const approval = approvals[0];
            if (approval) {
                const poNumber = `PO-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`;
                await db.query(
                    'INSERT INTO purchase_orders (po_number, quotation_id, vendor_name, rfq_ref, total_amount, status) VALUES (?, ?, ?, ?, ?, "approved")',
                    [poNumber, approval.quotation_id, approval.vendor_name, approval.rfq_title, approval.amount]
                );
            }
        }

        return result.affectedRows > 0;
    }
};

module.exports = Approval;
