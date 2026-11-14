/**
 * VendorBridge Dashboard Page Script (frontend/js/pages/dashboard.js)
 */
(function () {
  let currentPeriod = '6m';
  let lastDashboardData = null;

  async function loadDashboard(period = currentPeriod) {
    currentPeriod = period;
    try {
      const data = await API.getDashboard(period);
      lastDashboardData = data;
      renderDashboard(data);
    } catch (err) {
      showAlert(err.message || 'Failed to load dashboard telemetry', 'error');
    }
  }

  function renderDashboard(data) {
    if (!data) return;
    const s = data.stats || {};
    const a = data.analytics || {};

    animateNumber(document.getElementById('kpiTotalSpend'), s.totalSpend || 0, (v) => CurrencyEngine.format(v, 'USD'));
    animateNumber(document.getElementById('kpiSavings'), s.estimatedSavings || 0, (v) => CurrencyEngine.format(v, 'USD'));
    animateNumber(document.getElementById('kpiActiveRfqs'), s.activeRfqs || 0);
    animateNumber(document.getElementById('kpiVendors'), s.totalVendors || 0);

    document.getElementById('kpiPoCount').textContent = `${s.totalPos || 0} POs`;
    document.getElementById('kpiPendingApprovals').textContent = `${s.pendingApprovals || 0} pending`;
    document.getElementById('kpiCompliance').textContent = `${a.complianceRate || 98}%`;
    document.getElementById('kpiOnTime').textContent = `${a.onTimeDelivery || 96}%`;
    document.getElementById('avgApprovalBadge').textContent = `Avg Approval: ${a.avgApprovalHours || 3.2}h`;

    const labels = { '6m': 'Trailing 6 Months', quarter: 'Current Quarter', ytd: 'Year-to-Date' };
    document.getElementById('chartPeriodCaption').textContent = `Period: ${labels[currentPeriod] || currentPeriod}`;

    // Monthly Chart
    const monthly = a.monthlySpend || [];
    const maxM = Math.max(1, ...monthly.map((m) => Number(m.amount) || 0));
    document.getElementById('monthlyChart').innerHTML = monthly.length
      ? monthly
          .map((m) => {
            const pct = Math.max(10, Math.round(((Number(m.amount) || 0) / maxM) * 145));
            return `
            <div class="month-col" title="${escapeHtml(m.month)}: ${escapeHtml(CurrencyEngine.format(m.amount, 'USD'))}">
              <span class="mono" style="font-size:0.68rem;color:var(--text-secondary);">${escapeHtml(CurrencyEngine.format(m.amount, 'USD'))}</span>
              <div class="month-bar" style="height:${pct}px;"></div>
              <span class="month-label">${escapeHtml(m.month)}</span>
            </div>`;
          })
          .join('')
      : `<div style="color:var(--text-muted);font-size:0.86rem;">No monthly spend points recorded yet.</div>`;

    // Category Spend
    const cats = a.categorySpend || [];
    const maxCat = Math.max(1, ...cats.map((c) => Number(c.amount) || 0));
    document.getElementById('categoryBars').innerHTML = cats.length
      ? cats
          .map((c) => {
            const w = Math.max(6, Math.round(((Number(c.amount) || 0) / maxCat) * 100));
            return `
            <div class="bar-row">
              <div class="bar-meta">
                <span style="font-weight:600;color:var(--text-main);">${escapeHtml(c.category)}</span>
                <span class="mono">${escapeHtml(CurrencyEngine.format(c.amount, 'USD'))}</span>
              </div>
              <div class="bar-track"><div class="bar-fill" style="width:${w}%;"></div></div>
            </div>`;
          })
          .join('')
      : `<div style="color:var(--text-muted);font-size:0.86rem;">No category breakdown available.</div>`;

    // Top Vendors
    const topVendors = a.topVendors || [];
    document.getElementById('topVendorsBody').innerHTML = topVendors.length
      ? topVendors
          .map(
            (v) => `
        <tr>
          <td class="cell-primary">${escapeHtml(v.name)}</td>
          <td class="mono">${escapeHtml(CurrencyEngine.format(v.spend, 'USD'))}</td>
          <td><span class="badge badge-accent">${escapeHtml(v.orders)} orders</span></td>
        </tr>`
          )
          .join('')
      : `<tr><td colspan="3" style="color:var(--text-muted);text-align:center;">No vendor spend recorded yet.</td></tr>`;

    // Activity Logs
    const logs = data.activityLogs || [];
    document.getElementById('activityStreamList').innerHTML = logs.length
      ? logs
          .slice(0, 6)
          .map(
            (log) => `
        <div class="notif-item">
          <div class="notif-title">${escapeHtml(log.action || 'Workflow Event')}</div>
          <div class="notif-msg">${escapeHtml(log.details || '')}</div>
          <div class="notif-time">${escapeHtml(log.created_at ? new Date(log.created_at).toLocaleString() : '')}</div>
        </div>`
          )
          .join('')
      : `<div style="color:var(--text-muted);font-size:0.86rem;">No recent audit events.</div>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.requireAuth()) return;

    document.querySelectorAll('#periodSwitcher [data-period]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#periodSwitcher [data-period]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        loadDashboard(btn.getAttribute('data-period'));
      });
    });

    window.addEventListener('vb:currency-changed', () => {
      if (lastDashboardData) renderDashboard(lastDashboardData);
    });

    // Profile Modal
    const modal = document.getElementById('profileModal');
    const closeModal = () => modal.classList.remove('open');
    const openBtn = document.getElementById('openProfileBtn');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        const u = Auth.getUser() || {};
        document.getElementById('profileNameInput').value = u.name || '';
        document.getElementById('profileEmailInput').value = u.email || '';
        modal.classList.add('open');
      });
    }

    const closeBtn = document.getElementById('closeProfileModal');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    const cancelBtn = document.getElementById('cancelProfileBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const res = await API.updateProfile({ name: document.getElementById('profileNameInput').value.trim() });
          if (res.user) Auth.setUser(res.user);
          Auth.renderUserPill();
          closeModal();
          showAlert('Profile updated permanently', 'success');
        } catch (err) {
          showAlert(err.message, 'error');
        }
      });
    }

    loadDashboard('6m');
  });

  window.DashboardPage = {
    loadDashboard,
    renderDashboard
  };
})();
