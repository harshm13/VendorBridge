const db = require('../config/db');

const Notification = {
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM notifications ORDER BY id DESC LIMIT 25');
        return rows;
    },

    create: async ({ user_id = null, title, message = '', category = 'info' }) => {
        const [result] = await db.query(
            'INSERT INTO notifications (user_id, title, message, category) VALUES (?, ?, ?, ?)',
            [user_id, title, message, category]
        );
        return result;
    },

    markAllRead: async () => {
        const [result] = await db.query('UPDATE notifications SET is_read = TRUE');
        return result;
    }
};

module.exports = Notification;
