/**
 * HOOPS AI — Club Admin Support
 */
let _currentTicketId = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdminAuth()) return;
  loadMyTickets();
});


// ─── Ticket List ───────────────────────────────────────

async function loadMyTickets() {
  try {
    const res = await AdminAPI.get('/api/support/tickets');
    renderTicketList(res.data);
  } catch (err) { /* handled */ }
}

function renderTicketList(tickets) {
  const container = document.getElementById('ticketListContainer');
  if (!tickets || !tickets.length) {
    container.innerHTML = `
      <div class="card" style="padding:var(--sp-6);text-align:center;">
        <span class="material-symbols-outlined" style="font-size:48px;color:var(--text-muted);display:block;margin-bottom:var(--sp-2);">support_agent</span>
        <p style="color:var(--text-muted);">${t('admin.support.empty.no_tickets')}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = tickets.map(tk => `
    <div class="card" style="padding:var(--sp-3);margin-bottom:var(--sp-2);cursor:pointer;" onclick="viewTicket(${tk.id})">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--sp-1);">
        <div>
          <strong>#${tk.id}</strong> — ${esc(tk.subject)}
        </div>
        <div style="display:flex;gap:var(--sp-1);align-items:center;">
          ${priorityBadge(tk.priority)}
          ${statusBadge(tk.status)}
        </div>
      </div>
      <div class="text-sm text-muted" style="margin-top:4px;">
        ${categoryLabel(tk.category)} · ${timeAgo(tk.created_at)}
      </div>
    </div>
  `).join('');
}


// ─── Create Ticket ─────────────────────────────────────

async function submitCreateTicket() {
  const subject = document.getElementById('ticketSubject').value.trim();
  const body = document.getElementById('ticketBody').value.trim();
  const category = document.getElementById('ticketCategory').value;
  const priority = document.getElementById('ticketPriority').value;

  if (!subject) { AdminToast.error(t('admin.support.error.subject_required')); return; }
  if (!body) { AdminToast.error(t('admin.support.error.message_required')); return; }

  try {
    await AdminAPI.post('/api/support/tickets', { subject, body, category, priority });
    closeModal('createTicketModal');
    document.getElementById('ticketSubject').value = '';
    document.getElementById('ticketBody').value = '';
    AdminToast.success(t('admin.support.ticket_created'));
    loadMyTickets();
  } catch (err) { /* handled */ }
}


// ─── Ticket Detail View ────────────────────────────────

async function viewTicket(id) {
  _currentTicketId = id;
  try {
    const res = await AdminAPI.get(`/api/support/tickets/${id}`);
    const tk = res.data;

    // Hide list, show detail
    document.getElementById('ticketListContainer').style.display = 'none';
    document.querySelector('[onclick="openModal(\'createTicketModal\')"]')?.parentElement && (document.querySelector('[onclick="openModal(\'createTicketModal\')"]').style.display = 'none');
    document.getElementById('ticketDetailView').style.display = '';

    // Header
    document.getElementById('ticketDetailHeader').innerHTML = `
      <div style="padding:var(--sp-3);">
        <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-2);">
          <strong>#${tk.id}</strong>
          ${statusBadge(tk.status)}
          ${priorityBadge(tk.priority)}
          <span class="text-sm text-muted">${categoryLabel(tk.category)}</span>
        </div>
        <h3 style="margin:0;">${esc(tk.subject)}</h3>
        <p class="text-sm text-muted" style="margin-top:4px;">${t('admin.support.created_ago', { time: timeAgo(tk.created_at) })}</p>
      </div>
    `;

    // Messages
    const msgBody = document.getElementById('messagesBody');
    if (tk.messages && tk.messages.length) {
      msgBody.innerHTML = tk.messages.map(m => {
        const isSA = m.sender_type === 'super_admin';
        return `
          <div style="padding:var(--sp-2);margin-bottom:var(--sp-2);border-radius:var(--radius);${isSA ? 'background:var(--bg-surface);border-left:3px solid var(--primary);' : ''}">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-weight:600;font-size:0.85rem;">
                ${isSA ? t('admin.support.platform_support') : esc(m.sender_name)}
              </span>
              <span class="text-sm text-muted">${timeAgo(m.created_at)}</span>
            </div>
            <div style="white-space:pre-wrap;line-height:1.5;">${esc(m.body)}</div>
          </div>
        `;
      }).join('');
      msgBody.scrollTop = msgBody.scrollHeight;
    } else {
      msgBody.innerHTML = `<p class="text-muted" style="padding:var(--sp-2);">${t('admin.support.no_messages_yet')}</p>`;
    }

    // Disable reply if closed
    const replyInput = document.getElementById('replyInput');
    const replyBtn = replyInput?.nextElementSibling;
    if (tk.status === 'closed') {
      replyInput.disabled = true;
      replyInput.placeholder = t('admin.support.ticket_closed');
      if (replyBtn) replyBtn.disabled = true;
    } else {
      replyInput.disabled = false;
      replyInput.placeholder = t('admin.support.reply_placeholder');
      if (replyBtn) replyBtn.disabled = false;
    }

  } catch (err) { /* handled */ }
}

function showList() {
  document.getElementById('ticketDetailView').style.display = 'none';
  document.getElementById('ticketListContainer').style.display = '';
  document.querySelector('[onclick="openModal(\'createTicketModal\')"]')?.style && (document.querySelector('[onclick="openModal(\'createTicketModal\')"]').style.display = '');
  _currentTicketId = null;
}

async function submitClubReply() {
  if (!_currentTicketId) return;
  const body = document.getElementById('replyInput').value.trim();
  if (!body) { AdminToast.error(t('admin.support.error.reply_empty')); return; }

  try {
    await AdminAPI.post(`/api/support/tickets/${_currentTicketId}/reply`, { body });
    document.getElementById('replyInput').value = '';
    AdminToast.success(t('admin.support.reply_sent'));
    viewTicket(_currentTicketId);
  } catch (err) { /* handled */ }
}


// ─── Helpers ───────────────────────────────────────────

function statusBadge(s) {
  const colors = {
    open: '#3b82f6', in_progress: '#f59e0b', waiting_on_club: '#8b5cf6',
    resolved: '#22c55e', closed: '#9ca3af',
  };
  const c = colors[s] || '#6b7280';
  const label = t('admin.support.status.' + s) || (s || '').replace(/_/g, ' ');
  return `<span style="display:inline-block;background:${c};color:#fff;padding:2px 8px;border-radius:4px;font-size:0.7rem;">${label}</span>`;
}

function priorityBadge(p) {
  const colors = { urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#6b7280' };
  const c = colors[p] || '#6b7280';
  const label = t('admin.support.priority.' + p) || p;
  return `<span style="color:${c};font-weight:600;font-size:0.75rem;">${label}</span>`;
}

function categoryLabel(c) {
  return t('admin.support.cat.' + c) || c;
}

/* timeAgo → shared-utils.js */
