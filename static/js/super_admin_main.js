/**
 * HOOPS AI — Super Admin Main JS
 * Auth, API helpers, Toast notifications for Platform Management Portal
 */

const SuperAdminAPI = {
  token: localStorage.getItem('hoops_super_admin_token'),
  user: JSON.parse(localStorage.getItem('hoops_super_admin_user') || 'null'),

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('hoops_super_admin_token', token);
    localStorage.setItem('hoops_super_admin_user', JSON.stringify(user));
  },

  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('hoops_super_admin_token');
    localStorage.removeItem('hoops_super_admin_user');
  },

  async request(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json();
      if (res.status === 401) {
        this.clearAuth();
        window.location.href = '/super-admin/login';
        return null;
      }
      if (!res.ok) throw new Error(data.detail || 'Request failed');
      return data;
    } catch (err) {
      SuperAdminToast.error(err.message);
      throw err;
    }
  },

  get(url) { return this.request(url); },
  post(url, body) { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); },
  put(url, body) { return this.request(url, { method: 'PUT', body: JSON.stringify(body) }); },
  del(url) { return this.request(url, { method: 'DELETE' }); },
};


/* Toast Notifications */
const SuperAdminToast = {
  container: null,

  init() {
    this.container = document.getElementById('toastContainer');
  },

  show(message, type = 'info') {
    if (!this.container) this.init();
    const icons = { success: 'check_circle', error: 'error', info: 'info' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="material-symbols-outlined">${icons[type] || 'info'}</span>${esc(message)}`;
    this.container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); },
  info(msg) { this.show(msg, 'info'); },
};


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


/* Helpers */
function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }


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

function _notifTimeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return d.toLocaleDateString();
}


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

  // Sidebar toggle (mobile)
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      sidebarOverlay?.classList.toggle('open');
    });
    sidebarOverlay?.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('open');
    });
  }

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
