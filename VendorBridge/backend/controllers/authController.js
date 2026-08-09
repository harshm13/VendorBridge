const User = require('../models/userModel');

exports.login = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials. User not found.' });
        }

        if (user.password !== password) {
            return res.status(401).json({ message: 'Invalid password.' });
        }

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        let dbRole = 'vendor';
        if (role) {
            const roleLower = role.toLowerCase();
            if (roleLower.includes('admin')) dbRole = 'admin';
            else if (roleLower.includes('manager') || roleLower.includes('approver')) dbRole = 'manager';
            else if (roleLower.includes('procurement')) dbRole = 'procurement_officer';
            else if (roleLower.includes('vendor')) dbRole = 'vendor';
        }

        const userId = await User.create({
            name: name || email.split('@')[0],
            email,
            password,
            role: dbRole
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: { id: userId, email, role: dbRole }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};
