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
    getByUserId: async (userId) => {
        const [rows] = await db.query('SELECT * FROM vendors WHERE user_id = ?', [userId]);
        return rows[0];
    },
    create: async (vendorData) => {
        const { name, email, phone, company, gst_number, address, user_id, tier, country, currency } = vendorData;
        const company_name = company || name;
        const contact_person = name;
        const [result] = await db.query(
            'INSERT INTO vendors (user_id, company_name, contact_person, email, phone, gst_number, address, tier, country, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "active")',
            [
                user_id || null,
                company_name,
                contact_person,
                email,
                phone,
                gst_number || null,
                address || null,
                tier || 'verified',
                country || 'Global',
                currency || 'USD'
            ]
        );
        return result.insertId;
    },
    update: async (id, vendorData) => {
        const existing = await Vendor.getById(id);
        if (!existing) return false;
        const [result] = await db.query(
            'UPDATE vendors SET company_name = ?, contact_person = ?, email = ?, phone = ?, gst_number = ?, address = ?, tier = ?, country = ?, currency = ?, status = ? WHERE id = ?',
            [
                vendorData.company ?? existing.company_name,
                vendorData.name ?? existing.contact_person,
                vendorData.email ?? existing.email,
                vendorData.phone ?? existing.phone,
                vendorData.gst_number ?? existing.gst_number,
                vendorData.address ?? existing.address,
                vendorData.tier ?? existing.tier ?? 'verified',
                vendorData.country ?? existing.country ?? 'Global',
                vendorData.currency ?? existing.currency ?? 'USD',
                vendorData.status ?? existing.status ?? 'active',
                id
            ]
        );
        return result && result.affectedRows > 0;
    },
    remove: async (id) => {
        const [result] = await db.query('DELETE FROM vendors WHERE id = ?', [id]);
        return result && result.affectedRows > 0;
    },
    count: async () => {
        const [rows] = await db.query('SELECT COUNT(*) as count FROM vendors');
        return rows[0].count;
    }
};

module.exports = Vendor;
