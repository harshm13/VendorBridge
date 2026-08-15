const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, email, role }
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Access denied. Please log in.' });
        }
        
        const rolesArray = Array.isArray(roles) ? roles : [roles];
        if (rolesArray.includes(req.user.role)) {
            next();
        } else {
            return res.status(403).json({ success: false, message: 'Forbidden. You do not have permission to access this resource.' });
        }
    };
};

module.exports = {
    authenticateToken,
    requireRole
};
