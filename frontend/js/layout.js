/**
 * VendorBridge Shared Layout Component (frontend/js/layout.js)
 * Unifies Topbar Navigation, Header Controls, and Notification Bell across authenticated pages.
 */
(function () {
  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
    { id: 'vendors', label: 'Vendors', href: '/vendors' },
    { id: 'rfqs', label: 'RFQs', href: '/rfqs' },
    { id: 'quotations', label: 'Quotations', href: '/quotations' },
    { id: 'approvals', label: 'Approvals', href: '/approvals' },
    { id: 'purchase-orders', label: 'Orders', href: '/purchase-orders' },
    { id: 'invoices', label: 'Invoices', href: '/invoices' }
  ];

  function getActiveNav(container) {
    if (container && container.dataset.nav) return container.dataset.nav;
    if (document.body && document.body.dataset.nav) return document.body.dataset.nav;
    const path = (window.location.pathname || '').toLowerCase();
    for (const item of NAV_ITEMS) {
      if (path === item.href || path === `${item.href}.html` || path.startsWith(`${item.href}/`)) {
        return item.id;
      }
    }
    if (path.includes('vendor')) return 'vendors';
    if (path.includes('rfq')) return 'rfqs';
    if (path.includes('quotation')) return 'quotations';
    if (path.includes('approval')) return 'approvals';
    if (path.includes('purchase-order') || path.includes('order')) return 'purchase-orders';
    if (path.includes('invoice')) return 'invoices';
    if (path.includes('dashboard')) return 'dashboard';
    return '';
  }

  function mountHeader() {
    const header = document.getElementById('appHeader') || document.querySelector('header.topbar');
    if (!header) return;

    // Preserve topbar class
    if (!header.classList.contains('topbar')) {
      header.classList.add('topbar');
    }

    const activeNav = getActiveNav(header);

    const navLinksHtml = NAV_ITEMS.map((item) => {
      const isActive = item.id === activeNav ? ' active' : '';
      return `<a href="${item.href}" class="nav-link${isActive}">${item.label}</a>`;
    }).join('\n        ');

    header.innerHTML = `
    <div class="topbar-inner">
      <a href="/" class="brand-mark">
        <span class="brand-icon">VB</span>
        <span>VendorBridge</span>
        <span class="brand-badge">GLOBAL</span>
      </a>

      <nav class="nav-links" id="mainNavLinks">
        ${navLinksHtml}
      </nav>

      <div class="topbar-actions">
        <button type="button" class="cmd-trigger" id="cmdTriggerBtn" title="Command Palette">
          <span>⌘</span><span class="cmd-label">Search</span><span class="kbd-chip">Ctrl+K</span>
        </button>
        <select id="currencySelector" class="currency-select" aria-label="Display Currency">
          <option value="USD">USD $</option><option value="EUR">EUR €</option><option value="GBP">GBP £</option>
          <option value="INR">INR ₹</option><option value="JPY">JPY ¥</option><option value="AED">AED</option><option value="SGD">SGD S$</option>
        </select>
        <button type="button" class="icon-btn" id="notifBtn" title="Activity &amp; Alerts" aria-label="Notifications">
          🔔<span class="notif-dot" id="notifBadgeDot" style="display:none;"></span>
        </button>
        <button type="button" class="icon-btn" id="appearanceBtn" title="Appearance Studio" aria-label="Appearance Studio">🎨</button>
        <div id="userPillContainer"></div>
        <button type="button" class="icon-btn mobile-nav-toggle" id="mobileMenuBtn" aria-label="Toggle Menu">☰</button>
      </div>
    </div>
    `;

    // Bind layout-specific interactions safely
    const mobileToggle = header.querySelector('#mobileMenuBtn');
    const navLinks = header.querySelector('#mainNavLinks');
    if (mobileToggle && navLinks) {
      mobileToggle.addEventListener('click', () => navLinks.classList.toggle('mobile-open'));
    }

    const curSelect = header.querySelector('#currencySelector');
    if (curSelect && window.CurrencyEngine) {
      curSelect.value = window.CurrencyEngine.getDisplayCurrency();
      curSelect.addEventListener('change', (e) => {
        window.CurrencyEngine.setDisplayCurrency(e.target.value);
        if (window.showAlert) {
          window.showAlert(`Display currency updated to ${e.target.value}`, 'info', 2200);
        }
      });
      window.addEventListener('vb:currency-changed', (e) => {
        curSelect.value = e.detail;
      });
    }

    const cmdBtn = header.querySelector('#cmdTriggerBtn');
    if (cmdBtn) {
      cmdBtn.addEventListener('click', () => window.CommandPalette?.open());
    }

    const notifBtn = header.querySelector('#notifBtn');
    if (notifBtn) {
      notifBtn.addEventListener('click', () => window.NotificationEngine?.open());
    }

    const appBtn = header.querySelector('#appearanceBtn');
    if (appBtn) {
      appBtn.addEventListener('click', () => window.AppearanceEngine?.openDrawer());
    }

    if (window.Auth?.renderUserPill) {
      window.Auth.renderUserPill();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountHeader);
  } else {
    mountHeader();
  }

  window.LayoutComponent = {
    mount: mountHeader,
    NAV_ITEMS
  };
})();
