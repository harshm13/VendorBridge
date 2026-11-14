const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwt');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ['admin', 'manager', 'procurement_officer', 'vendor'];

exports.login = async (req, res, next) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const cleanEmail = String(email).toLowerCase().trim();
        if (!EMAIL_REGEX.test(cleanEmail)) {
            return res.status(400).json({ success: false, message: 'Invalid email address format' });
        }

        if (typeof password !== 'string' || password.length === 0) {
            return res.status(400).json({ success: false, message: 'Password must be a non-empty string' });
        }

        const user = await User.findByEmail(cleanEmail);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
        }

        let isMatch = false;
        if (typeof user.password === 'string' && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (password === user.password);
        }

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid password.' });
        }

        if (role) {
            const requestedRole = String(role).toLowerCase().trim();
            const userRole = (user.role || '').toLowerCase().trim();
            if (userRole !== requestedRole) {
                return res.status(401).json({
                    success: false,
                    message: `Role mismatch. Your account is registered as "${userRole.replace('_', ' ').toUpperCase()}", not "${requestedRole.replace('_', ' ').toUpperCase()}".`
                });
            }
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            getJwtSecret(),
            { expiresIn: '7d' }
        );

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.register = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const cleanEmail = String(email).toLowerCase().trim();
        if (!EMAIL_REGEX.test(cleanEmail)) {
            return res.status(400).json({ success: false, message: 'Invalid email address format' });
        }

        if (typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
        }

        const cleanName = name ? String(name).trim() : cleanEmail.split('@')[0];
        if (cleanName.length < 2 || cleanName.length > 100) {
            return res.status(400).json({ success: false, message: 'Name must be between 2 and 100 characters' });
        }

        const existingUser = await User.findByEmail(cleanEmail);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }

        let dbRole = 'vendor';
        if (role) {
            const roleLower = String(role).toLowerCase().trim();
            if (VALID_ROLES.includes(roleLower)) {
                dbRole = roleLower;
            } else if (roleLower === 'approver') {
                dbRole = 'manager';
            } else {
                return res.status(400).json({
                    success: false,
                    message: `Invalid role specified: '${role}'. Allowed roles: ${VALID_ROLES.join(', ')}`
                });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userId = await User.create({
            name: cleanName,
            email: cleanEmail,
            password: hashedPassword,
            role: dbRole
        });

        if (dbRole === 'vendor') {
            const Vendor = require('../models/vendorModel');
            await Vendor.create({
                name: cleanName,
                email: cleanEmail,
                phone: req.body.phone ? String(req.body.phone).trim() : '',
                company: req.body.company ? String(req.body.company).trim() : cleanName,
                gst_number: req.body.gst_number ? String(req.body.gst_number).trim() : '',
                address: req.body.address ? String(req.body.address).trim() : '',
                tier: 'verified',
                country: req.body.country ? String(req.body.country).trim() : 'Global',
                currency: req.body.currency ? String(req.body.currency).trim().toUpperCase() : 'USD',
                user_id: userId
            });
        }

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: { id: userId, email: cleanEmail, name: cleanName, role: dbRole }
        });
    } catch (error) {
        next(error);
    }
};

exports.getMe = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const user = await User.findByEmail(req.user.email);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                created_at: user.created_at
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.updateProfile = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { name } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Name must be a non-empty string' });
        }

        const cleanName = name.trim();
        if (cleanName.length < 2 || cleanName.length > 100) {
            return res.status(400).json({ success: false, message: 'Name must be between 2 and 100 characters' });
        }

        const user = await User.findByEmail(req.user.email);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await User.updateName(user.id, cleanName);
        user.name = cleanName;

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
};
