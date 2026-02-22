/**
 * HOOPS AI — Player Main JS
 * Auth, API helpers, Toast notifications, Badge & Notification system for Player Portal
 */

const PlayerAPI = {
  token: localStorage.getItem('hoops_player_token'),
  user: JSON.parse(localStorage.getItem('hoops_player_user') || 'null'),

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('hoops_player_token', token);
    localStorage.setItem('hoops_player_user', JSON.stringify(user));
  },

  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('hoops_player_token');
    localStorage.removeItem('hoops_player_user');
  },

  async request(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json();
      if (res.status === 401) {
        this.clearAuth();
        window.location.href = '/player/login';
        return null;
      }
      if (!res.ok) throw new Error(data.detail || 'Request failed');
      return data;
    } catch (err) {
      PlayerToast.error(err.message);
      throw err;
    }
  },

  get(url) { return this.request(url); },
  post(url, body) { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); },
  put(url, body) { return this.request(url, { method: 'PUT', body: JSON.stringify(body) }); },
  del(url) { return this.request(url, { method: 'DELETE' }); },
};


/* Toast Notifications */
const PlayerToast = {
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


/* Auth Guard for Player Pages */
function requirePlayerAuth() {
  const publicPages = ['/player/login', '/player/register'];
  const isJoinPage = window.location.pathname.startsWith('/join/');
  if (!PlayerAPI.token && !publicPages.includes(window.location.pathname) && !isJoinPage) {
    window.location.href = '/player/login';
    return false;
  }
  return true;
}


/* Player Logout */
function playerLogout() {
  PlayerAPI.clearAuth();
  window.location.href = '/player/login';
}


/* Helpers */
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function capitalize(str) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function _playerTimeAgo(dateStr) {
  if (!dateStr) return '';
  let d = dateStr;
  if (!d.endsWith('Z') && !d.includes('+')) d += 'Z';
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return 'עכשיו';
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דק'`;
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שע'`;
  if (diff < 604800) return `לפני ${Math.floor(diff / 86400)} ימים`;
  return new Date(d).toLocaleDateString('he-IL');
}


/* Init */
document.addEventListener('DOMContentLoaded', () => {
  PlayerToast.init();
  requirePlayerAuth();

  // Update user avatar
  if (PlayerAPI.user) {
    const avatar = document.getElementById('userAvatar');
    if (avatar) {
      avatar.innerHTML = `<span style="font-weight:700;font-size:14px;">${PlayerAPI.user.name?.charAt(0)?.toUpperCase() || 'P'}</span>`;
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

  // Notification bell toggle
  const notifBtn = document.getElementById('playerNotifBtn');
  const notifDrop = document.getElementById('playerNotifDropdown');
  if (notifBtn && notifDrop) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDrop.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!notifDrop.contains(e.target) && e.target !== notifBtn) {
        notifDrop.classList.remove('open');
      }
    });
  }

  // Badge counts + notifications
  if (PlayerAPI.token) {
    updatePlayerBadges();
    updatePlayerNotifications();
    setInterval(updatePlayerBadges, 30000);
    setInterval(updatePlayerNotifications, 30000);
  }
});


/* ===== Sidebar Badge Counts ===== */
async function updatePlayerBadges() {
  try {
    const res = await PlayerAPI.get('/api/player/badge-counts');
    if (!res || !res.data) return;
    const d = res.data;
    _setBadge('playerDrillsBadge', d.drills);
    _setBadge('playerPlaysBadge', d.plays);
    _setBadge('playerVideosBadge', d.videos);
    _setBadge('playerMsgBadge', d.messages);
  } catch { /* ignore */ }
}

function _setBadge(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = count;
  el.style.display = count > 0 ? 'inline-flex' : 'none';
}


/* ===== Notification Bell ===== */
async function updatePlayerNotifications() {
  try {
    const res = await PlayerAPI.get('/api/player/notifications');
    if (!res || !res.data) return;
    const items = res.data;

    const notifBtn = document.getElementById('playerNotifBtn');
    const notifDrop = document.getElementById('playerNotifDropdown');
    if (!notifBtn || !notifDrop) return;

    // Bell badge
    let badge = notifBtn.querySelector('.notif-badge');
    if (items.length > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'notif-badge';
        notifBtn.appendChild(badge);
      }
      badge.textContent = items.length;
      badge.style.display = '';
    } else if (badge) {
      badge.style.display = 'none';
    }

    // Dropdown content
    const typeColors = {
      drill: '#22c55e',
      play: '#60A5FA',
      video: '#F87171',
      message: '#FBBF24',
    };

    let html = '<div class="notif-dropdown-header">התראות</div>';
    if (items.length === 0) {
      html += `<div class="notif-dropdown-empty">
        <span class="material-symbols-outlined" style="font-size:32px;color:var(--text-muted)">notifications_off</span>
        <p>אין התראות חדשות</p>
      </div>`;
    } else {
      html += '<div class="notif-list">';
      for (const item of items) {
        const color = typeColors[item.type] || 'var(--primary)';
        const timeStr = _playerTimeAgo(item.time);
        html += `<a class="notif-item" href="${item.link}">
          <span class="material-symbols-outlined notif-icon" style="color:${color}">${esc(item.icon)}</span>
          <div class="notif-content">
            <div class="notif-text">${esc(item.text)}</div>
            ${timeStr ? `<div class="notif-sub">${timeStr}</div>` : ''}
          </div>
        </a>`;
      }
      html += '</div>';
    }
    notifDrop.innerHTML = html;
  } catch { /* ignore */ }
}
