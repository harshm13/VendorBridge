const db = require('../config/db');

function parseRfqItems(row) {
    if (!row) return row;
    let items = row.items || [];
    let cleanDesc = row.description || '';
    if ((!items || items.length === 0) && cleanDesc.includes('<!--BOM_ITEMS:')) {
        try {
            const match = cleanDesc.match(/<!--BOM_ITEMS:(.*?)-->/);
            if (match && match[1]) {
                items = JSON.parse(match[1]);
                cleanDesc = cleanDesc.replace(/<!--BOM_ITEMS:(.*?)-->/, '').trim();
            }
        } catch (e) {}
    }
    return {
        ...row,
        description: cleanDesc,
        items: items
    };
}

const RFQ = {
    getAll: async () => {
        const [rows] = await db.query(`
            SELECT r.*, u.name as created_by_name 
            FROM rfqs r 
            LEFT JOIN users u ON r.created_by = u.id 
            ORDER BY r.id DESC
        `);
        return rows.map(parseRfqItems);
    },
    getById: async (id) => {
        const [rows] = await db.query('SELECT * FROM rfqs WHERE id = ?', [id]);
        return rows && rows.length > 0 ? parseRfqItems(rows[0]) : null;
    },
    create: async (rfqData) => {
        const { title, description, quantity, deadline, created_by, status, items } = rfqData;
        let formattedDesc = description || '';
        if (items && Array.isArray(items) && items.length > 0) {
            formattedDesc = `${formattedDesc}\n<!--BOM_ITEMS:${JSON.stringify(items)}-->`;
        }
        const [result] = await db.query(
            'INSERT INTO rfqs (title, description, quantity, deadline, created_by, status) VALUES (?, ?, ?, ?, ?, ?)',
            [title, formattedDesc, quantity, deadline, created_by || 1, status || 'open']
        );
        return result.insertId;
    },
    countActive: async () => {
        const [rows] = await db.query("SELECT COUNT(*) as count FROM rfqs WHERE status = 'open'");
        return rows[0].count;
    }
};

module.exports = RFQ;

