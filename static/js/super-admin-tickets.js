/**
 * HOOPS AI — Super Admin Support Tickets
 */
let _ticketId = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!requireSuperAdminAuth()) return;
  if (document.getElementById('ticketTable')) {
    loadTicketStats();
    loadTickets();
    initFilters();
  }
});


// ─── Stats ─────────────────────────────────────────────

async function loadTicketStats() {
  try {
    const res = await SuperAdminAPI.get('/api/super/tickets/stats');
    const d = res.data;
    document.getElementById('statOpen').textContent = d.open;
    document.getElementById('statInProgress').textContent = d.in_progress;
    document.getElementById('statWaiting').textContent = d.waiting_on_club;
    document.getElementById('statResolved').textContent = d.resolved;
  } catch (err) { /* handled */ }
}


// ─── Ticket List ───────────────────────────────────────

async function loadTickets() {
  const status = document.getElementById('statusFilter')?.value || '';
  const priority = document.getElementById('priorityFilter')?.value || '';
  const category = document.getElementById('categoryFilter')?.value || '';
  const search = document.getElementById('searchInput')?.value || '';

  try {
    let url = '/api/super/tickets?limit=200';
    if (status) url += `&status=${status}`;
    if (priority) url += `&priority=${priority}`;
    if (category) url += `&category=${category}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res = await SuperAdminAPI.get(url);
    renderTicketTable(res.data);
  } catch (err) { /* handled */ }
}

function renderTicketTable(tickets) {
  const tbody = document.getElementById('ticketBody');
  if (!tickets || !tickets.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><span class="material-symbols-outlined">support_agent</span>No tickets yet</td></tr>';
    return;
  }

  tbody.innerHTML = tickets.map(t => `
    <tr onclick="window.location.href='/super-admin/tickets/${t.id}'" style="cursor:pointer;">
      <td>#${t.id}</td>
      <td><strong>${esc(t.subject)}</strong></td>
      <td>${esc(t.club_name || '—')}</td>
      <td>${categoryLabel(t.category)}</td>
      <td>${priorityBadge(t.priority)}</td>
      <td>${statusBadge(t.status)}</td>
      <td>${timeAgo(t.created_at)}</td>
    </tr>
  `).join('');
}

function initFilters() {
  let debounce;
  const search = document.getElementById('searchInput');
  if (search) {
    search.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(loadTickets, 400);
    });
  }
  document.getElementById('statusFilter')?.addEventListener('change', loadTickets);
  document.getElementById('priorityFilter')?.addEventListener('change', loadTickets);
  document.getElementById('categoryFilter')?.addEventListener('change', loadTickets);
}


// ─── Ticket Detail ─────────────────────────────────────

async function loadTicketDetail(id) {
  _ticketId = id;
  try {
    const res = await SuperAdminAPI.get(`/api/super/tickets/${id}`);
    renderTicketDetail(res.data);
  } catch (err) {
    document.getElementById('ticketHeader').innerHTML = '<div class="empty-state">Ticket not found</div>';
  }
}

function renderTicketDetail(ticket) {
  // Header
  const header = document.getElementById('ticketHeader');
  header.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:var(--sp-3);">
      <div>
        <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-2);">
          <h2 style="margin:0;">#${ticket.id}</h2>
          ${statusBadge(ticket.status)}
          ${priorityBadge(ticket.priority)}
          <span class="badge" style="background:var(--bg-card);color:var(--text-muted);">${categoryLabel(ticket.category)}</span>
        </div>
        <h3 style="margin:0 0 var(--sp-1) 0;">${esc(ticket.subject)}</h3>
        <p style="color:var(--text-muted);margin:0;">
          Club: <strong>${esc(ticket.club_name || '—')}</strong>
          · Created by: ${esc(ticket.created_by_name || '—')}
          · ${timeAgo(ticket.created_at)}
        </p>
      </div>
      <div style="text-align:right;">
        ${ticket.assigned_to_name
          ? `<span class="text-sm text-muted">Assigned to: <strong>${esc(ticket.assigned_to_name)}</strong></span>`
          : '<span class="text-sm text-muted">Unassigned</span>'}
      </div>
    </div>
  `;

  // Messages
  if (ticket.messages && ticket.messages.length) {
    document.getElementById('conversationSection').style.display = '';
    const container = document.getElementById('messagesContainer');
    container.innerHTML = ticket.messages.map(m => {
      const isSA = m.sender_type === 'super_admin';
      const bg = m.is_internal ? 'var(--bg-card);border-left:3px solid #f59e0b;' : (isSA ? 'var(--bg-card);border-left:3px solid var(--primary);' : '');
      return `
        <div style="padding:var(--sp-2);margin-bottom:var(--sp-2);border-radius:var(--radius);background:${bg || 'transparent'};">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="font-weight:600;font-size:0.85rem;">
              ${isSA ? '<span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">shield_person</span> ' : ''}
              ${esc(m.sender_name)}
              ${m.is_internal ? ' <span style="color:#f59e0b;font-size:0.75rem;">(Internal)</span>' : ''}
            </span>
            <span class="text-sm text-muted">${timeAgo(m.created_at)}</span>
          </div>
          <div style="white-space:pre-wrap;line-height:1.5;">${esc(m.body)}</div>
        </div>
      `;
    }).join('');
    container.scrollTop = container.scrollHeight;
  }

  // Actions
  const actions = document.getElementById('actionsContent');
  const btns = [];

  if (ticket.status !== 'closed') {
    btns.push(`<button class="btn" style="background:#3b82f6;color:#fff;" onclick="setStatus('in_progress')">In Progress</button>`);
    btns.push(`<button class="btn" style="background:#f59e0b;color:#fff;" onclick="setStatus('waiting_on_club')">Waiting on Club</button>`);
    btns.push(`<button class="btn" style="background:#22c55e;color:#fff;" onclick="setStatus('resolved')">Resolve</button>`);
    btns.push(`<button class="btn" style="background:#9ca3af;color:#fff;" onclick="setStatus('closed')">Close</button>`);
  } else {
    btns.push(`<button class="btn" style="background:#3b82f6;color:#fff;" onclick="setStatus('open')">Reopen</button>`);
  }

  if (btns.length) {
    document.getElementById('actionsSection').style.display = '';
    actions.innerHTML = btns.join('');
  }
}


// ─── Actions ───────────────────────────────────────────

async function submitReply() {
  if (!_ticketId) return;
  const body = document.getElementById('replyBody').value.trim();
  if (!body) { SuperAdminToast.error('Reply cannot be empty'); return; }
  const isInternal = document.getElementById('isInternal').checked;

  try {
    await SuperAdminAPI.post(`/api/super/tickets/${_ticketId}/reply`, {
      body, is_internal: isInternal,
    });
    document.getElementById('replyBody').value = '';
    document.getElementById('isInternal').checked = false;
    SuperAdminToast.success(isInternal ? 'Internal note added' : 'Reply sent');
    loadTicketDetail(_ticketId);
  } catch (err) { /* handled */ }
}

async function setStatus(status) {
  if (!_ticketId) return;
  try {
    await SuperAdminAPI.put(`/api/super/tickets/${_ticketId}/status`, { status });
    SuperAdminToast.success(`Status updated to ${status.replace(/_/g, ' ')}`);
    loadTicketDetail(_ticketId);
  } catch (err) { /* handled */ }
}


// ─── Helpers ───────────────────────────────────────────

function statusBadge(s) {
  const colors = {
    open: '#3b82f6', in_progress: '#f59e0b', waiting_on_club: '#8b5cf6',
    resolved: '#22c55e', closed: '#9ca3af',
  };
  const c = colors[s] || '#6b7280';
  return `<span class="badge" style="background:${c};color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;text-transform:uppercase;">${(s || '').replace(/_/g, ' ')}</span>`;
}

function priorityBadge(p) {
  const colors = { urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#6b7280' };
  const c = colors[p] || '#6b7280';
  return `<span style="color:${c};font-weight:600;font-size:0.8rem;text-transform:uppercase;">${p}</span>`;
}

function categoryLabel(c) {
  const labels = {
    billing: 'Billing', technical: 'Technical', feature_request: 'Feature Request',
    account: 'Account', bug_report: 'Bug Report', general: 'General', onboarding: 'Onboarding',
  };
  return labels[c] || c;
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return d.toLocaleDateString();
}
