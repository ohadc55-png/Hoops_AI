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
        <p style="color:var(--text-muted);">No support tickets yet. Click "New Ticket" to contact platform support.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = tickets.map(t => `
    <div class="card" style="padding:var(--sp-3);margin-bottom:var(--sp-2);cursor:pointer;" onclick="viewTicket(${t.id})">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--sp-1);">
        <div>
          <strong>#${t.id}</strong> — ${esc(t.subject)}
        </div>
        <div style="display:flex;gap:var(--sp-1);align-items:center;">
          ${priorityBadge(t.priority)}
          ${statusBadge(t.status)}
        </div>
      </div>
      <div class="text-sm text-muted" style="margin-top:4px;">
        ${categoryLabel(t.category)} · ${timeAgo(t.created_at)}
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

  if (!subject) { AdminToast.error('Subject is required'); return; }
  if (!body) { AdminToast.error('Message is required'); return; }

  try {
    await AdminAPI.post('/api/support/tickets', { subject, body, category, priority });
    closeModal('createTicketModal');
    document.getElementById('ticketSubject').value = '';
    document.getElementById('ticketBody').value = '';
    AdminToast.success('Ticket created');
    loadMyTickets();
  } catch (err) { /* handled */ }
}


// ─── Ticket Detail View ────────────────────────────────

async function viewTicket(id) {
  _currentTicketId = id;
  try {
    const res = await AdminAPI.get(`/api/support/tickets/${id}`);
    const t = res.data;

    // Hide list, show detail
    document.getElementById('ticketListContainer').style.display = 'none';
    document.querySelector('[onclick="openModal(\'createTicketModal\')"]')?.parentElement && (document.querySelector('[onclick="openModal(\'createTicketModal\')"]').style.display = 'none');
    document.getElementById('ticketDetailView').style.display = '';

    // Header
    document.getElementById('ticketDetailHeader').innerHTML = `
      <div style="padding:var(--sp-3);">
        <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-2);">
          <strong>#${t.id}</strong>
          ${statusBadge(t.status)}
          ${priorityBadge(t.priority)}
          <span class="text-sm text-muted">${categoryLabel(t.category)}</span>
        </div>
        <h3 style="margin:0;">${esc(t.subject)}</h3>
        <p class="text-sm text-muted" style="margin-top:4px;">Created ${timeAgo(t.created_at)}</p>
      </div>
    `;

    // Messages
    const msgBody = document.getElementById('messagesBody');
    if (t.messages && t.messages.length) {
      msgBody.innerHTML = t.messages.map(m => {
        const isSA = m.sender_type === 'super_admin';
        return `
          <div style="padding:var(--sp-2);margin-bottom:var(--sp-2);border-radius:var(--radius);${isSA ? 'background:var(--bg-surface);border-left:3px solid var(--primary);' : ''}">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-weight:600;font-size:0.85rem;">
                ${isSA ? 'Platform Support' : esc(m.sender_name)}
              </span>
              <span class="text-sm text-muted">${timeAgo(m.created_at)}</span>
            </div>
            <div style="white-space:pre-wrap;line-height:1.5;">${esc(m.body)}</div>
          </div>
        `;
      }).join('');
      msgBody.scrollTop = msgBody.scrollHeight;
    } else {
      msgBody.innerHTML = '<p class="text-muted" style="padding:var(--sp-2);">No messages yet.</p>';
    }

    // Disable reply if closed
    const replyInput = document.getElementById('replyInput');
    const replyBtn = replyInput?.nextElementSibling;
    if (t.status === 'closed') {
      replyInput.disabled = true;
      replyInput.placeholder = 'This ticket is closed';
      if (replyBtn) replyBtn.disabled = true;
    } else {
      replyInput.disabled = false;
      replyInput.placeholder = 'Type your reply...';
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
  if (!body) { AdminToast.error('Reply cannot be empty'); return; }

  try {
    await AdminAPI.post(`/api/support/tickets/${_currentTicketId}/reply`, { body });
    document.getElementById('replyInput').value = '';
    AdminToast.success('Reply sent');
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
  return `<span style="display:inline-block;background:${c};color:#fff;padding:2px 8px;border-radius:4px;font-size:0.7rem;text-transform:uppercase;">${(s || '').replace(/_/g, ' ')}</span>`;
}

function priorityBadge(p) {
  const colors = { urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#6b7280' };
  const c = colors[p] || '#6b7280';
  return `<span style="color:${c};font-weight:600;font-size:0.75rem;text-transform:uppercase;">${p}</span>`;
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
