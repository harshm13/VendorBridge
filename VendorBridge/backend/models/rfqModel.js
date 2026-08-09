const db = require('../config/db');

const RFQ = {
    getAll: async () => {
        const [rows] = await db.query(`
            SELECT r.*, u.name as created_by_name 
            FROM rfqs r 
            LEFT JOIN users u ON r.created_by = u.id 
            ORDER BY r.id DESC
        `);
        return rows;
    },
    create: async (rfqData) => {
        const { title, description, quantity, deadline, created_by, status } = rfqData;
        const [result] = await db.query(
            'INSERT INTO rfqs (title, description, quantity, deadline, created_by, status) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description, quantity, deadline, created_by || 1, status || 'open']
        );
        return result.insertId;
    },
    countActive: async () => {
        const [rows] = await db.query("SELECT COUNT(*) as count FROM rfqs WHERE status = 'open'");
        return rows[0].count;
    }
};

module.exports = RFQ;
