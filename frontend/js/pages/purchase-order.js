/**
 * VendorBridge Global — Purchase Orders Page Script
 * Extracted from frontend/purchase-order.html
 */

let allPOs = [];
let activeStatus = 'all';

async function loadPOs() {
  try {
    allPOs = await API.getPurchaseOrders();
    updateGlobalStats();
    renderPOs();
  } catch (err) {
    showAlert(err.message || 'Failed to load Purchase Orders', 'error');
  }
}

function updateGlobalStats() {
  const totalEl = document.getElementById('statTotalPos');
  const activeEl = document.getElementById('statActivePos');
  const doneEl = document.getElementById('statDonePos');
  const valEl = document.getElementById('statPoValue');

  if (totalEl) totalEl.textContent = allPOs.length;
  if (activeEl) activeEl.textContent = allPOs.filter((p) => ['issued', 'approved'].includes(p.status)).length;
  if (doneEl) doneEl.textContent = allPOs.filter((p) => p.status === 'completed').length;
  if (valEl) {
    const sumUsd = allPOs.reduce((acc, p) => acc + CurrencyEngine.convert(p.total_amount || 0, p.currency || 'USD', 'USD'), 0);
    valEl.textContent = CurrencyEngine.format(sumUsd, 'USD');
  }
}

function renderPOs() {
  const searchInput = document.getElementById('poSearchInput');
  const q = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const filtered = allPOs.filter((p) => {
    const statusOk = activeStatus === 'all' || p.status === activeStatus;
    const text = `${p.po_number} ${p.vendor_name} ${p.rfq_ref}`.toLowerCase();
    return statusOk && (!q || text.includes(q));
  });

  const tbody = document.getElementById('posTableBody');
  if (!tbody) return;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:28px;">No Purchase Orders match this filter.</td></tr>`;
    return;
  }

  const user = Auth.getUser() || {};
  const canManage = ['admin', 'manager', 'procurement_officer'].includes(user.role);

  tbody.innerHTML = filtered
    .map((p) => {
      return `
      <tr>
        <td class="mono" style="font-weight:700;">${escapeHtml(p.po_number)}</td>
        <td>
          <div class="cell-primary">${escapeHtml(p.vendor_name)}</div>
          <div class="cell-sub">${escapeHtml(p.rfq_ref || 'Approved Bid')}</div>
        </td>
        <td class="mono">${escapeHtml(CurrencyEngine.format(p.total_amount, p.currency || 'USD'))}</td>
        <td class="mono">${escapeHtml(p.created_at ? String(p.created_at).slice(0, 10) : '—')}</td>
        <td><span class="badge badge-${escapeHtml(p.status)}">${escapeHtml(p.status)}</span></td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <button type="button" class="btn btn-sm btn-secondary" onclick="openPoDocument(${Number(p.id)})">QR &amp; Print</button>
            ${
              canManage && p.status !== 'completed'
                ? `<button type="button" class="btn btn-sm btn-success" onclick="markPoCompleted(${Number(p.id)})">Complete</button>`
                : ''
            }
          </div>
        </td>
      </tr>`;
    })
    .join('');
}

window.markPoCompleted = async function (id) {
  try {
    await API.updatePOStatus(id, 'completed');
    showAlert('Purchase Order marked completed', 'success');
    loadPOs();
  } catch (err) {
    showAlert(err.message, 'error');
  }
};

window.openPoDocument = function (poId) {
  const po = allPOs.find((p) => Number(p.id) === Number(poId));
  if (!po) return;
  const sigHash = window.QRCodeEngine
    ? window.QRCodeEngine.generateSignatureHash('PO', po.po_number, po.total_amount)
    : `SIG-${po.id}`;
  const qrSvg = window.QRCodeEngine
    ? window.QRCodeEngine.generateSVG(`VB|${po.po_number}|${po.vendor_name}|${po.total_amount}|${sigHash}`, 128)
    : '';

  const docTitle = document.getElementById('poDocTitle');
  const docBody = document.getElementById('poDocBody');
  const modal = document.getElementById('poDocModal');

  if (docTitle) docTitle.textContent = `Purchase Order · ${po.po_number}`;
  if (docBody) {
    docBody.innerHTML = `
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:18px;padding:18px;border:1px solid var(--border);border-radius:12px;background:var(--bg-surface);">
        <div style="flex:1;min-width:240px;">
          <div class="mono" style="font-size:0.74rem;color:var(--accent);font-weight:700;">VERIFIED PURCHASE ORDER</div>
          <h2 style="font-size:1.5rem;margin:4px 0;">${escapeHtml(po.po_number)}</h2>
          <div style="font-size:0.88rem;color:var(--text-secondary);margin-top:8px;">
            <div><strong>Supplier:</strong> ${escapeHtml(po.vendor_name)}</div>
            <div><strong>Contract / RFQ Ref:</strong> ${escapeHtml(po.rfq_ref || 'Standard PO')}</div>
            <div><strong>Issued Date:</strong> ${escapeHtml(po.created_at ? new Date(po.created_at).toLocaleDateString() : 'N/A')}</div>
            <div><strong>Status:</strong> ${escapeHtml(String(po.status || '').toUpperCase())}</div>
          </div>
          <div style="margin-top:16px;font-size:1.3rem;font-weight:800;" class="mono">
            Total: ${escapeHtml(CurrencyEngine.formatNative(po.total_amount, po.currency || 'USD'))}
          </div>
          <div class="mono" style="font-size:0.72rem;color:var(--text-muted);margin-top:6px;">CRYPTO SIGNATURE: ${escapeHtml(sigHash)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;background:#ffffff;border-radius:10px;border:1px solid var(--border);">
          ${qrSvg}
          <span class="mono" style="font-size:0.65rem;color:#0f172a;margin-top:6px;">AUDIT VERIFY</span>
        </div>
      </div>
    `;
  }
  if (modal) modal.classList.add('open');
};

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;
  const user = Auth.getUser() || {};
  const newPoBtn = document.getElementById('openNewPoBtn');
  if (newPoBtn && !['admin', 'manager', 'procurement_officer'].includes(user.role)) {
    newPoBtn.style.display = 'none';
  }

  document.querySelectorAll('#poStatusFilters [data-status]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#poStatusFilters [data-status]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeStatus = btn.getAttribute('data-status');
      renderPOs();
    });
  });

  const searchInput = document.getElementById('poSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', renderPOs);
  }

  window.addEventListener('vb:currency-changed', () => {
    updateGlobalStats();
    renderPOs();
  });

  const createModal = document.getElementById('createPoModal');
  const closeCreate = () => createModal && createModal.classList.remove('open');
  if (newPoBtn) {
    newPoBtn.addEventListener('click', () => {
      const curEl = document.getElementById('poCurrency');
      if (curEl) curEl.value = CurrencyEngine.getDisplayCurrency();
      if (createModal) createModal.classList.add('open');
    });
  }
  const closeCreateBtn = document.getElementById('closeCreatePoModal');
  const cancelCreateBtn = document.getElementById('cancelCreatePoBtn');
  const closeDocBtn = document.getElementById('closePoDocModal');
  const closeDocFooterBtn = document.getElementById('closePoDocFooterBtn');
  const docModal = document.getElementById('poDocModal');

  if (closeCreateBtn) closeCreateBtn.addEventListener('click', closeCreate);
  if (cancelCreateBtn) cancelCreateBtn.addEventListener('click', closeCreate);
  if (closeDocBtn) closeDocBtn.addEventListener('click', () => docModal && docModal.classList.remove('open'));
  if (closeDocFooterBtn) closeDocFooterBtn.addEventListener('click', () => docModal && docModal.classList.remove('open'));

  const poForm = document.getElementById('createPoForm');
  if (poForm) {
    poForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const res = await API.createPO({
          vendor_name: document.getElementById('poVendor').value.trim(),
          rfq_ref: document.getElementById('poRef').value.trim(),
          total_amount: Number(document.getElementById('poAmount').value),
          currency: document.getElementById('poCurrency').value,
          status: 'issued',
        });
        showAlert(`Purchase Order ${res.po?.po_number || ''} created`, 'success');
        closeCreate();
        loadPOs();
      } catch (err) {
        showAlert(err.message, 'error');
      }
    });
  }

  loadPOs();
});
