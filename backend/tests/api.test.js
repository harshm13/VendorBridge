const http = require('http');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const app = require('../server');
const dbStore = require('../services/dbStore');

const DATA_FILE = path.join(__dirname, '../../database/data.json');

function makeRequest(port, reqPath, method = 'GET', data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '127.0.0.1',
            port,
            path: `/api${reqPath}`,
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

async function runTests() {
    console.log('--- STARTING VENDORBRIDGE API INTEGRATION TEST ---');
    const backup = fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE, 'utf8') : null;
    const server = await new Promise((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const port = server.address().port;

    try {
        const health = await makeRequest(port, '/health');
        assert.strictEqual(health.status, 200);
        assert.strictEqual(health.body.success, true);
        console.log(`[PASS] GET /health (${health.status})`);

        const login = await makeRequest(port, '/auth/login', 'POST', {
            email: 'admin@vendorbridge.com',
            password: 'admin123',
            role: 'admin'
        });
        assert.strictEqual(login.status, 200);
        assert.ok(login.body.token, 'JWT token expected');
        const token = login.body.token;
        console.log(`[PASS] POST /auth/login (${login.status})`);

        const me = await makeRequest(port, '/auth/me', 'GET', null, token);
        assert.strictEqual(me.status, 200);
        assert.strictEqual(me.body.user.email, 'admin@vendorbridge.com');
        console.log(`[PASS] GET /auth/me (${me.status})`);

        const dashboard = await makeRequest(port, '/dashboard?period=quarter', 'GET', null, token);
        assert.strictEqual(dashboard.status, 200);
        assert.strictEqual(dashboard.body.period, 'quarter');
        assert.ok(dashboard.body.stats.totalVendors >= 1);
        console.log(`[PASS] GET /dashboard?period=quarter (${dashboard.status})`);

        const vendors = await makeRequest(port, '/vendors', 'GET', null, token);
        assert.strictEqual(vendors.status, 200);
        assert.ok(Array.isArray(vendors.body) && vendors.body.length >= 1);
        console.log(`[PASS] GET /vendors (${vendors.status}, count=${vendors.body.length})`);

        const rfqs = await makeRequest(port, '/rfqs', 'GET', null, token);
        assert.strictEqual(rfqs.status, 200);
        assert.ok(Array.isArray(rfqs.body));
        console.log(`[PASS] GET /rfqs (${rfqs.status}, count=${rfqs.body.length})`);

        const quotations = await makeRequest(port, '/quotations', 'GET', null, token);
        assert.strictEqual(quotations.status, 200);
        assert.ok(Array.isArray(quotations.body));
        console.log(`[PASS] GET /quotations (${quotations.status}, count=${quotations.body.length})`);

        const approvals = await makeRequest(port, '/approvals', 'GET', null, token);
        assert.strictEqual(approvals.status, 200);
        assert.ok(Array.isArray(approvals.body));
        console.log(`[PASS] GET /approvals (${approvals.status}, count=${approvals.body.length})`);

        const pos = await makeRequest(port, '/purchase-orders', 'GET', null, token);
        assert.strictEqual(pos.status, 200);
        assert.ok(Array.isArray(pos.body));
        console.log(`[PASS] GET /purchase-orders (${pos.status}, count=${pos.body.length})`);

        const invoices = await makeRequest(port, '/invoices', 'GET', null, token);
        assert.strictEqual(invoices.status, 200);
        assert.ok(Array.isArray(invoices.body));
        assert.ok(invoices.body[0].three_way_match, '3-way match metadata expected');
        console.log(`[PASS] GET /invoices (${invoices.status}, count=${invoices.body.length})`);

        const notifs = await makeRequest(port, '/notifications', 'GET', null, token);
        assert.strictEqual(notifs.status, 200);
        assert.strictEqual(notifs.body.success, true);
        console.log(`[PASS] GET /notifications (${notifs.status})`);

        const aiPrompt = await makeRequest(port, '/ai/parse-prompt', 'POST', {
            prompt: 'Need 20 developer laptops and 10 monitors within 2 weeks',
            currency: 'USD'
        }, token);
        assert.strictEqual(aiPrompt.status, 200);
        assert.ok(aiPrompt.body.parsed.items.length >= 2);
        console.log(`[PASS] POST /ai/parse-prompt (${aiPrompt.status})`);

        console.log('\n--- ALL API INTEGRATION TESTS PASSED (100% OK) ---');
    } catch (err) {
        console.error('API Integration Test Failed:', err);
        process.exitCode = 1;
    } finally {
        server.close();
        if (backup !== null) {
            fs.writeFileSync(DATA_FILE, backup, 'utf8');
            dbStore.reload();
        }
    }
}

runTests();
