/**
 * VendorBridge Global — Approvals Page Script
 * Extracted from frontend/approval.html
 */

let allApprovals = [];
let activeStatus = 'all';

async function loadApprovals() {
  try {
    allApprovals = await API.getApprovals();
    updateGlobalStats();
    renderApprovals();
  } catch (err) {
    showAlert(err.message || 'Failed to load approvals', 'error');
  }
}

function updateGlobalStats() {
  const total = document.getElementById('statTotalApp');
  const pending = document.getElementById('statPendingApp');
  const approved = document.getElementById('statApprovedApp');
  const rejected = document.getElementById('statRejectedApp');
  if (total) total.textContent = allApprovals.length;
  if (pending) pending.textContent = allApprovals.filter((a) => a.status === 'pending').length;
  if (approved) approved.textContent = allApprovals.filter((a) => a.status === 'approved').length;
  if (rejected) rejected.textContent = allApprovals.filter((a) => a.status === 'rejected').length;
}

function renderApprovals() {
  const searchInput = document.getElementById('approvalSearchInput');
  const q = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const filtered = allApprovals.filter((a) => {
    const statusOk = activeStatus === 'all' || a.status === activeStatus;
    const text = `${a.rfq_title} ${a.vendor_name} ${a.remarks}`.toLowerCase();
    return statusOk && (!q || text.includes(q));
  });

  const tbody = document.getElementById('approvalsTableBody');
  if (!tbody) return;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:28px;">No approvals match this filter.</td></tr>`;
    return;
  }

  const user = Auth.getUser() || {};
  const canDecide = ['admin', 'manager'].includes(user.role);

  tbody.innerHTML = filtered
    .map((a) => {
      const isPending = a.status === 'pending';
      return `
      <tr>
        <td class="mono">APP-${String(a.id).padStart(4, '0')}</td>
        <td>
          <div class="cell-primary">${escapeHtml(a.rfq_title || `Quote #${a.quotation_id}`)}</div>
          <div class="cell-sub">${escapeHtml(a.vendor_name || 'Vendor')}</div>
        </td>
        <td class="mono">${escapeHtml(CurrencyEngine.format(a.amount || 0, a.currency || 'USD'))}</td>
        <td><span class="badge badge-${escapeHtml(a.status)}">${escapeHtml(a.status)}</span></td>
        <td style="max-width:240px;font-size:0.82rem;color:var(--text-secondary);">${escapeHtml(a.remarks || '—')}</td>
        <td>
          ${
            isPending && canDecide
              ? `<div style="display:flex;gap:6px;">
                  <button type="button" class="btn btn-sm btn-success" onclick="openDecision(${Number(a.id)}, 'approved')">Approve &amp; Mint PO</button>
                  <button type="button" class="btn btn-sm btn-danger" onclick="openDecision(${Number(a.id)}, 'rejected')">Reject</button>
                 </div>`
              : `<span style="font-size:0.78rem;color:var(--text-muted);">${isPending ? 'Manager/Admin role required' : 'Finalized'}</span>`
          }
        </td>
      </tr>`;
    })
    .join('');
}

window.openDecision = function (id, status) {
  const app = allApprovals.find((a) => Number(a.id) === Number(id));
  if (!app) return;
  const appIdEl = document.getElementById('decisionAppId');
  const targetEl = document.getElementById('decisionTargetStatus');
  const titleEl = document.getElementById('decisionTitle');
  const promptEl = document.getElementById('decisionPromptText');
  const remarksEl = document.getElementById('decisionRemarks');
  const confirmBtn = document.getElementById('confirmDecisionBtn');
  const modal = document.getElementById('decisionModal');

  if (appIdEl) appIdEl.value = id;
  if (targetEl) targetEl.value = status;
  if (titleEl) titleEl.textContent = status === 'approved' ? 'Approve Bid & Auto-Generate PO' : 'Reject Quotation';
  if (promptEl) promptEl.textContent = `${app.vendor_name} — ${app.rfq_title} (${CurrencyEngine.format(app.amount || 0, app.currency || 'USD')})`;
  if (remarksEl) remarksEl.value = status === 'approved' ? 'Approved under Q4 compliance budget.' : 'Pricing exceeds target SLA threshold.';
  if (confirmBtn) {
    confirmBtn.className = status === 'approved' ? 'btn btn-success' : 'btn btn-danger';
    confirmBtn.textContent = status === 'approved' ? 'Approve & Issue PO' : 'Confirm Rejection';
  }
  if (modal) modal.classList.add('open');
};

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;

  document.querySelectorAll('#approvalFilters [data-status]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#approvalFilters [data-status]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeStatus = btn.getAttribute('data-status');
      renderApprovals();
    });
  });

  const searchInput = document.getElementById('approvalSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', renderApprovals);
  }

  window.addEventListener('vb:currency-changed', renderApprovals);

  const modal = document.getElementById('decisionModal');
  const closeModal = () => modal && modal.classList.remove('open');
  const closeBtn = document.getElementById('closeDecisionModal');
  const cancelBtn = document.getElementById('cancelDecisionBtn');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  const form = document.getElementById('decisionForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('decisionAppId').value;
      const status = document.getElementById('decisionTargetStatus').value;
      const remarks = document.getElementById('decisionRemarks').value.trim();
      try {
        const res = await API.updateApproval(id, { status, remarks });
        closeModal();
        if (status === 'approved' && res.po) {
          showAlert(`Approved! Purchase Order ${res.po.po_number} minted automatically.`, 'success', 5000);
        } else {
          showAlert(`Approval #${id} marked as ${status}.`, 'info');
        }
        loadApprovals();
      } catch (err) {
        showAlert(err.message, 'error');
      }
    });
  }

  loadApprovals();
});
