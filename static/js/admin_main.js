/**
 * HOOPS AI — Admin Main JS
 * Auth, API helpers, Toast notifications for Management Portal
 */

/* API & Toast — powered by api-core.js factory */
const AdminToast = createHoopsToast();
const AdminAPI = createHoopsAPI({
  tokenKey: 'hoops_admin_token',
  userKey: 'hoops_admin_user',
  loginUrl: '/admin/login',
  toastRef: () => AdminToast,
  langEndpoint: '/api/admin-auth/language',
});


/* Auth Guard for Admin Pages */
function requireAdminAuth() {
  const publicPages = ['/admin/login', '/admin/register'];
  if (!AdminAPI.token && !publicPages.includes(window.location.pathname)) {
    window.location.href = '/admin/login';
    return false;
  }
  return true;
}


/**
 * Permission-based UI filtering.
 * Reads `data-admin-section` attributes on sidebar nav items.
 * If the logged-in admin has `permissions.allowed_pages`, hide anything not listed.
 * null permissions = unrestricted (Chairman / CEO).
 */
function applyAdminPermissions() {
  const user = AdminAPI.user;
  if (!user) return;
  const allowed = user.permissions?.allowed_pages;
  if (!allowed) return; // null = all sections visible

  document.querySelectorAll('[data-admin-section]').forEach(el => {
    const section = el.dataset.adminSection;
    if (!allowed.includes(section)) {
      el.style.display = 'none';
    }
  });
}


/* Admin Logout */
function adminLogout() {
  AdminAPI.clearAuth();
  window.location.href = '/admin/login';
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
    AdminToast.success('Copied to clipboard');
  } catch {
    AdminToast.error('Failed to copy');
  }
}


/* Init */
document.addEventListener('DOMContentLoaded', () => {
  AdminToast.init();
  requireAdminAuth();
  applyAdminPermissions();
  updateBillingBadge();

  // Update user avatar
  if (AdminAPI.user) {
    const avatar = document.getElementById('userAvatar');
    if (avatar) {
      avatar.innerHTML = `<span style="font-weight:700;font-size:14px;">${AdminAPI.user.name?.charAt(0)?.toUpperCase() || 'A'}</span>`;
    }
  }

  // Sidebar toggle → shared-utils.js
});

// ── Billing badge (new payments count) ──
async function updateBillingBadge() {
  try {
    const res = await AdminAPI.get('/api/billing/new-payments');
    const count = (res.data || []).length;
    const badge = document.getElementById('adminBillingBadge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  } catch { /* ignore */ }
}
