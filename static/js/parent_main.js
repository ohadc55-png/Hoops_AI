/**
 * HOOPS AI — Parent Main JS
 * Auth, API helpers, Toast notifications for Parent Portal
 */

const ParentAPI = {
  token: localStorage.getItem('hoops_parent_token'),
  user: JSON.parse(localStorage.getItem('hoops_parent_user') || 'null'),

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('hoops_parent_token', token);
    localStorage.setItem('hoops_parent_user', JSON.stringify(user));
  },

  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('hoops_parent_token');
    localStorage.removeItem('hoops_parent_user');
  },

  async request(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json();
      if (res.status === 401) {
        this.clearAuth();
        window.location.href = '/parent/login';
        return null;
      }
      if (!res.ok) throw new Error(data.detail || 'Request failed');
      return data;
    } catch (err) {
      ParentToast.error(err.message);
      throw err;
    }
  },

  get(url) { return this.request(url); },
  post(url, body) { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); },
  put(url, body) { return this.request(url, { method: 'PUT', body: JSON.stringify(body) }); },
  del(url) { return this.request(url, { method: 'DELETE' }); },
};


/* Toast Notifications */
const ParentToast = {
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


/* Auth Guard for Parent Pages */
function requireParentAuth() {
  const publicPages = ['/parent/login', '/parent/register'];
  const isJoinPage = window.location.pathname.startsWith('/join/');
  if (!ParentAPI.token && !publicPages.includes(window.location.pathname) && !isJoinPage) {
    window.location.href = '/parent/login';
    return false;
  }
  return true;
}


/* Parent Logout */
function parentLogout() {
  ParentAPI.clearAuth();
  window.location.href = '/parent/login';
}


/* Helpers */
function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }


/* Init */
document.addEventListener('DOMContentLoaded', () => {
  ParentToast.init();
  requireParentAuth();

  // Update user avatar
  if (ParentAPI.user) {
    const avatar = document.getElementById('userAvatar');
    if (avatar) {
      avatar.innerHTML = `<span style="font-weight:700;font-size:14px;">${ParentAPI.user.name?.charAt(0)?.toUpperCase() || 'P'}</span>`;
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

  // Badge counts
  if (ParentAPI.token) {
    updateParentBadges();
    setInterval(updateParentBadges, 30000);
  }
});


/* Badge Counts */
async function updateParentBadges() {
  try {
    const res = await ParentAPI.get('/api/parent/badge-counts');
    const d = res.data;
    _setBadge('parentPaymentsBadge', d.payments);
    _setBadge('parentVideosBadge', d.videos);
    _setBadge('parentMsgBadge', d.messages);
  } catch { /* ignore */ }
}

function _setBadge(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = count;
  el.style.display = count > 0 ? 'inline-flex' : 'none';
}
