/**
 * HOOPS AI — Player Messages JS
 * Inbox + Compose for player messaging (coach & team only)
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!PlayerAPI.token) return;
  loadPlayerMsgInbox();
});

function switchPlayerMsgTab(tab) {
  document.querySelectorAll('.msg-tab').forEach((t, i) => {
    t.classList.toggle('active', ['inbox','compose'][i] === tab);
  });
  document.getElementById('playerMsgInbox').style.display = tab === 'inbox' ? 'block' : 'none';
  document.getElementById('playerMsgCompose').style.display = tab === 'compose' ? 'block' : 'none';
  if (tab === 'inbox') loadPlayerMsgInbox();
}

async function loadPlayerMsgInbox() {
  const list = document.getElementById('playerInboxList');
  try {
    const res = await PlayerAPI.get('/api/messages/inbox');
    const msgs = res.data || [];
    if (msgs.length === 0) {
      list.innerHTML = '<div class="empty-state" style="text-align:center;padding:24px;color:rgba(255,255,255,0.4);"><span class="material-symbols-outlined" style="font-size:36px;display:block;margin-bottom:8px;">inbox</span>No messages</div>';
      return;
    }
    list.innerHTML = msgs.map(m => `
      <div class="msg-item ${m.is_read ? '' : 'unread'}" onclick="openPlayerMsgDetail(${JSON.stringify(m).replace(/"/g, '&quot;')})">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span class="msg-sender">${esc(m.sender_name)}</span>
            <span class="msg-role-badge ${m.sender_role}">${m.sender_role}</span>
            ${m.message_type !== 'general' ? `<span class="msg-type-badge ${m.message_type}">${m.message_type}</span>` : ''}
          </div>
          <span class="msg-time">${msgTimeAgo(m.created_at)}</span>
        </div>
        ${m.subject ? `<div class="msg-subject">${esc(m.subject)}</div>` : ''}
        <div class="msg-preview">${esc((m.body || '').substring(0, 80))}</div>
      </div>
    `).join('');
  } catch {
    list.innerHTML = '<div style="text-align:center;padding:16px;color:rgba(255,255,255,0.4);">Could not load messages</div>';
  }
}

function openPlayerMsgDetail(msg) {
  document.getElementById('playerMsgDetailSubject').textContent = msg.subject || 'Message';
  document.getElementById('playerMsgDetailMeta').innerHTML = `
    <span class="msg-sender">${esc(msg.sender_name)}</span>
    <span class="msg-role-badge ${msg.sender_role}">${msg.sender_role}</span>
    <span class="msg-time">${msgTimeAgo(msg.created_at)}</span>
  `;
  document.getElementById('playerMsgDetailBody').textContent = msg.body;
  document.getElementById('playerMsgDetailModal').classList.add('active');
  if (!msg.is_read) {
    PlayerAPI.put(`/api/messages/${msg.id}/read`).then(() => updatePlayerMsgBadge()).catch(() => {});
  }
}

function closePlayerMsgModal() {
  document.getElementById('playerMsgDetailModal').classList.remove('active');
}

async function sendPlayerMsg() {
  const body = document.getElementById('playerComposeBody').value.trim();
  if (!body) { PlayerToast.error('Message body is required'); return; }
  const payload = {
    body,
    subject: document.getElementById('playerComposeSubject').value.trim() || null,
    message_type: 'general',
    target_type: document.getElementById('playerComposeTarget').value,
  };
  try {
    await PlayerAPI.post('/api/messages/send', payload);
    PlayerToast.success('Message sent');
    document.getElementById('playerComposeSubject').value = '';
    document.getElementById('playerComposeBody').value = '';
    switchPlayerMsgTab('inbox');
  } catch { /* toast shown by API */ }
}

async function updatePlayerMsgBadge() {
  try {
    const res = await PlayerAPI.get('/api/messages/inbox/count');
    const count = res.data?.unread || 0;
    const badge = document.getElementById('playerMsgBadge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  } catch { /* ignore */ }
}

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
