const db = require('../config/db');

const Invoice = {
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM invoices ORDER BY id DESC');
        return rows;
    },
    count: async () => {
        const [rows] = await db.query('SELECT COUNT(*) as count FROM invoices');
        return rows[0].count;
    },
    create: async (invoiceData) => {
        const { vendor_name, product, quantity, unit_price, purchase_order_id } = invoiceData;
        const qty = parseInt(quantity, 10) || 1;
        const price = parseFloat(unit_price) || 0;
        const subtotal = qty * price;
        const tax = subtotal * 0.18;
        const total_amount = subtotal + tax;
        const invoice_number = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const [result] = await db.query(
            `INSERT INTO invoices (invoice_number, purchase_order_id, vendor_name, product, quantity, unit_price, subtotal, tax, total_amount, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated')`,
            [invoice_number, purchase_order_id || null, vendor_name, product, qty, price, subtotal, tax, total_amount]
        );
        return { id: result.insertId, invoice_number, subtotal, tax, total_amount };
    }
};

module.exports = Invoice;
