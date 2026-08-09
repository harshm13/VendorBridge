const db = require('../config/db');

const User = {
    findByEmail: async (email) => {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    },
    create: async (userData) => {
        const { name, email, password, role } = userData;
        const [result] = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, password, role]
        );
        return result.insertId;
    },
    getAll: async () => {
        const [rows] = await db.query('SELECT id, name, email, role, created_at FROM users ORDER BY id DESC');
        return rows;
    }
};

module.exports = User;
