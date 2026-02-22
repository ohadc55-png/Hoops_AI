/* HOOPS AI - Admin Billing JS */

let allTeams = [];
let teamBillingData = []; // cached for current team
let currentPlanId = null; // for detail modal

// ── Init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadOverview();
  loadTeams();
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

  const opts = allTeams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  const emptyOpt = '<option value="">Select Team...</option>';
  const allOpt  = '<option value="all">כל הקבוצות</option>';

  ['teamBillingSelect', 'planTeamId', 'chargeTeamId'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = (id === 'teamBillingSelect' ? emptyOpt + allOpt : '') + opts;
  });
}

// ── Team Billing Detail ────────────────────────────────────────────────────

async function loadTeamBilling() {
  const teamId = document.getElementById('teamBillingSelect').value;
  const season = document.getElementById('seasonFilter').value.trim();

  if (!teamId) {
    document.getElementById('teamBillingContent').innerHTML = '<div class="empty-state-admin">Select a team to view billing details</div>';
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
    AdminToast.error('Failed to load team billing');
    return;
  }
  teamBillingData = res.data || [];
  renderTeamBilling();
  loadOverview(parseInt(teamId));
}

async function loadAllTeamsBilling(season) {
  document.getElementById('reminderRow').style.display = 'none';
  document.getElementById('teamBillingContent').innerHTML = '<div class="empty-state-admin">טוען נתונים...</div>';

  const results = await Promise.all(
    allTeams.map(t => {
      const url = `/api/billing/team/${t.id}` + (season ? `?season=${encodeURIComponent(season)}` : '');
      return AdminAPI.get(url).then(res => ({
        team: t,
        rows: res.success ? (res.data || []) : [],
      }));
    })
  );

  // flatten into teamBillingData so openPlayerDetail still works
  teamBillingData = results.flatMap(r => r.rows);
  loadOverview(); // no team_id = all teams

  const teamsWithData = results.filter(r => r.rows.length > 0);
  if (!teamsWithData.length) {
    document.getElementById('teamBillingContent').innerHTML = '<div class="empty-state-admin">אין נתוני חיוב לאף קבוצה.</div>';
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
            שולם: <strong style="color:var(--clr-success);">${formatNum(totals.paid)}</strong>
            &nbsp;|&nbsp; יתרה: <strong style="color:var(--clr-error);">${formatNum(totals.balance)}</strong>
          </span>
        </div>
        <div style="overflow-x:auto;">
        <table class="billing-table">
          <thead><tr>
            <th>Player</th><th>Plan</th><th>Paid</th>
            <th>Balance</th><th>One-Time</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>${displayRows.map(r => renderPlayerRow(r)).join('')}</tbody>
        </table>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('teamBillingContent').innerHTML = html || '<div class="empty-state-admin">אין שחקנים לא משלמים.</div>';
}

function renderTeamBilling() {
  const unpaidOnly = document.getElementById('unpaidOnly').checked;
  let rows = teamBillingData;
  if (unpaidOnly) rows = rows.filter(r => r.status !== 'paid');

  const hasUnpaid = teamBillingData.some(r => r.status !== 'paid');
  document.getElementById('reminderRow').style.display = hasUnpaid ? 'block' : 'none';

  if (!rows.length) {
    document.getElementById('teamBillingContent').innerHTML =
      '<div class="empty-state-admin">' + (unpaidOnly ? 'No unpaid players.' : 'No billing data for this team.') + '</div>';
    return;
  }

  const html = `
    <div style="overflow-x:auto;">
    <table class="billing-table">
      <thead>
        <tr>
          <th>Player</th>
          <th>Plan</th>
          <th>Paid</th>
          <th>Balance</th>
          <th>One-Time</th>
          <th>Status</th>
          <th>Actions</th>
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
    ? `${r.paid_count}/${r.total_count} תשלומים`
    : '—';
  const paidAmt = r.paid_amount > 0 ? formatNum(r.paid_amount) : '—';
  const balance = r.balance > 0
    ? `<span style="color:var(--clr-error);">${formatNum(r.balance)}</span>`
    : '<span style="color:var(--clr-success);">✓</span>';
  const oneTimeHtml = renderOneTimeSummary(r.one_time_charges);
  const statusBadge = statusLabel(r.status);

  const actions = r.plan_id
    ? `<button class="btn btn-secondary btn-xs" onclick="openPlayerDetail(${r.plan_id})">Details</button>`
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
  return `<span style="color:var(--clr-warning);">${pending.length} unpaid</span>`;
}

// ── Player Detail Modal ───────────────────────────────────────────────────

function openPlayerDetail(planId) {
  currentPlanId = planId;
  const row = teamBillingData.find(r => r.plan_id === planId);
  if (!row) return;

  document.getElementById('playerDetailName').textContent = row.player_name;

  let html = `
    <div style="margin-bottom:var(--sp-4);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-3);">
        <span style="font-size:13px;color:var(--text-muted);">Season: ${row.season || '—'} &nbsp;|&nbsp; Method: ${methodLabel(row.payment_method)}</span>
        <span style="font-size:15px;font-weight:600;">${formatNum(row.paid_amount)} / ${formatNum(row.total_amount)}</span>
      </div>
      <div class="installment-timeline">
  `;

  row.installments.forEach(inst => {
    const icon = inst.status === 'paid' ? '✅' : inst.status === 'overdue' ? '⚠️' : '⏳';
    const dateLabel = inst.paid_date
      ? `שולם ${formatDate(inst.paid_date)}`
      : inst.due_date ? `יגיע ב-${formatDate(inst.due_date)}` : '';
    const actionBtn = inst.status !== 'paid'
      ? `<button class="btn btn-primary btn-xs" onclick="openMarkPaid('installment', ${inst.id}, 'תשלום ${inst.number}')">✓ שולם</button>`
      : '';

    html += `
      <div class="installment-row ${inst.status}">
        <span class="inst-icon">${icon}</span>
        <span class="inst-label">תשלום ${inst.number}</span>
        <span class="inst-amount">${formatNum(inst.amount)}</span>
        <span class="inst-date">${dateLabel}</span>
        <span class="inst-action">${actionBtn}</span>
      </div>
    `;
  });

  html += `</div></div>`;

  if (row.one_time_charges && row.one_time_charges.length) {
    html += `<h4 style="margin-bottom:var(--sp-2);font-size:14px;color:var(--text-secondary);">One-Time Charges</h4>`;
    row.one_time_charges.forEach(c => {
      const icon = c.status === 'paid' ? '✅' : c.status === 'overdue' ? '⚠️' : '⏳';
      const actionBtn = c.status !== 'paid' && c.status !== 'cancelled'
        ? `<button class="btn btn-primary btn-xs" onclick="openMarkPaid('charge', ${c.id}, '${escHtml(c.title)}')">✓ שולם</button>
           <button class="btn btn-secondary btn-xs" onclick="cancelCharge(${c.id})">ביטול</button>`
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
  const newAmt = prompt(`Adjust total for ${row.player_name}\nCurrent: ₪${row.total_amount}\n\nNew total:`, row.total_amount);
  if (!newAmt || isNaN(parseFloat(newAmt))) return;
  adjustPlanAmount(currentPlanId, parseFloat(newAmt));
}

async function adjustPlanAmount(planId, newAmount) {
  const res = await AdminAPI.put(`/api/billing/plans/${planId}`, { new_total_amount: newAmount });
  if (res.success) {
    AdminToast.success('Plan amount updated');
    closeModal('playerDetailModal');
    loadTeamBilling();
  } else {
    AdminToast.error(res.detail || 'Failed to update');
  }
}

// ── Mark Paid ─────────────────────────────────────────────────────────────

function openMarkPaid(type, id, label) {
  document.getElementById('markPaidId').value = id;
  document.getElementById('markPaidType').value = type;
  document.getElementById('markPaidTitle').textContent = `סמן שולם: ${label}`;
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
    AdminToast.success('Payment recorded');
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
  if (!confirm('Cancel this charge?')) return;
  const res = await AdminAPI.put(`/api/billing/one-time/${chargeId}/cancel`, {});
  if (res.success) {
    AdminToast.success('Charge cancelled');
    closeModal('playerDetailModal');
    loadTeamBilling();
  } else {
    AdminToast.error('Failed to cancel');
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
    AdminToast.error('Please fill all required fields');
    return;
  }

  const res = await AdminAPI.post('/api/billing/plans', {
    team_id: parseInt(teamId),
    season,
    total_amount: amount,
    num_installments: num,
    billing_day: day,
    start_month: startMonth,
    payment_method: method,
    description: description || null,
  });

  if (res.success) {
    const d = res.data;
    AdminToast.success(`Created ${d.created} plans (${d.skipped} already exist)`);
    closeModal('planModal');
    document.getElementById('teamBillingSelect').value = teamId;
    loadTeamBilling();
  } else {
    AdminToast.error(res.detail || 'Failed to create plans');
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
    AdminToast.error('Please fill Team, Title and Amount');
    return;
  }

  const res = await AdminAPI.post('/api/billing/one-time', {
    team_id: parseInt(teamId),
    title,
    amount,
    due_date,
    description,
  });

  if (res.success) {
    AdminToast.success(`Created ${res.data.created} charges`);
    closeModal('chargeModal');
    ['chargeTitle', 'chargeAmount', 'chargeDescription', 'chargeDueDate'].forEach(id => {
      document.getElementById(id).value = '';
    });
    if (document.getElementById('teamBillingSelect').value === teamId) loadTeamBilling();
  } else {
    AdminToast.error(res.detail || 'Failed');
  }
}

// ── Check Overdue ─────────────────────────────────────────────────────────

async function checkOverdue() {
  const res = await AdminAPI.post('/api/billing/check-overdue', {});
  if (res.success) {
    const d = res.data;
    AdminToast.info(`Updated: ${d.installments_updated} installments, ${d.charges_updated} charges`);
    loadTeamBilling();
    loadOverview(document.getElementById('teamBillingSelect').value || null);
  } else {
    AdminToast.error('Failed');
  }
}

// ── Reminders ─────────────────────────────────────────────────────────────

async function openReminderPreview() {
  const teamId = document.getElementById('teamBillingSelect').value;
  if (!teamId) return;

  const unpaid = teamBillingData.filter(r => r.status !== 'paid');
  if (!unpaid.length) {
    AdminToast.info('No unpaid players in this team');
    return;
  }

  const listHtml = unpaid.map(r => `
    <div style="display:flex;justify-content:space-between;padding:var(--sp-2) 0;border-bottom:1px solid var(--border-color);">
      <span>${escHtml(r.player_name)}</span>
      <span style="color:var(--clr-warning);">${formatNum(r.balance)} pending</span>
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
    AdminToast.success(`Sent ${res.data.sent} reminder messages`);
    closeModal('reminderModal');
  } else {
    AdminToast.error(res.detail || 'Failed to send reminders');
  }
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

function statusLabel(status) {
  const map = {
    paid: '<span class="billing-status paid">שולם</span>',
    pending: '<span class="billing-status pending">ממתין</span>',
    overdue: '<span class="billing-status overdue">באיחור</span>',
    partial: '<span class="billing-status partial">חלקי</span>',
  };
  return map[status] || status;
}

function methodLabel(m) {
  const map = { credit_card: 'אשראי', check: "צ'קים", cash: 'מזומן', bank_transfer: 'העברה', other: 'אחר' };
  return map[m] || m || '—';
}

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
