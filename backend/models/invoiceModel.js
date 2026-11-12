const db = require('../config/db');

const Invoice = {
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM invoices ORDER BY id DESC');
        return rows;
    },
    getById: async (id) => {
        const [rows] = await db.query('SELECT * FROM invoices WHERE id = ?', [id]);
        return rows[0];
    },
    count: async () => {
        const [rows] = await db.query('SELECT COUNT(*) as count FROM invoices');
        return rows[0].count;
    },
    create: async (invoiceData) => {
        const { vendor_name, product, quantity, unit_price, purchase_order_id, tax_rate, tax_label, currency } = invoiceData;
        const qty = parseInt(quantity, 10) || 1;
        const price = parseFloat(unit_price) || 0;
        const rate = tax_rate !== undefined && tax_rate !== null ? parseFloat(tax_rate) : 18;
        const label = tax_label || 'GST';
        const subtotal = Number((qty * price).toFixed(2));
        const tax = Number((subtotal * (rate / 100)).toFixed(2));
        const total_amount = Number((subtotal + tax).toFixed(2));

        const year = new Date().getFullYear();
        const [[{ maxId }]] = await db.query('SELECT MAX(id) as maxId FROM invoices');
        const nextId = (maxId || 0) + 1;
        const invoice_number = `INV-${year}-${String(nextId).padStart(6, '0')}`;

        const [result] = await db.query(
            `INSERT INTO invoices (invoice_number, purchase_order_id, vendor_name, product, quantity, unit_price, subtotal, tax_rate, tax_label, tax, total_amount, currency, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated')`,
            [invoice_number, purchase_order_id || null, vendor_name, product, qty, price, subtotal, rate, label, tax, total_amount, currency || 'USD']
        );
        return { id: result.insertId, invoice_number, subtotal, tax_rate: rate, tax_label: label, tax, total_amount };
    },
    updateStatus: async (id, status) => {
        const [result] = await db.query('UPDATE invoices SET status = ? WHERE id = ?', [status, id]);
        return result && result.affectedRows > 0;
    }
};

module.exports = Invoice;
