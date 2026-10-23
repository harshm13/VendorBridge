const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_FILE = path.join(__dirname, '../../database/data.json');

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
            } else {
                this.initDefaults();
                this.save();
            }
            this.ensureDefaultUsers();
            this.initialized = true;
        } catch (err) {
            console.error('Failed to load data.json in DBStore:', err.message);
            this.initDefaults();
        }
    }

    initDefaults() {
        this.data = {
            users: [
                { id: 1, name: 'Admin User', email: 'admin@vendorbridge.com', password: 'admin123', role: 'admin', created_at: new Date().toISOString() },
                { id: 2, name: 'Manager Approver', email: 'manager@vendorbridge.com', password: 'manager123', role: 'manager', created_at: new Date().toISOString() },
                { id: 3, name: 'Procurement Officer', email: 'procurement@vendorbridge.com', password: 'procurement123', role: 'procurement_officer', created_at: new Date().toISOString() },
                { id: 4, name: 'ABC Vendor', email: 'abc@suppliers.com', password: 'vendor123', role: 'vendor', created_at: new Date().toISOString() }
            ],
            vendors: [
                { id: 1, user_id: 4, company_name: 'ABC Suppliers', contact_person: 'John Doe', email: 'abc@suppliers.com', phone: '+91 9876543210', gst_number: '29ABCDE1234F1Z5', address: '123 Industrial Estate, Mumbai', status: 'active', created_at: new Date().toISOString() },
                { id: 2, user_id: null, company_name: 'Tech Industries', contact_person: 'Sarah Smith', email: 'contact@techind.com', phone: '+91 9812345678', gst_number: '27TECH9876G1Z2', address: '456 Tech Park, Bengaluru', status: 'active', created_at: new Date().toISOString() },
                { id: 3, user_id: null, company_name: 'Office Essentials', contact_person: 'Mike Johnson', email: 'info@officeessentials.com', phone: '+91 9988776655', gst_number: '07OFFIC4321H1Z9', address: '789 Commercial Zone, Delhi', status: 'active', created_at: new Date().toISOString() }
            ],
            rfqs: [
                { id: 1, title: 'Laptop Procurement', description: 'High performance laptops for development team', quantity: 50, deadline: '2026-11-20', created_by: 3, status: 'open', created_at: new Date().toISOString() },
                { id: 2, title: 'Office Furniture', description: 'Ergonomic chairs and executive desks', quantity: 100, deadline: '2026-11-25', created_by: 3, status: 'open', created_at: new Date().toISOString() },
                { id: 3, title: 'Printer Supplies', description: 'LaserJet toner cartridges and heavy duty paper', quantity: 30, deadline: '2026-10-18', created_by: 3, status: 'closed', created_at: new Date().toISOString() }
            ],
            quotations: [
                { id: 1, rfq_id: 1, vendor_id: 1, vendor_name: 'ABC Suppliers', amount: 480000, delivery_days: 7, notes: 'Includes 3 years warranty and free delivery', status: 'approved', created_at: new Date().toISOString() },
                { id: 2, rfq_id: 1, vendor_id: 2, vendor_name: 'Tech Industries', amount: 510000, delivery_days: 5, notes: 'Includes fast shipping and setup', status: 'submitted', created_at: new Date().toISOString() },
                { id: 3, rfq_id: 1, vendor_id: 3, vendor_name: 'Office Essentials', amount: 465000, delivery_days: 10, notes: 'Standard warranty', status: 'submitted', created_at: new Date().toISOString() }
            ],
            approvals: [
                { id: 1, quotation_id: 1, rfq_title: 'RFQ001 - Laptop Procurement', vendor_name: 'ABC Suppliers', amount: 480000, approved_by: 1, status: 'approved', remarks: 'Best balance of pricing and warranty.', created_at: new Date().toISOString() }
            ],
            purchase_orders: [
                { id: 1, po_number: 'PO-2026-000001', quotation_id: 1, vendor_name: 'ABC Suppliers', rfq_ref: 'RFQ001 - Laptop Procurement', total_amount: 480000, status: 'approved', created_at: new Date().toISOString() }
            ],
            invoices: [
                { id: 1, invoice_number: 'INV-2026-000001', purchase_order_id: 1, vendor_name: 'ABC Suppliers', product: 'Development Laptops', quantity: 50, unit_price: 9600, subtotal: 480000, tax: 86400, total_amount: 566400, status: 'generated', created_at: new Date().toISOString() }
            ],
            activity_logs: [],
            notifications: []
        };
    }

    ensureDefaultUsers() {
        const defaults = [
            { id: 1, name: 'Admin User', email: 'admin@vendorbridge.com', password: 'admin123', role: 'admin' },
            { id: 2, name: 'Manager Approver', email: 'manager@vendorbridge.com', password: 'manager123', role: 'manager' },
            { id: 3, name: 'Procurement Officer', email: 'procurement@vendorbridge.com', password: 'procurement123', role: 'procurement_officer' },
            { id: 4, name: 'ABC Vendor', email: 'abc@suppliers.com', password: 'vendor123', role: 'vendor' }
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

    // Emulated SQL query engine
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

        if (upper.startsWith('INSERT INTO USERS')) {
            const [name, email, password, role] = params;
            const maxId = this.data.users.reduce((max, u) => Math.max(max, u.id || 0), 0);
            const newUser = {
                id: maxId + 1,
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
            const [user_id, company_name, contact_person, email, phone, gst_number, address] = params;
            const maxId = this.data.vendors.reduce((max, v) => Math.max(max, v.id || 0), 0);
            const newVendor = {
                id: maxId + 1,
                user_id: user_id || null,
                company_name,
                contact_person,
                email,
                phone,
                gst_number: gst_number || null,
                address: address || null,
                status: 'active',
                created_at: new Date().toISOString()
            };
            this.data.vendors.unshift(newVendor);
            this.save();
            return [{ insertId: newVendor.id, affectedRows: 1 }];
        }

        if (upper.includes('FROM VENDORS ORDER BY ID DESC') || upper.includes('FROM VENDORS')) {
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
            const [title, description, quantity, deadline, created_by, status] = params;
            const maxId = this.data.rfqs.reduce((max, r) => Math.max(max, r.id || 0), 0);
            const newRfq = {
                id: maxId + 1,
                title,
                description,
                quantity: parseInt(quantity, 10),
                deadline,
                created_by: created_by || 1,
                status: status || 'open',
                created_at: new Date().toISOString()
            };
            this.data.rfqs.unshift(newRfq);
            this.save();
            return [{ insertId: newRfq.id, affectedRows: 1 }];
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
            const [rfq_id, vendor_id, vendor_name, amount, delivery_days, notes] = params;
            const maxId = this.data.quotations.reduce((max, q) => Math.max(max, q.id || 0), 0);
            const newQuote = {
                id: maxId + 1,
                rfq_id: rfq_id || null,
                vendor_id: vendor_id || null,
                vendor_name,
                amount: parseFloat(amount),
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
            const maxId = this.data.approvals.reduce((max, a) => Math.max(max, a.id || 0), 0);
            const newApp = {
                id: maxId + 1,
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
            const [po_number, quotation_id, vendor_name, rfq_ref, total_amount, status] = params;
            const maxId = this.data.purchase_orders.reduce((max, p) => Math.max(max, p.id || 0), 0);
            const newPo = {
                id: maxId + 1,
                po_number,
                quotation_id: quotation_id || null,
                vendor_name,
                rfq_ref: rfq_ref || 'RFQ001',
                total_amount: parseFloat(total_amount),
                status: status || 'pending',
                created_at: new Date().toISOString()
            };
            this.data.purchase_orders.unshift(newPo);
            this.save();
            return [{ insertId: newPo.id, affectedRows: 1 }];
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
            const [invoice_number, purchase_order_id, vendor_name, product, qty, price, subtotal, tax, total_amount] = params;
            const maxId = this.data.invoices.reduce((max, i) => Math.max(max, i.id || 0), 0);
            const newInvoice = {
                id: maxId + 1,
                invoice_number,
                purchase_order_id: purchase_order_id || null,
                vendor_name,
                product,
                quantity: parseInt(qty, 10),
                unit_price: parseFloat(price),
                subtotal: parseFloat(subtotal),
                tax: parseFloat(tax),
                total_amount: parseFloat(total_amount),
                status: 'generated',
                created_at: new Date().toISOString()
            };
            this.data.invoices.unshift(newInvoice);
            this.save();
            return [{ insertId: newInvoice.id, affectedRows: 1 }];
        }

        if (upper.includes('FROM INVOICES')) {
            const sorted = [...this.data.invoices].sort((a, b) => b.id - a.id);
            return [sorted];
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
