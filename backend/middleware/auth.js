const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'vendorbridge-jwt-super-secret-key-2026-production';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, email, role, name }
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
            return res.status(403).json({ 
                success: false, 
                message: `Forbidden. Role '${req.user.role}' does not have permission to perform this action.` 
            });
        }
    };
};

module.exports = {
    authenticateToken,
    requireRole
};
