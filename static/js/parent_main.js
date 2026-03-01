/**
 * HOOPS AI — Parent Main JS
 * Auth, API helpers, Toast notifications for Parent Portal
 */

/* API & Toast — powered by api-core.js factory */
const ParentToast = createHoopsToast();
const ParentAPI = createHoopsAPI({
  tokenKey: 'hoops_parent_token',
  userKey: 'hoops_parent_user',
  loginUrl: '/parent/login',
  toastRef: () => ParentToast,
  langEndpoint: '/api/parent-auth/language',
});


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


/* esc, openModal, closeModal → shared-utils.js */


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

  // Sidebar toggle → shared-utils.js

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

/* _setBadge → shared-utils.js */
