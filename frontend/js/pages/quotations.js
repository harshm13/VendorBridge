/**
 * VendorBridge Quotations & AI Comparison Page Script (frontend/js/pages/quotations.js)
 */
(function () {
  let allRfqs = [];
  let allQuotes = [];
  let lastAnalysis = null;

  async function loadData() {
    try {
      const [rfqs, quotes] = await Promise.all([API.getRfqs(), API.getQuotations()]);
      allRfqs = rfqs;
      allQuotes = quotes;
      populateRfqSelectors();
      renderQuotes();
    } catch (err) {
      showAlert(err.message || 'Failed to load quotations', 'error');
    }
  }

  function populateRfqSelectors() {
    const aiSel = document.getElementById('aiRfqSelector');
    if (aiSel) {
      aiSel.innerHTML = allRfqs.length
        ? allRfqs.map((r) => `<option value="${Number(r.id)}">RFQ-${Number(r.id)}: ${escapeHtml(r.title)}</option>`).join('')
        : `<option value="">No RFQs found</option>`;

      const params = new URLSearchParams(window.location.search);
      const urlRfqId = params.get('rfqId');
      if (urlRfqId && allRfqs.some((r) => String(r.id) === String(urlRfqId))) {
        aiSel.value = urlRfqId;
        runAiAnalysis(urlRfqId);
      }
    }

    const openRfqs = allRfqs.filter((r) => r.status === 'open');
    const submitSel = document.getElementById('qRfqSelect');
    if (submitSel) {
      submitSel.innerHTML = openRfqs.length
        ? openRfqs.map((r) => `<option value="${Number(r.id)}">RFQ-${Number(r.id)}: ${escapeHtml(r.title)}</option>`).join('')
        : `<option value="">No open RFQs accepting bids</option>`;
    }
  }

  async function runAiAnalysis(rfqId) {
    if (!rfqId) return;
    try {
      const res = await API.analyzeRfq(rfqId, CurrencyEngine.getDisplayCurrency());
      lastAnalysis = res.analysis;
      renderAiAnalysis(lastAnalysis);
    } catch (err) {
      showAlert(err.message, 'error');
    }
  }

  function renderAiAnalysis(analysis) {
    const box = document.getElementById('aiAnalysisResult');
    if (!box) return;
    if (!analysis) return;
    box.style.display = 'block';
    const quotes = analysis.quotes || [];
    box.innerHTML = `
      <div class="card" style="margin-top:8px;">
        <div style="font-weight:700;margin-bottom:6px;">${escapeHtml(analysis.rfq_title || 'Evaluation Summary')}</div>
        <p style="font-size:0.86rem;margin-bottom:12px;">${escapeHtml(analysis.recommendation || '')}</p>
        <div class="grid-3">
          ${quotes
            .map(
              (q) => `
            <div class="card" style="padding:14px;border-color:${q.isRecommended ? 'var(--success)' : 'var(--border)'};">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <strong>${escapeHtml(q.vendor_name)}</strong>
                ${q.isRecommended ? `<span class="badge badge-approved">★ Top Pick</span>` : `<span class="badge badge-neutral">Score ${Number(q.score)}</span>`}
              </div>
              <div class="mono" style="font-size:1.1rem;font-weight:700;margin-bottom:6px;">${escapeHtml(CurrencyEngine.format(q.amount, q.currency || 'USD'))}</div>
              <div style="font-size:0.76rem;color:var(--text-secondary);">
                Price Score: <strong class="mono">${Number(q.priceScore || 0)}</strong> · Delivery Score: <strong class="mono">${Number(q.deliveryScore || 0)}</strong> (${Number(q.delivery_days)}d)
              </div>
            </div>`
            )
            .join('')}
        </div>
      </div>`;
  }

  function renderQuotes() {
    const tbody = document.getElementById('quotesTableBody');
    if (!tbody) return;
    if (!allQuotes.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:28px;">No supplier quotations submitted yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = allQuotes
      .map(
        (q) => `
      <tr>
        <td><div class="cell-primary">RFQ-${Number(q.rfq_id)} · ${escapeHtml(q.rfq_title || 'Tender')}</div></td>
        <td>${escapeHtml(q.vendor_name)}</td>
        <td class="mono">${escapeHtml(CurrencyEngine.format(q.amount, q.currency || 'USD'))} <span style="color:var(--text-muted);font-size:0.72rem;">(${escapeHtml(q.currency || 'USD')})</span></td>
        <td class="mono">${Number(q.delivery_days)} days</td>
        <td><span class="badge badge-${escapeHtml(q.status)}">${escapeHtml(q.status)}</span></td>
        <td style="max-width:260px;color:var(--text-secondary);font-size:0.82rem;">${escapeHtml(q.notes || '—')}</td>
      </tr>`
      )
      .join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.requireAuth()) return;
    const user = Auth.getUser() || {};
    if (!['admin', 'vendor'].includes(user.role)) {
      const openBtn = document.getElementById('openNewQuoteBtn');
      if (openBtn) openBtn.style.display = 'none';
    }

    const modal = document.getElementById('quoteModal');
    const closeModal = () => modal?.classList.remove('open');
    const openBtn = document.getElementById('openNewQuoteBtn');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        const nameField = document.getElementById('qVendorName');
        if (nameField) nameField.value = user.role === 'vendor' ? user.name : '';
        const curField = document.getElementById('qCurrency');
        if (curField) curField.value = CurrencyEngine.getDisplayCurrency();
        modal?.classList.add('open');
      });
    }

    const closeBtn = document.getElementById('closeQuoteModal');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    const cancelBtn = document.getElementById('cancelQuoteModal');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    const rankBtn = document.getElementById('runAiRankBtn');
    if (rankBtn) {
      rankBtn.addEventListener('click', () => {
        const sel = document.getElementById('aiRfqSelector');
        if (sel) runAiAnalysis(sel.value);
      });
    }

    window.addEventListener('vb:currency-changed', () => {
      renderQuotes();
      if (lastAnalysis) renderAiAnalysis(lastAnalysis);
    });

    const quoteForm = document.getElementById('quoteForm');
    if (quoteForm) {
      quoteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rfqId = Number(document.getElementById('qRfqSelect')?.value);
        if (!rfqId) return showAlert('No open RFQ selected', 'error');
        try {
          await API.createQuotation({
            rfq_id: rfqId,
            vendor_name: document.getElementById('qVendorName').value.trim(),
            currency: document.getElementById('qCurrency').value,
            amount: Number(document.getElementById('qAmount').value),
            delivery_days: Number(document.getElementById('qDeliveryDays').value),
            notes: document.getElementById('qNotes').value.trim(),
          });
          showAlert('Quotation submitted and routed to governance approval', 'success');
          closeModal();
          loadData();
        } catch (err) {
          showAlert(err.message, 'error');
        }
      });
    }

    loadData();
  });

  window.QuotationsPage = {
    loadData,
    renderQuotes,
    runAiAnalysis
  };
})();
