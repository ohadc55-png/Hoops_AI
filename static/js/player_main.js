/**
 * HOOPS AI — Player Main JS
 * Auth, API helpers, Toast notifications, Badge & Notification system for Player Portal
 */

/* API & Toast — powered by api-core.js factory */
const PlayerToast = createHoopsToast();
const PlayerAPI = createHoopsAPI({
  tokenKey: 'hoops_player_token',
  userKey: 'hoops_player_user',
  loginUrl: '/player/login',
  toastRef: () => PlayerToast,
  langEndpoint: '/api/player-auth/language',
});


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


/* esc, capitalize, _playerTimeAgo → shared-utils.js */


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

  // Sidebar toggle → shared-utils.js

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

/* _setBadge → shared-utils.js */


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
