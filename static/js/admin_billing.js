/* HOOPS AI - Admin Billing JS */

let allTeams = [];
let teamBillingData = []; // cached for current team
let currentPlanId = null; // for detail modal

// ── Init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadOverview();
  loadTeams();
  loadNewPayments();
  // Default start month to current month
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  document.getElementById('planStartMonth').value = `${now.getFullYear()}-${mm}`;
  document.getElementById('markPaidDate').value = new Date().toISOString().slice(0, 10);
});

// ── Overview ──────────────────────────────────────────────────────────────

async function loadOverview(teamId = null) {
  const url = teamId ? `/api/billing/overview?team_id=${teamId}` : '/api/billing/overview';
  const res = await AdminAPI.get(url);
  if (!res.success) return;
  const d = res.data;
  document.getElementById('billingTotal').textContent = formatNum(d.total_expected);
  document.getElementById('billingPaid').textContent = formatNum(d.total_paid);
  document.getElementById('billingPending').textContent = formatNum(d.total_pending);
  document.getElementById('billingOverdue').textContent = formatNum(d.total_overdue);
}

// ── Teams ──────────────────────────────────────────────────────────────────

async function loadTeams() {
  const res = await AdminAPI.get('/api/teams');
  if (!res.success) return;
  allTeams = res.data || [];

  const opts = allTeams.map(tm => `<option value="${tm.id}">${tm.name}</option>`).join('');
  const emptyOpt = `<option value="">${t('admin.billing.select_team')}</option>`;
  const allOpt  = `<option value="all">${t('admin.billing.all_teams')}</option>`;

  ['teamBillingSelect', 'planTeamId', 'chargeTeamId'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = emptyOpt + allOpt + opts;
  });
}

// ── Team Billing Detail ────────────────────────────────────────────────────

async function loadTeamBilling() {
  const teamId = document.getElementById('teamBillingSelect').value;
  const season = document.getElementById('seasonFilter').value.trim();

  if (!teamId) {
    document.getElementById('teamBillingContent').innerHTML = `<div class="empty-state-admin">${t('admin.billing.empty.select_team')}</div>`;
    document.getElementById('reminderRow').style.display = 'none';
    return;
  }

  if (teamId === 'all') {
    await loadAllTeamsBilling(season);
    return;
  }

  const url = `/api/billing/team/${teamId}` + (season ? `?season=${encodeURIComponent(season)}` : '');
  const res = await AdminAPI.get(url);
  if (!res.success) {
    AdminToast.error(t('admin.billing.load_failed'));
    return;
  }
  teamBillingData = res.data || [];
  renderTeamBilling();
  loadOverview(parseInt(teamId));
}

async function loadAllTeamsBilling(season) {
  document.getElementById('reminderRow').style.display = 'none';
  document.getElementById('teamBillingContent').innerHTML = `<div class="empty-state-admin">${t('admin.billing.empty.loading')}</div>`;

  const results = await Promise.all(
    allTeams.map(tm => {
      const url = `/api/billing/team/${tm.id}` + (season ? `?season=${encodeURIComponent(season)}` : '');
      return AdminAPI.get(url).then(res => ({
        team: tm,
        rows: res.success ? (res.data || []) : [],
      }));
    })
  );

  // flatten into teamBillingData so openPlayerDetail still works
  teamBillingData = results.flatMap(r => r.rows);
  loadOverview(); // no team_id = all teams

  const teamsWithData = results.filter(r => r.rows.length > 0);
  if (!teamsWithData.length) {
    document.getElementById('teamBillingContent').innerHTML = `<div class="empty-state-admin">${t('admin.billing.empty.no_billing_data')}</div>`;
    return;
  }

  const unpaidOnly = document.getElementById('unpaidOnly').checked;

  const html = teamsWithData.map(({ team, rows }) => {
    const displayRows = unpaidOnly ? rows.filter(r => r.status !== 'paid') : rows;
    if (!displayRows.length) return '';

    const totals = rows.reduce((acc, r) => {
      acc.paid   += r.paid_amount  || 0;
      acc.balance += r.balance     || 0;
      return acc;
    }, { paid: 0, balance: 0 });

    return `
      <div style="margin-bottom:var(--sp-6);">
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:var(--sp-2) var(--sp-3);background:var(--surface-2);
                    border-radius:var(--r-sm);margin-bottom:var(--sp-2);">
          <strong style="font-size:15px;">${escHtml(team.name)}</strong>
          <span style="font-size:13px;color:var(--text-muted);">
            ${t('admin.billing.paid_label')} <strong style="color:var(--clr-success);">${formatNum(totals.paid)}</strong>
            &nbsp;|&nbsp; ${t('admin.billing.balance_label')} <strong style="color:var(--clr-error);">${formatNum(totals.balance)}</strong>
          </span>
        </div>
        <div style="overflow-x:auto;">
        <table class="billing-table">
          <thead><tr>
            <th>${t('admin.billing.th.player')}</th><th>${t('admin.billing.th.plan')}</th><th>${t('admin.billing.th.paid')}</th>
            <th>${t('admin.billing.th.balance')}</th><th>${t('admin.billing.th.one_time')}</th><th>${t('admin.billing.th.status')}</th><th>${t('admin.billing.th.actions')}</th>
          </tr></thead>
          <tbody>${displayRows.map(r => renderPlayerRow(r)).join('')}</tbody>
        </table>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('teamBillingContent').innerHTML = html || `<div class="empty-state-admin">${t('admin.billing.empty.no_unpaid')}</div>`;
}

function renderTeamBilling() {
  const unpaidOnly = document.getElementById('unpaidOnly').checked;
  let rows = teamBillingData;
  if (unpaidOnly) rows = rows.filter(r => r.status !== 'paid');

  const hasUnpaid = teamBillingData.some(r => r.status !== 'paid');
  document.getElementById('reminderRow').style.display = hasUnpaid ? 'block' : 'none';

  if (!rows.length) {
    document.getElementById('teamBillingContent').innerHTML =
      '<div class="empty-state-admin">' + (unpaidOnly ? t('admin.billing.empty.no_unpaid_single') : t('admin.billing.empty.no_data_team')) + '</div>';
    return;
  }

  const html = `
    <div style="overflow-x:auto;">
    <table class="billing-table">
      <thead>
        <tr>
          <th>${t('admin.billing.th.player')}</th>
          <th>${t('admin.billing.th.plan')}</th>
          <th>${t('admin.billing.th.paid')}</th>
          <th>${t('admin.billing.th.balance')}</th>
          <th>${t('admin.billing.th.one_time')}</th>
          <th>${t('admin.billing.th.status')}</th>
          <th>${t('admin.billing.th.actions')}</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => renderPlayerRow(r)).join('')}
      </tbody>
    </table>
    </div>
  `;
  document.getElementById('teamBillingContent').innerHTML = html;
}

function renderPlayerRow(r) {
  const planLabel = r.total_count > 0
    ? `${r.paid_count}/${r.total_count} ${t('admin.billing.installments_label')}`
    : '—';
  const paidAmt = r.paid_amount > 0 ? formatNum(r.paid_amount) : '—';
  const balance = r.balance > 0
    ? `<span style="color:var(--clr-error);">${formatNum(r.balance)}</span>`
    : '<span style="color:var(--clr-success);">✓</span>';
  const oneTimeHtml = renderOneTimeSummary(r.one_time_charges);
  const statusBadge = statusLabel(r.status);

  const actions = r.plan_id
    ? `<button class="btn btn-secondary btn-xs" onclick="openPlayerDetail(${r.plan_id})">${t('admin.billing.details_btn')}</button>`
    : '';

  return `<tr>
    <td><strong>${escHtml(r.player_name)}</strong></td>
    <td>${planLabel}</td>
    <td>${paidAmt}</td>
    <td>${balance}</td>
    <td>${oneTimeHtml}</td>
    <td>${statusBadge}</td>
    <td>${actions}</td>
  </tr>`;
}

function renderOneTimeSummary(charges) {
  if (!charges || !charges.length) return '—';
  const pending = charges.filter(c => c.status !== 'paid' && c.status !== 'cancelled');
  const paid = charges.filter(c => c.status === 'paid');
  if (pending.length === 0) return `<span style="color:var(--clr-success);">✓ ${paid.length}</span>`;
  return `<span style="color:var(--clr-warning);">${pending.length} ${t('admin.billing.unpaid')}</span>`;
}

// ── Player Detail Modal ───────────────────────────────────────────────────

function _renderInstRow(inst) {
  const icon = inst.status === 'paid' ? '✅' : inst.status === 'overdue' ? '⚠️' : '⏳';
  const dateLabel = inst.paid_date
    ? `${t('admin.billing.installment_paid')} ${formatDate(inst.paid_date)}`
    : inst.due_date ? `${t('admin.billing.installment_due')}${formatDate(inst.due_date)}` : '';
  const actionBtn = inst.status !== 'paid'
    ? `<button class="btn btn-primary btn-xs" onclick="openMarkPaid('installment', ${inst.id}, '${t('admin.billing.installment_label')} ${inst.number}')">✓ ${t('admin.billing.mark_paid_btn')}</button>`
    : '';
  return `
    <div class="installment-row ${inst.status}">
      <span class="inst-icon">${icon}</span>
      <span class="inst-label">${t('admin.billing.installment_label')} ${inst.number}</span>
      <span class="inst-amount">${formatNum(inst.amount)}</span>
      <span class="inst-date">${dateLabel}</span>
      <span class="inst-action">${actionBtn}</span>
    </div>
  `;
}

function openPlayerDetail(planId) {
  currentPlanId = planId;
  const row = teamBillingData.find(r => r.plan_id === planId);
  if (!row) return;

  document.getElementById('playerDetailName').textContent = row.player_name;

  let html = `
    <div style="margin-bottom:var(--sp-4);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-3);">
        <span style="font-size:13px;color:var(--text-muted);">${t('admin.billing.season_label')} ${row.season || '—'} &nbsp;|&nbsp; ${t('admin.billing.method_label')} ${methodLabel(row.payment_method)}</span>
        <span style="font-size:15px;font-weight:600;">${formatNum(row.paid_amount)} / ${formatNum(row.total_amount)}</span>
      </div>
  `;

  // Group installments by plan/season when player has multiple plans
  const plans = row.plans || [];
  if (plans.length > 1) {
    plans.forEach(plan => {
      const planInsts = row.installments.filter(i => i.season === plan.season);
      if (!planInsts.length) return;
      html += `<div style="margin-bottom:var(--sp-3);padding:var(--sp-2);background:var(--surface-2);border-radius:var(--r-sm);">
        <div style="font-size:13px;font-weight:600;margin-bottom:var(--sp-1);">${escHtml(plan.season || '—')} — ${formatNum(plan.total_amount)}</div>
        <div class="installment-timeline">`;
      planInsts.forEach(inst => { html += _renderInstRow(inst); });
      html += `</div></div>`;
    });
  } else {
    html += `<div class="installment-timeline">`;
    row.installments.forEach(inst => { html += _renderInstRow(inst); });
    html += `</div>`;
  }

  html += `</div>`;

  if (row.one_time_charges && row.one_time_charges.length) {
    html += `<h4 style="margin-bottom:var(--sp-2);font-size:14px;color:var(--text-secondary);">${t('admin.billing.one_time_charges_title')}</h4>`;
    row.one_time_charges.forEach(c => {
      const icon = c.status === 'paid' ? '✅' : c.status === 'overdue' ? '⚠️' : '⏳';
      const actionBtn = c.status !== 'paid' && c.status !== 'cancelled'
        ? `<button class="btn btn-primary btn-xs" onclick="openMarkPaid('charge', ${c.id}, '${escHtml(c.title)}')">✓ ${t('admin.billing.mark_paid_btn')}</button>
           <button class="btn btn-secondary btn-xs" onclick="cancelCharge(${c.id})">${t('admin.billing.cancel_btn')}</button>`
        : '';
      html += `
        <div class="installment-row ${c.status}">
          <span class="inst-icon">${icon}</span>
          <span class="inst-label">${escHtml(c.title)}</span>
          <span class="inst-amount">${formatNum(c.amount)}</span>
          <span class="inst-date">${c.due_date ? formatDate(c.due_date) : ''}</span>
          <span class="inst-action">${actionBtn}</span>
        </div>
      `;
    });
  }

  document.getElementById('playerDetailBody').innerHTML = html;
  openModal('playerDetailModal');
}

function promptAdjustAmount() {
  const row = teamBillingData.find(r => r.plan_id === currentPlanId);
  if (!row) return;
  const newAmt = prompt(t('admin.billing.adjust_prompt', { name: row.player_name, amount: '₪' + row.total_amount }), row.total_amount);
  if (!newAmt || isNaN(parseFloat(newAmt))) return;
  adjustPlanAmount(currentPlanId, parseFloat(newAmt));
}

async function adjustPlanAmount(planId, newAmount) {
  const res = await AdminAPI.put(`/api/billing/plans/${planId}`, { new_total_amount: newAmount });
  if (res.success) {
    AdminToast.success(t('admin.billing.plan_updated'));
    closeModal('playerDetailModal');
    loadTeamBilling();
  } else {
    AdminToast.error(res.detail || t('admin.billing.update_failed'));
  }
}

// ── Mark Paid ─────────────────────────────────────────────────────────────

function openMarkPaid(type, id, label) {
  document.getElementById('markPaidId').value = id;
  document.getElementById('markPaidType').value = type;
  document.getElementById('markPaidTitle').textContent = `${t('admin.billing.mark_paid_title')} ${label}`;
  document.getElementById('markPaidDate').value = new Date().toISOString().slice(0, 10);
  document.getElementById('markPaidNote').value = '';
  openModal('markPaidModal');
}

async function confirmMarkPaid() {
  const id = document.getElementById('markPaidId').value;
  const type = document.getElementById('markPaidType').value;
  const paid_date = document.getElementById('markPaidDate').value;
  const payment_method = document.getElementById('markPaidMethod').value;
  const notes = document.getElementById('markPaidNote').value || null;

  const url = type === 'installment'
    ? `/api/billing/installments/${id}/paid`
    : `/api/billing/one-time/${id}/paid`;

  const res = await AdminAPI.put(url, { paid_date, payment_method, notes });
  if (res.success) {
    AdminToast.success(t('admin.billing.payment_recorded'));
    closeModal('markPaidModal');
    await loadTeamBilling();
    if (currentPlanId && document.getElementById('playerDetailModal').classList.contains('active')) {
      openPlayerDetail(currentPlanId);
    }
  } else {
    AdminToast.error(res.detail || 'Failed');
  }
}

async function cancelCharge(chargeId) {
  if (!confirm(t('admin.billing.cancel_confirm'))) return;
  const res = await AdminAPI.put(`/api/billing/one-time/${chargeId}/cancel`, {});
  if (res.success) {
    AdminToast.success(t('admin.billing.charge_cancelled'));
    closeModal('playerDetailModal');
    loadTeamBilling();
  } else {
    AdminToast.error(t('admin.billing.cancel_failed'));
  }
}

// ── Create Plan ───────────────────────────────────────────────────────────

async function createPlan() {
  const teamId = document.getElementById('planTeamId').value;
  const season = document.getElementById('planSeason').value.trim();
  const amount = parseFloat(document.getElementById('planAmount').value);
  const num = parseInt(document.getElementById('planInstallments').value);
  const day = parseInt(document.getElementById('planBillingDay').value);
  const startMonth = document.getElementById('planStartMonth').value;
  const method = document.getElementById('planMethod').value;
  const description = document.getElementById('planDescription').value.trim();

  if (!teamId || !season || !amount || !startMonth) {
    AdminToast.error(t('admin.billing.fill_required'));
    return;
  }

  const isAllTeams = teamId === 'all';
  const payload = {
    all_teams: isAllTeams,
    season,
    total_amount: amount,
    num_installments: num,
    billing_day: day,
    start_month: startMonth,
    payment_method: method,
    description: description || null,
  };
  if (!isAllTeams) payload.team_id = parseInt(teamId);

  const res = await AdminAPI.post('/api/billing/plans', payload);

  if (res.success) {
    const d = res.data;
    const msg = isAllTeams
      ? t('admin.billing.plans_created_all_teams', { created: d.created, skipped: d.skipped, teams: d.teams })
      : t('admin.billing.plans_created', { created: d.created, skipped: d.skipped });
    AdminToast.success(msg);
    closeModal('planModal');
    if (!isAllTeams) document.getElementById('teamBillingSelect').value = teamId;
    loadTeamBilling();
  } else {
    AdminToast.error(res.detail || t('admin.billing.plan_create_failed'));
  }
}

// ── Create One-Time Charge ────────────────────────────────────────────────

async function createCharge() {
  const teamId = document.getElementById('chargeTeamId').value;
  const title = document.getElementById('chargeTitle').value.trim();
  const amount = parseFloat(document.getElementById('chargeAmount').value);
  const due_date = document.getElementById('chargeDueDate').value || null;
  const description = document.getElementById('chargeDescription').value.trim() || null;

  if (!teamId || !title || !amount) {
    AdminToast.error(t('admin.billing.fill_charge_fields'));
    return;
  }

  const isAllTeams = teamId === 'all';
  const payload = { all_teams: isAllTeams, title, amount, due_date, description };
  if (!isAllTeams) payload.team_id = parseInt(teamId);

  const res = await AdminAPI.post('/api/billing/one-time', payload);

  if (res.success) {
    AdminToast.success(t('admin.billing.charges_created', { count: res.data.created }));
    closeModal('chargeModal');
    ['chargeTitle', 'chargeAmount', 'chargeDescription', 'chargeDueDate'].forEach(id => {
      document.getElementById(id).value = '';
    });
    if (!isAllTeams && document.getElementById('teamBillingSelect').value === teamId) loadTeamBilling();
    else if (isAllTeams) loadTeamBilling();
  } else {
    AdminToast.error(res.detail || 'Failed');
  }
}

// ── Check Overdue ─────────────────────────────────────────────────────────

async function checkOverdue() {
  const btn = document.querySelector('[onclick="checkOverdue()"]');
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="material-symbols-outlined spin">sync</span> ${t('admin.billing.checking_overdue')}`; }
  try {
    const res = await AdminAPI.post('/api/billing/check-overdue', {});
    if (res.success) {
      const d = res.data;
      AdminToast.info(t('admin.billing.overdue_updated', { installments: d.installments_updated, charges: d.charges_updated }));
      loadTeamBilling();
      const sel = document.getElementById('teamBillingSelect').value;
      loadOverview(sel && sel !== 'all' ? parseInt(sel) : null);
    } else {
      AdminToast.error(t('admin.billing.overdue_check_failed'));
    }
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = `<span class="material-symbols-outlined">update</span> ${t('admin.billing.check_overdue_btn')}`; }
  }
}

// ── Reminders ─────────────────────────────────────────────────────────────

async function openReminderPreview() {
  const teamId = document.getElementById('teamBillingSelect').value;
  if (!teamId) return;

  const unpaid = teamBillingData.filter(r => r.status !== 'paid');
  if (!unpaid.length) {
    AdminToast.info(t('admin.billing.no_unpaid_players'));
    return;
  }

  const listHtml = unpaid.map(r => `
    <div style="display:flex;justify-content:space-between;padding:var(--sp-2) 0;border-bottom:1px solid var(--border-color);">
      <span>${escHtml(r.player_name)}</span>
      <span style="color:var(--clr-warning);">${formatNum(r.balance)} ${t('admin.billing.pending_label')}</span>
    </div>
  `).join('');

  document.getElementById('reminderPlayerList').innerHTML = listHtml;
  openModal('reminderModal');
}

async function sendReminders() {
  const teamId = document.getElementById('teamBillingSelect').value;
  if (!teamId) return;
  const res = await AdminAPI.post(`/api/billing/remind?team_id=${teamId}`, {});
  if (res.success) {
    AdminToast.success(t('admin.billing.reminders_sent', { count: res.data.sent }));
    closeModal('reminderModal');
  } else {
    AdminToast.error(res.detail || t('admin.billing.reminders_failed'));
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

/* formatNum → shared-utils.js */
/* formatDate → shared-utils.js */

function statusLabel(status) {
  const validStatuses = ['paid', 'pending', 'overdue', 'partial'];
  if (validStatuses.includes(status)) {
    return `<span class="billing-status ${status}">${t('payment.' + status)}</span>`;
  }
  return status;
}

function methodLabel(m) {
  const validMethods = ['credit_card', 'check', 'cash', 'bank_transfer', 'bit', 'other'];
  if (m && validMethods.includes(m)) {
    return t('payment.method.' + m);
  }
  return m || '—';
}

/* escHtml → shared-utils.js */

// ── New Payments ─────────────────────────────────────────────────────────

async function loadNewPayments() {
  const res = await AdminAPI.get('/api/billing/new-payments');
  if (!res.success) return;
  const items = res.data || [];
  const section = document.getElementById('newPaymentsSection');

  if (!items.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  document.getElementById('newPaymentsCount').textContent = items.length;
  document.getElementById('ackAllBtn').style.display = items.length > 1 ? '' : 'none';

  const html = items.map(item => `
    <div class="new-payment-item" id="np-${item.type}-${item.id}" style="
      display:flex;justify-content:space-between;align-items:center;
      padding:var(--sp-2) var(--sp-3);background:rgba(255,255,255,0.08);
      border-radius:var(--r-sm);margin-bottom:var(--sp-2);">
      <div style="display:flex;align-items:center;gap:var(--sp-3);flex:1;">
        <span class="material-symbols-outlined" style="font-size:20px;color:#34d399;">payments</span>
        <div>
          <strong style="color:#ecfdf5;font-size:14px;">${escHtml(item.player_name)}</strong>
          <div style="font-size:12px;color:#a7f3d0;">${escHtml(item.team_name)} · ${escHtml(item.description)}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:var(--sp-3);">
        <span style="font-weight:600;color:#34d399;font-size:15px;white-space:nowrap;">${formatNum(item.amount)}</span>
        <span style="font-size:12px;color:#a7f3d0;">${item.paid_date ? formatDate(item.paid_date) : ''}</span>
        <button class="btn btn-xs" onclick="acknowledgePayment('${item.type}', ${item.id})"
                style="background:#10b981;color:#fff;border:none;padding:4px 10px;font-size:12px;border-radius:6px;">
          <span class="material-symbols-outlined" style="font-size:14px;">check</span>
        </button>
      </div>
    </div>
  `).join('');

  document.getElementById('newPaymentsList').innerHTML = html;
}

async function acknowledgePayment(type, id) {
  const el = document.getElementById(`np-${type}-${id}`);
  if (el) {
    el.style.opacity = '0.4';
    el.style.pointerEvents = 'none';
  }
  await AdminAPI.put('/api/billing/acknowledge', { type, id });
  // Reload to update count
  loadNewPayments();
}

async function acknowledgeAllPayments() {
  const btn = document.getElementById('ackAllBtn');
  if (btn) btn.disabled = true;
  await AdminAPI.put('/api/billing/acknowledge-all', {});
  loadNewPayments();
  if (btn) btn.disabled = false;
  AdminToast.success(t('admin.billing.all_acknowledged'));
}
