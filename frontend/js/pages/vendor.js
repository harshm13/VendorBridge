/**
 * VendorBridge Vendors Directory Page Script (frontend/js/pages/vendor.js)
 */
(function () {
  let allVendors = [];
  let activeTier = 'all';

  async function loadVendors() {
    try {
      allVendors = await API.getVendors();
      updateGlobalStats();
      renderVendors();
    } catch (err) {
      showAlert(err.message || 'Failed to load suppliers', 'error');
    }
  }

  function updateGlobalStats() {
    document.getElementById('statTotalVendors').textContent = allVendors.length;
    document.getElementById('statStrategicVendors').textContent = allVendors.filter((v) => v.tier === 'Strategic').length;
    document.getElementById('statActiveVendors').textContent = allVendors.filter((v) => (v.status || 'active') === 'active').length;
    const avg = allVendors.length
      ? Math.round(allVendors.reduce((acc, v) => acc + Number(v.scorecard?.on_time_rate || 95), 0) / allVendors.length)
      : 0;
    document.getElementById('statAvgSla').textContent = `${avg}%`;
  }

  function renderVendors() {
    const q = (document.getElementById('vendorSearchInput')?.value || '').trim().toLowerCase();
    const filtered = allVendors.filter((v) => {
      const tierOk = activeTier === 'all' || (v.tier || 'Standard') === activeTier;
      const text = `${v.company_name} ${v.contact_person} ${v.country} ${v.gst_number} ${v.email}`.toLowerCase();
      return tierOk && (!q || text.includes(q));
    });

    const tbody = document.getElementById('vendorsTableBody');
    if (!tbody) return;
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:28px;">No suppliers match the current filter.</td></tr>`;
      return;
    }

    const user = Auth.getUser() || {};
    const canEdit = ['admin', 'procurement_officer'].includes(user.role);

    tbody.innerHTML = filtered
      .map((v) => {
        const sc = v.scorecard || {};
        const tier = v.tier || sc.tier || 'Standard';
        const tierCls = tier === 'Strategic' ? 'badge-strategic' : tier === 'Preferred' ? 'badge-preferred' : 'badge-neutral';
        return `
        <tr>
          <td>
            <div class="cell-primary">${escapeHtml(v.company_name)}</div>
            <div class="cell-sub">${escapeHtml(v.contact_person)} · ${escapeHtml(v.email)}</div>
          </td>
          <td><span class="mono">${escapeHtml(v.country || 'US')} · ${escapeHtml(v.currency || 'USD')}</span></td>
          <td class="mono">${escapeHtml(v.gst_number || '—')}</td>
          <td><span class="badge ${tierCls}">${escapeHtml(tier)}</span></td>
          <td class="mono">★ ${escapeHtml(sc.rating || '4.8')} (${escapeHtml(sc.on_time_rate || 96)}% SLA)</td>
          <td><span class="badge badge-active">${escapeHtml(v.status || 'active')}</span></td>
          <td>
            <div style="display:flex;gap:6px;">
              <button type="button" class="btn btn-sm btn-secondary" onclick="openScorecardModal(${Number(v.id)})">Scorecard</button>
              ${canEdit ? `<button type="button" class="btn btn-sm btn-outline" onclick="openEditVendorModal(${Number(v.id)})">Edit</button>` : ''}
            </div>
          </td>
        </tr>`;
      })
      .join('');
  }

  window.openScorecardModal = function (vendorId) {
    const v = allVendors.find((item) => Number(item.id) === Number(vendorId));
    if (!v) return;
    const sc = v.scorecard || {};
    document.getElementById('scorecardTitle').textContent = `${v.company_name} — SLA Scorecard`;
    document.getElementById('scorecardBody').innerHTML = `
      <div class="grid-2" style="margin-bottom:16px;">
        <div class="card"><div class="stat-label">On-Time Delivery</div><div class="stat-value mono">${escapeHtml(sc.on_time_rate || 96)}%</div></div>
        <div class="card"><div class="stat-label">Quality Index</div><div class="stat-value mono">${escapeHtml(sc.quality_score || 97)} / 100</div></div>
        <div class="card"><div class="stat-label">Response SLA</div><div class="stat-value mono">${escapeHtml(sc.response_time || '3.2 hrs')}</div></div>
        <div class="card"><div class="stat-label">KYC &amp; Audit</div><div class="stat-value" style="font-size:1.1rem;color:var(--success);">${escapeHtml(sc.kyc_status || 'Verified')}</div></div>
      </div>
      <div style="font-size:0.86rem;color:var(--text-secondary);">
        <div><strong>Address:</strong> ${escapeHtml(v.address || 'N/A')}</div>
        <div style="margin-top:6px;"><strong>Certifications:</strong> ${escapeHtml((sc.certifications || ['ISO-9001', 'SOC2']).join(', '))}</div>
      </div>
    `;
    document.getElementById('scorecardModal').classList.add('open');
  };

  window.openEditVendorModal = function (vendorId) {
    const v = allVendors.find((item) => Number(item.id) === Number(vendorId));
    if (!v) return;
    document.getElementById('vendorModalTitle').textContent = `Edit Supplier — ${v.company_name}`;
    document.getElementById('editVendorId').value = v.id;
    document.getElementById('vCompany').value = v.company_name || '';
    document.getElementById('vContact').value = v.contact_person || '';
    document.getElementById('vEmail').value = v.email || '';
    document.getElementById('vPhone').value = v.phone || '';
    document.getElementById('vCountry').value = v.country || 'US';
    document.getElementById('vCurrency').value = v.currency || 'USD';
    document.getElementById('vTier').value = v.tier || 'Standard';
    document.getElementById('vGst').value = v.gst_number || '';
    document.getElementById('vAddress').value = v.address || '';
    document.getElementById('vendorFormModal').classList.add('open');
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.requireAuth()) return;
    const user = Auth.getUser() || {};
    if (!['admin', 'procurement_officer'].includes(user.role)) {
      const onboardBtn = document.getElementById('openNewVendorBtn');
      if (onboardBtn) onboardBtn.style.display = 'none';
    }

    document.querySelectorAll('#tierFilters [data-tier]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#tierFilters [data-tier]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeTier = btn.getAttribute('data-tier');
        renderVendors();
      });
    });

    const searchInput = document.getElementById('vendorSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', renderVendors);
    }

    const formModal = document.getElementById('vendorFormModal');
    const closeForm = () => formModal.classList.remove('open');
    const openBtn = document.getElementById('openNewVendorBtn');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        document.getElementById('vendorModalTitle').textContent = 'Onboard Global Supplier';
        document.getElementById('editVendorId').value = '';
        document.getElementById('vendorForm').reset();
        formModal.classList.add('open');
      });
    }

    const closeFormBtn = document.getElementById('closeVendorFormModal');
    if (closeFormBtn) closeFormBtn.addEventListener('click', closeForm);

    const cancelFormBtn = document.getElementById('cancelVendorFormBtn');
    if (cancelFormBtn) cancelFormBtn.addEventListener('click', closeForm);

    const closeScBtn = document.getElementById('closeScorecardModal');
    if (closeScBtn) {
      closeScBtn.addEventListener('click', () => {
        document.getElementById('scorecardModal').classList.remove('open');
      });
    }

    const vendorForm = document.getElementById('vendorForm');
    if (vendorForm) {
      vendorForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('editVendorId').value;
        const payload = {
          company: document.getElementById('vCompany').value.trim(),
          name: document.getElementById('vContact').value.trim(),
          email: document.getElementById('vEmail').value.trim(),
          phone: document.getElementById('vPhone').value.trim(),
          country: document.getElementById('vCountry').value.trim().toUpperCase() || 'US',
          currency: document.getElementById('vCurrency').value,
          tier: document.getElementById('vTier').value,
          gst_number: document.getElementById('vGst').value.trim(),
          address: document.getElementById('vAddress').value.trim(),
        };
        try {
          if (editId) {
            await API.updateVendor(editId, payload);
            showAlert('Supplier updated successfully', 'success');
          } else {
            await API.createVendor(payload);
            showAlert('Global supplier onboarded', 'success');
          }
          closeForm();
          loadVendors();
        } catch (err) {
          showAlert(err.message, 'error');
        }
      });
    }

    loadVendors();
  });

  window.VendorsPage = {
    loadVendors,
    renderVendors
  };
})();
