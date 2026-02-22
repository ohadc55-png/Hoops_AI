/**
 * HOOPS AI — Coach Messages JS
 * Messaging UI for coach portal: inbox, sent, compose
 */

let currentCoachMsgTab = 'inbox';

/** Safe fetch for messaging — does NOT redirect on 401 (avoids kicking coach to login) */
async function msgFetch(url, options = {}) {
  const headers = { ...options.headers };
  if (API.token) headers['Authorization'] = `Bearer ${API.token}`;
  if (options.body) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Request failed');
  return res.json();
}

document.addEventListener('DOMContentLoaded', () => {
  if (!API.token) return;
  loadCoachMsgInbox();
  updateCoachMsgBadge();
  setInterval(updateCoachMsgBadge, 30000);
});


/* === Tab switching === */

function switchCoachMsgTab(tab) {
  currentCoachMsgTab = tab;
  document.querySelectorAll('.msg-tab').forEach((t, i) => {
    t.classList.toggle('active', ['inbox','sent','compose'][i] === tab);
  });
  document.querySelectorAll('.msg-tab-content').forEach(c => c.style.display = 'none');
  const el = { inbox: 'coachMsgInbox', sent: 'coachMsgSent', compose: 'coachMsgCompose' }[tab];
  document.getElementById(el).style.display = 'block';

  if (tab === 'inbox') loadCoachMsgInbox();
  else if (tab === 'sent') loadCoachMsgSent();
}


/* === Inbox === */

async function loadCoachMsgInbox(retryCount = 0) {
  const list = document.getElementById('coachInboxList');
  try {
    const res = await msgFetch('/api/messages/inbox');
    const msgs = res.data || [];
    if (msgs.length === 0) {
      list.innerHTML = '<div class="empty-state" style="text-align:center;padding:32px;color:rgba(255,255,255,0.4);"><span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:8px;">inbox</span>No messages</div>';
      return;
    }
    list.innerHTML = msgs.map(m => `
      <div class="msg-item ${m.is_read ? '' : 'unread'}" onclick="openCoachMsgDetail(${JSON.stringify(m).replace(/"/g, '&quot;')})">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span class="msg-sender">${esc(m.sender_name)}</span>
            <span class="msg-role-badge ${m.sender_role}">${m.sender_role}</span>
            ${m.message_type !== 'general' ? `<span class="msg-type-badge ${m.message_type}">${m.message_type}</span>` : ''}
          </div>
          <span class="msg-time">${msgTimeAgo(m.created_at)}</span>
        </div>
        ${m.subject ? `<div class="msg-subject">${esc(m.subject)}</div>` : ''}
        <div class="msg-preview">${esc((m.body || '').substring(0, 80))}${m.body && m.body.length > 80 ? '...' : ''}</div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load inbox:', err);
    if (retryCount < 2) {
      setTimeout(() => loadCoachMsgInbox(retryCount + 1), 1000);
      return;
    }
    list.innerHTML = `<div style="text-align:center;padding:16px;color:rgba(255,255,255,0.4);">
      Could not load messages<br>
      <button class="btn btn-secondary btn-sm" style="margin-top:8px;" onclick="loadCoachMsgInbox()">Retry</button>
    </div>`;
  }
}


function openCoachMsgDetail(msg) {
  document.getElementById('coachMsgDetailSubject').textContent = msg.subject || 'Message';
  document.getElementById('coachMsgDetailMeta').innerHTML = `
    <span class="msg-sender">${esc(msg.sender_name)}</span>
    <span class="msg-role-badge ${msg.sender_role}">${msg.sender_role}</span>
    ${msg.message_type !== 'general' ? `<span class="msg-type-badge ${msg.message_type}">${msg.message_type}</span>` : ''}
    <span class="msg-time">${msgTimeAgo(msg.created_at)}</span>
  `;
  document.getElementById('coachMsgDetailBody').textContent = msg.body;
  openModal('coachMsgDetailModal');
  if (!msg.is_read) {
    msgFetch(`/api/messages/${msg.id}/read`, { method: 'PUT' }).then(() => updateCoachMsgBadge()).catch(() => {});
  }
}


async function coachMarkAllRead() {
  try {
    await msgFetch('/api/messages/read-all', { method: 'PUT' });
    Toast.success('All messages marked as read');
    loadCoachMsgInbox();
    updateCoachMsgBadge();
  } catch { /* ignore */ }
}


/* === Sent === */

async function loadCoachMsgSent(retryCount = 0) {
  const list = document.getElementById('coachSentList');
  try {
    const res = await msgFetch('/api/messages/sent');
    const msgs = res.data || [];
    if (msgs.length === 0) {
      list.innerHTML = '<div class="empty-state" style="text-align:center;padding:32px;color:rgba(255,255,255,0.4);"><span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:8px;">outbox</span>No sent messages</div>';
      return;
    }
    list.innerHTML = msgs.map(m => {
      const targetLabels = {
        admin: 'Management', my_team_players: 'Team Players',
        my_team_parents: 'Team Parents', my_team: 'Entire Team',
      };
      return `
        <div class="msg-item">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span class="msg-sender">To: ${targetLabels[m.target_type] || m.target_type}</span>
            <span class="msg-time">${msgTimeAgo(m.created_at)}</span>
          </div>
          ${m.subject ? `<div class="msg-subject">${esc(m.subject)}</div>` : ''}
          <div class="msg-preview">${esc((m.body || '').substring(0, 80))}</div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load sent messages:', err);
    if (retryCount < 2) {
      setTimeout(() => loadCoachMsgSent(retryCount + 1), 1000);
      return;
    }
    list.innerHTML = `<div style="text-align:center;padding:16px;color:rgba(255,255,255,0.4);">
      Could not load messages<br>
      <button class="btn btn-secondary btn-sm" style="margin-top:8px;" onclick="loadCoachMsgSent()">Retry</button>
    </div>`;
  }
}


/* === Compose === */

async function sendCoachMessage() {
  const body = document.getElementById('coachComposeBody').value.trim();
  if (!body) { Toast.error('Message body is required'); return; }

  try {
    await msgFetch('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        body,
        subject: document.getElementById('coachComposeSubject').value.trim() || null,
        message_type: 'general',
        target_type: document.getElementById('coachComposeTarget').value,
      }),
    });
    Toast.success('Message sent');
    document.getElementById('coachComposeSubject').value = '';
    document.getElementById('coachComposeBody').value = '';
    switchCoachMsgTab('sent');
  } catch (err) {
    Toast.error(err.message || 'Failed to send');
  }
}


/* === Badge === */

async function updateCoachMsgBadge() {
  try {
    const res = await msgFetch('/api/messages/inbox/count');
    const count = res.data?.unread || 0;
    const badge = document.getElementById('coachMsgBadge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  } catch { /* ignore */ }
}


/* === Helpers === */

function msgTimeAgo(dateStr) {
  if (!dateStr) return '';
  let d = dateStr;
  if (!d.endsWith('Z') && !d.includes('+')) d += 'Z';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return new Date(d).toLocaleDateString();
}
