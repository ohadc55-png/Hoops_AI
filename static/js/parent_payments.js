/* HOOPS AI - Parent Payments JS */

document.addEventListener('DOMContentLoaded', loadBilling);

async function loadBilling() {
  const res = await ParentAPI.get('/api/billing/my');
  if (!res.success) {
    document.getElementById('billingContent').innerHTML =
      '<div class="empty-state">אין נתוני תשלומים</div>';
    return;
  }

  const data = res.data;
  const s = data.summary || {};

  // Summary cards
  document.getElementById('payTotal').textContent = formatNum(s.total_expected);
  document.getElementById('payPaid').textContent = formatNum(s.total_paid);
  document.getElementById('payPending').textContent = formatNum(s.total_pending);
  document.getElementById('payOverdue').textContent = formatNum(s.total_overdue);

  let html = '';

  // Payment Plans
  if (data.plans && data.plans.length) {
    data.plans.forEach(plan => {
      html += renderPlan(plan);
    });
  }

  // One-Time Charges
  if (data.one_time_charges && data.one_time_charges.length) {
    html += `
      <section class="payment-section" style="margin-top:var(--sp-5);">
        <h3 class="payment-section-title">
          <span class="material-symbols-outlined">receipt</span> חיובים נוספים
        </h3>
        <div class="installment-timeline">
          ${data.one_time_charges.map(c => renderOneTimeCharge(c)).join('')}
        </div>
      </section>
    `;
  }

  if (!html) {
    html = '<div class="empty-state">אין תוכניות תשלום פעילות</div>';
  }

  document.getElementById('billingContent').innerHTML = html;
}

function renderPlan(plan) {
  const balance = plan.total_amount - plan.paid_amount;
  const paidCount = plan.installments.filter(i => i.status === 'paid').length;
  const progressPct = plan.num_installments > 0 ? Math.round((paidCount / plan.num_installments) * 100) : 0;

  return `
    <section class="payment-section" style="margin-top:var(--sp-5);">
      <div class="payment-plan-header">
        <div>
          <h3 class="payment-section-title">
            <span class="material-symbols-outlined">payments</span>
            תוכנית תשלומים — ${escHtml(plan.season)}
          </h3>
          <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">
            ${plan.num_installments} תשלומים &nbsp;|&nbsp; יום ${plan.billing_day} לחודש &nbsp;|&nbsp; ${methodLabel(plan.payment_method)}
            ${plan.team_name ? ' &nbsp;|&nbsp; ' + escHtml(plan.team_name) : ''}
          </div>
        </div>
        <div style="text-align:left;">
          <div style="font-size:18px;font-weight:700;">${formatNum(plan.paid_amount)} <span style="font-size:13px;color:var(--text-muted);font-weight:400;">/ ${formatNum(plan.total_amount)}</span></div>
          ${balance > 0 ? `<div style="font-size:12px;color:var(--clr-warning);">נותר: ${formatNum(balance)}</div>` : `<div style="font-size:12px;color:var(--clr-success);">שולם במלואו ✓</div>`}
        </div>
      </div>

      <!-- Progress bar -->
      <div class="payment-progress-bar" style="margin:var(--sp-3) 0;">
        <div class="payment-progress-fill" style="width:${progressPct}%;"></div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:var(--sp-3);">${paidCount} מתוך ${plan.num_installments} תשלומים שולמו</div>

      <!-- Installments -->
      <div class="installment-timeline">
        ${plan.installments.map(inst => renderInstallment(inst)).join('')}
      </div>
    </section>
  `;
}

function renderInstallment(inst) {
  const icon = inst.status === 'paid' ? '✅' : inst.status === 'overdue' ? '⚠️' : '⏳';
  const dateLabel = inst.paid_date
    ? `<span style="color:var(--clr-success);">שולם ${formatDate(inst.paid_date)}</span>`
    : inst.due_date
      ? `<span style="color:${inst.status === 'overdue' ? 'var(--clr-error)' : 'var(--text-muted)'};">יגיע ב-${formatDate(inst.due_date)}</span>`
      : '';

  return `
    <div class="installment-row ${inst.status}">
      <span class="inst-icon">${icon}</span>
      <span class="inst-label">תשלום ${inst.number}</span>
      <span class="inst-amount">${formatNum(inst.amount)}</span>
      <span class="inst-date">${dateLabel}</span>
    </div>
  `;
}

function renderOneTimeCharge(c) {
  const icon = c.status === 'paid' ? '✅' : c.status === 'overdue' ? '⚠️' : '⏳';
  const dateLabel = c.paid_date
    ? `<span style="color:var(--clr-success);">שולם ${formatDate(c.paid_date)}</span>`
    : c.due_date
      ? `<span style="color:${c.status === 'overdue' ? 'var(--clr-error)' : 'var(--text-muted)'};">${formatDate(c.due_date)}</span>`
      : '';

  return `
    <div class="installment-row ${c.status}">
      <span class="inst-icon">${icon}</span>
      <span class="inst-label">${escHtml(c.title)}</span>
      <span class="inst-amount">${formatNum(c.amount)}</span>
      <span class="inst-date">${dateLabel}</span>
    </div>
  `;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatNum(n) {
  if (n == null || isNaN(n)) return '₪0';
  return '₪' + Number(n).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function methodLabel(m) {
  const map = { credit_card: 'אשראי', check: "צ'קים", cash: 'מזומן', bank_transfer: 'העברה', other: 'אחר' };
  return map[m] || m || '';
}

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
