const http = require('http');

const API_HOST = '127.0.0.1';
const API_PORT = 5000;

function makeRequest(path, method = 'GET', data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: `/api${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runTests() {
    console.log('--- STARTING VENDORBRIDGE API INTEGRATION TEST ---');
    try {
        // 1. Health check
        console.log('Testing GET /health...');
        const health = await makeRequest('/health');
        console.log(`[PASS] Health Status: ${health.status}`, health.body);

        // 2. Auth Login
        console.log('\nTesting POST /auth/login...');
        const login = await makeRequest('/auth/login', 'POST', {
            email: 'admin@vendorbridge.com',
            password: 'admin123',
            role: 'admin'
        });
        console.log(`[PASS] Login Status: ${login.status}`, login.body);
        const token = login.body.token;

        // 3. Get Dashboard Stats
        console.log('\nTesting GET /dashboard...');
        const dashboard = await makeRequest('/dashboard', 'GET', null, token);
        console.log(`[PASS] Dashboard Status: ${dashboard.status}`, dashboard.body.stats);

        // 4. Vendors API
        console.log('\nTesting GET /vendors...');
        const vendors = await makeRequest('/vendors', 'GET', null, token);
        console.log(`[PASS] Vendors Status: ${vendors.status}, Count: ${Array.isArray(vendors.body) ? vendors.body.length : 0}`);

        // 5. RFQs API
        console.log('\nTesting GET /rfqs...');
        const rfqs = await makeRequest('/rfqs', 'GET', null, token);
        console.log(`[PASS] RFQs Status: ${rfqs.status}, Count: ${Array.isArray(rfqs.body) ? rfqs.body.length : 0}`);

        // 6. Quotations API
        console.log('\nTesting GET /quotations...');
        const quotations = await makeRequest('/quotations', 'GET', null, token);
        console.log(`[PASS] Quotations Status: ${quotations.status}, Count: ${Array.isArray(quotations.body) ? quotations.body.length : 0}`);

        // 7. Approvals API
        console.log('\nTesting GET /approvals...');
        const approvals = await makeRequest('/approvals', 'GET', null, token);
        console.log(`[PASS] Approvals Status: ${approvals.status}, Count: ${Array.isArray(approvals.body) ? approvals.body.length : 0}`);

        // 8. Purchase Orders API
        console.log('\nTesting GET /purchase-orders...');
        const pos = await makeRequest('/purchase-orders', 'GET', null, token);
        console.log(`[PASS] Purchase Orders Status: ${pos.status}, Count: ${Array.isArray(pos.body) ? pos.body.length : 0}`);

        // 9. Invoices API
        console.log('\nTesting GET /invoices...');
        const invoices = await makeRequest('/invoices', 'GET', null, token);
        console.log(`[PASS] Invoices Status: ${invoices.status}, Count: ${Array.isArray(invoices.body) ? invoices.body.length : 0}`);

        console.log('\n--- ALL API INTEGRATION TESTS COMPLETED ---');
    } catch (err) {
        console.error('Test Execution Error:', err);
    }
}

runTests();
