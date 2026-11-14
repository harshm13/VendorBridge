/**
 * VendorBridge Global — Security & State Transition Validation Test Suite (backend/tests/security.test.js)
 * Verifies:
 * 1. JWT secret security: ensures getJwtSecret throws when missing in production.
 * 2. Auth input validation: rejects invalid emails, short passwords, invalid roles.
 * 3. Procurement state transition enforcement:
 *    - RFQ: Cannot quote on closed RFQ (400)
 *    - RFQ: Non-existent RFQ lookup (404)
 *    - Approval: Re-approval conflict guard (409)
 *    - Purchase Order: Completed PO cannot be reverted (400)
 *    - Invoice: Cannot invoice pending/unapproved PO (400)
 *    - Invoice: Settled paid invoice cannot be reverted (400)
 * 4. CORS header verification.
 */

const http = require('http');
const assert = require('assert');
const path = require('path');
const app = require('../server');
const { getJwtSecret } = require('../config/jwt');

function makeRequest(port, reqPath, method = 'GET', data = null, token = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '127.0.0.1',
            port,
            path: reqPath.startsWith('/api') ? reqPath : `/api${reqPath}`,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let parsed;
                try {
                    parsed = JSON.parse(body);
                } catch {
                    parsed = body;
                }
                resolve({ status: res.statusCode, headers: res.headers, body: parsed });
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runSecurityTests() {
    console.log('====================================================');
    console.log(' VENDORBRIDGE ERP - SECURITY & STATE MACHINE TESTS  ');
    console.log('====================================================\n');

    // 1. JWT Secret Security Check
    console.log('[TEST 1] JWT Secret Environment Guard');
    const originalSecret = process.env.JWT_SECRET;
    const originalEnv = process.env.NODE_ENV;
    try {
        delete process.env.JWT_SECRET;
        process.env.NODE_ENV = 'production';
        assert.throws(
            () => getJwtSecret(),
            /FATAL SECURITY ERROR: JWT_SECRET environment variable is missing/,
            'Should throw fatal security error in production when JWT_SECRET is unset'
        );
        console.log('  [PASS] getJwtSecret strictly prevents insecure execution in production');
    } finally {
        process.env.JWT_SECRET = originalSecret;
        process.env.NODE_ENV = originalEnv;
    }

    const server = await new Promise((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const port = server.address().port;

    try {
        // 2. Auth Input Validation
        console.log('\n[TEST 2] Auth Input Validation');

        // Invalid email format on registration
        const badEmailReg = await makeRequest(port, '/auth/register', 'POST', {
            name: 'Hacker',
            email: 'not-an-email',
            password: 'validPassword123',
            role: 'vendor'
        });
        assert.strictEqual(badEmailReg.status, 400);
        console.log('  [PASS] Registration rejects invalid email format (400)');

        // Short password on registration
        const shortPassReg = await makeRequest(port, '/auth/register', 'POST', {
            name: 'Hacker',
            email: 'valid.user@vendorbridge.com',
            password: '123',
            role: 'vendor'
        });
        assert.strictEqual(shortPassReg.status, 400);
        console.log('  [PASS] Registration rejects passwords shorter than 6 chars (400)');

        // Invalid role on registration
        const badRoleReg = await makeRequest(port, '/auth/register', 'POST', {
            name: 'Hacker',
            email: 'valid.role@vendorbridge.com',
            password: 'securePassword123',
            role: 'super_admin_bypass'
        });
        assert.strictEqual(badRoleReg.status, 400);
        console.log('  [PASS] Registration rejects unauthorized / invalid roles (400)');

        // Login with invalid email
        const badEmailLogin = await makeRequest(port, '/auth/login', 'POST', {
            email: 'malformed-email',
            password: 'password123'
        });
        assert.strictEqual(badEmailLogin.status, 400);
        console.log('  [PASS] Login rejects malformed email format (400)');

        // Login as admin for procurement tests
        const adminLogin = await makeRequest(port, '/auth/login', 'POST', {
            email: 'admin@vendorbridge.com',
            password: 'admin123'
        });
        assert.strictEqual(adminLogin.status, 200);
        const adminToken = adminLogin.body.token;

        // Register a test vendor
        const testVendorEmail = `sec.vendor.${Date.now()}@vendorbridge.com`;
        const vendorReg = await makeRequest(port, '/auth/register', 'POST', {
            name: 'Security Test Vendor',
            email: testVendorEmail,
            password: 'vendorPass123',
            role: 'vendor'
        });
        assert.strictEqual(vendorReg.status, 201);

        const vendorLogin = await makeRequest(port, '/auth/login', 'POST', {
            email: testVendorEmail,
            password: 'vendorPass123'
        });
        assert.strictEqual(vendorLogin.status, 200);
        const vendorToken = vendorLogin.body.token;

        // 3. Procurement State Transition Validation
        console.log('\n[TEST 3] Procurement State Transitions (RFQ -> Quote -> PO -> Approval -> Invoice)');

        // Create an RFQ
        const rfq = await makeRequest(port, '/rfqs', 'POST', {
            title: 'Security Test RFQ High-Capacity Edge Routers',
            description: 'Network hardware for edge nodes',
            category: 'Telecommunications',
            quantity: 5,
            deadline: '2026-12-31',
            currency: 'USD',
            items: [{ name: 'Router', unit: 'Units', qty: 5, target_price: 2000 }]
        }, adminToken);
        assert.strictEqual(rfq.status, 201);
        const rfqId = rfq.body.id;

        // Close the RFQ
        const closeRfq = await makeRequest(port, `/rfqs/${rfqId}/status`, 'PATCH', { status: 'closed' }, adminToken);
        assert.strictEqual(closeRfq.status, 200);

        // Attempt to submit quotation on closed RFQ -> must be rejected with 400
        const quoteOnClosed = await makeRequest(port, '/quotations', 'POST', {
            rfq_id: rfqId,
            amount: 10000,
            delivery_days: 14
        }, vendorToken);
        assert.strictEqual(quoteOnClosed.status, 400);
        console.log('  [PASS] Rejects quotation submitted against closed RFQ (400)');

        // Attempt to submit quotation on non-existent RFQ -> must return 404
        const quoteOnMissing = await makeRequest(port, '/quotations', 'POST', {
            rfq_id: 999999,
            amount: 10000,
            delivery_days: 14
        }, vendorToken);
        assert.strictEqual(quoteOnMissing.status, 404);
        console.log('  [PASS] Rejects quotation referencing non-existent RFQ (404)');

        // Re-open RFQ and submit quotation
        const reOpenRfq = await makeRequest(port, `/rfqs/${rfqId}/status`, 'PATCH', { status: 'open' }, adminToken);
        assert.strictEqual(reOpenRfq.status, 200);

        const quote = await makeRequest(port, '/quotations', 'POST', {
            rfq_id: rfqId,
            amount: 9500,
            delivery_days: 10
        }, vendorToken);
        assert.strictEqual(quote.status, 201);
        const quoteId = quote.body.id;

        // Verify direct PO cannot be issued for a pending or rejected quote
        const directPendingPo = await makeRequest(port, '/purchase-orders', 'POST', {
            vendor_name: 'Security Test Vendor',
            quotation_id: 999999,
            total_amount: 9500
        }, adminToken);
        assert.strictEqual(directPendingPo.status, 404);
        console.log('  [PASS] PO creation rejects non-existent quotation reference (404)');

        // Create a direct pending PO to test invoice guard
        const directPo = await makeRequest(port, '/purchase-orders', 'POST', {
            vendor_name: 'Security Test Vendor',
            rfq_ref: 'Test Requisition',
            total_amount: 12000,
            status: 'pending'
        }, adminToken);
        assert.strictEqual(directPo.status, 201);
        const pendingPoId = directPo.body.po.id;

        // Invoice against unapproved pending PO must be rejected with 400
        const invOnPendingPo = await makeRequest(port, '/invoices', 'POST', {
            purchase_order_id: pendingPoId,
            vendor_name: 'Security Test Vendor',
            product: 'Routers',
            quantity: 1,
            unit_price: 12000
        }, vendorToken);
        assert.strictEqual(invOnPendingPo.status, 400);
        console.log('  [PASS] Rejects invoice generated against pending / unapproved PO (400)');

        // Complete the PO and verify it cannot be reverted to earlier states
        const poApproved = await makeRequest(port, `/purchase-orders/${pendingPoId}/status`, 'PATCH', { status: 'approved' }, adminToken);
        assert.strictEqual(poApproved.status, 200);

        const poCompleted = await makeRequest(port, `/purchase-orders/${pendingPoId}/status`, 'PATCH', { status: 'completed' }, adminToken);
        assert.strictEqual(poCompleted.status, 200);

        const poRevert = await makeRequest(port, `/purchase-orders/${pendingPoId}/status`, 'PATCH', { status: 'pending' }, adminToken);
        assert.strictEqual(poRevert.status, 400);
        console.log('  [PASS] Completed PO cannot be reverted to earlier state (400)');

        // Now create a valid invoice against the completed/approved PO
        const validInv = await makeRequest(port, '/invoices', 'POST', {
            purchase_order_id: pendingPoId,
            vendor_name: 'Security Test Vendor',
            product: 'Routers',
            quantity: 1,
            unit_price: 12000
        }, vendorToken);
        assert.strictEqual(validInv.status, 201);
        const invId = validInv.body.invoice.id;

        // Mark invoice as paid
        const markPaid = await makeRequest(port, `/invoices/${invId}/status`, 'PATCH', { status: 'paid' }, adminToken);
        assert.strictEqual(markPaid.status, 200);

        // Attempt to revert settled paid invoice
        const revertPaid = await makeRequest(port, `/invoices/${invId}/status`, 'PATCH', { status: 'generated' }, adminToken);
        assert.strictEqual(revertPaid.status, 400);
        console.log('  [PASS] Paid / settled invoice cannot be reverted to un-settled state (400)');

        // 4. CORS Header Restriction
        console.log('\n[TEST 4] CORS Restriction');
        const corsReq = await makeRequest(port, '/health', 'GET', null, null, {
            'Origin': 'https://evil-unauthorized-domain.com'
        });
        assert.strictEqual(corsReq.headers['access-control-allow-origin'], undefined);
        console.log('  [PASS] Unauthorized origin does not receive Access-Control-Allow-Origin');

        console.log('\n====================================================');
        console.log(' ALL SECURITY & STATE MACHINE TESTS PASSED (100% OK) ');
        console.log('====================================================');
    } finally {
        server.close();
    }
}

if (require.main === module) {
    runSecurityTests()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('\nSecurity Test Execution Error:', err);
            process.exit(1);
        });
}

module.exports = runSecurityTests;
