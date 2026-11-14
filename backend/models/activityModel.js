const db = require('../config/db');
const Notification = require('./notificationModel');

const Activity = {
    log: async ({ user_id = null, title, category = 'system', action = '' }) => {
        try {
            await db.query(
                'INSERT INTO activity_logs (user_id, title, category, action) VALUES (?, ?, ?, ?)',
                [user_id, title, category, action]
            );
            await Notification.create({
                user_id,
                title,
                message: action,
                category
            });
        } catch (err) {
            console.warn('Activity log non-fatal warning:', err.message);
        }
    },

    getLogs: async () => {
        const [rows] = await db.query('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 25');
        return rows;
    },

    // Retained for backward compatibility
    getNotifications: async () => {
        return Notification.getAll();
    },

    markAllRead: async () => {
        return Notification.markAllRead();
    }
};

module.exports = Activity;
