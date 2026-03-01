/* HOOPS AI - Parent Payments JS */

document.addEventListener('DOMContentLoaded', () => {
  loadBilling();

  // Card number formatting (auto-spaces every 4 digits)
  const cardInput = document.getElementById('payCardNumber');
  if (cardInput) {
    cardInput.addEventListener('input', () => {
      let v = cardInput.value.replace(/\D/g, '').substring(0, 16);
      cardInput.value = v.replace(/(.{4})/g, '$1 ').trim();
    });
  }

  // Expiry formatting (auto-slash MM/YY)
  const expiryInput = document.getElementById('payExpiry');
  if (expiryInput) {
    expiryInput.addEventListener('input', () => {
      let v = expiryInput.value.replace(/\D/g, '').substring(0, 4);
      if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2);
      expiryInput.value = v;
    });
  }
});

async function loadBilling() {
  const res = await ParentAPI.get('/api/billing/my');
  if (!res.success) {
    document.getElementById('billingContent').innerHTML =
      `<div class="empty-state">${t('parent.payments.no_data')}</div>`;
    return;
  }

  const data = res.data;
  const s = data.summary || {};

  // Summary cards
  document.getElementById('payTotal').textContent = formatNum(s.total_expected);
  document.getElementById('payPaid').textContent = formatNum(s.total_paid);
  document.getElementById('payPending').textContent = formatNum(s.total_pending);
  document.getElementById('payOverdue').textContent = formatNum(s.total_overdue);

  // Build rows: one per plan + one per charge
  let rows = [];

  if (data.plans && data.plans.length) {
    data.plans.forEach(plan => {
      const balance = plan.total_amount - plan.paid_amount;
      const allPaid = balance <= 0;
      const hasOverdue = (plan.installments || []).some(i => i.status === 'overdue');

      // Determine plan-level status
      let status = 'pending';
      if (allPaid) status = 'paid';
      else if (hasOverdue) status = 'overdue';

      // Date: earliest unpaid due_date, or latest paid_date
      let dateStr = '';
      if (allPaid) {
        const paidDates = (plan.installments || [])
          .filter(i => i.paid_date)
          .map(i => i.paid_date);
        if (paidDates.length) dateStr = paidDates.sort().pop();
      } else {
        const unpaidDates = (plan.installments || [])
          .filter(i => i.status !== 'paid' && i.due_date)
          .map(i => i.due_date);
        if (unpaidDates.length) dateStr = unpaidDates.sort()[0];
      }

      // Notes from first paid installment (for CC split info)
      const paidWithNotes = (plan.installments || []).find(i => i.status === 'paid' && i.notes);

      rows.push({
        type: 'plan',
        id: plan.plan_id,
        description: plan.season || plan.description || t('parent.payments.plan_label'),
        totalAmount: plan.total_amount,
        paidAmount: plan.paid_amount,
        balance: balance,
        status: status,
        date: dateStr,
        notes: paidWithNotes ? paidWithNotes.notes : null,
        teamName: plan.team_name,
      });
    });
  }

  if (data.one_time_charges && data.one_time_charges.length) {
    data.one_time_charges.forEach(c => {
      rows.push({
        type: 'charge',
        id: c.id,
        description: c.title,
        totalAmount: c.amount,
        paidAmount: c.status === 'paid' ? c.amount : 0,
        balance: c.status === 'paid' ? 0 : c.amount,
        status: c.status,
        date: c.paid_date || c.due_date,
        notes: c.notes,
      });
    });
  }

  if (!rows.length) {
    document.getElementById('billingContent').innerHTML =
      `<div class="empty-state">${t('parent.payments.no_active_plans')}</div>`;
    return;
  }

  // Sort: overdue first, then pending, then paid
  const statusOrder = { overdue: 0, pending: 1, paid: 2, cancelled: 3 };
  rows.sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));

  let html = `<div class="payments-list">`;
  html += rows.map(r => renderPaymentRow(r)).join('');
  html += `</div>`;

  document.getElementById('billingContent').innerHTML = html;
}

function renderPaymentRow(r) {
  // Status badge
  let statusBadge;
  if (r.status === 'paid') {
    statusBadge = `<span class="pay-status-badge paid">${t('payment.paid')}</span>`;
  } else if (r.status === 'overdue') {
    statusBadge = `<span class="pay-status-badge overdue">${t('payment.overdue')}</span>`;
  } else {
    statusBadge = `<span class="pay-status-badge pending">${t('payment.pending')}</span>`;
  }

  // Date
  const dateStr = r.date ? formatDate(r.date) : '';

  // CC installments (parsed from notes, e.g. "(3 תשלומים)")
  let splitLabel = '';
  if (r.status === 'paid' && r.notes) {
    const match = r.notes.match(/\((\d+) תשלומים\)/);
    if (match && parseInt(match[1]) > 1) {
      splitLabel = `<span class="pay-split-label">${match[1]} ${t('parent.payments.cc_payments')}</span>`;
    }
  }

  // Amount display
  let amountHtml;
  if (r.status === 'paid') {
    amountHtml = `<span class="payment-amount">${formatNum(r.totalAmount)}</span>`;
  } else if (r.paidAmount > 0) {
    amountHtml = `<span class="payment-amount">${formatNum(r.balance)}</span>
      <span class="payment-amount-detail">${t('parent.payments.out_of', { total: formatNum(r.totalAmount) })}</span>`;
  } else {
    amountHtml = `<span class="payment-amount">${formatNum(r.totalAmount)}</span>`;
  }

  // Action
  let action = '';
  if (r.status === 'paid') {
    action = `<a class="pay-receipt-link" href="/parent/receipt/${r.type}/${r.id}" target="_blank"><span class="material-symbols-outlined" style="font-size:16px;">receipt_long</span> ${t('parent.payments.download_receipt')}</a>`;
  } else if (r.status !== 'cancelled') {
    const payAmount = r.balance > 0 ? r.balance : r.totalAmount;
    const desc = escAttr(r.description);
    action = `<button class="pay-btn" onclick="openPaymentModal('${r.type}', ${r.id}, ${payAmount}, '${desc}')">${t('parent.payments.pay_btn')}</button>`;
  }

  return `
    <div class="payment-row ${r.status}">
      <div class="payment-row-right">
        <span class="payment-desc">${escHtml(r.description)}</span>
        <div class="payment-meta">
          ${dateStr ? `<span class="payment-date">${dateStr}</span>` : ''}
          ${r.teamName ? `<span class="payment-team">${escHtml(r.teamName)}</span>` : ''}
          ${splitLabel}
        </div>
      </div>
      <div class="payment-row-left">
        <div class="payment-amounts">${amountHtml}</div>
        ${statusBadge}
        <span class="payment-action">${action}</span>
      </div>
    </div>
  `;
}


// ── Payment Modal ─────────────────────────────────────────────────────────

function openPaymentModal(type, id, amount, description) {
  document.getElementById('payType').value = type;
  document.getElementById('payItemId').value = id;
  document.getElementById('payAmount').value = amount;

  // Summary card
  document.getElementById('paySummaryCard').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span>${description}</span>
      <strong style="font-size:18px;">${formatNum(amount)}</strong>
    </div>
  `;

  // Update submit button label
  document.getElementById('paySubmitLabel').textContent =
    t('parent.payments.pay_amount', { amount: formatNum(amount) });

  // Reset form
  document.getElementById('payCardholderName').value = '';
  document.getElementById('payIdNumber').value = '';
  document.getElementById('payCardNumber').value = '';
  document.getElementById('payExpiry').value = '';
  document.getElementById('payCvv').value = '';
  document.getElementById('payNumPayments').value = '1';

  openModal('paymentModal');
}

async function submitPayment() {
  const cardholderName = document.getElementById('payCardholderName').value.trim();
  const idNumber = document.getElementById('payIdNumber').value.trim();
  const cardNumber = document.getElementById('payCardNumber').value.replace(/\s/g, '');
  const expiry = document.getElementById('payExpiry').value.trim();
  const cvv = document.getElementById('payCvv').value.trim();
  const numPayments = parseInt(document.getElementById('payNumPayments').value);

  if (!cardholderName || !idNumber || !cardNumber || !expiry || !cvv) {
    ParentToast.error(t('parent.payments.fill_all_fields'));
    return;
  }

  if (cardNumber.length < 13) {
    ParentToast.error(t('parent.payments.fill_all_fields'));
    return;
  }

  const type = document.getElementById('payType').value;
  const itemId = document.getElementById('payItemId').value;

  const btn = document.getElementById('paySubmitBtn');
  btn.disabled = true;
  const origLabel = document.getElementById('paySubmitLabel').textContent;
  document.getElementById('paySubmitLabel').textContent = t('parent.payments.processing');

  try {
    const url = type === 'plan'
      ? `/api/billing/my/plans/${itemId}/pay`
      : `/api/billing/my/charges/${itemId}/pay`;

    await ParentAPI.put(url, {
      cardholder_name: cardholderName,
      id_number: idNumber,
      card_number: cardNumber,
      expiry: expiry,
      cvv: cvv,
      num_payments: numPayments,
    });

    closeModal('paymentModal');
    openModal('receiptModal');
    loadBilling();
  } catch (err) {
    ParentToast.error(t('parent.payments.payment_failed'));
  } finally {
    btn.disabled = false;
    document.getElementById('paySubmitLabel').textContent = origLabel;
  }
}


// ── Helpers ───────────────────────────────────────────────────────────────

/* formatNum → shared-utils.js */
/* formatDate → shared-utils.js */
/* escHtml → shared-utils.js */

function escAttr(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
