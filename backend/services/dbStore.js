const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../database/data.json');
const SEED_FILE = path.join(__dirname, '../../database/data.seed.json');

class DBStore {
    constructor() {
        this.data = {
            users: [],
            vendors: [],
            rfqs: [],
            quotations: [],
            approvals: [],
            purchase_orders: [],
            invoices: [],
            activity_logs: [],
            notifications: []
        };
        this.initialized = false;
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const raw = fs.readFileSync(DATA_FILE, 'utf8');
                const parsed = JSON.parse(raw);
                this.data = { ...this.data, ...parsed };
            } else if (fs.existsSync(SEED_FILE)) {
                const raw = fs.readFileSync(SEED_FILE, 'utf8');
                const parsed = JSON.parse(raw);
                this.data = { ...this.data, ...parsed };
                this.save();
            } else {
                this.initDefaults();
                this.save();
            }
            this.ensureDefaultUsers();
            this.initialized = true;
        } catch (err) {
            console.error('Failed to load data in DBStore:', err.message);
            this.initDefaults();
        }
    }

    initDefaults() {
        this.data = {
            users: [
                { id: 1, name: 'Elena Rostova', email: 'admin@vendorbridge.com', password: 'admin123', role: 'admin', created_at: new Date().toISOString() },
                { id: 2, name: 'Marcus Vance', email: 'manager@vendorbridge.com', password: 'manager123', role: 'manager', created_at: new Date().toISOString() },
                { id: 3, name: 'Priya Nair', email: 'procurement@vendorbridge.com', password: 'procurement123', role: 'procurement_officer', created_at: new Date().toISOString() },
                { id: 4, name: 'ABC Global Suppliers', email: 'abc@suppliers.com', password: 'vendor123', role: 'vendor', created_at: new Date().toISOString() }
            ],
            vendors: [
                { id: 1, user_id: 4, company_name: 'ABC Global Suppliers', contact_person: 'John Doe', email: 'abc@suppliers.com', phone: '+1 (415) 555-0192', gst_number: '29ABCDE1234F1Z5', address: '450 Mission St, San Francisco, CA', tier: 'tier1', country: 'United States (NA)', currency: 'USD', status: 'active', created_at: new Date().toISOString() },
                { id: 2, user_id: null, company_name: 'Nordic Tech Industries', contact_person: 'Astrid Lindqvist', email: 'contact@nordictech.eu', phone: '+46 8 501 234 00', gst_number: 'SE556012345601', address: 'Kista Science Tower, Stockholm', tier: 'tier1', country: 'Sweden (EMEA)', currency: 'EUR', status: 'active', created_at: new Date().toISOString() },
                { id: 3, user_id: null, company_name: 'Office & Workspace Co.', contact_person: 'Mike Johnson', email: 'info@workspaceco.co.uk', phone: '+44 20 7946 0821', gst_number: 'GB884129044', address: 'One Canada Square, London', tier: 'verified', country: 'United Kingdom (EMEA)', currency: 'GBP', status: 'active', created_at: new Date().toISOString() }
            ],
            rfqs: [
                { id: 1, title: 'Global Engineering Laptop Fleet', description: 'High performance developer workstations', category: 'IT Hardware & Infrastructure', quantity: 50, currency: 'USD', deadline: '2026-12-01', created_by: 3, status: 'open', items: [], created_at: new Date().toISOString() }
            ],
            quotations: [
                { id: 1, rfq_id: 1, vendor_id: 1, vendor_name: 'ABC Global Suppliers', amount: 89500, currency: 'USD', delivery_days: 6, notes: '3-year global warranty', items: [], status: 'approved', created_at: new Date().toISOString() }
            ],
            approvals: [
                { id: 1, quotation_id: 1, rfq_title: 'RFQ#1 - Global Engineering Laptop Fleet', vendor_name: 'ABC Global Suppliers', amount: 89500, approved_by: 2, status: 'approved', remarks: 'Best value balance.', created_at: new Date().toISOString(), approved_at: new Date().toISOString() }
            ],
            purchase_orders: [
                { id: 1, po_number: 'PO-2026-000001', quotation_id: 1, vendor_name: 'ABC Global Suppliers', rfq_ref: 'RFQ#1 - Global Engineering Laptop Fleet', total_amount: 89500, currency: 'USD', status: 'approved', created_at: new Date().toISOString() }
            ],
            invoices: [
                { id: 1, invoice_number: 'INV-2026-000001', purchase_order_id: 1, vendor_name: 'ABC Global Suppliers', product: 'Developer Workstation Laptops', quantity: 50, unit_price: 1790, subtotal: 89500, tax_rate: 18, tax_label: 'GST', tax: 16110, total_amount: 105610, currency: 'USD', status: 'generated', created_at: new Date().toISOString() }
            ],
            activity_logs: [],
            notifications: []
        };
    }

    ensureDefaultUsers() {
        const defaults = [
            { id: 1, name: 'Elena Rostova', email: 'admin@vendorbridge.com', password: 'admin123', role: 'admin' },
            { id: 2, name: 'Marcus Vance', email: 'manager@vendorbridge.com', password: 'manager123', role: 'manager' },
            { id: 3, name: 'Priya Nair', email: 'procurement@vendorbridge.com', password: 'procurement123', role: 'procurement_officer' },
            { id: 4, name: 'ABC Global Suppliers', email: 'abc@suppliers.com', password: 'vendor123', role: 'vendor' }
        ];

        defaults.forEach(def => {
            const exists = this.data.users.find(u => u.email.toLowerCase() === def.email.toLowerCase());
            if (!exists) {
                this.data.users.push({ ...def, created_at: new Date().toISOString() });
            }
        });
    }

    save() {
        try {
            const dir = path.dirname(DATA_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf8');
        } catch (err) {
            console.error('Failed to save data.json in DBStore:', err.message);
        }
    }

    // Reload from disk (useful when external scripts or tests modify data.json)
    reload() {
        this.load();
    }

    nextId(arr) {
        return arr.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
    }

    async query(sql, params = []) {
        const clean = sql.trim().replace(/\s+/g, ' ');
        const upper = clean.toUpperCase();

        // 1. SELECT 1 (Health check)
        if (upper === 'SELECT 1') {
            return [[{ '1': 1 }]];
        }

        // 2. USERS Queries
        if (upper.includes('FROM USERS WHERE EMAIL = ?')) {
            const email = (params[0] || '').toLowerCase().trim();
            const user = this.data.users.find(u => (u.email || '').toLowerCase().trim() === email);
            return [user ? [user] : []];
        }

        if (upper.includes('FROM USERS WHERE ID = ?')) {
            const id = parseInt(params[0], 10);
            const user = this.data.users.find(u => u.id === id);
            return [user ? [user] : []];
        }

        if (upper.startsWith('INSERT INTO USERS')) {
            const [name, email, password, role] = params;
            const newUser = {
                id: this.nextId(this.data.users),
                name: name || (email ? email.split('@')[0] : 'User'),
                email: email.toLowerCase().trim(),
                password,
                role: role || 'vendor',
                created_at: new Date().toISOString()
            };
            this.data.users.push(newUser);
            this.save();
            return [{ insertId: newUser.id, affectedRows: 1 }];
        }

        if (upper.startsWith('UPDATE USERS SET NAME = ? WHERE ID = ?')) {
            const [name, id] = params;
            const user = this.data.users.find(u => u.id === parseInt(id, 10));
            if (user) {
                user.name = name;
                this.save();
                return [{ affectedRows: 1 }];
            }
            return [{ affectedRows: 0 }];
        }

        if (upper.startsWith('SELECT ID, NAME, EMAIL, ROLE, CREATED_AT FROM USERS') || upper.startsWith('SELECT * FROM USERS')) {
            const sorted = [...this.data.users].sort((a, b) => b.id - a.id);
            return [sorted];
        }

        // 3. VENDORS Queries
        if (upper.startsWith('SELECT COUNT(*) AS COUNT FROM VENDORS') || upper.startsWith('SELECT COUNT(*) AS COUNT FROM `VENDORS`')) {
            return [[{ count: this.data.vendors.length }]];
        }

        if (upper.includes('FROM VENDORS WHERE ID = ?')) {
            const id = parseInt(params[0], 10);
            const vendor = this.data.vendors.find(v => v.id === id);
            return [vendor ? [vendor] : []];
        }

        if (upper.includes('FROM VENDORS WHERE USER_ID = ?')) {
            const userId = parseInt(params[0], 10);
            const vendor = this.data.vendors.find(v => v.user_id === userId);
            return [vendor ? [vendor] : []];
        }

        if (upper.startsWith('INSERT INTO VENDORS')) {
            const [user_id, company_name, contact_person, email, phone, gst_number, address, tier, country, currency] = params;
            const newVendor = {
                id: this.nextId(this.data.vendors),
                user_id: user_id || null,
                company_name,
                contact_person,
                email,
                phone,
                gst_number: gst_number || null,
                address: address || null,
                tier: tier || 'verified',
                country: country || 'Global',
                currency: currency || 'USD',
                status: 'active',
                created_at: new Date().toISOString()
            };
            this.data.vendors.unshift(newVendor);
            this.save();
            return [{ insertId: newVendor.id, affectedRows: 1 }];
        }

        if (upper.startsWith('UPDATE VENDORS SET') && upper.includes('WHERE ID = ?')) {
            const id = parseInt(params[params.length - 1], 10);
            const vendor = this.data.vendors.find(v => v.id === id);
            if (!vendor) return [{ affectedRows: 0 }];
            const [company_name, contact_person, email, phone, gst_number, address, tier, country, currency, status] = params;
            if (company_name !== undefined) vendor.company_name = company_name;
            if (contact_person !== undefined) vendor.contact_person = contact_person;
            if (email !== undefined) vendor.email = email;
            if (phone !== undefined) vendor.phone = phone;
            if (gst_number !== undefined) vendor.gst_number = gst_number;
            if (address !== undefined) vendor.address = address;
            if (tier !== undefined) vendor.tier = tier;
            if (country !== undefined) vendor.country = country;
            if (currency !== undefined) vendor.currency = currency;
            if (status !== undefined) vendor.status = status;
            this.save();
            return [{ affectedRows: 1 }];
        }

        if (upper.startsWith('DELETE FROM VENDORS WHERE ID = ?')) {
            const id = parseInt(params[0], 10);
            const before = this.data.vendors.length;
            this.data.vendors = this.data.vendors.filter(v => v.id !== id);
            this.save();
            return [{ affectedRows: before - this.data.vendors.length }];
        }

        if (upper.includes('FROM VENDORS')) {
            const sorted = [...this.data.vendors].sort((a, b) => b.id - a.id);
            return [sorted];
        }

        // 4. RFQS Queries
        if (upper.startsWith('SELECT COUNT(*) AS COUNT FROM RFQS WHERE STATUS = \'OPEN\'')) {
            const count = this.data.rfqs.filter(r => r.status === 'open').length;
            return [[{ count }]];
        }

        if (upper.includes('FROM RFQS WHERE ID = ?')) {
            const id = parseInt(params[0], 10);
            const rfq = this.data.rfqs.find(r => r.id === id);
            return [rfq ? [rfq] : []];
        }

        if (upper.startsWith('INSERT INTO RFQS')) {
            const [title, description, category, quantity, currency, deadline, created_by, status] = params;
            const newRfq = {
                id: this.nextId(this.data.rfqs),
                title,
                description,
                category: category || 'IT Hardware & Infrastructure',
                quantity: parseInt(quantity, 10),
                currency: currency || 'USD',
                deadline,
                created_by: created_by || 1,
                status: status || 'open',
                created_at: new Date().toISOString()
            };
            this.data.rfqs.unshift(newRfq);
            this.save();
            return [{ insertId: newRfq.id, affectedRows: 1 }];
        }

        if (upper.startsWith('UPDATE RFQS SET STATUS = ? WHERE ID = ?')) {
            const [status, id] = params;
            const rfq = this.data.rfqs.find(r => r.id === parseInt(id, 10));
            if (rfq) {
                rfq.status = status;
                this.save();
                return [{ affectedRows: 1 }];
            }
            return [{ affectedRows: 0 }];
        }

        if (upper.includes('FROM RFQS') && upper.includes('JOIN USERS')) {
            const result = this.data.rfqs.map(r => {
                const user = this.data.users.find(u => u.id === r.created_by);
                return {
                    ...r,
                    created_by_name: user ? user.name : 'Procurement Officer'
                };
            }).sort((a, b) => b.id - a.id);
            return [result];
        }

        if (upper.includes('FROM RFQS')) {
            const sorted = [...this.data.rfqs].sort((a, b) => b.id - a.id);
            return [sorted];
        }

        // 5. QUOTATIONS Queries
        if (upper.startsWith('INSERT INTO QUOTATIONS')) {
            const [rfq_id, vendor_id, vendor_name, amount, currency, delivery_days, notes] = params;
            const newQuote = {
                id: this.nextId(this.data.quotations),
                rfq_id: rfq_id || null,
                vendor_id: vendor_id || null,
                vendor_name,
                amount: parseFloat(amount),
                currency: currency || 'USD',
                delivery_days: parseInt(delivery_days, 10),
                notes: notes || '',
                status: 'submitted',
                created_at: new Date().toISOString()
            };
            this.data.quotations.unshift(newQuote);
            this.save();
            return [{ insertId: newQuote.id, affectedRows: 1 }];
        }

        if (upper.includes('UPDATE QUOTATIONS SET STATUS = "APPROVED" WHERE ID = ?') || upper.includes('UPDATE QUOTATIONS SET STATUS = \'APPROVED\' WHERE ID = ?')) {
            const id = parseInt(params[0], 10);
            const quote = this.data.quotations.find(q => q.id === id);
            if (quote) quote.status = 'approved';
            this.save();
            return [{ affectedRows: quote ? 1 : 0 }];
        }

        if (upper.includes('UPDATE QUOTATIONS SET STATUS = "REJECTED" WHERE ID = ?') || upper.includes('UPDATE QUOTATIONS SET STATUS = \'REJECTED\' WHERE ID = ?')) {
            const id = parseInt(params[0], 10);
            const quote = this.data.quotations.find(q => q.id === id);
            if (quote) quote.status = 'rejected';
            this.save();
            return [{ affectedRows: quote ? 1 : 0 }];
        }

        if (upper.includes('FROM QUOTATIONS') && upper.includes('JOIN RFQS')) {
            const result = this.data.quotations.map(q => {
                const rfq = this.data.rfqs.find(r => r.id === q.rfq_id);
                return {
                    ...q,
                    rfq_title: rfq ? rfq.title : `RFQ#${q.rfq_id || 'General'}`
                };
            }).sort((a, b) => b.id - a.id);
            return [result];
        }

        if (upper.includes('FROM QUOTATIONS WHERE RFQ_ID = ?')) {
            const rfqId = parseInt(params[0], 10);
            const filtered = this.data.quotations.filter(q => q.rfq_id === rfqId).sort((a, b) => a.amount - b.amount);
            return [filtered];
        }

        if (upper.includes('FROM QUOTATIONS WHERE ID = ?')) {
            const id = parseInt(params[0], 10);
            const quote = this.data.quotations.find(q => q.id === id);
            return [quote ? [quote] : []];
        }

        if (upper.includes('FROM QUOTATIONS')) {
            const sorted = [...this.data.quotations].sort((a, b) => b.id - a.id);
            return [sorted];
        }

        // 6. APPROVALS Queries
        if (upper.startsWith('SELECT COUNT(*) AS COUNT FROM APPROVALS WHERE STATUS = \'PENDING\'')) {
            const count = this.data.approvals.filter(a => a.status === 'pending').length;
            return [[{ count }]];
        }

        if (upper.startsWith('INSERT INTO APPROVALS')) {
            const [quotation_id, rfq_title, vendor_name, amount, remarks] = params;
            const newApp = {
                id: this.nextId(this.data.approvals),
                quotation_id: quotation_id || null,
                rfq_title: rfq_title || 'General RFQ',
                vendor_name: vendor_name || 'Vendor',
                amount: parseFloat(amount),
                status: 'pending',
                remarks: remarks || 'Pending review',
                created_at: new Date().toISOString(),
                approved_by: null,
                approved_at: null
            };
            this.data.approvals.unshift(newApp);
            this.save();
            return [{ insertId: newApp.id, affectedRows: 1 }];
        }

        if (upper.includes('FROM APPROVALS WHERE ID = ?')) {
            const id = parseInt(params[0], 10);
            const app = this.data.approvals.find(a => a.id === id);
            return [app ? [app] : []];
        }

        if (upper.startsWith('UPDATE APPROVALS SET STATUS = ?')) {
            const [status, remarks, approved_by, id] = params;
            const app = this.data.approvals.find(a => a.id === parseInt(id, 10));
            if (app) {
                app.status = status;
                app.remarks = remarks || app.remarks;
                app.approved_by = approved_by || 1;
                app.approved_at = new Date().toISOString();
                this.save();
                return [{ affectedRows: 1 }];
            }
            return [{ affectedRows: 0 }];
        }

        if (upper.includes('FROM APPROVALS')) {
            const sorted = [...this.data.approvals].sort((a, b) => b.id - a.id);
            return [sorted];
        }

        // 7. PURCHASE ORDERS Queries
        if (upper.includes('SELECT MAX(ID) AS MAXID FROM PURCHASE_ORDERS')) {
            const maxId = this.data.purchase_orders.reduce((max, p) => Math.max(max, p.id || 0), 0);
            return [[{ maxId: maxId > 0 ? maxId : null }]];
        }

        if (upper.startsWith('INSERT INTO PURCHASE_ORDERS')) {
            const [po_number, quotation_id, vendor_name, rfq_ref, total_amount, currency, statusParam] = params;
            const isApprovedLiteral = upper.includes('"APPROVED"') || upper.includes("'APPROVED'");
            const status = statusParam || (isApprovedLiteral ? 'approved' : 'pending');
            const newPo = {
                id: this.nextId(this.data.purchase_orders),
                po_number,
                quotation_id: quotation_id || null,
                vendor_name,
                rfq_ref: rfq_ref || 'RFQ001',
                total_amount: parseFloat(total_amount),
                currency: currency || 'USD',
                status: status || 'pending',
                created_at: new Date().toISOString()
            };
            this.data.purchase_orders.unshift(newPo);
            this.save();
            return [{ insertId: newPo.id, affectedRows: 1 }];
        }

        if (upper.startsWith('UPDATE PURCHASE_ORDERS SET STATUS = ? WHERE ID = ?')) {
            const [status, id] = params;
            const po = this.data.purchase_orders.find(p => p.id === parseInt(id, 10));
            if (po) {
                po.status = status;
                this.save();
                return [{ affectedRows: 1 }];
            }
            return [{ affectedRows: 0 }];
        }

        if (upper.includes('FROM PURCHASE_ORDERS WHERE ID = ?')) {
            const id = parseInt(params[0], 10);
            const po = this.data.purchase_orders.find(p => p.id === id);
            return [po ? [po] : []];
        }

        if (upper.includes('FROM PURCHASE_ORDERS')) {
            const sorted = [...this.data.purchase_orders].sort((a, b) => b.id - a.id);
            return [sorted];
        }

        // 8. INVOICES Queries
        if (upper.startsWith('SELECT COUNT(*) AS COUNT FROM INVOICES')) {
            return [[{ count: this.data.invoices.length }]];
        }

        if (upper.includes('SELECT MAX(ID) AS MAXID FROM INVOICES')) {
            const maxId = this.data.invoices.reduce((max, i) => Math.max(max, i.id || 0), 0);
            return [[{ maxId: maxId > 0 ? maxId : null }]];
        }

        if (upper.startsWith('INSERT INTO INVOICES')) {
            const [invoice_number, purchase_order_id, vendor_name, product, qty, price, subtotal, tax_rate, tax_label, tax, total_amount, currency] = params;
            const newInvoice = {
                id: this.nextId(this.data.invoices),
                invoice_number,
                purchase_order_id: purchase_order_id || null,
                vendor_name,
                product,
                quantity: parseInt(qty, 10),
                unit_price: parseFloat(price),
                subtotal: parseFloat(subtotal),
                tax_rate: tax_rate !== undefined ? parseFloat(tax_rate) : 18,
                tax_label: tax_label || 'GST',
                tax: parseFloat(tax),
                total_amount: parseFloat(total_amount),
                currency: currency || 'USD',
                status: 'generated',
                created_at: new Date().toISOString()
            };
            this.data.invoices.unshift(newInvoice);
            this.save();
            return [{ insertId: newInvoice.id, affectedRows: 1 }];
        }

        if (upper.startsWith('UPDATE INVOICES SET STATUS = ? WHERE ID = ?')) {
            const [status, id] = params;
            const inv = this.data.invoices.find(i => i.id === parseInt(id, 10));
            if (inv) {
                inv.status = status;
                this.save();
                return [{ affectedRows: 1 }];
            }
            return [{ affectedRows: 0 }];
        }

        if (upper.includes('FROM INVOICES WHERE ID = ?')) {
            const id = parseInt(params[0], 10);
            const inv = this.data.invoices.find(i => i.id === id);
            return [inv ? [inv] : []];
        }

        if (upper.includes('FROM INVOICES')) {
            const sorted = [...this.data.invoices].sort((a, b) => b.id - a.id);
            return [sorted];
        }

        // 9. ACTIVITY LOGS Queries
        if (upper.startsWith('INSERT INTO ACTIVITY_LOGS')) {
            const [user_id, title, category, action] = params;
            if (!Array.isArray(this.data.activity_logs)) this.data.activity_logs = [];
            const entry = {
                id: this.nextId(this.data.activity_logs),
                user_id: user_id || null,
                title: title || 'System Event',
                category: category || 'system',
                action: action || '',
                created_at: new Date().toISOString()
            };
            this.data.activity_logs.unshift(entry);
            if (this.data.activity_logs.length > 50) {
                this.data.activity_logs = this.data.activity_logs.slice(0, 50);
            }
            this.save();
            return [{ insertId: entry.id, affectedRows: 1 }];
        }

        if (upper.includes('FROM ACTIVITY_LOGS')) {
            const logs = Array.isArray(this.data.activity_logs) ? [...this.data.activity_logs] : [];
            return [logs.sort((a, b) => b.id - a.id).slice(0, 25)];
        }

        // 10. NOTIFICATIONS Queries
        if (upper.startsWith('INSERT INTO NOTIFICATIONS')) {
            const [user_id, title, message, category] = params;
            if (!Array.isArray(this.data.notifications)) this.data.notifications = [];
            const notif = {
                id: this.nextId(this.data.notifications),
                user_id: user_id || null,
                title: title || 'Notification',
                message: message || '',
                category: category || 'info',
                is_read: false,
                created_at: new Date().toISOString()
            };
            this.data.notifications.unshift(notif);
            if (this.data.notifications.length > 50) {
                this.data.notifications = this.data.notifications.slice(0, 50);
            }
            this.save();
            return [{ insertId: notif.id, affectedRows: 1 }];
        }

        if (upper.startsWith('UPDATE NOTIFICATIONS SET IS_READ = TRUE')) {
            if (Array.isArray(this.data.notifications)) {
                this.data.notifications.forEach(n => { n.is_read = true; });
                this.save();
            }
            return [{ affectedRows: 1 }];
        }

        if (upper.includes('FROM NOTIFICATIONS')) {
            const list = Array.isArray(this.data.notifications) ? [...this.data.notifications] : [];
            return [list.sort((a, b) => b.id - a.id).slice(0, 25)];
        }

        console.warn('DBStore unhandled query fallback:', clean);
        return [[]];
    }

    getConnection() {
        const self = this;
        return {
            query: (sql, params) => self.query(sql, params),
            beginTransaction: async () => {},
            commit: async () => { self.save(); },
            rollback: async () => {},
            release: () => {}
        };
    }
}

const dbStoreInstance = new DBStore();
module.exports = dbStoreInstance;
