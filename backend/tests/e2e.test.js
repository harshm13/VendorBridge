const http = require('http');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const app = require('../server');
const dbStore = require('../services/dbStore');

const DATA_FILE = path.join(__dirname, '../../database/data.json');
const SEED_FILE = path.join(__dirname, '../../database/data.seed.json');

function makeRequest(port, reqPath, method = 'GET', data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '127.0.0.1',
            port,
            path: reqPath.startsWith('/api') ? reqPath : `/api${reqPath}`,
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch {
                    resolve({ status: res.statusCode, body });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runE2ETests() {
    console.log('====================================================');
    console.log(' VENDORBRIDGE ERP - FULL END-TO-END AUTOMATED TEST ');
    console.log('====================================================\n');

    if (!fs.existsSync(DATA_FILE) && fs.existsSync(SEED_FILE)) {
        fs.copyFileSync(SEED_FILE, DATA_FILE);
    }
    const backup = fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE, 'utf8') : (fs.existsSync(SEED_FILE) ? fs.readFileSync(SEED_FILE, 'utf8') : null);
    const server = await new Promise((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const port = server.address().port;

    try {
        const health = await makeRequest(port, '/health');
        assert.strictEqual(health.status, 200);
        console.log(`1. [PASS] GET /api/health -> ${health.body.message}`);

        const adminLogin = await makeRequest(port, '/auth/login', 'POST', {
            email: 'admin@vendorbridge.com',
            password: 'admin123',
            role: 'admin'
        });
        assert.strictEqual(adminLogin.status, 200);
        const adminToken = adminLogin.body.token;
        console.log(`2. [PASS] Admin Login`);

        // Register unique test manager + login + update profile
        const uniqueEmail = `e2e.manager.${Date.now()}@vendorbridge.com`;
        const reg = await makeRequest(port, '/auth/register', 'POST', {
            name: 'E2E Manager',
            email: uniqueEmail,
            password: 'pass123',
            role: 'manager'
        });
        assert.strictEqual(reg.status, 201);

        const newLogin = await makeRequest(port, '/auth/login', 'POST', {
            email: uniqueEmail,
            password: 'pass123',
            role: 'manager'
        });
        assert.strictEqual(newLogin.status, 200);
        const managerToken = newLogin.body.token;

        const profUpdate = await makeRequest(port, '/auth/profile', 'PUT', { name: 'E2E Updated Manager' }, managerToken);
        assert.strictEqual(profUpdate.status, 200);
        assert.strictEqual(profUpdate.body.user.name, 'E2E Updated Manager');
        console.log(`3. [PASS] User Register, Login & Profile Persistence`);

        // Vendor creation + update
        const vendor = await makeRequest(port, '/vendors', 'POST', {
            name: 'Global Freight Tech',
            email: 'ops@globalfreight.io',
            phone: '+1 212 555 0100',
            company: 'Global Freight Tech Inc.',
            gst_number: 'US-EIN-9920192',
            address: 'Manhattan, NY',
            tier: 'tier1',
            country: 'United States',
            currency: 'USD'
        }, adminToken);
        assert.strictEqual(vendor.status, 201);
        const vendorUpd = await makeRequest(port, `/vendors/${vendor.body.id}`, 'PUT', { tier: 'tier2' }, adminToken);
        assert.strictEqual(vendorUpd.status, 200);
        console.log(`4. [PASS] Vendor Creation & Tier Update`);

        // RFQ creation with BoM
        const rfq = await makeRequest(port, '/rfqs', 'POST', {
            title: 'Server Hardware Infrastructure',
            description: 'Enterprise rack servers with 128GB RAM',
            category: 'Cloud & Data Center',
            currency: 'USD',
            quantity: 10,
            deadline: '2026-12-20',
            items: [
                { name: 'Enterprise 2U Rack Servers', unit: 'Units', qty: 6, target_price: 6500 },
                { name: '48-Port PoE Managed Switches', unit: 'Units', qty: 4, target_price: 3000 }
            ]
        }, adminToken);
        assert.strictEqual(rfq.status, 201);
        const rfqId = rfq.body.id;
        console.log(`5. [PASS] RFQ Creation with BoM (RFQ#${rfqId})`);

        // Submit Quotation as vendor role
        const vendorLogin = await makeRequest(port, '/auth/login', 'POST', {
            email: 'abc@suppliers.com',
            password: 'vendor123',
            role: 'vendor'
        });
        assert.strictEqual(vendorLogin.status, 200);
        const vendorToken = vendorLogin.body.token;

        const quote = await makeRequest(port, '/quotations', 'POST', {
            rfq_id: rfqId,
            vendor_name: 'ABC Global Suppliers',
            amount: 51000,
            currency: 'USD',
            delivery_days: 5,
            notes: 'Includes 3 years enterprise SLA',
            items: [
                { name: 'Enterprise 2U Rack Servers', unit: 'Units', qty: 6, quoted_price: 6500 },
                { name: '48-Port PoE Managed Switches', unit: 'Units', qty: 4, quoted_price: 3000 }
            ]
        }, vendorToken);
        assert.strictEqual(quote.status, 201);
        console.log(`6. [PASS] Vendor Quotation Submission (QUOTE#${quote.body.id})`);

        // AI Analysis
        const ai = await makeRequest(port, `/ai/analyze/${rfqId}?currency=USD`, 'GET', null, adminToken);
        assert.strictEqual(ai.status, 200);
        assert.strictEqual(ai.body.analysis.bestQuoteId, quote.body.id);
        console.log(`7. [PASS] AI Quote Analysis`);

        // Manager Approval -> Auto PO
        const approvalsList = await makeRequest(port, '/approvals', 'GET', null, managerToken);
        assert.strictEqual(approvalsList.status, 200);
        const targetApproval = approvalsList.body.find(a => a.quotation_id === quote.body.id);
        assert.ok(targetApproval, 'Auto-created approval ticket expected');

        const approvalDecision = await makeRequest(port, `/approvals/${targetApproval.id}`, 'PUT', {
            status: 'approved',
            remarks: 'Approved by E2E Manager'
        }, managerToken);
        assert.strictEqual(approvalDecision.status, 200);
        assert.ok(approvalDecision.body.po && approvalDecision.body.po.po_number);
        const createdPoId = approvalDecision.body.po.id;

        // Re-approving same ticket must return 409 Conflict (not 500!)
        const duplicateDecision = await makeRequest(port, `/approvals/${targetApproval.id}`, 'PUT', {
            status: 'approved',
            remarks: 'Duplicate'
        }, managerToken);
        assert.strictEqual(duplicateDecision.status, 409);
        console.log(`8. [PASS] Manager Approval + Auto PO (${approvalDecision.body.po.po_number}) + 409 Guard`);

        // Vendor creates Invoice linked to PO + Mark Paid
        const invoice = await makeRequest(port, '/invoices', 'POST', {
            purchase_order_id: createdPoId,
            vendor_name: 'ABC Global Suppliers',
            product: 'Server Hardware Infrastructure',
            quantity: 1,
            unit_price: 51000,
            tax_rate: 18,
            tax_label: 'GST',
            currency: 'USD'
        }, vendorToken);
        assert.strictEqual(invoice.status, 201);
        const invId = invoice.body.invoice.id;

        const invPaid = await makeRequest(port, `/invoices/${invId}/status`, 'PATCH', { status: 'paid' }, adminToken);
        assert.strictEqual(invPaid.status, 200);
        console.log(`9. [PASS] Vendor Invoice Generation & Settlement (${invoice.body.invoice.invoice_number})`);

        // Close RFQ
        const rfqClose = await makeRequest(port, `/rfqs/${rfqId}/status`, 'PATCH', { status: 'closed' }, adminToken);
        assert.strictEqual(rfqClose.status, 200);

        const dashboard = await makeRequest(port, '/dashboard', 'GET', null, adminToken);
        assert.strictEqual(dashboard.status, 200);
        console.log(`10. [PASS] RFQ Close & Dashboard Telemetry`);

        console.log('\n====================================================');
        console.log(' ALL E2E WORKFLOW TESTS PASSED PERFECTLY (100% OK) ');
        console.log('====================================================');
    } catch (err) {
        console.error('\nE2E Test Execution Error:', err);
        process.exitCode = 1;
    } finally {
        server.close();
        if (backup !== null) {
            fs.writeFileSync(DATA_FILE, backup, 'utf8');
            dbStore.reload();
        }
    }
}

runE2ETests();
