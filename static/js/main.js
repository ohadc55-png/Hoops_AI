/**
 * HOOPS AI - Main JavaScript
 * Auth, API helpers, Toast notifications, Utilities
 */

const API = {
  token: localStorage.getItem('hoops_token'),
  coach: JSON.parse(localStorage.getItem('hoops_coach') || 'null'),

  setAuth(token, coach) {
    this.token = token;
    this.coach = coach;
    localStorage.setItem('hoops_token', token);
    localStorage.setItem('hoops_coach', JSON.stringify(coach));
  },

  clearAuth() {
    this.token = null;
    this.coach = null;
    localStorage.removeItem('hoops_token');
    localStorage.removeItem('hoops_coach');
  },

  async request(url, options = {}) {
    const silent = options.silent; delete options.silent;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json();
      if (res.status === 401) {
        this.clearAuth();
        window.location.href = '/login';
        return null;
      }
      if (!res.ok) throw new Error(data.detail || 'Request failed');
      return data;
    } catch (err) {
      if (!silent) Toast.error(err.message);
      throw err;
    }
  },

  get(url, options) { return this.request(url, options || {}); },
  post(url, body) { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); },
  put(url, body) { return this.request(url, { method: 'PUT', body: JSON.stringify(body) }); },
  del(url) { return this.request(url, { method: 'DELETE' }); },

  async upload(url, file) {
    const form = new FormData();
    form.append('file', file);
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(url, { method: 'POST', headers, body: form });
    return res.json();
  },
};


/* Toast Notifications */
const Toast = {
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


/* Auth Guard */
function requireAuth() {
  const path = window.location.pathname;
  const isPublic = ['/login', '/register'].includes(path) || path.startsWith('/join/') || path.startsWith('/super-admin/');
  if (!API.token && !isPublic) {
    window.location.href = '/login';
    return false;
  }
  return true;
}


/* Modal Helpers */
function openModal(id) {
  document.getElementById(id)?.classList.add('active');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}


/* HTML escape */
function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }


/* Format helpers */
function timeAgo(dateStr) {
  const d = dateStr && !dateStr.endsWith('Z') ? dateStr + 'Z' : dateStr;
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function capitalize(str) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}


/* Init */
document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  requireAuth();

  // Update user avatar
  if (API.coach) {
    const avatar = document.getElementById('userAvatar');
    if (avatar) {
      avatar.innerHTML = `<span style="font-weight:700;font-size:14px;">${API.coach.name?.charAt(0)?.toUpperCase() || 'C'}</span>`;
    }
  }

  // Notification bell
  const notifBtn = document.getElementById('notifBtn');
  const notifDrop = document.getElementById('notifDropdown');
  if (notifBtn && notifDrop) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDrop.classList.toggle('open');
    });
    document.addEventListener('click', () => notifDrop.classList.remove('open'));
    notifDrop.addEventListener('click', (e) => e.stopPropagation());
  }

  // Load notifications into bell
  loadNotifications();

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

  // Global search
  const searchInput = document.getElementById('globalSearch');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const q = searchInput.value.trim().toLowerCase();
      if (!q) return;
      const routes = [
        { keywords: ['drill', 'תרגיל'], path: '/drills' },
        { keywords: ['play', 'משחק', 'תרשים'], path: '/plays' },
        { keywords: ['practice', 'אימון'], path: '/practice' },
        { keywords: ['team', 'player', 'event', 'roster', 'שחקן', 'אירוע', 'קבוצה'], path: '/logistics' },
        { keywords: ['analytics', 'stat', 'ניתוח'], path: '/analytics' },
        { keywords: ['setting', 'הגדר'], path: '/settings' },
        { keywords: ['chat', 'צאט', 'שיחה'], path: '/' },
      ];
      for (const r of routes) {
        if (r.keywords.some(k => q.includes(k))) {
          window.location.href = r.path;
          return;
        }
      }
      Toast.info('Try searching for: drills, plays, practice, team, analytics, settings');
    });
  }
});


// ===== NOTIFICATION BELL =====
async function loadNotifications() {
  if (!API.token) return;
  try {
    const [pendingRes, msgCountRes] = await Promise.all([
      API.get('/api/reports/games/pending', { silent: true }).catch(() => null),
      API.get('/api/messages/inbox/count', { silent: true }).catch(() => null),
    ]);

    const pending = pendingRes?.data || [];
    const unreadMsgs = msgCountRes?.data?.unread || 0;
    const totalBadge = pending.length + unreadMsgs;

    const notifBtn = document.getElementById('notifBtn');
    const notifDrop = document.getElementById('notifDropdown');
    if (!notifBtn || !notifDrop) return;

    // Badge
    let badge = notifBtn.querySelector('.notif-badge');
    if (totalBadge > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'notif-badge';
        notifBtn.appendChild(badge);
      }
      badge.textContent = totalBadge;
      badge.style.display = '';
    } else if (badge) {
      badge.style.display = 'none';
    }

    // Dropdown content
    let html = '<div class="notif-dropdown-header">Notifications</div>';
    if (pending.length === 0 && unreadMsgs === 0) {
      html += `<div class="notif-dropdown-empty">
        <span class="material-symbols-outlined" style="font-size:32px;color:var(--text-muted)">notifications_off</span>
        <p>No notifications</p>
      </div>`;
    } else {
      html += '<div class="notif-list">';
      for (const e of pending) {
        html += `<a class="notif-item notif-game-reminder" data-event='${JSON.stringify(e).replace(/'/g, "&#39;")}' href="/reports">
          <span class="material-symbols-outlined notif-icon" style="color:var(--warning)">sports_basketball</span>
          <div class="notif-content">
            <div class="notif-text">vs ${esc(e.opponent || 'Unknown')} (${e.date})</div>
            <div class="notif-sub">המשחק הסתיים — מלא דוח משחק</div>
          </div>
        </a>`;
      }
      if (unreadMsgs > 0) {
        html += `<a class="notif-item" href="/messages">
          <span class="material-symbols-outlined notif-icon" style="color:var(--primary)">mail</span>
          <div class="notif-content">
            <div class="notif-text">${unreadMsgs} הודעות שלא נקראו</div>
          </div>
        </a>`;
      }
      html += '</div>';
    }
    notifDrop.innerHTML = html;

    // On game reminder click — store event data for reports page
    notifDrop.querySelectorAll('.notif-game-reminder').forEach(item => {
      item.addEventListener('click', () => {
        try {
          const eventData = JSON.parse(item.dataset.event);
          localStorage.setItem('hoops_open_game_report', JSON.stringify(eventData));
        } catch(err) {}
      });
    });
  } catch(e) {
    // Silent — notifications are not critical
  }
}
