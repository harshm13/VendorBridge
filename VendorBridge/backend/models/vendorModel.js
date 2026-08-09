const db = require('../config/db');

const Vendor = {
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM vendors ORDER BY id DESC');
        return rows;
    },
    getById: async (id) => {
        const [rows] = await db.query('SELECT * FROM vendors WHERE id = ?', [id]);
        return rows[0];
    },
    create: async (vendorData) => {
        const { name, email, phone, company, gst_number, address } = vendorData;
        const company_name = company || name;
        const contact_person = name;
        const [result] = await db.query(
            'INSERT INTO vendors (company_name, contact_person, email, phone, gst_number, address, status) VALUES (?, ?, ?, ?, ?, ?, "active")',
            [company_name, contact_person, email, phone, gst_number || null, address || null]
        );
        return result.insertId;
    },
    count: async () => {
        const [rows] = await db.query('SELECT COUNT(*) as count FROM vendors');
        return rows[0].count;
    }
};

module.exports = Vendor;
