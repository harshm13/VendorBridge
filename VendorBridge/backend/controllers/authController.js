const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res, next) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid password.' });
        }

        if (role && user.role !== role) {
            return res.status(401).json({ 
                success: false,
                message: `Role mismatch. Your account is registered as "${user.role.replace('_', ' ').toUpperCase()}", not "${role.replace('_', ' ').toUpperCase()}".` 
            });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
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

        const existingUser = await User.findByEmail(email);
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
            name: name || email.split('@')[0],
            email,
            password: hashedPassword,
            role: dbRole
        });

        if (dbRole === 'vendor') {
            const Vendor = require('../models/vendorModel');
            await Vendor.create({
                name: name || email.split('@')[0],
                email,
                phone: '',
                company: name || email.split('@')[0],
                gst_number: '',
                address: '',
                user_id: userId
            });
        }

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: { id: userId, email, role: dbRole }
        });
    } catch (error) {
        next(error);
    }
};
