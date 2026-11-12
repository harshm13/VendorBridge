const db = require('../config/db');

function parseQuoteItems(row) {
    if (!row) return row;
    let items = row.items || [];
    let cleanNotes = row.notes || '';
    if ((!items || items.length === 0) && cleanNotes.includes('<!--BOM_QUOTE:')) {
        try {
            const match = cleanNotes.match(/<!--BOM_QUOTE:(.*?)-->/);
            if (match && match[1]) {
                items = JSON.parse(match[1]);
                cleanNotes = cleanNotes.replace(/<!--BOM_QUOTE:(.*?)-->/, '').trim();
            }
        } catch (e) {}
    }
    return {
        ...row,
        currency: row.currency || 'USD',
        notes: cleanNotes,
        items: items
    };
}

const Quotation = {
    getAll: async () => {
        const [rows] = await db.query(`
            SELECT q.*, r.title as rfq_title 
            FROM quotations q 
            LEFT JOIN rfqs r ON q.rfq_id = r.id 
            ORDER BY q.id DESC
        `);
        return rows.map(parseQuoteItems);
    },
    getByRfqId: async (rfqId) => {
        const [rows] = await db.query('SELECT * FROM quotations WHERE rfq_id = ? ORDER BY amount ASC', [rfqId]);
        return rows.map(parseQuoteItems);
    },
    create: async (quoteData) => {
        const { rfq_id, vendor_id, vendor_name, amount, currency, delivery_days, notes, items } = quoteData;
        let formattedNotes = notes || '';
        if (items && Array.isArray(items) && items.length > 0) {
            formattedNotes = `${formattedNotes}\n<!--BOM_QUOTE:${JSON.stringify(items)}-->`;
        }

        const [result] = await db.query(
            'INSERT INTO quotations (rfq_id, vendor_id, vendor_name, amount, currency, delivery_days, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, "submitted")',
            [rfq_id || null, vendor_id || null, vendor_name, amount, currency || 'USD', delivery_days, formattedNotes]
        );

        const quoteId = result.insertId;

        let rfqTitle = `RFQ#${rfq_id || 'General'}`;
        try {
            if (rfq_id) {
                const [rfqs] = await db.query('SELECT * FROM rfqs WHERE id = ?', [rfq_id]);
                if (rfqs && rfqs[0] && rfqs[0].title) {
                    rfqTitle = `RFQ#${rfq_id} - ${rfqs[0].title}`;
                }
            }
        } catch (e) {}

        await db.query(
            'INSERT INTO approvals (quotation_id, rfq_title, vendor_name, amount, status, remarks) VALUES (?, ?, ?, ?, "pending", ?)',
            [quoteId, rfqTitle, vendor_name, amount, 'Pending manager review']
        );

        return quoteId;
    }
};

module.exports = Quotation;
