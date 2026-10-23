const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'vendorbridge-jwt-super-secret-key-2026-production';

exports.login = async (req, res, next) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const cleanEmail = email.toLowerCase().trim();
        const user = await User.findByEmail(cleanEmail);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
        }

        // Support both hashed passwords and initial plain-text seed passwords
        let isMatch = false;
        if (typeof user.password === 'string' && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (password === user.password);
        }

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid password.' });
        }

        // Check role if role was requested
        if (role) {
            const requestedRole = role.toLowerCase().trim();
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
            JWT_SECRET,
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

        const cleanEmail = email.toLowerCase().trim();
        const existingUser = await User.findByEmail(cleanEmail);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }

        let dbRole = 'vendor';
        if (role) {
            const roleLower = role.toLowerCase();
            if (roleLower.includes('admin')) dbRole = 'admin';
            else if (roleLower.includes('manager') || roleLower.includes('approver')) dbRole = 'manager';
            else if (roleLower.includes('procurement')) dbRole = 'procurement_officer';
            else if (roleLower.includes('vendor')) dbRole = 'vendor';
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userId = await User.create({
            name: name ? name.trim() : cleanEmail.split('@')[0],
            email: cleanEmail,
            password: hashedPassword,
            role: dbRole
        });

        if (dbRole === 'vendor') {
            const Vendor = require('../models/vendorModel');
            await Vendor.create({
                name: name ? name.trim() : cleanEmail.split('@')[0],
                email: cleanEmail,
                phone: req.body.phone || '',
                company: req.body.company || (name ? name.trim() : cleanEmail.split('@')[0]),
                gst_number: req.body.gst_number || '',
                address: req.body.address || '',
                user_id: userId
            });
        }

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: { id: userId, email: cleanEmail, name: name || cleanEmail.split('@')[0], role: dbRole }
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
        const user = await User.findByEmail(req.user.email);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (name) {
            user.name = name.trim();
        }

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
