/**
 * HOOPS AI - Main JavaScript
 * Auth, API helpers, Toast notifications, Utilities
 */

/* API & Toast — powered by api-core.js factory */
const Toast = createHoopsToast();
const API = createHoopsAPI({
  tokenKey: 'hoops_token',
  userKey: 'hoops_coach',
  loginUrl: '/login',
  toastRef: () => Toast,
  langEndpoint: '/api/auth/language',
});


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


/* esc, escHtml, timeAgo, capitalize, openModal, closeModal, setBadge → shared-utils.js */


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

  // Sidebar toggle → shared-utils.js

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
      Toast.info(t('main.search.hint'));
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

    // Also update sidebar message badge if on messages page (avoids duplicate API call)
    const sidebarMsgBadge = document.getElementById('coachMsgBadge');
    if (sidebarMsgBadge) {
      sidebarMsgBadge.textContent = unreadMsgs;
      sidebarMsgBadge.style.display = unreadMsgs > 0 ? 'inline-flex' : 'none';
    }

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
    let html = `<div class="notif-dropdown-header">${t('header.notifications')}</div>`;
    if (pending.length === 0 && unreadMsgs === 0) {
      html += `<div class="notif-dropdown-empty">
        <span class="material-symbols-outlined" style="font-size:32px;color:var(--text-muted)">notifications_off</span>
        <p>${t('header.no_notifications')}</p>
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
