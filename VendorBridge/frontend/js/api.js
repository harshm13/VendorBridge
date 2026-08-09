// Determine API Base URL dynamically
const getApiBaseUrl = () => {
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
        if (window.location.port === '5000') {
            return '/api';
        }
    }
    return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

// Local Storage Helper for Offline / Direct File Mode
const LocalDB = {
    getUsers() {
        return JSON.parse(localStorage.getItem('vb_users')) || [
            { id: 1, name: 'Admin User', email: 'admin@vendorbridge.com', password: 'admin123', role: 'admin' },
            { id: 2, name: 'Manager Approver', email: 'manager@vendorbridge.com', password: 'manager123', role: 'manager' },
            { id: 3, name: 'Procurement Officer', email: 'procurement@vendorbridge.com', password: 'procurement123', role: 'procurement_officer' },
            { id: 4, name: 'ABC Vendor', email: 'abc@suppliers.com', password: 'vendor123', role: 'vendor' }
        ];
    },
    saveUsers(users) {
        localStorage.setItem('vb_users', JSON.stringify(users));
    }
};

const API = {
    async request(endpoint, options = {}) {
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            };
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.warn(`API network request failed for ${endpoint}:`, error.message);
            // Fallback for login/register if server is unreachable
            if (endpoint === '/auth/login') {
                const body = JSON.parse(options.body || '{}');
                const cleanEmail = (body.email || '').trim().toLowerCase();
                const cleanPass = (body.password || '').trim();
                
                const users = LocalDB.getUsers();
                const user = users.find(u => u.email.toLowerCase() === cleanEmail);
                
                if (!user) {
                    throw new Error('User account not found. Please create a new account.');
                }
                if (user.password !== cleanPass) {
                    throw new Error('Incorrect password. Please try again.');
                }
                
                return {
                    message: 'Login successful (Offline mode)',
                    user: { id: user.id, name: user.name, email: user.email, role: user.role }
                };
            }

            if (endpoint === '/auth/register') {
                const body = JSON.parse(options.body || '{}');
                const cleanName = (body.name || '').trim();
                const cleanEmail = (body.email || '').trim().toLowerCase();
                const cleanPass = (body.password || '').trim();
                const role = body.role || 'vendor';

                const users = LocalDB.getUsers();
                if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
                    throw new Error('An account with this email address already exists.');
                }

                const newUser = {
                    id: users.length + 1,
                    name: cleanName || cleanEmail.split('@')[0],
                    email: cleanEmail,
                    password: cleanPass,
                    role: role
                };
                users.push(newUser);
                LocalDB.saveUsers(users);

                return {
                    message: 'User registered successfully!',
                    user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
                };
            }

            // Return mock fallback for get endpoints if offline
            if (options.method === 'GET' || !options.method) {
                if (endpoint === '/dashboard') {
                    return {
                        stats: { totalVendors: 4, activeRfqs: 3, pendingApprovals: 2, invoicesGenerated: 2 },
                        recentRfqs: [
                            { id: 1, title: 'Laptop Procurement', quantity: 50, deadline: '2026-08-20', status: 'open' },
                            { id: 2, title: 'Office Furniture', quantity: 100, deadline: '2026-08-25', status: 'open' }
                        ],
                        recentPos: [
                            { id: 1, po_number: 'PO-2026-001', vendor_name: 'ABC Suppliers', total_amount: 480000, status: 'approved' }
                        ]
                    };
                }
                return [];
            }

            throw error;
        }
    },

    // Auth
    async login(email, password, role) {
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanPassword = (password || '').trim();
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: cleanEmail, password: cleanPassword, role })
        });
    },

    async register(name, email, password, role) {
        const cleanName = (name || '').trim();
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanPassword = (password || '').trim();
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name: cleanName, email: cleanEmail, password: cleanPassword, role })
        });
    },

    // Dashboard
    async getDashboard() {
        return this.request('/dashboard');
    },

    // Vendors
    async getVendors() {
        return this.request('/vendors');
    },

    async createVendor(vendorData) {
        return this.request('/vendors', {
            method: 'POST',
            body: JSON.stringify(vendorData)
        });
    },

    // RFQs
    async getRFQs() {
        return this.request('/rfqs');
    },

    async createRFQ(rfqData) {
        return this.request('/rfqs', {
            method: 'POST',
            body: JSON.stringify(rfqData)
        });
    },

    // Quotations
    async getQuotations() {
        return this.request('/quotations');
    },

    async createQuotation(quoteData) {
        return this.request('/quotations', {
            method: 'POST',
            body: JSON.stringify(quoteData)
        });
    },

    // Approvals
    async getApprovals() {
        return this.request('/approvals');
    },

    async updateApproval(id, status, remarks) {
        return this.request(`/approvals/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status, remarks })
        });
    },

    // Purchase Orders
    async getPOs() {
        return this.request('/purchase-orders');
    },

    async createPO(poData) {
        return this.request('/purchase-orders', {
            method: 'POST',
            body: JSON.stringify(poData)
        });
    },

    // Invoices
    async getInvoices() {
        return this.request('/invoices');
    },

    async createInvoice(invoiceData) {
        return this.request('/invoices', {
            method: 'POST',
            body: JSON.stringify(invoiceData)
        });
    }
};

// UI helper to show notification banner
function showAlert(message, type = 'danger', elementId = 'alertBox') {
    const alertBox = document.getElementById(elementId);
    if (alertBox) {
        alertBox.className = `alert-box alert-${type}`;
        alertBox.innerText = message;
        alertBox.style.display = 'block';
        setTimeout(() => { alertBox.style.display = 'none'; }, 4000);
    } else {
        alert(message);
    }
}
