/**
 * VendorBridge Core API, Auth, Multi-Currency, Notifications & Command Palette (api.js)
 */
(function () {
  function getApiBaseUrl() {
    try {
      const override = localStorage.getItem('vb_api_url');
      if (override) return override.replace(/\/$/, '');
    } catch {
      // ignore
    }
    if (window.location.protocol === 'file:') {
      return 'http://localhost:5000/api';
    }
    return `${window.location.origin}/api`;
  }

  function escapeHtml(val) {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showAlert(message, type = 'info', duration = 3800) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : '✦';
    toast.innerHTML = `<span style="font-weight:700;">${icon}</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 220);
    }, duration);
  }

  /* ---------------- MULTI-CURRENCY ENGINE ---------------- */
  const FX_RATES_FROM_USD = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    INR: 84.5,
    JPY: 154.0,
    AED: 3.67,
    SGD: 1.34,
  };
  const CURRENCY_SYMBOLS = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    JPY: '¥',
    AED: 'AED ',
    SGD: 'S$',
  };

  const CurrencyEngine = {
    getDisplayCurrency() {
      try {
        return localStorage.getItem('vb_display_currency') || 'USD';
      } catch {
        return 'USD';
      }
    },
    setDisplayCurrency(cur) {
      const code = FX_RATES_FROM_USD[cur] ? cur : 'USD';
      try {
        localStorage.setItem('vb_display_currency', code);
      } catch {
        // ignore
      }
      window.dispatchEvent(new CustomEvent('vb:currency-changed', { detail: code }));
      return code;
    },
    convert(amount, fromCurrency = 'USD', toCurrency = null) {
      const target = toCurrency || this.getDisplayCurrency();
      const num = Number(amount) || 0;
      const fromRate = FX_RATES_FROM_USD[fromCurrency] || 1;
      const toRate = FX_RATES_FROM_USD[target] || 1;
      const usdAmount = num / fromRate;
      return usdAmount * toRate;
    },
    format(amount, sourceCurrency = 'USD', forceCurrency = null) {
      const target = forceCurrency || this.getDisplayCurrency();
      const converted = this.convert(amount, sourceCurrency, target);
      const sym = CURRENCY_SYMBOLS[target] || `${target} `;
      const decimals = target === 'JPY' ? 0 : converted >= 1000 ? 0 : 2;
      const formatted = converted.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      return `${sym}${formatted}`;
    },
    formatNative(amount, currency = 'USD') {
      const num = Number(amount) || 0;
      const sym = CURRENCY_SYMBOLS[currency] || `${currency} `;
      const decimals = currency === 'JPY' ? 0 : 2;
      return `${sym}${num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;
    },
  };

  /* ---------------- AUTH ENGINE ---------------- */
  const Auth = {
    getToken() {
      try {
        return localStorage.getItem('token');
      } catch {
        return null;
      }
    },
    setToken(token) {
      localStorage.setItem('token', token);
    },
    getUser() {
      try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    setUser(user) {
      localStorage.setItem('user', JSON.stringify(user));
    },
    logout() {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    },
    requireAuth() {
      if (!this.getToken()) {
        window.location.href = '/login';
        return false;
      }
      return true;
    },
    renderUserPill() {
      const pill = document.getElementById('userPillContainer');
      if (!pill) return;
      const user = this.getUser();
      if (!user) {
        pill.innerHTML = `<a href="/login" class="btn btn-primary btn-sm">Sign In</a>`;
        return;
      }
      const initials = (user.name || 'U')
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      pill.innerHTML = `
        <div class="user-pill">
          <div class="user-avatar">${escapeHtml(initials)}</div>
          <span class="user-name-text" style="font-weight:600;">${escapeHtml(user.name)}</span>
          <span class="badge badge-accent" style="font-size:0.64rem;padding:2px 7px;">${escapeHtml(String(user.role || '').replace('_', ' '))}</span>
          <button type="button" id="logoutBtn" class="btn btn-sm btn-secondary" style="padding:4px 8px;margin-left:2px;" title="Sign Out">Exit</button>
        </div>
      `;
      const btn = document.getElementById('logoutBtn');
      if (btn) btn.addEventListener('click', () => Auth.logout());
    },
    async quickLoginDemo(roleKey) {
      const creds = {
        admin: { email: 'admin@vendorbridge.com', password: 'password123', role: 'admin' },
        manager: { email: 'manager@vendorbridge.com', password: 'password123', role: 'manager' },
        procurement: { email: 'procurement@vendorbridge.com', password: 'password123', role: 'procurement_officer' },
        vendor: { email: 'abc@suppliers.com', password: 'password123', role: 'vendor' },
      }[roleKey];
      if (!creds) return;
      try {
        const res = await API.login(creds);
        if (res.token && res.user) {
          this.setToken(res.token);
          this.setUser(res.user);
          showAlert(`Signed in as ${res.user.name} (${res.user.role})`, 'success');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 450);
        }
      } catch (err) {
        showAlert(err.message || 'Demo login failed', 'error');
      }
    },
  };

  /* ---------------- HTTP REQUEST WRAPPER ---------------- */
  async function request(path, options = {}) {
    const token = Auth.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && !path.startsWith('/auth/login')) {
      Auth.logout();
      throw new Error('Session expired. Please sign in again.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || data.error || `Request failed (${res.status})`);
    }
    return data;
  }

  const API = {
    login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
    register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    getMe: () => request('/auth/me'),
    updateProfile: (payload) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(payload) }),
    getDashboard: (period = '6m') => request(`/dashboard?period=${encodeURIComponent(period)}`),
    getVendors: () => request('/vendors'),
    createVendor: (payload) => request('/vendors', { method: 'POST', body: JSON.stringify(payload) }),
    updateVendor: (id, payload) => request(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    getRfqs: () => request('/rfqs'),
    getRfq: (id) => request(`/rfqs/${id}`),
    createRFQ: (payload) => request('/rfqs', { method: 'POST', body: JSON.stringify(payload) }),
    updateRfqStatus: (id, status) => request(`/rfqs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    getQuotations: () => request('/quotations'),
    createQuotation: (payload) => request('/quotations', { method: 'POST', body: JSON.stringify(payload) }),
    getApprovals: () => request('/approvals'),
    updateApproval: (id, payload) => request(`/approvals/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    getPurchaseOrders: () => request('/purchase-orders'),
    createPO: (payload) => request('/purchase-orders', { method: 'POST', body: JSON.stringify(payload) }),
    updatePOStatus: (id, status) => request(`/purchase-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    getInvoices: () => request('/invoices'),
    createInvoice: (payload) => request('/invoices', { method: 'POST', body: JSON.stringify(payload) }),
    updateInvoiceStatus: (id, status) => request(`/invoices/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    analyzeRfq: (rfqId, currency = 'USD') => request(`/ai/analyze/${rfqId}?currency=${encodeURIComponent(currency)}`),
    estimateBudget: (payload) => request('/ai/estimate', { method: 'POST', body: JSON.stringify(payload) }),
    parseRfqPrompt: (payload) => request('/ai/parse-prompt', { method: 'POST', body: JSON.stringify(payload) }),
    getNotifications: () => request('/notifications'),
    markNotificationsRead: () => request('/notifications/mark-read', { method: 'POST', body: JSON.stringify({}) }),
  };

  /* ---------------- LIVE NOTIFICATION DRAWER ---------------- */
  const NotificationEngine = {
    ensureMarkup() {
      if (document.getElementById('notifDrawer')) return;
      const overlay = document.createElement('div');
      overlay.id = 'notifOverlay';
      overlay.className = 'notif-overlay';

      const drawer = document.createElement('aside');
      drawer.id = 'notifDrawer';
      drawer.className = 'notif-drawer';
      drawer.innerHTML = `
        <div class="notif-header">
          <div>
            <div style="font-weight:700;font-size:1rem;">Global Activity &amp; Alerts</div>
            <div style="font-size:0.74rem;color:var(--text-muted);">Live procurement telemetry stream</div>
          </div>
          <button type="button" class="notif-close-btn" id="closeNotifBtn" aria-label="Close Notifications">&times;</button>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="badge badge-accent" id="notifUnreadPill">0 unread</span>
          <button type="button" class="btn btn-sm btn-secondary" id="markReadBtn">Mark all read</button>
        </div>
        <div id="notifList" style="display:flex;flex-direction:column;gap:10px;"></div>
      `;

      document.body.appendChild(overlay);
      document.body.appendChild(drawer);

      overlay.addEventListener('click', () => this.close());
      drawer.querySelector('#closeNotifBtn').addEventListener('click', () => this.close());
      drawer.querySelector('#markReadBtn').addEventListener('click', async () => {
        try {
          await API.markNotificationsRead();
          await this.refresh();
          showAlert('Notifications marked as read', 'success');
        } catch (err) {
          showAlert(err.message, 'error');
        }
      });
    },
    async open() {
      this.ensureMarkup();
      document.getElementById('notifDrawer').classList.add('open');
      document.getElementById('notifOverlay').classList.add('open');
      await this.refresh();
    },
    close() {
      document.getElementById('notifDrawer')?.classList.remove('open');
      document.getElementById('notifOverlay')?.classList.remove('open');
    },
    async refresh() {
      if (!Auth.getToken()) return;
      try {
        const data = await API.getNotifications();
        const dot = document.getElementById('notifBadgeDot');
        if (dot) dot.style.display = data.unreadCount > 0 ? 'block' : 'none';

        const pill = document.getElementById('notifUnreadPill');
        if (pill) pill.textContent = `${data.unreadCount || 0} unread`;

        const list = document.getElementById('notifList');
        if (!list) return;
        const items = [...(data.notifications || []), ...(data.logs || []).slice(0, 6)];
        if (!items.length) {
          list.innerHTML = `<div style="color:var(--text-muted);font-size:0.84rem;padding:12px;">No notifications yet.</div>`;
          return;
        }
        list.innerHTML = items
          .map(
            (n) => `
          <div class="notif-item ${n.read === false ? 'unread' : ''}">
            <div class="notif-title">${escapeHtml(n.title || n.action || 'Event')}</div>
            <div class="notif-msg">${escapeHtml(n.message || n.details || '')}</div>
            <div class="notif-time">${escapeHtml(n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now')}</div>
          </div>`
          )
          .join('');
      } catch {
        // silent background check
      }
    },
  };

  /* ---------------- UNIVERSAL CMD+K COMMAND PALETTE ---------------- */
  const CommandPalette = {
    staticCommands: [
      { group: 'Navigate', label: 'Home & Global Overview', sub: '/', href: '/' },
      { group: 'Navigate', label: 'Executive Dashboard', sub: '/dashboard', href: '/dashboard' },
      { group: 'Navigate', label: 'Supplier Network Directory', sub: '/vendors', href: '/vendors' },
      { group: 'Navigate', label: 'RFQ Studio & AI Prompt', sub: '/rfqs', href: '/rfqs' },
      { group: 'Navigate', label: 'Vendor Quotations & AI Compare', sub: '/quotations', href: '/quotations' },
      { group: 'Navigate', label: 'Governance Approvals', sub: '/approvals', href: '/approvals' },
      { group: 'Navigate', label: 'Purchase Orders & QR Vault', sub: '/purchase-orders', href: '/purchase-orders' },
      { group: 'Navigate', label: 'Invoices & 3-Way Match', sub: '/invoices', href: '/invoices' },
      { group: 'Preferences', label: 'Open Appearance Studio', sub: 'Theme / Accent / Density', action: () => window.AppearanceEngine?.openDrawer() },
      { group: 'Preferences', label: 'Toggle Light / Obsidian Dark Theme', sub: 'Instant Switch', action: () => window.AppearanceEngine?.toggleTheme() },
      { group: 'Currency', label: 'Switch Display Currency to USD ($)', sub: 'FX', action: () => CurrencyEngine.setDisplayCurrency('USD') },
      { group: 'Currency', label: 'Switch Display Currency to EUR (€)', sub: 'FX', action: () => CurrencyEngine.setDisplayCurrency('EUR') },
      { group: 'Currency', label: 'Switch Display Currency to GBP (£)', sub: 'FX', action: () => CurrencyEngine.setDisplayCurrency('GBP') },
      { group: 'Currency', label: 'Switch Display Currency to INR (₹)', sub: 'FX', action: () => CurrencyEngine.setDisplayCurrency('INR') },
    ],
    ensureMarkup() {
      if (document.getElementById('cmdOverlay')) return;
      const overlay = document.createElement('div');
      overlay.id = 'cmdOverlay';
      overlay.className = 'cmd-overlay';
      overlay.innerHTML = `
        <div class="cmd-modal" role="dialog" aria-label="Command Palette">
          <div class="cmd-input-row">
            <span style="color:var(--text-muted);">⌘</span>
            <input type="text" id="cmdSearchInput" class="cmd-input" placeholder="Search pages, vendors, RFQs, POs, or switch currency..." autocomplete="off">
            <span class="kbd-chip">ESC</span>
          </div>
          <div class="cmd-results" id="cmdResultsList"></div>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.close();
      });
      overlay.querySelector('#cmdSearchInput').addEventListener('input', (e) => {
        this.renderList(e.target.value);
      });
    },
    open() {
      this.ensureMarkup();
      const overlay = document.getElementById('cmdOverlay');
      const input = document.getElementById('cmdSearchInput');
      overlay.classList.add('open');
      input.value = '';
      this.renderList('');
      setTimeout(() => input.focus(), 20);
    },
    close() {
      document.getElementById('cmdOverlay')?.classList.remove('open');
    },
    renderList(query) {
      const list = document.getElementById('cmdResultsList');
      if (!list) return;
      const q = (query || '').trim().toLowerCase();
      const matches = this.staticCommands.filter(
        (c) => !q || c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q)
      );
      if (!matches.length) {
        list.innerHTML = `<div style="padding:18px;text-align:center;color:var(--text-muted);font-size:0.84rem;">No matching commands found.</div>`;
        return;
      }
      list.innerHTML = matches
        .map(
          (c, i) => `
        <button type="button" class="cmd-item ${i === 0 ? 'selected' : ''}" data-cmd-idx="${i}">
          <span><strong style="font-weight:600;">${escapeHtml(c.label)}</strong> <span style="font-size:0.74rem;color:var(--text-muted);margin-left:6px;">${escapeHtml(c.group)}</span></span>
          <span class="cmd-item-sub">${escapeHtml(c.sub)}</span>
        </button>`
        )
        .join('');

      list.querySelectorAll('.cmd-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          const item = matches[Number(btn.getAttribute('data-cmd-idx'))];
          this.close();
          if (item.href) window.location.href = item.href;
          else if (item.action) item.action();
        });
      });
    },
  };

  function animateNumber(el, targetValue, formatter) {
    if (!el) return;
    const end = Number(targetValue) || 0;
    const duration = 520;
    const start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = end * eased;
      el.textContent = formatter ? formatter(current) : Math.round(current).toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = formatter ? formatter(end) : end.toLocaleString('en-US');
    }
    requestAnimationFrame(tick);
  }

  /* ---------------- SHARED CHROME INITIALIZER ---------------- */
  function initAppChrome() {
    Auth.renderUserPill();

    const curSelect = document.getElementById('currencySelector');
    if (curSelect) {
      curSelect.value = CurrencyEngine.getDisplayCurrency();
      curSelect.addEventListener('change', (e) => {
        CurrencyEngine.setDisplayCurrency(e.target.value);
        showAlert(`Display currency updated to ${e.target.value}`, 'info', 2200);
      });
      window.addEventListener('vb:currency-changed', (e) => {
        curSelect.value = e.detail;
      });
    }

    const cmdBtn = document.getElementById('cmdTriggerBtn');
    if (cmdBtn) cmdBtn.addEventListener('click', () => CommandPalette.open());

    const notifBtn = document.getElementById('notifBtn');
    if (notifBtn) notifBtn.addEventListener('click', () => NotificationEngine.open());

    const mobileToggle = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('mainNavLinks');
    if (mobileToggle && navLinks) {
      mobileToggle.addEventListener('click', () => navLinks.classList.toggle('mobile-open'));
    }

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        CommandPalette.open();
      } else if (e.key === 'Escape') {
        CommandPalette.close();
        NotificationEngine.close();
        window.AppearanceEngine?.closeDrawer();
      }
    });

    if (Auth.getToken()) {
      NotificationEngine.refresh();
    }
  }

  window.API = API;
  window.Auth = Auth;
  window.CurrencyEngine = CurrencyEngine;
  window.NotificationEngine = NotificationEngine;
  window.CommandPalette = CommandPalette;
  window.showAlert = showAlert;
  window.escapeHtml = escapeHtml;
  window.animateNumber = animateNumber;

  document.addEventListener('DOMContentLoaded', initAppChrome);
})();
