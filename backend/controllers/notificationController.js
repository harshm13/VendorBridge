const Activity = require('../models/activityModel');

exports.getNotifications = async (req, res, next) => {
    try {
        const [notifications, logs] = await Promise.all([
            Activity.getNotifications(),
            Activity.getLogs()
        ]);
        const unreadCount = notifications.filter(n => !n.is_read).length;
        res.status(200).json({
            success: true,
            unreadCount,
            notifications,
            logs
        });
    } catch (error) {
        next(error);
    }
};

exports.markAllRead = async (req, res, next) => {
    try {
        await Activity.markAllRead();
        res.status(200).json({ success: true, message: 'All notifications marked as read.' });
    } catch (error) {
        next(error);
    }
};
