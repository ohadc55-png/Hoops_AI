/**
 * HOOPS AI — Admin Main JS
 * Auth, API helpers, Toast notifications for Management Portal
 */

const AdminAPI = {
  token: localStorage.getItem('hoops_admin_token'),
  user: JSON.parse(localStorage.getItem('hoops_admin_user') || 'null'),

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('hoops_admin_token', token);
    localStorage.setItem('hoops_admin_user', JSON.stringify(user));
  },

  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('hoops_admin_token');
    localStorage.removeItem('hoops_admin_user');
  },

  async request(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json();
      if (res.status === 401) {
        this.clearAuth();
        window.location.href = '/admin/login';
        return null;
      }
      if (!res.ok) throw new Error(data.detail || 'Request failed');
      return data;
    } catch (err) {
      AdminToast.error(err.message);
      throw err;
    }
  },

  get(url) { return this.request(url); },
  post(url, body) { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); },
  put(url, body) { return this.request(url, { method: 'PUT', body: JSON.stringify(body) }); },
  del(url) { return this.request(url, { method: 'DELETE' }); },
};


/* Toast Notifications */
const AdminToast = {
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


/* Auth Guard for Admin Pages */
function requireAdminAuth() {
  const publicPages = ['/admin/login', '/admin/register'];
  if (!AdminAPI.token && !publicPages.includes(window.location.pathname)) {
    window.location.href = '/admin/login';
    return false;
  }
  return true;
}


/* Admin Logout */
function adminLogout() {
  AdminAPI.clearAuth();
  window.location.href = '/admin/login';
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
    AdminToast.success('Copied to clipboard');
  } catch {
    AdminToast.error('Failed to copy');
  }
}


/* Init */
document.addEventListener('DOMContentLoaded', () => {
  AdminToast.init();
  requireAdminAuth();

  // Update user avatar
  if (AdminAPI.user) {
    const avatar = document.getElementById('userAvatar');
    if (avatar) {
      avatar.innerHTML = `<span style="font-weight:700;font-size:14px;">${AdminAPI.user.name?.charAt(0)?.toUpperCase() || 'A'}</span>`;
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
});
