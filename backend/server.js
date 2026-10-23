const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const rfqRoutes = require('./routes/rfqRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const poRoutes = require('./routes/poRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware       
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.status(200).json({ 
            success: true, 
            status: 'OK', 
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

// Start Express server
const server = app.listen(PORT, () => {
    console.log(`VendorBridge ERP Server listening on http://localhost:${PORT}`);
    console.log(`Data Layer Storage Engine: [${db.getMode()}]`);
});

module.exports = app;
