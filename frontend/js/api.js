/**
 * VendorBridge Client-Side API & Session Architecture
 */

const getApiBaseUrl = () => {
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
        if (window.location.port === '5000') {
            return '/api';
        }
    }
    return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

const API = {
    async request(endpoint, options = {}) {
        try {
            const token = Auth.getToken();
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const config = {
                headers,
                ...options
            };
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            const data = await response.json();
            
            if (response.status === 401) {
                if (endpoint !== '/auth/login' && endpoint !== '/auth/register') {
                    Auth.logout();
                }
            }

            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.warn(`API network request failed for ${endpoint}:`, error.message);
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

    async getMe() {
        return this.request('/auth/me');
    },

    async updateProfile(profileData) {
        return this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
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
    },

    // AI Procurement Intelligence
    async analyzeQuotes(rfqId) {
        return this.request(`/ai/analyze/${rfqId}`);
    },

    async estimateRFQ(rfqData) {
        return this.request('/ai/estimate', {
            method: 'POST',
            body: JSON.stringify(rfqData)
        });
    }
};

// Toast notification banner
function showAlert(message, type = 'danger', elementId = 'alertBox') {
    let alertBox = document.getElementById(elementId);
    
    // Auto-create floating toast if elementId doesn't exist
    if (!alertBox) {
        alertBox = document.getElementById('globalToast');
        if (!alertBox) {
            alertBox = document.createElement('div');
            alertBox.id = 'globalToast';
            alertBox.className = 'global-toast';
            document.body.appendChild(alertBox);
        }
    }

    const icons = {
        success: '<i class="fa-solid fa-circle-check"></i>',
        danger: '<i class="fa-solid fa-triangle-exclamation"></i>',
        warning: '<i class="fa-solid fa-bell"></i>',
        info: '<i class="fa-solid fa-circle-info"></i>'
    };

    alertBox.className = `alert-box alert-${type} show`;
    alertBox.innerHTML = `
        <span class="alert-icon">${icons[type] || icons.info}</span>
        <span class="alert-text">${message}</span>
    `;
    alertBox.style.display = 'flex';

    if (window.alertTimer) clearTimeout(window.alertTimer);
    window.alertTimer = setTimeout(() => {
        alertBox.style.display = 'none';
        alertBox.classList.remove('show');
    }, 4500);
}

// Authentication & Session Guard Helpers
const Auth = {
    getUser() {
        try {
            const u = localStorage.getItem('user');
            return u ? JSON.parse(u) : null;
        } catch (e) {
            return null;
        }
    },
    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },
    getToken() {
        return localStorage.getItem('token') || null;
    },
    setToken(token) {
        localStorage.setItem('token', token);
    },
    logout() {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    },
    requireAuth() {
        const user = this.getUser();
        const token = this.getToken();
        if (!user || !token) {
            window.location.href = 'login.html';
            return null;
        }
        return user;
    },
    renderUserPill() {
        const user = this.getUser();
        const navUl = document.querySelector('nav ul');
        if (!navUl) return;

        let userItem = document.getElementById('navUserItem');
        if (!userItem) {
            userItem = document.createElement('li');
            userItem.id = 'navUserItem';
            const lastLi = navUl.lastElementChild;
            if (lastLi) {
                navUl.insertBefore(userItem, lastLi);
            } else {
                navUl.appendChild(userItem);
            }
        }

        if (user) {
            const roleDisplay = (user.role || 'user').replace('_', ' ').toUpperCase();
            userItem.innerHTML = `
                <div class="user-nav-badge" title="Logged in as ${user.name} (${roleDisplay})">
                    <span class="user-status-dot pulse-dot"></span>
                    <i class="fa-solid fa-circle-user"></i>
                    <span class="user-nav-name">${user.name}</span>
                    <span class="user-nav-role-tag">${roleDisplay}</span>
                </div>
            `;
        } else {
            userItem.innerHTML = '';
        }
    },
    async quickLoginDemo(email, password, role) {
        try {
            showAlert(`Signing in as ${role.replace('_', ' ').toUpperCase()}...`, 'info');
            const res = await API.login(email, password, role);
            Auth.setUser(res.user);
            Auth.setToken(res.token);
            showAlert('Login successful! Launching workspace...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
        } catch (err) {
            showAlert(err.message || 'Demo login failed', 'danger');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Auth.renderUserPill();
});