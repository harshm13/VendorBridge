const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { getJwtSecret } = require('./config/jwt');
const db = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Early security verification: ensure JWT secret is configured
try {
    getJwtSecret();
} catch (err) {
    console.error(err.message);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

const authRoutes = require('./routes/authRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const rfqRoutes = require('./routes/rfqRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const poRoutes = require('./routes/poRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const aiRoutes = require('./routes/aiRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Configurable CORS restriction via environment variables
const parseAllowedOrigins = () => {
    const raw = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || process.env.ALLOWED_ORIGINS;
    if (!raw) {
        if (process.env.NODE_ENV === 'production') {
            console.warn('SECURITY WARNING: No CORS_ORIGIN or FRONTEND_URL set in production. Defaulting to same-origin only.');
            return [];
        }
        return ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:3000'];
    }
    if (raw === '*') {
        if (process.env.NODE_ENV === 'production') {
            console.warn('SECURITY WARNING: Wildcard CORS origin (*) configured in production environment.');
        }
        return '*';
    }
    return raw.split(',').map(o => o.trim()).filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, automated test suites, same-origin)
        if (!origin || allowedOrigins === '*') {
            return callback(null, true);
        }
        if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Prevent noisy browser 404 for favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Serve frontend static files
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));

// Clean URL rewrites for HTML pages
const cleanRoutes = [
    { path: '/dashboard', file: 'dashboard.html' },
    { path: '/vendors', file: 'vendor.html' },
    { path: '/rfqs', file: 'rfq.html' },
    { path: '/quotations', file: 'quotations.html' },
    { path: '/approvals', file: 'approval.html' },
    { path: '/purchase-orders', file: 'purchase-order.html' },
    { path: '/invoices', file: 'invoice.html' },
    { path: '/login', file: 'login.html' },
    { path: '/register', file: 'newaccount.html' }
];

cleanRoutes.forEach(r => {
    app.get(r.path, (req, res) => {
        res.sendFile(path.join(frontendDir, r.file));
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/rfqs', rfqRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/purchase-orders', poRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.status(200).json({
            success: true,
            status: 'OK',
            message: 'VendorBridge Global ERP Mesh operational',
            database: 'connected',
            storageEngine: db.getMode(),
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(503).json({
            success: false,
            status: 'ERROR',
            database: 'disconnected',
            error: err.message
        });
    }
});

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: `API endpoint ${req.originalUrl} not found` });
});

// Fallback to index.html for SPA/frontend routes
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDir, 'index.html'));
});

// Error handler
app.use(errorHandler);

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`VendorBridge ERP Server listening on http://localhost:${PORT}`);
        console.log(`Data Layer Storage Engine: [${db.getMode()}]`);
    });
}

module.exports = app;
