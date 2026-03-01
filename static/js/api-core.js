/**
 * HOOPS AI - Unified API & Toast Factory
 *
 * Provides createHoopsAPI() and createHoopsToast() to eliminate duplication
 * across main.js, admin_main.js, player_main.js, parent_main.js, super_admin_main.js.
 *
 * Loaded in all base templates AFTER shared-utils.js, BEFORE portal-specific main.js.
 */

// ── API Factory ──────────────────────────────────────────────────────────

function createHoopsAPI(config) {
  const { tokenKey, userKey, loginUrl, toastRef, langEndpoint } = config;

  const api = {
    token: localStorage.getItem(tokenKey),
    user: JSON.parse(localStorage.getItem(userKey) || 'null'),
    // Legacy alias: coach portal uses .coach instead of .user
    get coach() { return this.user; },
    set coach(v) { this.user = v; },

    setAuth(token, user) {
      this.token = token;
      this.user = user;
      localStorage.setItem(tokenKey, token);
      localStorage.setItem(userKey, JSON.stringify(user));
    },

    clearAuth() {
      this.token = null;
      this.user = null;
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(userKey);
    },

    async request(url, options = {}) {
      const silent = options.silent;
      delete options.silent;
      const headers = { 'Content-Type': 'application/json', ...options.headers };
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
      try {
        const res = await fetch(url, { ...options, headers });
        const data = await res.json();
        if (res.status === 401) {
          this.clearAuth();
          window.location.href = loginUrl;
          return null;
        }
        if (!res.ok) throw new Error(data.detail || 'Request failed');
        return data;
      } catch (err) {
        if (!silent && toastRef()) toastRef().error(err.message);
        throw err;
      }
    },

    get(url, opts) { return this.request(url, opts || {}); },
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

  // Language preference sync
  if (langEndpoint) {
    window._saveLangPref = function(lang) {
      api.put(langEndpoint, { language: lang }).catch(() => {});
    };
  }

  return api;
}


// ── Toast Factory ────────────────────────────────────────────────────────

function createHoopsToast() {
  return {
    container: null,

    init() {
      this.container = document.getElementById('toastContainer');
    },

    show(message, type = 'info') {
      if (!this.container) this.init();
      if (!this.container) return;
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
}


// ── Language Init (shared across all portals) ────────────────────────────

(function _initLang() {
  const lang = localStorage.getItem('hoops_language') || 'he';
  if (typeof I18N !== 'undefined') I18N.setLanguage(lang);
})();
