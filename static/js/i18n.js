/**
 * HOOPS AI - Internationalization (i18n) Engine
 * Supports Hebrew (he) and English (en) with RTL/LTR switching.
 * Load this script BEFORE all other JS files.
 */
window.I18N = {
  _lang: localStorage.getItem('hoops_language') || 'he',
  _dict: { he: {}, en: {} },
  _changeCallbacks: [],

  /** Register translation keys from a module */
  register(translations) {
    if (translations.he) Object.assign(this._dict.he, translations.he);
    if (translations.en) Object.assign(this._dict.en, translations.en);
  },

  /** Get translated string. Supports {param} interpolation. */
  t(key, params) {
    const str = this._dict[this._lang][key] || this._dict['en'][key] || key;
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => params[k] != null ? params[k] : '');
  },

  /** Get current language */
  getLang() {
    return this._lang;
  },

  /** Check if current language is RTL */
  isRtl() {
    return this._lang === 'he';
  },

  /** Register a callback for language changes */
  onLanguageChange(fn) {
    if (typeof fn === 'function') this._changeCallbacks.push(fn);
  },

  /** Switch language and update the page */
  setLanguage(lang) {
    if (lang !== 'he' && lang !== 'en') return;
    this._lang = lang;
    localStorage.setItem('hoops_language', lang);
    this._applyDir();
    this._translateDom();
    this._changeCallbacks.forEach(fn => { try { fn(lang); } catch(e) { console.error('i18n callback error:', e); } });
  },

  /** Apply lang/dir attributes to <html> */
  _applyDir() {
    document.documentElement.lang = this._lang;
    document.documentElement.dir = this._lang === 'he' ? 'rtl' : 'ltr';
  },

  /** Translate all DOM elements with data-i18n attributes */
  _translateDom() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = this.t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = this.t(el.dataset.i18nTitle);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = this.t(el.dataset.i18nHtml);
    });
    // Update language toggle button if it exists
    const langBtn = document.getElementById('lang-toggle-label');
    if (langBtn) langBtn.textContent = this._lang === 'he' ? 'EN' : 'עב';
  },

  /** Initialize on page load */
  init() {
    this._applyDir();
    // Translate static elements once DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this._translateDom());
    } else {
      this._translateDom();
    }
  }
};

/** Global shorthand */
window.t = (key, params) => I18N.t(key, params);

/** Auto-init */
I18N.init();
