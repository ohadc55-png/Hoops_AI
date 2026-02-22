/**
 * HOOPS AI — Super Admin Billing
 */
let _invoiceId = null;  // for detail page
let _clubs = [];         // cached clubs for dropdown

document.addEventListener('DOMContentLoaded', () => {
  if (!requireSuperAdminAuth()) return;
  // Only run list page logic if we're on the billing list page
  if (document.getElementById('invoiceTable')) {
    loadBillingOverview();
    loadInvoices();
    loadClubs();
    initFilters();
  }
});


// ─── Overview Stats ────────────────────────────────────

async function loadBillingOverview() {
  try {
    const res = await SuperAdminAPI.get('/api/super/billing/overview');
    const d = res.data;
    document.getElementById('statMRR').textContent = formatILS(d.mrr);
    document.getElementById('statInvoiced').textContent = formatILS(d.total_invoiced);
    document.getElementById('statPaid').textContent = formatILS(d.total_paid);
    document.getElementById('statOverdue').textContent = formatILS(d.total_overdue);
    document.getElementById('collectionRate').textContent = d.collection_rate + '%';
  } catch (err) {
    // handled by API wrapper
  }
}


// ─── Clubs Dropdown ───────────────────────────────────

async function loadClubs() {
  try {
    const res = await SuperAdminAPI.get('/api/super/clubs');
    _clubs = res.data || [];
    _populateClubDropdown();
  } catch (err) {
    console.error('loadClubs error:', err);
  }
}

function _populateClubDropdown() {
  const sel = document.getElementById('newClubId');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select club...</option>' +
    _clubs.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
}

function _onClubSelected() {
  const clubId = parseInt(document.getElementById('newClubId').value);
  if (!clubId) return;
  const club = _clubs.find(c => c.id === clubId);
  if (!club) return;

  // Auto-fill first line item with club's monthly price
  const firstRow = document.querySelector('.line-item-row');
  if (!firstRow) return;
  const descInput = firstRow.querySelector('.li-desc');
  const priceInput = firstRow.querySelector('.li-price');

  if (descInput && (!descInput.value || descInput.value === 'HOOPS AI App')) {
    descInput.value = 'HOOPS AI App';
  }
  if (priceInput && (!priceInput.value || priceInput.value === '0')) {
    priceInput.value = club.monthly_price || 0;
  }
}


// ─── Invoice List ──────────────────────────────────────

async function loadInvoices() {
  const type = document.getElementById('typeFilter')?.value || '';
  const status = document.getElementById('statusFilter')?.value || '';
  const search = document.getElementById('searchInput')?.value || '';

  try {
    let url = '/api/super/billing/invoices?limit=200';
    if (type) url += `&invoice_type=${type}`;
    if (status) url += `&status=${status}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res = await SuperAdminAPI.get(url);
    renderInvoiceTable(res.data);
  } catch (err) {
    // handled
  }
}

function renderInvoiceTable(invoices) {
  const tbody = document.getElementById('invoiceBody');
  if (!invoices || !invoices.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><span class="material-symbols-outlined">receipt_long</span>No invoices yet</td></tr>';
    return;
  }

  tbody.innerHTML = invoices.map(inv => {
    const canPay = ['draft','sent','overdue'].includes(inv.status);
    return `
    <tr onclick="window.location.href='/super-admin/billing/${inv.id}'" style="cursor:pointer;">
      <td><strong>${esc(inv.invoice_number)}</strong></td>
      <td>${typeLabel(inv.invoice_type)}</td>
      <td>${esc(inv.billing_name)}</td>
      <td style="font-weight:600;">${formatILS(inv.total)}</td>
      <td>${statusBadge(inv.status)}</td>
      <td>${inv.issue_date || '—'}</td>
      <td>${inv.due_date || '—'}</td>
      <td style="display:flex;gap:4px;">
        <button class="btn btn-sm btn-icon" onclick="event.stopPropagation();downloadPDF(${inv.id})" title="Download PDF">
          <span class="material-symbols-outlined" style="font-size:18px;">picture_as_pdf</span>
        </button>
        ${canPay ? `<button class="btn btn-sm btn-icon" onclick="event.stopPropagation();openQuickPay(${inv.id},'${esc(inv.invoice_number)}','${esc(inv.billing_name)}',${inv.total})" title="Mark as Paid" style="color:#22c55e;">
          <span class="material-symbols-outlined" style="font-size:18px;">payments</span>
        </button>` : ''}
      </td>
    </tr>`;
  }).join('');
}

function initFilters() {
  let debounce;
  const search = document.getElementById('searchInput');
  if (search) {
    search.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(loadInvoices, 400);
    });
  }
  document.getElementById('typeFilter')?.addEventListener('change', loadInvoices);
  document.getElementById('statusFilter')?.addEventListener('change', loadInvoices);
}


// ─── Create Invoice ────────────────────────────────────

async function openCreateModal() {
  // Ensure clubs are loaded
  if (!_clubs.length) await loadClubs();
  _populateClubDropdown();

  document.getElementById('newClubId').value = '';
  document.getElementById('newType').value = 'tax_invoice';
  document.getElementById('newDueDate').value = '';
  document.getElementById('newVat').value = '18';
  document.getElementById('newNotes').value = '';
  // Reset line items to one row
  const container = document.getElementById('lineItemsContainer');
  container.innerHTML = `
    <div class="line-item-row" style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-2);align-items:center;">
      <input type="text" class="input li-desc" placeholder="Description" style="flex:3;">
      <input type="number" class="input li-qty" placeholder="Qty" value="1" min="1" style="flex:1;">
      <input type="number" class="input li-price" placeholder="Price (VAT incl.)" step="0.01" min="0" style="flex:1;">
    </div>
  `;
  // Wire club change to auto-fill line item
  const clubSel = document.getElementById('newClubId');
  clubSel.onchange = _onClubSelected;
  openModal('createModal');
}

function addLineItem() {
  const container = document.getElementById('lineItemsContainer');
  const row = document.createElement('div');
  row.className = 'line-item-row';
  row.style.cssText = 'display:flex;gap:var(--sp-2);margin-bottom:var(--sp-2);align-items:center;';
  row.innerHTML = `
    <input type="text" class="input li-desc" placeholder="Description" style="flex:3;">
    <input type="number" class="input li-qty" placeholder="Qty" value="1" min="1" style="flex:1;">
    <input type="number" class="input li-price" placeholder="Price" step="0.01" min="0" style="flex:1;">
    <button class="btn-icon" onclick="this.parentElement.remove()" style="flex:0 0 auto;">
      <span class="material-symbols-outlined" style="font-size:18px;color:var(--error);">close</span>
    </button>
  `;
  container.appendChild(row);
}

let _creatingInvoice = false;

async function submitCreateInvoice() {
  if (_creatingInvoice) return;
  _creatingInvoice = true;

  const submitBtn = document.querySelector('#createModal .btn-primary');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating...'; }

  const clubId = parseInt(document.getElementById('newClubId').value);
  if (!clubId) { SuperAdminToast.error('Please select a club'); _resetCreateBtn(); return; }

  const rows = document.querySelectorAll('.line-item-row');
  const lineItems = [];
  rows.forEach(row => {
    const desc = row.querySelector('.li-desc').value.trim();
    const qty = parseInt(row.querySelector('.li-qty').value) || 1;
    const price = parseFloat(row.querySelector('.li-price').value) || 0;
    if (desc && price > 0) {
      lineItems.push({ description: desc, quantity: qty, unit_price: price });
    }
  });

  if (!lineItems.length) { SuperAdminToast.error('Add at least one line item'); _resetCreateBtn(); return; }

  const body = {
    club_id: clubId,
    line_items: lineItems,
    invoice_type: document.getElementById('newType').value,
    vat_rate: parseFloat(document.getElementById('newVat').value) || 18,
  };

  const dueDate = document.getElementById('newDueDate').value;
  if (dueDate) body.due_date = dueDate;

  const notes = document.getElementById('newNotes').value.trim();
  if (notes) body.notes = notes;

  try {
    await SuperAdminAPI.post('/api/super/billing/invoices', body);
    closeModal('createModal');
    SuperAdminToast.success('Invoice created');
    loadInvoices();
    loadBillingOverview();
  } catch (err) {
    // handled
  } finally {
    _resetCreateBtn();
  }
}

function _resetCreateBtn() {
  _creatingInvoice = false;
  const submitBtn = document.querySelector('#createModal .btn-primary');
  if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Create Invoice'; }
}


// ─── Invoice Detail ────────────────────────────────────

async function loadInvoiceDetail(id) {
  _invoiceId = id;
  try {
    const res = await SuperAdminAPI.get(`/api/super/billing/invoices/${id}`);
    renderInvoiceDetail(res.data);
  } catch (err) {
    document.getElementById('invoiceHeader').innerHTML = '<div class="empty-state">Invoice not found</div>';
  }
}

function renderInvoiceDetail(inv) {
  // Header section
  const header = document.getElementById('invoiceHeader');
  header.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:var(--sp-3);">
      <div>
        <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-2);">
          <h2 style="margin:0;">#${esc(inv.invoice_number)}</h2>
          ${statusBadge(inv.status)}
          <span class="badge" style="background:var(--bg-card);color:var(--text-muted);">${typeLabel(inv.invoice_type)}</span>
        </div>
        <p style="color:var(--text-muted);margin:0;">${esc(inv.billing_name)} ${inv.billing_email ? '· ' + esc(inv.billing_email) : ''}</p>
      </div>
      <div style="text-align:right;">
        <div style="font-size:1.8rem;font-weight:700;color:var(--primary);">${formatILS(inv.total)}</div>
        <div class="text-sm text-muted">Issue: ${inv.issue_date || '—'} ${inv.due_date ? '· Due: ' + inv.due_date : ''}</div>
        ${inv.period_start ? `<div class="text-sm text-muted">Period: ${inv.period_start} — ${inv.period_end || ''}</div>` : ''}
        ${inv.paid_date ? `<div class="text-sm" style="color:var(--success);">Paid: ${inv.paid_date}</div>` : ''}
      </div>
    </div>
    ${inv.notes ? `<div style="margin-top:var(--sp-3);padding:var(--sp-2);background:var(--bg-card);border-radius:var(--radius);color:var(--text-muted);font-style:italic;">${esc(inv.notes)}</div>` : ''}
  `;

  // Line items
  if (inv.line_items && inv.line_items.length) {
    document.getElementById('lineItemsSection').style.display = '';
    const tbody = document.getElementById('lineItemsBody');
    tbody.innerHTML = inv.line_items.map(li => `
      <tr>
        <td>${esc(li.description)}</td>
        <td style="text-align:right;">${li.quantity}</td>
        <td style="text-align:right;">${formatILS(li.unit_price)}</td>
        <td style="text-align:right;font-weight:600;">${formatILS(li.total)}</td>
      </tr>
    `).join('');

    document.getElementById('lineItemsFoot').innerHTML = `
      <tr><td colspan="3" style="text-align:right;">Subtotal</td><td style="text-align:right;">${formatILS(inv.subtotal)}</td></tr>
      <tr><td colspan="3" style="text-align:right;">VAT (${inv.vat_rate}%)</td><td style="text-align:right;">${formatILS(inv.vat_amount)}</td></tr>
      <tr style="font-weight:700;font-size:1.1em;"><td colspan="3" style="text-align:right;">Total</td><td style="text-align:right;color:var(--primary);">${formatILS(inv.total)}</td></tr>
    `;
  }

  // Actions
  const actions = document.getElementById('actionsContent');
  const btns = [];

  btns.push(`<button class="btn btn-primary" onclick="downloadPDF(${inv.id})"><span class="material-symbols-outlined">picture_as_pdf</span> Download PDF</button>`);

  if (inv.status === 'draft') {
    btns.push(`<button class="btn" style="background:#3b82f6;color:#fff;" onclick="sendInvoice(${inv.id})"><span class="material-symbols-outlined">send</span> Send Invoice</button>`);
  }
  if (['sent', 'overdue', 'draft'].includes(inv.status)) {
    btns.push(`<button class="btn" style="background:#22c55e;color:#fff;" onclick="openPayModal()"><span class="material-symbols-outlined">payments</span> Mark as Paid</button>`);
  }
  if (inv.invoice_type === 'tax_invoice' && inv.status !== 'cancelled') {
    btns.push(`<button class="btn" style="background:var(--danger);color:#fff;" onclick="openModal('cancelModal')"><span class="material-symbols-outlined">cancel</span> Cancel Invoice</button>`);
  }

  if (btns.length) {
    document.getElementById('actionsSection').style.display = '';
    actions.innerHTML = btns.join('');
  }
}


// ─── Invoice Actions ───────────────────────────────────

async function sendInvoice(id) {
  try {
    await SuperAdminAPI.post(`/api/super/billing/invoices/${id}/send`, {});
    SuperAdminToast.success('Invoice sent');
    loadInvoiceDetail(id);
  } catch (err) { /* handled */ }
}

function openPayModal() {
  // Reset pay modal fields
  document.getElementById('payMethod').value = 'bank_transfer';
  document.getElementById('payReference').value = '';
  document.getElementById('payNotes').value = '';
  openModal('payModal');
}

async function confirmPay() {
  if (!_invoiceId) return;
  const method = document.getElementById('payMethod').value;
  const reference = document.getElementById('payReference').value.trim();
  const userNotes = document.getElementById('payNotes').value.trim();

  // Combine reference + notes into the notes field
  let notes = '';
  if (reference) notes += `Ref: ${reference}`;
  if (userNotes) notes += (notes ? ' | ' : '') + userNotes;

  try {
    await SuperAdminAPI.post(`/api/super/billing/invoices/${_invoiceId}/pay`, {
      payment_method: method,
      notes: notes || null,
    });
    closeModal('payModal');
    SuperAdminToast.success('Invoice marked as paid, receipt created');
    loadInvoiceDetail(_invoiceId);
  } catch (err) { /* handled */ }
}

async function confirmCancel() {
  if (!_invoiceId) return;
  const reason = document.getElementById('cancelReason').value.trim();
  try {
    await SuperAdminAPI.post(`/api/super/billing/invoices/${_invoiceId}/cancel`, {
      reason: reason || null,
    });
    closeModal('cancelModal');
    SuperAdminToast.success('Invoice cancelled, credit note created');
    loadInvoiceDetail(_invoiceId);
  } catch (err) { /* handled */ }
}


// ─── Quick Pay (from list) ──────────────────────────────

let _quickPayId = null;

function openQuickPay(id, number, club, total) {
  _quickPayId = id;
  document.getElementById('quickPayInfo').textContent =
    `Invoice #${number} · ${club} · ${formatILS(total)}`;
  document.getElementById('quickPayMethod').value = 'bank_transfer';
  document.getElementById('quickPayRef').value = '';
  document.getElementById('quickPayNotes').value = '';
  openModal('quickPayModal');
}

async function confirmQuickPay() {
  if (!_quickPayId) return;
  const method = document.getElementById('quickPayMethod').value;
  const ref = document.getElementById('quickPayRef').value.trim();
  const userNotes = document.getElementById('quickPayNotes').value.trim();

  let notes = '';
  if (ref) notes += `Ref: ${ref}`;
  if (userNotes) notes += (notes ? ' | ' : '') + userNotes;

  try {
    await SuperAdminAPI.post(`/api/super/billing/invoices/${_quickPayId}/pay`, {
      payment_method: method,
      notes: notes || null,
    });
    closeModal('quickPayModal');
    SuperAdminToast.success('Invoice marked as paid');
    _quickPayId = null;
    loadInvoices();
    loadBillingOverview();
  } catch (err) { /* handled */ }
}


// ─── PDF Download ──────────────────────────────────────

async function downloadPDF(id) {
  try {
    const token = SuperAdminAPI.token;
    const res = await fetch(`/api/super/billing/invoices/${id}/pdf`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    SuperAdminToast.error('Failed to download PDF');
  }
}


// ─── Helpers ───────────────────────────────────────────

function formatILS(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n);
}

function typeLabel(t) {
  const labels = {
    tax_invoice: 'Tax Invoice',
    receipt: 'Receipt',
    credit_note: 'Credit Note',
    proforma: 'Proforma',
    quote: 'Quote',
  };
  return labels[t] || t;
}

function statusBadge(s) {
  const colors = {
    draft: 'background:#6b7280;',
    sent: 'background:#3b82f6;',
    paid: 'background:#22c55e;',
    overdue: 'background:#ef4444;',
    cancelled: 'background:#9ca3af;',
  };
  return `<span class="badge" style="${colors[s] || ''}color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;text-transform:uppercase;">${s}</span>`;
}
