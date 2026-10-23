const db = require('../config/db');

const Quotation = {
    getAll: async () => {
        const [rows] = await db.query(`
            SELECT q.*, r.title as rfq_title 
            FROM quotations q 
            LEFT JOIN rfqs r ON q.rfq_id = r.id 
            ORDER BY q.id DESC
        `);
        return rows;
    },
    getByRfqId: async (rfqId) => {
        const [rows] = await db.query('SELECT * FROM quotations WHERE rfq_id = ? ORDER BY amount ASC', [rfqId]);
        return rows;
    },
    create: async (quoteData) => {
        const { rfq_id, vendor_id, vendor_name, amount, delivery_days, notes } = quoteData;
        const [result] = await db.query(
            'INSERT INTO quotations (rfq_id, vendor_id, vendor_name, amount, delivery_days, notes, status) VALUES (?, ?, ?, ?, ?, ?, "submitted")',
            [rfq_id || null, vendor_id || null, vendor_name, amount, delivery_days, notes]
        );

        const quoteId = result.insertId;

        // Fetch actual RFQ title for rich approval display
        let rfqTitle = `RFQ#${rfq_id || 'General'}`;
        try {
            if (rfq_id) {
                const [rfqs] = await db.query('SELECT * FROM rfqs WHERE id = ?', [rfq_id]);
                if (rfqs && rfqs[0] && rfqs[0].title) {
                    rfqTitle = `RFQ#${rfq_id} - ${rfqs[0].title}`;
                }
            }
        } catch (e) {
            // Keep default fallback
        }

        // Auto-create approval request for this quotation
        await db.query(
            'INSERT INTO approvals (quotation_id, rfq_title, vendor_name, amount, status, remarks) VALUES (?, ?, ?, ?, "pending", ?)',
            [quoteId, rfqTitle, vendor_name, amount, 'Pending manager review']
        );

        return quoteId;
    }
};

module.exports = Quotation;
