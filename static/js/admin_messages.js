/**
 * HOOPS AI — Admin Messages JS
 * Messaging UI for admin portal: inbox, sent, scheduled, hoops updates, invoices, compose
 */

let currentMsgTab = 'inbox';
let _userSearchTimer = null;
let _allInvoices = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAPI.token) return;
  loadMsgInbox();
  loadComposeTargets();
  updateAdminMsgBadge();
  setInterval(updateAdminMsgBadge, 30000);
});


/* === Tab switching === */

const TAB_KEYS = ['inbox', 'sent', 'scheduled', 'hoops', 'invoices', 'compose'];
const TAB_ELEMENTS = {
  inbox: 'msgTabInbox', sent: 'msgTabSent',
  scheduled: 'msgTabScheduled', hoops: 'msgTabHoops',
  invoices: 'msgTabInvoices', compose: 'msgTabCompose',
};

function switchMsgTab(tab) {
  currentMsgTab = tab;
  document.querySelectorAll('.msg-tab').forEach((tabEl, i) => {
    tabEl.classList.toggle('active', TAB_KEYS[i] === tab);
  });
  document.querySelectorAll('.msg-tab-content').forEach(c => c.style.display = 'none');
  document.getElementById(TAB_ELEMENTS[tab]).style.display = 'block';

  if (tab === 'inbox') loadMsgInbox();
  else if (tab === 'sent') loadMsgSent();
  else if (tab === 'scheduled') loadMsgScheduled();
  else if (tab === 'hoops') loadHoopsUpdates();
  else if (tab === 'invoices') loadMyInvoices();
  else if (tab === 'compose') loadComposeTargets();
}


/* === Inbox === */

async function loadMsgInbox() {
  const list = document.getElementById('adminInboxList');
  try {
    const res = await AdminAPI.get('/api/messages/inbox');
    const msgs = res.data || [];
    if (msgs.length === 0) {
      list.innerHTML = `<div class="empty-state" style="text-align:center;padding:32px;color:rgba(255,255,255,0.4);"><span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:8px;">inbox</span>${t('admin.messages.empty.inbox')}</div>`;
      return;
    }
    list.innerHTML = msgs.map(m => `
      <div class="msg-item ${m.is_read ? '' : 'unread'}" onclick="openMsgDetail(${JSON.stringify(m).replace(/"/g, '&quot;')})">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span class="msg-sender">${esc(m.sender_name)}</span>
            <span class="msg-role-badge ${m.sender_role}">${m.sender_role}</span>
            ${m.message_type !== 'general' ? `<span class="msg-type-badge ${m.message_type}">${m.message_type}</span>` : ''}
          </div>
          <span class="msg-time">${timeAgo(m.created_at)} · ${formatMsgDate(m.created_at)}</span>
        </div>
        ${m.subject ? `<div class="msg-subject">${esc(m.subject)}</div>` : ''}
        <div class="msg-preview">${esc((m.body || '').substring(0, 80))}${m.body && m.body.length > 80 ? '...' : ''}</div>
      </div>
    `).join('');
  } catch {
    list.innerHTML = `<div style="text-align:center;padding:16px;color:rgba(255,255,255,0.4);">${t('admin.messages.empty.load_error')}</div>`;
  }
}


function openMsgDetail(msg) {
  document.getElementById('msgDetailSubject').textContent = msg.subject || t('admin.messages.detail.default_subject');
  document.getElementById('msgDetailMeta').innerHTML = `
    <span class="msg-sender">${esc(msg.sender_name)}</span>
    <span class="msg-role-badge ${msg.sender_role}">${msg.sender_role}</span>
    ${msg.message_type !== 'general' ? `<span class="msg-type-badge ${msg.message_type}">${msg.message_type}</span>` : ''}
    <span class="msg-time">${timeAgo(msg.created_at)} · ${formatMsgDate(msg.created_at)}</span>
  `;
  document.getElementById('msgDetailBody').textContent = msg.body;

  // Show PDF download button if billing notification
  const actionsEl = document.getElementById('msgDetailActions');
  if (msg.message_type === 'billing_notification' && msg.body && msg.body.includes('/api/billing/platform-invoices/')) {
    const match = msg.body.match(/\/api\/billing\/platform-invoices\/(\d+)\/pdf/);
    if (match) {
      actionsEl.innerHTML = `
        <button class="btn btn-primary btn-sm" onclick="downloadInvoicePDF(${match[1]})">
          <span class="material-symbols-outlined" style="font-size:16px;">download</span>
          ${t('admin.messages.detail.download_pdf')}
        </button>
      `;
    } else {
      actionsEl.innerHTML = '';
    }
  } else {
    actionsEl.innerHTML = '';
  }

  openModal('msgDetailModal');
  if (!msg.is_read) {
    markMsgRead(msg.id);
  }
}


async function markMsgRead(id) {
  try {
    await AdminAPI.put(`/api/messages/${id}/read`);
    updateAdminMsgBadge();
  } catch { /* ignore */ }
}

async function markAllMsgRead() {
  try {
    await AdminAPI.put('/api/messages/read-all');
    AdminToast.success(t('admin.messages.all_read'));
    loadMsgInbox();
    updateAdminMsgBadge();
  } catch { /* ignore */ }
}


/* === Sent === */

async function loadMsgSent() {
  const list = document.getElementById('adminSentList');
  try {
    const res = await AdminAPI.get('/api/messages/sent');
    const msgs = res.data || [];
    if (msgs.length === 0) {
      list.innerHTML = `<div class="empty-state" style="text-align:center;padding:32px;color:rgba(255,255,255,0.4);"><span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:8px;">outbox</span>${t('admin.messages.empty.sent')}</div>`;
      return;
    }
    list.innerHTML = msgs.map(m => `
      <div class="msg-item">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span class="msg-sender">To: ${formatTarget(m.target_type)}</span>
            ${m.message_type !== 'general' ? `<span class="msg-type-badge ${m.message_type}">${m.message_type}</span>` : ''}
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span class="msg-time">${timeAgo(m.created_at)} · ${formatMsgDate(m.created_at)}</span>
            <button class="btn-icon" onclick="event.stopPropagation();showMsgStats(${m.id})" title="Stats">
              <span class="material-symbols-outlined" style="font-size:18px;">bar_chart</span>
            </button>
          </div>
        </div>
        ${m.subject ? `<div class="msg-subject">${esc(m.subject)}</div>` : ''}
        <div class="msg-preview">${esc((m.body || '').substring(0, 80))}</div>
      </div>
    `).join('');
  } catch {
    list.innerHTML = `<div style="text-align:center;padding:16px;color:rgba(255,255,255,0.4);">${t('admin.messages.empty.load_error')}</div>`;
  }
}


async function showMsgStats(msgId) {
  try {
    const res = await AdminAPI.get(`/api/messages/${msgId}/stats`);
    const s = res.data;
    document.getElementById('msgStatsBody').innerHTML = `
      <div style="display:flex;gap:24px;justify-content:center;padding:16px;">
        <div style="text-align:center;">
          <div style="font-size:28px;font-weight:700;">${s.total}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.5);">${t('admin.messages.stats.total')}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#66bb6a;">${s.read}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.5);">${t('admin.messages.stats.read')}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#ef5350;">${s.unread}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.5);">${t('admin.messages.stats.unread')}</div>
        </div>
      </div>
    `;
    openModal('msgStatsModal');
  } catch {
    AdminToast.error(t('admin.messages.stats_error'));
  }
}


/* === Scheduled === */

async function loadMsgScheduled() {
  const list = document.getElementById('adminScheduledList');
  try {
    const res = await AdminAPI.get('/api/messages/scheduled');
    const msgs = res.data || [];
    if (msgs.length === 0) {
      list.innerHTML = `<div class="empty-state" style="text-align:center;padding:32px;color:rgba(255,255,255,0.4);"><span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:8px;">schedule_send</span>${t('admin.messages.empty.scheduled')}</div>`;
      return;
    }
    list.innerHTML = msgs.map(m => `
      <div class="msg-item">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span class="msg-sender">To: ${formatTarget(m.target_type)}</span>
            ${m.subject ? ` — ${esc(m.subject)}` : ''}
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span class="msg-time">${t('admin.messages.scheduled_prefix')} ${m.scheduled_at || ''}</span>
            <button class="btn btn-secondary btn-sm" onclick="cancelScheduled(${m.id})" style="color:#ef5350;">${t('admin.messages.cancel_btn')}</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch {
    list.innerHTML = `<div style="text-align:center;padding:16px;color:rgba(255,255,255,0.4);">${t('admin.messages.empty.load_error_short')}</div>`;
  }
}


async function cancelScheduled(id) {
  if (!confirm(t('admin.messages.cancel_confirm'))) return;
  try {
    await AdminAPI.del(`/api/messages/scheduled/${id}`);
    AdminToast.success(t('admin.messages.scheduled_cancelled'));
    loadMsgScheduled();
  } catch { /* ignore */ }
}


/* === HOOPS Updates (system messages) === */

async function loadHoopsUpdates() {
  const list = document.getElementById('hoopsUpdatesList');
  try {
    const res = await AdminAPI.get('/api/messages/inbox');
    const allMsgs = res.data || [];
    // Filter to system messages only (billing_notification, system_notification, etc.)
    const msgs = allMsgs.filter(m => m.sender_role === 'system');

    if (msgs.length === 0) {
      list.innerHTML = `
        <div class="empty-state" style="text-align:center;padding:32px;color:rgba(255,255,255,0.4);">
          <span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:8px;">campaign</span>
          ${t('admin.messages.empty.hoops')}
        </div>`;
      return;
    }

    list.innerHTML = msgs.map(m => {
      const icon = m.message_type === 'billing_notification' ? 'receipt_long' : 'campaign';
      const typeLabel = m.message_type === 'billing_notification' ? t('admin.messages.hoops.type.billing') : t('admin.messages.hoops.type.system');
      return `
        <div class="msg-item ${m.is_read ? '' : 'unread'}" onclick="openMsgDetail(${JSON.stringify(m).replace(/"/g, '&quot;')})">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="material-symbols-outlined" style="font-size:20px;color:#0891B2;">${icon}</span>
              <span class="msg-sender">HOOPS AI</span>
              <span class="msg-type-badge billing_notification">${typeLabel}</span>
            </div>
            <span class="msg-time">${timeAgo(m.created_at)} · ${formatMsgDate(m.created_at)}</span>
          </div>
          ${m.subject ? `<div class="msg-subject">${esc(m.subject)}</div>` : ''}
          <div class="msg-preview">${esc((m.body || '').substring(0, 100))}${m.body && m.body.length > 100 ? '...' : ''}</div>
        </div>
      `;
    }).join('');
  } catch {
    list.innerHTML = `<div style="text-align:center;padding:16px;color:rgba(255,255,255,0.4);">${t('admin.messages.empty.load_error_short')}</div>`;
  }
}

async function markAllHoopsRead() {
  try {
    await AdminAPI.put('/api/messages/read-all');
    AdminToast.success(t('admin.messages.all_hoops_read'));
    loadHoopsUpdates();
    updateAdminMsgBadge();
  } catch { /* ignore */ }
}


/* === Invoices Tab === */

async function loadMyInvoices() {
  const list = document.getElementById('invoicesList');
  const summary = document.getElementById('invoiceSummary');
  try {
    const res = await AdminAPI.get('/api/billing/platform-invoices');
    _allInvoices = res.data || [];

    // Summary cards
    const taxInvoices = _allInvoices.filter(i => i.invoice_type === 'tax_invoice');
    const totalInvoiced = taxInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const totalPaid = taxInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
    const totalOverdue = taxInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total || 0), 0);
    const totalOpen = taxInvoices.filter(i => ['draft', 'sent'].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0);

    summary.innerHTML = `
      <div class="summary-card" style="background:var(--surface-1);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;">${t('admin.messages.invoice.total_invoiced')}</div>
        <div style="font-size:22px;font-weight:700;margin-top:4px;">₪${totalInvoiced.toLocaleString()}</div>
      </div>
      <div class="summary-card" style="background:var(--surface-1);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;">${t('admin.messages.invoice.paid')}</div>
        <div style="font-size:22px;font-weight:700;color:#66bb6a;margin-top:4px;">₪${totalPaid.toLocaleString()}</div>
      </div>
      <div class="summary-card" style="background:var(--surface-1);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;">${t('admin.messages.invoice.open')}</div>
        <div style="font-size:22px;font-weight:700;color:#42a5f5;margin-top:4px;">₪${totalOpen.toLocaleString()}</div>
      </div>
      <div class="summary-card" style="background:var(--surface-1);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;">${t('admin.messages.invoice.overdue')}</div>
        <div style="font-size:22px;font-weight:700;color:#ef5350;margin-top:4px;">₪${totalOverdue.toLocaleString()}</div>
      </div>
    `;

    renderInvoiceList(_allInvoices);
  } catch {
    list.innerHTML = `<div style="text-align:center;padding:16px;color:rgba(255,255,255,0.4);">${t('admin.messages.empty.invoices_error')}</div>`;
  }
}


function filterInvoices() {
  const typeFilter = document.getElementById('invoiceFilter').value;
  const statusFilter = document.getElementById('invoiceStatusFilter').value;
  let filtered = _allInvoices;
  if (typeFilter) filtered = filtered.filter(i => i.invoice_type === typeFilter);
  if (statusFilter) filtered = filtered.filter(i => i.status === statusFilter);
  renderInvoiceList(filtered);
}


function renderInvoiceList(invoices) {
  const list = document.getElementById('invoicesList');
  if (invoices.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="text-align:center;padding:32px;color:rgba(255,255,255,0.4);">
        <span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:8px;">receipt_long</span>
        ${t('admin.messages.empty.invoices')}
      </div>`;
    return;
  }

  const typeLabels = { tax_invoice: t('admin.messages.invoice.type.tax_invoice'), receipt: t('admin.messages.invoice.type.receipt'), credit_note: t('admin.messages.invoice.type.credit_note'), quote: t('admin.messages.invoice.type.quote') };
  const statusColors = { draft: '#9e9e9e', sent: '#42a5f5', paid: '#66bb6a', overdue: '#ef5350', cancelled: '#757575' };

  list.innerHTML = invoices.map(inv => {
    const typeLabel = typeLabels[inv.invoice_type] || inv.invoice_type;
    const statusColor = statusColors[inv.status] || '#9e9e9e';
    const issueDate = inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('he-IL') : '';
    const dueDate = inv.due_date ? new Date(inv.due_date).toLocaleDateString('he-IL') : '';

    return `
      <div class="msg-item invoice-item" style="cursor:default;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="material-symbols-outlined" style="font-size:20px;color:${statusColor};">
              ${inv.invoice_type === 'receipt' ? 'check_circle' : inv.invoice_type === 'credit_note' ? 'undo' : 'description'}
            </span>
            <span style="font-weight:600;">#${inv.invoice_number}</span>
            <span class="msg-type-badge" style="background:${statusColor}20;color:${statusColor};border:1px solid ${statusColor}40;">${typeLabel}</span>
            <span class="msg-type-badge" style="background:${statusColor}20;color:${statusColor};border:1px solid ${statusColor}40;text-transform:uppercase;font-size:10px;">${inv.status}</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span style="font-weight:700;font-size:16px;color:${inv.total >= 0 ? '#fff' : '#ef5350'};">₪${Math.abs(inv.total).toLocaleString()}</span>
            <button class="btn-icon" title="${t('admin.messages.invoice.download_pdf')}" style="color:#42a5f5;" onclick="event.stopPropagation();downloadInvoicePDF(${inv.id})">
              <span class="material-symbols-outlined" style="font-size:18px;">download</span>
            </button>
          </div>
        </div>
        <div style="display:flex;gap:16px;margin-top:4px;font-size:12px;color:rgba(255,255,255,0.5);">
          <span>${t('admin.messages.invoice.issued')} ${issueDate}</span>
          ${dueDate ? `<span>${t('admin.messages.invoice.due')} ${dueDate}</span>` : ''}
          ${inv.paid_date ? `<span style="color:#66bb6a;">${t('admin.messages.invoice.paid_date')} ${new Date(inv.paid_date).toLocaleDateString('he-IL')}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}


/* === Compose === */

async function loadComposeTargets() {
  try {
    const res = await AdminAPI.get('/api/messages/targets/teams');
    const teams = res.data || [];
    const el = document.getElementById('teamsCheckboxes');
    el.innerHTML = teams.map(tm => `
      <label style="display:flex;align-items:center;gap:8px;padding:4px 0;">
        <input type="checkbox" class="team-checkbox" value="${tm.id}">
        ${esc(tm.name)} ${tm.age_group ? '(' + esc(tm.age_group) + ')' : ''}
      </label>
    `).join('');
  } catch { /* ignore */ }
}


function onTargetChange() {
  const target = document.getElementById('composeTarget').value;
  document.getElementById('teamsMultiSection').style.display = target === 'team' ? 'block' : 'none';
  document.getElementById('individualSection').style.display = target === 'individual' ? 'block' : 'none';
  if (target === 'team') loadComposeTargets();
  if (target === 'individual') loadIndivTeams();
}


function toggleSchedule() {
  const checked = document.getElementById('scheduleToggle').checked;
  document.getElementById('scheduleSection').classList.toggle('visible', checked);
}


/* === Individual targeting: Team → Role → Person === */

async function loadIndivTeams() {
  const sel = document.getElementById('indivTeamSelect');
  try {
    const res = await AdminAPI.get('/api/messages/targets/teams');
    const teams = res.data || [];
    sel.innerHTML = `<option value="">${t('admin.messages.indiv.select_team')}</option>` +
      teams.map(tm => `<option value="${tm.id}">${esc(tm.name)} ${tm.age_group ? '(' + esc(tm.age_group) + ')' : ''}</option>`).join('');
  } catch { /* ignore */ }
  // Reset cascading
  document.getElementById('indivRoleSection').style.display = 'none';
  document.getElementById('indivPersonSection').style.display = 'none';
  document.getElementById('selectedUserId').value = '';
}


function onIndivTeamChange() {
  const teamId = document.getElementById('indivTeamSelect').value;
  const roleSection = document.getElementById('indivRoleSection');
  const personSection = document.getElementById('indivPersonSection');
  document.getElementById('indivRoleSelect').value = '';
  personSection.style.display = 'none';
  document.getElementById('selectedUserId').value = '';

  if (teamId) {
    roleSection.style.display = 'block';
  } else {
    roleSection.style.display = 'none';
  }
}


async function onIndivRoleChange() {
  const teamId = document.getElementById('indivTeamSelect').value;
  const role = document.getElementById('indivRoleSelect').value;
  const personSection = document.getElementById('indivPersonSection');
  const personSelect = document.getElementById('indivPersonSelect');
  document.getElementById('selectedUserId').value = '';

  if (!teamId || !role) {
    personSection.style.display = 'none';
    return;
  }

  personSelect.innerHTML = `<option value="">${t('admin.messages.indiv.loading')}</option>`;
  personSection.style.display = 'block';

  try {
    const res = await AdminAPI.get(`/api/messages/targets/team-members?team_id=${teamId}&role=${role}`);
    const members = res.data || [];
    if (members.length === 0) {
      personSelect.innerHTML = `<option value="">${t('admin.messages.indiv.no_members')}</option>`;
      return;
    }
    personSelect.innerHTML = `<option value="">${t('admin.messages.indiv.select_person')}</option>` +
      members.map(m => `<option value="${m.user_id}">${esc(m.name)}</option>`).join('');
  } catch {
    personSelect.innerHTML = `<option value="">${t('admin.messages.indiv.load_error')}</option>`;
  }
}


function onIndivPersonChange() {
  const userId = document.getElementById('indivPersonSelect').value;
  document.getElementById('selectedUserId').value = userId;
}


async function sendAdminMessage() {
  const target = document.getElementById('composeTarget').value;
  const body = document.getElementById('composeBody').value.trim();
  if (!body) { AdminToast.error(t('admin.messages.compose.body_required')); return; }

  const payload = {
    body,
    subject: document.getElementById('composeSubject').value.trim() || null,
    message_type: document.getElementById('composeType').value,
    target_type: target,
  };

  if (target === 'team') {
    const checked = [...document.querySelectorAll('.team-checkbox:checked')].map(c => parseInt(c.value));
    if (checked.length === 0) { AdminToast.error(t('admin.messages.compose.select_team')); return; }
    payload.target_team_ids = checked;
  }

  if (target === 'individual') {
    const uid = parseInt(document.getElementById('selectedUserId').value);
    if (!uid) { AdminToast.error(t('admin.messages.compose.select_user')); return; }
    payload.target_user_id = uid;
  }

  if (document.getElementById('scheduleToggle').checked) {
    const schedDate = document.getElementById('scheduleDate').value;
    const schedTime = document.getElementById('scheduleTime').value;
    if (!schedDate || !schedTime) { AdminToast.error(t('admin.messages.compose.set_schedule')); return; }
    payload.scheduled_at = `${schedDate}T${schedTime}:00`;
  }

  try {
    const res = await AdminAPI.post('/api/messages/send', payload);
    if (res.data.is_scheduled) {
      AdminToast.success(t('admin.messages.compose.scheduled'));
    } else {
      AdminToast.success(t('admin.messages.compose.sent'));
    }
    document.getElementById('composeSubject').value = '';
    document.getElementById('composeBody').value = '';
    document.getElementById('scheduleToggle').checked = false;
    toggleSchedule();
    switchMsgTab('sent');
  } catch { /* toast shown by API */ }
}


/* === Badge === */

async function updateAdminMsgBadge() {
  try {
    const res = await AdminAPI.get('/api/messages/inbox/count');
    const count = res.data?.unread || 0;
    const badge = document.getElementById('adminMsgBadge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  } catch { /* ignore */ }
}


/* === PDF Download === */

async function downloadInvoicePDF(invoiceId) {
  try {
    const res = await fetch(`/api/billing/platform-invoices/${invoiceId}/pdf`, {
      headers: { 'Authorization': 'Bearer ' + AdminAPI.token }
    });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${invoiceId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    AdminToast.error(t('admin.messages.pdf_error'));
  }
}


/* === Helpers === */

function formatTarget(targetType) {
  const labels = {
    all_club: t('admin.messages.target.all_club'), all_coaches: t('admin.messages.target.all_coaches'),
    all_players: t('admin.messages.target.all_players'), all_parents: t('admin.messages.target.all_parents'),
    team: t('admin.messages.target.team'), team_players: t('admin.messages.target.team_players'),
    team_parents: t('admin.messages.target.team_parents'), team_coaches: t('admin.messages.target.team_coaches'),
    individual: t('admin.messages.target.individual'), admin: t('admin.messages.target.admin'),
    my_team: t('admin.messages.target.my_team'), my_coach: t('admin.messages.target.my_coach'),
    my_team_players: t('admin.messages.target.my_team_players'), my_team_parents: t('admin.messages.target.my_team_parents'),
  };
  return labels[targetType] || targetType;
}

/* timeAgo → shared-utils.js */

/* formatMsgDate → shared-utils.js */
