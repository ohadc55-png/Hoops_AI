/**
 * HOOPS AI — Super Admin Main JS
 * Auth, API helpers, Toast notifications for Platform Management Portal
 */

/* API & Toast — powered by api-core.js factory */
const SuperAdminToast = createHoopsToast();
const SuperAdminAPI = createHoopsAPI({
  tokenKey: 'hoops_super_admin_token',
  userKey: 'hoops_super_admin_user',
  loginUrl: '/super-admin/login',
  toastRef: () => SuperAdminToast,
});


/* Auth Guard for Super Admin Pages */
function requireSuperAdminAuth() {
  const publicPages = ['/super-admin/login'];
  if (!SuperAdminAPI.token && !publicPages.includes(window.location.pathname)) {
    window.location.href = '/super-admin/login';
    return false;
  }
  return true;
}


/* Logout */
function superAdminLogout() {
  SuperAdminAPI.clearAuth();
  window.location.href = '/super-admin/login';
}


/* esc, openModal, closeModal → shared-utils.js */


/* Clipboard helper */
async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const icon = btn.querySelector('.material-symbols-outlined');
    const orig = icon.textContent;
    icon.textContent = 'check';
    setTimeout(() => icon.textContent = orig, 1500);
    SuperAdminToast.success('Copied to clipboard');
  } catch {
    SuperAdminToast.error('Failed to copy');
  }
}


/* ─── Notification System ─────────────────────────────── */
let _notifDropdownOpen = false;
let _notifPollInterval = null;

const NOTIF_ICONS = {
  storage_threshold: 'hard_drive',
  tier_threshold: 'group',
  payment_overdue: 'warning',
  payment_received: 'paid',
  new_ticket: 'support_agent',
  ticket_reply: 'reply',
  club_registered: 'domain_add',
  billing_cycle: 'receipt_long',
  system: 'info',
};

function toggleNotifDropdown() {
  const dd = document.getElementById('notifDropdown');
  if (!dd) return;
  _notifDropdownOpen = !_notifDropdownOpen;
  dd.style.display = _notifDropdownOpen ? '' : 'none';
  if (_notifDropdownOpen) loadNotifDropdown();
}

async function loadNotifDropdown() {
  try {
    const res = await SuperAdminAPI.get('/api/super/notifications/unread?limit=15');
    const body = document.getElementById('notifDropdownBody');
    const notifs = res.data;
    if (!notifs || !notifs.length) {
      body.innerHTML = '<div style="padding:var(--sp-4);text-align:center;color:var(--text-muted);font-size:0.85rem;">No new notifications</div>';
      return;
    }
    body.innerHTML = notifs.map(n => `
      <div class="sa-notif-item unread" onclick="onNotifClick(${n.id}, '${esc(n.action_url || '')}')">
        <div class="sa-notif-item-icon ${n.priority}">
          <span class="material-symbols-outlined">${NOTIF_ICONS[n.type] || 'info'}</span>
        </div>
        <div class="sa-notif-item-content">
          <div class="sa-notif-item-title">${esc(n.title)}</div>
          ${n.body ? `<div class="sa-notif-item-body">${esc(n.body)}</div>` : ''}
          <div class="sa-notif-item-time">${_notifTimeAgo(n.created_at)}</div>
        </div>
      </div>
    `).join('');
  } catch { /* handled */ }
}

async function onNotifClick(id, url) {
  try {
    await SuperAdminAPI.put(`/api/super/notifications/${id}/read`);
  } catch { /* ok */ }
  if (url) window.location.href = url;
  else { toggleNotifDropdown(); pollNotifCount(); }
}

async function markAllNotificationsRead() {
  try {
    await SuperAdminAPI.put('/api/super/notifications/read-all');
    const body = document.getElementById('notifDropdownBody');
    if (body) body.innerHTML = '<div style="padding:var(--sp-4);text-align:center;color:var(--text-muted);font-size:0.85rem;">No new notifications</div>';
    updateNotifBadge(0);
    SuperAdminToast.success('All notifications marked as read');
  } catch { /* handled */ }
}

async function pollNotifCount() {
  try {
    const res = await SuperAdminAPI.get('/api/super/notifications/unread-count');
    updateNotifBadge(res.data.count);
  } catch { /* silent */ }
}

function updateNotifBadge(count) {
  const badge = document.getElementById('notifCount');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

/* _notifTimeAgo → shared-utils.js */


/* Init */
document.addEventListener('DOMContentLoaded', () => {
  SuperAdminToast.init();
  requireSuperAdminAuth();

  // Update user avatar
  if (SuperAdminAPI.user) {
    const avatar = document.getElementById('userAvatar');
    if (avatar) {
      avatar.innerHTML = `<span style="font-weight:700;font-size:14px;">${SuperAdminAPI.user.name?.charAt(0)?.toUpperCase() || 'S'}</span>`;
    }
  }

  // Sidebar toggle → shared-utils.js

  // Close notification dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (_notifDropdownOpen && !e.target.closest('#notifBtn') && !e.target.closest('#notifDropdown')) {
      _notifDropdownOpen = false;
      const dd = document.getElementById('notifDropdown');
      if (dd) dd.style.display = 'none';
    }
  });

  // Start polling notifications (every 30 seconds)
  if (SuperAdminAPI.token && !window.location.pathname.includes('/login')) {
    pollNotifCount();
    _notifPollInterval = setInterval(pollNotifCount, 30000);
  }
});
