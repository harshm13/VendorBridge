/**
 * VendorBridge RFQ Studio Page Script (frontend/js/pages/rfq.js)
 */
(function () {
  let allRfqs = [];
  let activeStatus = 'all';

  function addBomRow(item = { name: '', unit: 'Units', qty: 10, target_price: 250 }) {
    const wrap = document.getElementById('bomItemsContainer');
    if (!wrap) return;
    const row = document.createElement('div');
    row.className = 'bom-item-row';
    row.innerHTML = `
      <input type="text" class="bom-name" placeholder="Item description" value="${escapeHtml(item.name || '')}" required>
      <input type="text" class="bom-unit" placeholder="Unit" value="${escapeHtml(item.unit || 'Units')}" required>
      <input type="number" class="bom-qty" min="1" placeholder="Qty" value="${Number(item.qty) || 1}" required>
      <input type="number" class="bom-price" min="0" step="0.01" placeholder="Target Price" value="${Number(item.target_price) || 0}" required>
      <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">✕</button>
    `;
    wrap.appendChild(row);
  }

  function collectBomItems() {
    return Array.from(document.querySelectorAll('#bomItemsContainer .bom-item-row')).map((row) => ({
      name: row.querySelector('.bom-name').value.trim(),
      unit: row.querySelector('.bom-unit').value.trim() || 'Units',
      qty: Math.max(1, Number(row.querySelector('.bom-qty').value) || 1),
      target_price: Math.max(0, Number(row.querySelector('.bom-price').value) || 0),
    }));
  }

  async function loadRfqs() {
    try {
      allRfqs = await API.getRfqs();
      updateGlobalStats();
      renderRfqs();
    } catch (err) {
      showAlert(err.message || 'Failed to load RFQs', 'error');
    }
  }

  function updateGlobalStats() {
    document.getElementById('statTotalRfqs').textContent = allRfqs.length;
    document.getElementById('statOpenRfqs').textContent = allRfqs.filter((r) => r.status === 'open').length;
    document.getElementById('statClosedRfqs').textContent = allRfqs.filter((r) => r.status === 'closed').length;
    const units = allRfqs.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
    document.getElementById('statTotalUnits').textContent = units.toLocaleString('en-US');
  }

  function computeRfqTargetValue(rfq) {
    if (Array.isArray(rfq.items) && rfq.items.length) {
      return rfq.items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.target_price) || 0), 0);
    }
    return (Number(rfq.quantity) || 1) * 500;
  }

  function renderRfqs() {
    const q = (document.getElementById('rfqSearchInput')?.value || '').trim().toLowerCase();
    const filtered = allRfqs.filter((r) => {
      const statusOk = activeStatus === 'all' || r.status === activeStatus;
      const text = `${r.title} ${r.category} ${r.description} ${r.created_by_name}`.toLowerCase();
      return statusOk && (!q || text.includes(q));
    });

    const tbody = document.getElementById('rfqsTableBody');
    if (!tbody) return;
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:28px;">No RFQs match the selected filter.</td></tr>`;
      return;
    }

    const user = Auth.getUser() || {};
    const canManage = ['admin', 'procurement_officer'].includes(user.role);

    tbody.innerHTML = filtered
      .map((r) => {
        const targetVal = computeRfqTargetValue(r);
        const itemCount = Array.isArray(r.items) ? r.items.length : 1;
        const nextStatus = r.status === 'open' ? 'closed' : 'open';
        const nextLabel = r.status === 'open' ? 'Close' : 'Reopen';
        return `
        <tr>
          <td>
            <div class="cell-primary">RFQ-${Number(r.id)} · ${escapeHtml(r.title)}</div>
            <div class="cell-sub">${escapeHtml(r.category || 'General')} · By ${escapeHtml(r.created_by_name || 'Buyer')}</div>
          </td>
          <td class="mono">${itemCount} line(s) · ${Number(r.quantity || 0).toLocaleString('en-US')} units</td>
          <td class="mono">${escapeHtml(CurrencyEngine.format(targetVal, r.currency || 'USD'))}</td>
          <td class="mono">${escapeHtml(r.deadline ? String(r.deadline).slice(0, 10) : '—')}</td>
          <td><span class="badge badge-${escapeHtml(r.status)}">${escapeHtml(r.status)}</span></td>
          <td>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button type="button" class="btn btn-sm btn-secondary" onclick="openRfqDetail(${Number(r.id)})">Inspect BoM</button>
              <a href="/quotations?rfqId=${Number(r.id)}" class="btn btn-sm btn-outline">Quotes</a>
              ${canManage ? `<button type="button" class="btn btn-sm btn-outline" onclick="toggleRfqStatus(${Number(r.id)}, '${nextStatus}')">${nextLabel}</button>` : ''}
            </div>
          </td>
        </tr>`;
      })
      .join('');
  }

  window.openRfqDetail = function (rfqId) {
    const r = allRfqs.find((item) => Number(item.id) === Number(rfqId));
    if (!r) return;
    document.getElementById('rfqDetailTitle').textContent = `RFQ-${r.id} · ${r.title}`;
    const items = Array.isArray(r.items) ? r.items : [];
    document.getElementById('rfqDetailBody').innerHTML = `
      <p style="margin-bottom:14px;">${escapeHtml(r.description)}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
        <span class="badge badge-accent">${escapeHtml(r.category || 'General')}</span>
        <span class="badge badge-neutral">Currency: ${escapeHtml(r.currency || 'USD')}</span>
        <span class="badge badge-${escapeHtml(r.status)}">${escapeHtml(r.status)}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Line Item</th><th>Unit</th><th>Quantity</th><th>Target Unit Price</th><th>Line Total</th></tr></thead>
          <tbody>
            ${items
              .map(
                (it) => `
              <tr>
                <td class="cell-primary">${escapeHtml(it.name)}</td>
                <td>${escapeHtml(it.unit)}</td>
                <td class="mono">${Number(it.qty)}</td>
                <td class="mono">${escapeHtml(CurrencyEngine.format(it.target_price, r.currency || 'USD'))}</td>
                <td class="mono">${escapeHtml(CurrencyEngine.format((Number(it.qty) || 0) * (Number(it.target_price) || 0), r.currency || 'USD'))}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
    document.getElementById('rfqDetailModal').classList.add('open');
  };

  window.toggleRfqStatus = async function (rfqId, status) {
    try {
      await API.updateRfqStatus(rfqId, status);
      showAlert(`RFQ-${rfqId} marked as ${status}`, 'success');
      loadRfqs();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.requireAuth()) return;
    const user = Auth.getUser() || {};
    if (!['admin', 'procurement_officer'].includes(user.role)) {
      const openBtn = document.getElementById('openNewRfqBtn');
      if (openBtn) openBtn.style.display = 'none';
    }

    document.querySelectorAll('#rfqStatusFilters [data-status]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#rfqStatusFilters [data-status]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeStatus = btn.getAttribute('data-status');
        renderRfqs();
      });
    });

    const searchInput = document.getElementById('rfqSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', renderRfqs);
    }
    window.addEventListener('vb:currency-changed', renderRfqs);

    const modal = document.getElementById('createRfqModal');
    const closeModal = () => modal.classList.remove('open');
    const openBtn = document.getElementById('openNewRfqBtn');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        document.getElementById('rfqForm').reset();
        document.getElementById('bomItemsContainer').innerHTML = '';
        document.getElementById('aiBudgetNotice').style.display = 'none';
        document.getElementById('rfqCurrency').value = CurrencyEngine.getDisplayCurrency();
        const defDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
        document.getElementById('rfqDeadline').value = defDate;
        addBomRow();
        modal.classList.add('open');
      });
    }

    const closeBtn = document.getElementById('closeRfqModal');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    const cancelBtn = document.getElementById('cancelRfqModal');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    const closeDetailBtn = document.getElementById('closeRfqDetailModal');
    if (closeDetailBtn) {
      closeDetailBtn.addEventListener('click', () => {
        document.getElementById('rfqDetailModal').classList.remove('open');
      });
    }

    const addRowBtn = document.getElementById('addBomRowBtn');
    if (addRowBtn) addRowBtn.addEventListener('click', () => addBomRow());

    const parseBtn = document.getElementById('runAiParseBtn');
    if (parseBtn) {
      parseBtn.addEventListener('click', async () => {
        const prompt = document.getElementById('aiPromptInput').value.trim();
        if (!prompt) return showAlert('Enter a sourcing prompt first', 'error');
        parseBtn.disabled = true;
        parseBtn.textContent = 'Parsing...';
        try {
          const cur = document.getElementById('rfqCurrency').value || 'USD';
          const res = await API.parseRfqPrompt({ prompt, currency: cur });
          const p = res.parsed || {};
          if (p.title) document.getElementById('rfqTitle').value = p.title;
          if (p.category) document.getElementById('rfqCategory').value = p.category;
          if (p.deadline) document.getElementById('rfqDeadline').value = String(p.deadline).slice(0, 10);
          if (p.description) document.getElementById('rfqDesc').value = p.description;
          const wrap = document.getElementById('bomItemsContainer');
          wrap.innerHTML = '';
          (p.items || []).forEach((it) => addBomRow(it));
          showAlert(`BoM generated via ${p.source || 'AI'}`, 'success');
        } catch (err) {
          showAlert(err.message, 'error');
        } finally {
          parseBtn.disabled = false;
          parseBtn.textContent = '✦ Auto-Fill with AI';
        }
      });
    }

    const estBtn = document.getElementById('estimateBudgetBtn');
    if (estBtn) {
      estBtn.addEventListener('click', async () => {
        const items = collectBomItems();
        const totalQty = items.reduce((acc, i) => acc + i.qty, 0) || 1;
        const cur = document.getElementById('rfqCurrency').value || 'USD';
        try {
          const res = await API.estimateBudget({
            title: document.getElementById('rfqTitle').value || 'Hardware Procurement',
            quantity: totalQty,
            description: document.getElementById('rfqDesc').value || 'Enterprise grade equipment',
            currency: cur,
          });
          const notice = document.getElementById('aiBudgetNotice');
          notice.style.display = 'block';
          notice.textContent = `✦ Market Benchmark (${res.estimation?.source || 'AI'}): ${res.estimation?.summary || 'Estimated budget ready'}`;
          showAlert('AI budget estimation computed', 'info');
        } catch (err) {
          showAlert(err.message, 'error');
        }
      });
    }

    const rfqForm = document.getElementById('rfqForm');
    if (rfqForm) {
      rfqForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const items = collectBomItems();
        if (!items.length) return showAlert('Add at least one BoM line item', 'error');
        const totalQty = items.reduce((acc, it) => acc + it.qty, 0);
        try {
          await API.createRFQ({
            title: document.getElementById('rfqTitle').value.trim(),
            category: document.getElementById('rfqCategory').value,
            currency: document.getElementById('rfqCurrency').value,
            deadline: document.getElementById('rfqDeadline').value,
            description: document.getElementById('rfqDesc').value.trim(),
            quantity: totalQty,
            items,
          });
          showAlert('RFQ tender published globally', 'success');
          closeModal();
          loadRfqs();
        } catch (err) {
          showAlert(err.message, 'error');
        }
      });
    }

    loadRfqs();
  });

  window.RfqPage = {
    loadRfqs,
    renderRfqs,
    addBomRow,
    collectBomItems
  };
})();
