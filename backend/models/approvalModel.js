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
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            const [approvals] = await connection.query('SELECT * FROM approvals WHERE id = ? FOR UPDATE', [id]);
            const approval = approvals[0];
            
            if (!approval) {
                throw new Error('Approval request not found');
            }
            if (approval.status !== 'pending') {
                throw new Error('Approval request has already been processed');
            }

            const [result] = await connection.query(
                'UPDATE approvals SET status = ?, remarks = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
                [status, remarks || '', approved_by || 1, id]
            );

            if (status === 'approved') {
                const year = new Date().getFullYear();
                const [[{ maxId }]] = await connection.query('SELECT MAX(id) as maxId FROM purchase_orders');
                const nextId = (maxId || 0) + 1;
                const poNumber = `PO-${year}-${String(nextId).padStart(6, '0')}`;
                
                await connection.query(
                    'INSERT INTO purchase_orders (po_number, quotation_id, vendor_name, rfq_ref, total_amount, status) VALUES (?, ?, ?, ?, ?, "approved")',
                    [poNumber, approval.quotation_id, approval.vendor_name, approval.rfq_title, approval.amount]
                );
                
                if (approval.quotation_id) {
                    await connection.query('UPDATE quotations SET status = "approved" WHERE id = ?', [approval.quotation_id]);
                }
            } else if (status === 'rejected') {
                if (approval.quotation_id) {
                    await connection.query('UPDATE quotations SET status = "rejected" WHERE id = ?', [approval.quotation_id]);
                }
            }

            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

module.exports = Approval;
