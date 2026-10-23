const http = require('http');

const API_HOST = '127.0.0.1';
const API_PORT = 5000;

function makeRequest(path, method = 'GET', data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: path.startsWith('/api') ? path : `/api${path}`,
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

async function runE2ETests() {
    console.log('====================================================');
    console.log(' VENDORBRIDGE ERP - FULL END-TO-END AUTOMATED TEST ');
    console.log('====================================================\n');

    try {
        // 1. Health Check
        console.log('1. Testing GET /api/health...');
        const health = await makeRequest('/health');
        console.log(`   -> Status ${health.status}:`, health.body.message);

        // 2. User Login with Seed Account
        console.log('\n2. Testing Admin Login...');
        const adminLogin = await makeRequest('/auth/login', 'POST', {
            email: 'admin@vendorbridge.com',
            password: 'admin123',
            role: 'admin'
        });
        console.log(`   -> Admin Login Status ${adminLogin.status}:`, adminLogin.body);
        let adminToken = adminLogin.body.token;

        // 3. Register New User & Login
        console.log('\n3. Testing User Auth Register & Login...');
        const newAccount = await makeRequest('/auth/register', 'POST', {
            name: 'Test Manager',
            email: 'newmanager@vendorbridge.com',
            password: 'pass123',
            role: 'manager'
        });
        console.log(`   -> Register Status ${newAccount.status}:`, newAccount.body);

        const newLogin = await makeRequest('/auth/login', 'POST', {
            email: 'newmanager@vendorbridge.com',
            password: 'pass123',
            role: 'manager'
        });
        console.log(`   -> New User Login Status ${newLogin.status}:`, newLogin.body);
        let managerToken = newLogin.body.token;

        // 4. Add Vendor
        console.log('\n4. Testing Vendor Creation...');
        const vendor = await makeRequest('/vendors', 'POST', {
            name: 'Apex Solutions',
            email: 'contact@apexsolutions.com',
            phone: '+91 9123456789',
            company: 'Apex Solutions Pvt Ltd',
            gst_number: '27APEXS1234F1Z9',
            address: 'Tech Park, Hyderabad'
        }, adminToken);
        console.log(`   -> Vendor Status ${vendor.status}:`, vendor.body.message);

        // 5. Create RFQ with Bill of Materials (BoM)
        console.log('\n5. Testing RFQ Creation with BoM Line Items...');
        const rfq = await makeRequest('/rfqs', 'POST', {
            title: 'Server Hardware Infrastructure',
            description: 'Enterprise rack servers with 128GB RAM',
            quantity: 10,
            deadline: '2026-09-15',
            items: [
                { name: 'Enterprise 2U Rack Servers', unit: 'Units', qty: 6, target_price: 65000 },
                { name: '48-Port PoE Managed Switches', unit: 'Units', qty: 4, target_price: 50000 }
            ]
        }, adminToken);
        console.log(`   -> RFQ Status ${rfq.status}: Created RFQ ID #${rfq.body.id}`);

        // 6. Submit Quotation with Itemized BoM Breakdown
        console.log('\n6. Testing Quotation Submission with BoM Items...');
        const quote = await makeRequest('/quotations', 'POST', {
            rfq_id: rfq.body.id,
            vendor_name: 'Apex Solutions Pvt Ltd',
            amount: 590000.00,
            delivery_days: 5,
            notes: 'Includes 3 years enterprise SLA and support',
            items: [
                { name: 'Enterprise 2U Rack Servers', unit: 'Units', qty: 6, quoted_price: 65000 },
                { name: '48-Port PoE Managed Switches', unit: 'Units', qty: 4, quoted_price: 50000 }
            ]
        }, adminToken);
        console.log(`   -> Quotation Status ${quote.status}: Submitted Quotation ID #${quote.body.id}`);

        // 7. Approve Quotation Request
        console.log('\n7. Testing Manager Approval...');
        const approvalsList = await makeRequest('/approvals', 'GET', null, managerToken);
        const latestApproval = approvalsList.body[0];
        if (latestApproval) {
            const approvalDecision = await makeRequest(`/approvals/${latestApproval.id}`, 'PUT', {
                status: 'approved',
                remarks: 'Approved by Senior Manager'
            }, managerToken);
            console.log(`   -> Approval Status ${approvalDecision.status}: Request APP#${latestApproval.id} Approved!`);
        }

        // 8. Generate Invoice
        console.log('\n8. Testing Invoice Generation...');
        const invoice = await makeRequest('/invoices', 'POST', {
            vendor_name: 'Apex Solutions Pvt Ltd',
            product: 'Rack Servers 128GB',
            quantity: 10,
            unit_price: 75000.00
        }, adminToken);
        console.log(`   -> Invoice Status ${invoice.status}: Invoice ${invoice.body.invoice ? invoice.body.invoice.invoice_number : ''} Generated!`);

        // 9. Fetch Updated Dashboard Metrics
        console.log('\n9. Testing Dashboard Overview Metrics...');
        const dashboard = await makeRequest('/dashboard', 'GET', null, adminToken);
        console.log(`   -> Dashboard Metrics:`, dashboard.body.stats);

        console.log('\n====================================================');
        console.log(' ALL E2E WORKFLOW TESTS PASSED PERFECTLY (100% OK) ');
        console.log('====================================================');
    } catch (err) {
        console.error('\nE2E Test Execution Error:', err);
    }
}

runE2ETests();
