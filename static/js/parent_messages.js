/**
 * HOOPS AI — Parent Messages JS
 * Messaging UI for parent portal: inbox, sent, compose
 */

let currentParentMsgTab = 'inbox';

document.addEventListener('DOMContentLoaded', () => {
  if (!ParentAPI.token) return;
  loadParentMsgInbox();
});


/* === Tab switching === */

function switchParentMsgTab(tab) {
  currentParentMsgTab = tab;
  document.querySelectorAll('.msg-tab').forEach((tab_el, i) => {
    tab_el.classList.toggle('active', ['inbox','sent','compose'][i] === tab);
  });
  document.querySelectorAll('.msg-tab-content').forEach(c => c.style.display = 'none');
  const el = { inbox: 'parentMsgInbox', sent: 'parentMsgSent', compose: 'parentMsgCompose' }[tab];
  document.getElementById(el).style.display = 'block';

  if (tab === 'inbox') loadParentMsgInbox();
  else if (tab === 'sent') loadParentMsgSent();
}


/* === Inbox === */

async function loadParentMsgInbox() {
  const list = document.getElementById('parentInboxList');
  try {
    const res = await ParentAPI.get('/api/messages/inbox');
    const msgs = res.data || [];
    if (msgs.length === 0) {
      list.innerHTML = `<div class="empty-state" style="text-align:center;padding:32px;color:rgba(255,255,255,0.4);"><span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:8px;">inbox</span>${t('parent.messages.no_messages')}</div>`;
      return;
    }
    list.innerHTML = msgs.map(m => `
      <div class="msg-item ${m.is_read ? '' : 'unread'}" onclick="openParentMsgDetail(${JSON.stringify(m).replace(/"/g, '&quot;')})">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span class="msg-sender">${esc(m.sender_name)}</span>
            <span class="msg-role-badge ${m.sender_role}">${m.sender_role}</span>
            ${m.message_type === 'progress_update' ? `<span class="msg-type-badge progress_update">${t('parent.messages.progress_update')}</span>` : ''}
            ${m.message_type === 'urgent' ? `<span class="msg-type-badge urgent">${t('parent.messages.urgent')}</span>` : ''}
            ${m.message_type === 'announcement' ? `<span class="msg-type-badge announcement">${t('parent.messages.announcement')}</span>` : ''}
          </div>
          <span class="msg-time">${parentMsgTimeAgo(m.created_at)} · ${formatMsgDate(m.created_at)}</span>
        </div>
        ${m.subject ? `<div class="msg-subject">${esc(m.subject)}</div>` : ''}
        <div class="msg-preview">${esc((m.body || '').substring(0, 80))}${m.body && m.body.length > 80 ? '...' : ''}</div>
      </div>
    `).join('');
  } catch {
    list.innerHTML = `<div style="text-align:center;padding:16px;color:rgba(255,255,255,0.4);">${t('parent.messages.load_error')}</div>`;
  }
}


function openParentMsgDetail(msg) {
  document.getElementById('parentMsgDetailSubject').textContent = msg.subject || t('parent.messages.default_subject');
  document.getElementById('parentMsgDetailMeta').innerHTML = `
    <span class="msg-sender">${esc(msg.sender_name)}</span>
    <span class="msg-role-badge ${msg.sender_role}">${msg.sender_role}</span>
    ${msg.message_type !== 'general' ? `<span class="msg-type-badge ${msg.message_type}">${msg.message_type}</span>` : ''}
    <span class="msg-time">${parentMsgTimeAgo(msg.created_at)} · ${formatMsgDate(msg.created_at)}</span>
  `;
  // Render body with receipt link support
  let bodyHtml = esc(msg.body);
  bodyHtml = bodyHtml.replace(
    /\[receipt:(\/parent\/receipt\/[^\]]+)\]/g,
    `<a href="$1" target="_blank" style="display:inline-flex;align-items:center;gap:4px;margin-top:8px;padding:8px 16px;background:#eff6ff;color:#3b82f6;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px;"><span class="material-symbols-outlined" style="font-size:18px;">receipt_long</span> הורד קבלה</a>`
  );
  bodyHtml = bodyHtml.replace(/\n/g, '<br>');
  document.getElementById('parentMsgDetailBody').innerHTML = bodyHtml;
  openModal('parentMsgDetailModal');
  if (!msg.is_read) {
    ParentAPI.put(`/api/messages/${msg.id}/read`).then(() => updateParentMsgBadge()).catch(() => {});
  }
}


async function parentMarkAllRead() {
  try {
    await ParentAPI.put('/api/messages/read-all');
    ParentToast.success(t('parent.messages.all_read'));
    loadParentMsgInbox();
    updateParentMsgBadge();
  } catch { /* ignore */ }
}


/* === Sent === */

async function loadParentMsgSent() {
  const list = document.getElementById('parentSentList');
  try {
    const res = await ParentAPI.get('/api/messages/sent');
    const msgs = res.data || [];
    if (msgs.length === 0) {
      list.innerHTML = `<div class="empty-state" style="text-align:center;padding:32px;color:rgba(255,255,255,0.4);"><span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:8px;">outbox</span>${t('parent.messages.no_sent')}</div>`;
      return;
    }
    list.innerHTML = msgs.map(m => {
      const targetLabels = {
        my_coach: t('parent.messages.target.my_coach'), my_team: t('parent.messages.target.my_team'), admin: t('parent.messages.target.admin'),
      };
      return `
        <div class="msg-item">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span class="msg-sender">To: ${targetLabels[m.target_type] || m.target_type}</span>
            <span class="msg-time">${parentMsgTimeAgo(m.created_at)} · ${formatMsgDate(m.created_at)}</span>
          </div>
          ${m.subject ? `<div class="msg-subject">${esc(m.subject)}</div>` : ''}
          <div class="msg-preview">${esc((m.body || '').substring(0, 80))}</div>
        </div>
      `;
    }).join('');
  } catch {
    list.innerHTML = `<div style="text-align:center;padding:16px;color:rgba(255,255,255,0.4);">${t('parent.messages.load_sent_error')}</div>`;
  }
}


/* === Compose === */

async function sendParentMsg() {
  const body = document.getElementById('parentComposeBody').value.trim();
  if (!body) { ParentToast.error(t('parent.messages.body_required')); return; }
  try {
    await ParentAPI.post('/api/messages/send', {
      body,
      subject: document.getElementById('parentComposeSubject').value.trim() || null,
      message_type: 'general',
      target_type: document.getElementById('parentComposeTarget').value,
    });
    ParentToast.success(t('parent.messages.sent'));
    document.getElementById('parentComposeSubject').value = '';
    document.getElementById('parentComposeBody').value = '';
    switchParentMsgTab('sent');
  } catch { /* toast shown by API */ }
}


/* === Badge === */

async function updateParentMsgBadge() {
  try {
    const res = await ParentAPI.get('/api/messages/inbox/count');
    const count = res.data?.unread || 0;
    const badge = document.getElementById('parentMsgBadge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  } catch { /* ignore */ }
}


/* === Helpers === */

function parentMsgTimeAgo(dateStr) {
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

/* formatMsgDate → shared-utils.js */
