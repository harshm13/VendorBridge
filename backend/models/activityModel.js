const db = require('../config/db');

const Activity = {
    log: async ({ user_id = null, title, category = 'system', action = '' }) => {
        try {
            await db.query(
                'INSERT INTO activity_logs (user_id, title, category, action) VALUES (?, ?, ?, ?)',
                [user_id, title, category, action]
            );
            await db.query(
                'INSERT INTO notifications (user_id, title, message, category) VALUES (?, ?, ?, ?)',
                [user_id, title, action, category]
            );
        } catch (err) {
            console.warn('Activity log non-fatal warning:', err.message);
        }
    },
    getLogs: async () => {
        const [rows] = await db.query('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 25');
        return rows;
    },
    getNotifications: async () => {
        const [rows] = await db.query('SELECT * FROM notifications ORDER BY id DESC LIMIT 25');
        return rows;
    },
    markAllRead: async () => {
        await db.query('UPDATE notifications SET is_read = TRUE');
        return true;
    }
};

module.exports = Activity;
