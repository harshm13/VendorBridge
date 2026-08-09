const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../../database/data.json');

// Ensure database file exists
const defaultData = {
    users: [],
    vendors: [],
    rfqs: [],
    quotations: [],
    approvals: [],
    purchase_orders: [],
    invoices: []
};

function readData() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
            fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading JSON DB:', err.message);
        return defaultData;
    }
}

function saveData(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error writing JSON DB:', err.message);
    }
}

console.log('Zero-dependency JSON NoSQL Database initialized cleanly at:', DB_FILE);

module.exports = {
    readData,
    saveData,
    query: async (sql, params = []) => {
        const data = readData();
        const sqlLower = sql.toLowerCase().trim();

        // USERS
        if (sqlLower.includes('users')) {
            if (sqlLower.includes('where email = ?')) {
                const user = data.users.find(u => u.email.toLowerCase() === (params[0] || '').toLowerCase());
                return [user ? [user] : [], []];
            }
            if (sqlLower.includes('insert into users')) {
                const newId = data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
                const newUser = {
                    id: newId,
                    name: params[0],
                    email: params[1],
                    password: params[2],
                    role: params[3],
                    created_at: new Date().toISOString()
                };
                data.users.push(newUser);
                saveData(data);
                return [{ insertId: newId }, []];
            }
            return [data.users, []];
        }

        // VENDORS
        if (sqlLower.includes('vendors')) {
            if (sqlLower.includes('select count(*)')) {
                return [[{ count: data.vendors.length }], []];
            }
            if (sqlLower.includes('where id = ?')) {
                const vendor = data.vendors.find(v => v.id == params[0]);
                return [vendor ? [vendor] : [], []];
            }
            if (sqlLower.includes('insert into vendors')) {
                const newId = data.vendors.length > 0 ? Math.max(...data.vendors.map(v => v.id)) + 1 : 1;
                const newVendor = {
                    id: newId,
                    company_name: params[0],
                    contact_person: params[1],
                    email: params[2],
                    phone: params[3],
                    gst_number: params[4],
                    address: params[5],
                    status: 'active',
                    created_at: new Date().toISOString()
                };
                data.vendors.unshift(newVendor);
                saveData(data);
                return [{ insertId: newId }, []];
            }
            return [data.vendors, []];
        }

        // RFQS
        if (sqlLower.includes('rfqs')) {
            if (sqlLower.includes('select count(*)')) {
                const activeCount = data.rfqs.filter(r => r.status === 'open').length;
                return [[{ count: activeCount }], []];
            }
            if (sqlLower.includes('insert into rfqs')) {
                const newId = data.rfqs.length > 0 ? Math.max(...data.rfqs.map(r => r.id)) + 1 : 1;
                const newRfq = {
                    id: newId,
                    title: params[0],
                    description: params[1],
                    quantity: params[2],
                    deadline: params[3],
                    created_by: params[4],
                    status: params[5] || 'open',
                    created_at: new Date().toISOString()
                };
                data.rfqs.unshift(newRfq);
                saveData(data);
                return [{ insertId: newId }, []];
            }
            return [data.rfqs, []];
        }

        // QUOTATIONS
        if (sqlLower.includes('quotations')) {
            if (sqlLower.includes('where rfq_id = ?')) {
                const quotes = data.quotations.filter(q => q.rfq_id == params[0]);
                return [quotes, []];
            }
            if (sqlLower.includes('insert into quotations')) {
                const newId = data.quotations.length > 0 ? Math.max(...data.quotations.map(q => q.id)) + 1 : 1;
                const newQuote = {
                    id: newId,
                    rfq_id: params[0],
                    vendor_id: params[1],
                    vendor_name: params[2],
                    amount: params[3],
                    delivery_days: params[4],
                    notes: params[5],
                    status: 'submitted',
                    created_at: new Date().toISOString()
                };
                data.quotations.unshift(newQuote);

                // Auto-create approval
                const newAppId = data.approvals.length > 0 ? Math.max(...data.approvals.map(a => a.id)) + 1 : 1;
                data.approvals.unshift({
                    id: newAppId,
                    quotation_id: newId,
                    rfq_title: `RFQ#${params[0] || 'General'}`,
                    vendor_name: params[2],
                    amount: params[3],
                    status: 'pending',
                    remarks: 'Pending manager review',
                    created_at: new Date().toISOString()
                });

                saveData(data);
                return [{ insertId: newId }, []];
            }
            return [data.quotations, []];
        }

        // APPROVALS
        if (sqlLower.includes('approvals')) {
            if (sqlLower.includes('select count(*)')) {
                const count = data.approvals.filter(a => a.status === 'pending').length;
                return [[{ count }], []];
            }
            if (sqlLower.includes('update approvals')) {
                const status = params[0];
                const remarks = params[1];
                const approved_by = params[2];
                const id = params[3];
                const app = data.approvals.find(a => a.id == id);
                if (app) {
                    app.status = status;
                    app.remarks = remarks;
                    app.approved_by = approved_by;

                    if (status === 'approved') {
                        const newPoId = data.purchase_orders.length > 0 ? Math.max(...data.purchase_orders.map(p => p.id)) + 1 : 1;
                        const poNumber = `PO-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`;
                        data.purchase_orders.unshift({
                            id: newPoId,
                            po_number: poNumber,
                            quotation_id: app.quotation_id,
                            vendor_name: app.vendor_name,
                            rfq_ref: app.rfq_title,
                            total_amount: app.amount,
                            status: 'approved',
                            created_at: new Date().toISOString()
                        });
                    }
                    saveData(data);
                    return [{ affectedRows: 1 }, []];
                }
                return [{ affectedRows: 0 }, []];
            }
            if (sqlLower.includes('where id = ?')) {
                const app = data.approvals.find(a => a.id == params[0]);
                return [app ? [app] : [], []];
            }
            return [data.approvals, []];
        }

        // PURCHASE ORDERS
        if (sqlLower.includes('purchase_orders')) {
            if (sqlLower.includes('insert into purchase_orders')) {
                const newId = data.purchase_orders.length > 0 ? Math.max(...data.purchase_orders.map(p => p.id)) + 1 : 1;
                const newPo = {
                    id: newId,
                    po_number: params[0],
                    quotation_id: params[1],
                    vendor_name: params[2],
                    rfq_ref: params[3],
                    total_amount: params[4],
                    status: params[5],
                    created_at: new Date().toISOString()
                };
                data.purchase_orders.unshift(newPo);
                saveData(data);
                return [{ insertId: newId }, []];
            }
            return [data.purchase_orders, []];
        }

        // INVOICES
        if (sqlLower.includes('invoices')) {
            if (sqlLower.includes('select count(*)')) {
                return [[{ count: data.invoices.length }], []];
            }
            if (sqlLower.includes('insert into invoices')) {
                const newId = data.invoices.length > 0 ? Math.max(...data.invoices.map(i => i.id)) + 1 : 1;
                const newInv = {
                    id: newId,
                    invoice_number: params[0],
                    purchase_order_id: params[1],
                    vendor_name: params[2],
                    product: params[3],
                    quantity: params[4],
                    unit_price: params[5],
                    subtotal: params[6],
                    tax: params[7],
                    total_amount: params[8],
                    status: 'generated',
                    created_at: new Date().toISOString()
                };
                data.invoices.unshift(newInv);
                saveData(data);
                return [{ insertId: newId }, []];
            }
            return [data.invoices, []];
        }

        return [[], []];
    }
};
