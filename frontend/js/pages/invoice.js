/**
 * VendorBridge Global — Invoices Page Script
 * Extracted from frontend/invoice.html
 */

let allInvoices = [];
let allPOs = [];
let activeStatus = 'all';

async function loadInvoices() {
  try {
    const [invs, pos] = await Promise.all([API.getInvoices(), API.getPurchaseOrders()]);
    allInvoices = invs;
    allPOs = pos;
    populatePoSelect();
    updateGlobalStats();
    renderInvoices();
  } catch (err) {
    showAlert(err.message || 'Failed to load invoices', 'error');
  }
}

function populatePoSelect() {
  const sel = document.getElementById('invPoSelect');
  if (!sel) return;
  sel.innerHTML =
    `<option value="">Direct / Unlinked Invoice</option>` +
    allPOs
      .map(
        (p) =>
          `<option value="${Number(p.id)}">${escapeHtml(p.po_number)} — ${escapeHtml(p.vendor_name)} (${escapeHtml(
            CurrencyEngine.formatNative(p.total_amount, p.currency || 'USD')
          )})</option>`
      )
      .join('');
}

function updateGlobalStats() {
  const totalEl = document.getElementById('statTotalInv');
  const matchedEl = document.getElementById('statMatchedInv');
  const paidValEl = document.getElementById('statPaidValue');
  const pendValEl = document.getElementById('statPendingValue');

  if (totalEl) totalEl.textContent = allInvoices.length;
  if (matchedEl) matchedEl.textContent = allInvoices.filter((i) => i.three_way_match?.status === 'passed').length;
  if (paidValEl) {
    const paidUsd = allInvoices
      .filter((i) => i.status === 'paid')
      .reduce((a, i) => a + CurrencyEngine.convert(i.total_amount || 0, i.currency || 'USD', 'USD'), 0);
    paidValEl.textContent = CurrencyEngine.format(paidUsd, 'USD');
  }
  if (pendValEl) {
    const pendUsd = allInvoices
      .filter((i) => i.status !== 'paid')
      .reduce((a, i) => a + CurrencyEngine.convert(i.total_amount || 0, i.currency || 'USD', 'USD'), 0);
    pendValEl.textContent = CurrencyEngine.format(pendUsd, 'USD');
  }
}

function renderInvoices() {
  const searchInput = document.getElementById('invSearchInput');
  const q = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const filtered = allInvoices.filter((i) => {
    const statusOk = activeStatus === 'all' || i.status === activeStatus;
    const text = `${i.invoice_number} ${i.po_number} ${i.vendor_name} ${i.product}`.toLowerCase();
    return statusOk && (!q || text.includes(q));
  });

  const tbody = document.getElementById('invoicesTableBody');
  if (!tbody) return;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:28px;">No invoices match this filter.</td></tr>`;
    return;
  }

  const user = Auth.getUser() || {};
  const canSettle = ['admin', 'manager', 'procurement_officer'].includes(user.role);

  tbody.innerHTML = filtered
    .map((inv) => {
      const m = inv.three_way_match || { status: 'unlinked', message: 'Unlinked' };
      const mBadge = m.status === 'passed' ? 'badge-approved' : m.status === 'variance' ? 'badge-danger' : 'badge-neutral';
      const mText = m.status === 'passed' ? `✓ Passed (${m.variance_pct}%)` : m.status === 'variance' ? `⚠ Variance ${m.variance_pct}%` : 'Unlinked';
      return `
      <tr>
        <td class="mono" style="font-weight:700;">${escapeHtml(inv.invoice_number)}</td>
        <td>
          <div class="cell-primary">${escapeHtml(inv.vendor_name)}</div>
          <div class="cell-sub">${escapeHtml(inv.product)} · ${inv.po_number ? escapeHtml(inv.po_number) : 'Direct'}</div>
        </td>
        <td>
          <div class="mono" style="font-weight:700;">${escapeHtml(CurrencyEngine.format(inv.total_amount, inv.currency || 'USD'))}</div>
          <div class="cell-sub">${escapeHtml(inv.tax_label || 'Tax')}</div>
        </td>
        <td><span class="badge ${mBadge}">${escapeHtml(mText)}</span></td>
        <td><span class="badge badge-${escapeHtml(inv.status)}">${escapeHtml(inv.status)}</span></td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button type="button" class="btn btn-sm btn-secondary" onclick="openInvoiceDoc(${Number(inv.id)})">Audit &amp; Print</button>
            ${
              canSettle && inv.status !== 'paid'
                ? `<button type="button" class="btn btn-sm btn-success" onclick="markInvoicePaid(${Number(inv.id)})">Mark Paid</button>`
                : ''
            }
          </div>
        </td>
      </tr>`;
    })
    .join('');
}

window.markInvoicePaid = async function (id) {
  try {
    await API.updateInvoiceStatus(id, 'paid');
    showAlert('Invoice settled & marked Paid', 'success');
    loadInvoices();
  } catch (err) {
    showAlert(err.message, 'error');
  }
};

window.openInvoiceDoc = function (invId) {
  const inv = allInvoices.find((i) => Number(i.id) === Number(invId));
  if (!inv) return;
  const m = inv.three_way_match || {};
  const sigHash = window.QRCodeEngine
    ? window.QRCodeEngine.generateSignatureHash('INV', inv.invoice_number, inv.total_amount)
    : `SIG-${inv.id}`;
  const qrSvg = window.QRCodeEngine
    ? window.QRCodeEngine.generateSVG(`VB|${inv.invoice_number}|${inv.vendor_name}|${inv.total_amount}|${sigHash}`, 124)
    : '';

  const docTitle = document.getElementById('invDocTitle');
  const docBody = document.getElementById('invDocBody');
  const modal = document.getElementById('invDocModal');

  if (docTitle) docTitle.textContent = `Tax Invoice · ${inv.invoice_number}`;
  if (docBody) {
    docBody.innerHTML = `
      <div class="ai-banner" style="margin-bottom:14px;">
        <div style="font-weight:700;margin-bottom:4px;">3-Way Match Audit Report</div>
        <div style="font-size:0.86rem;color:var(--text-secondary);">${escapeHtml(m.message || 'Unlinked invoice')}</div>
      </div>
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:18px;padding:18px;border:1px solid var(--border);border-radius:12px;background:var(--bg-surface);">
        <div style="flex:1;min-width:240px;">
          <h2 style="font-size:1.45rem;margin-bottom:8px;">${escapeHtml(inv.invoice_number)}</h2>
          <div style="font-size:0.88rem;color:var(--text-secondary);line-height:1.7;">
            <div><strong>Supplier:</strong> ${escapeHtml(inv.vendor_name)}</div>
            <div><strong>PO Reference:</strong> ${escapeHtml(inv.po_number || 'Unlinked')}</div>
            <div><strong>Line Item:</strong> ${escapeHtml(inv.product)} (${Number(inv.quantity)} × ${escapeHtml(
              CurrencyEngine.formatNative(inv.unit_price, inv.currency || 'USD')
            )})</div>
            <div><strong>Subtotal:</strong> <span class="mono">${escapeHtml(CurrencyEngine.formatNative(inv.subtotal, inv.currency || 'USD'))}</span></div>
            <div><strong>${escapeHtml(inv.tax_label || 'Tax')}:</strong> <span class="mono">${escapeHtml(
              CurrencyEngine.formatNative(inv.tax, inv.currency || 'USD')
            )}</span></div>
            <div style="font-size:1.15rem;color:var(--text-main);margin-top:6px;"><strong>Grand Total:</strong> <span class="mono">${escapeHtml(
              CurrencyEngine.formatNative(inv.total_amount, inv.currency || 'USD')
            )}</span></div>
          </div>
          <div class="mono" style="font-size:0.72rem;color:var(--text-muted);margin-top:8px;">SHA-256 REF: ${escapeHtml(sigHash)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;background:#ffffff;border-radius:10px;border:1px solid var(--border);">
          ${qrSvg}
          <span class="mono" style="font-size:0.65rem;color:#0f172a;margin-top:6px;">VERIFIED INVOICE</span>
        </div>
      </div>
    `;
  }
  if (modal) modal.classList.add('open');
};

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;
  const user = Auth.getUser() || {};
  const newInvBtn = document.getElementById('openNewInvBtn');
  if (newInvBtn && !['admin', 'procurement_officer', 'vendor'].includes(user.role)) {
    newInvBtn.style.display = 'none';
  }

  document.querySelectorAll('#invFilters [data-status]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#invFilters [data-status]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeStatus = btn.getAttribute('data-status');
      renderInvoices();
    });
  });

  const searchInput = document.getElementById('invSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', renderInvoices);
  }

  window.addEventListener('vb:currency-changed', () => {
    updateGlobalStats();
    renderInvoices();
  });

  // Autofill vendor & amount when selecting a PO
  const poSelect = document.getElementById('invPoSelect');
  if (poSelect) {
    poSelect.addEventListener('change', (e) => {
      const po = allPOs.find((p) => String(p.id) === String(e.target.value));
      if (!po) return;
      const vendorEl = document.getElementById('invVendor');
      const productEl = document.getElementById('invProduct');
      const qtyEl = document.getElementById('invQty');
      const priceEl = document.getElementById('invUnitPrice');
      const curEl = document.getElementById('invCurrency');

      if (vendorEl) vendorEl.value = po.vendor_name || '';
      if (productEl) productEl.value = po.rfq_ref || `PO ${po.po_number} Fulfillment`;
      if (qtyEl) qtyEl.value = 1;
      if (priceEl) priceEl.value = po.total_amount || 0;
      if (curEl) curEl.value = po.currency || 'USD';
    });
  }

  const createModal = document.getElementById('createInvModal');
  const closeCreate = () => createModal && createModal.classList.remove('open');
  if (newInvBtn) {
    newInvBtn.addEventListener('click', () => {
      const curEl = document.getElementById('invCurrency');
      if (curEl) curEl.value = CurrencyEngine.getDisplayCurrency();
      if (user.role === 'vendor') {
        const vendorEl = document.getElementById('invVendor');
        if (vendorEl) vendorEl.value = user.name || '';
      }
      if (createModal) createModal.classList.add('open');
    });
  }

  const closeInvBtn = document.getElementById('closeInvModal');
  const cancelInvBtn = document.getElementById('cancelInvBtn');
  const closeDocModalBtn = document.getElementById('closeInvDocModal');
  const closeDocFooterBtn = document.getElementById('closeInvDocFooterBtn');
  const docModal = document.getElementById('invDocModal');

  if (closeInvBtn) closeInvBtn.addEventListener('click', closeCreate);
  if (cancelInvBtn) cancelInvBtn.addEventListener('click', closeCreate);
  if (closeDocModalBtn) closeDocModalBtn.addEventListener('click', () => docModal && docModal.classList.remove('open'));
  if (closeDocFooterBtn) closeDocFooterBtn.addEventListener('click', () => docModal && docModal.classList.remove('open'));

  const invForm = document.getElementById('createInvForm');
  if (invForm) {
    invForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const taxPreset = document.getElementById('invTaxPreset');
      const [rateStr, label] = taxPreset ? taxPreset.value.split('|') : ['0', 'Tax'];
      const poVal = document.getElementById('invPoSelect').value;
      try {
        const res = await API.createInvoice({
          purchase_order_id: poVal ? Number(poVal) : null,
          vendor_name: document.getElementById('invVendor').value.trim(),
          product: document.getElementById('invProduct').value.trim(),
          quantity: Number(document.getElementById('invQty').value),
          unit_price: Number(document.getElementById('invUnitPrice').value),
          tax_rate: Number(rateStr),
          tax_label: label,
          currency: document.getElementById('invCurrency').value,
        });
        showAlert(`Tax Invoice ${res.invoice?.invoice_number || ''} issued`, 'success');
        closeCreate();
        loadInvoices();
      } catch (err) {
        showAlert(err.message, 'error');
      }
    });
  }

  loadInvoices();
});
