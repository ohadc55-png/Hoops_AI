/**
 * HOOPS AI - Shared Utility Functions
 *
 * Loaded in ALL base templates AFTER i18n.js + translations.
 * Provides: HTML escaping, date/time/number formatting, modals, badges, sidebar toggle.
 */

// ── HTML Escaping ────────────────────────────────────────────────────────

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/** Alias — some files use escHtml() (regex variant) or escapeHtml() */
const escHtml = esc;
const escapeHtml = esc;

// ── Time Ago ─────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return '';
  let d = dateStr;
  if (!d.endsWith('Z') && !d.includes('+')) d += 'Z';
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (isNaN(diff) || diff < 0) return '';

  const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('hoops_language')) || 'he';

  if (lang === 'he') {
    if (diff < 60) return 'עכשיו';
    if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דק'`;
    if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שע'`;
    if (diff < 604800) return `לפני ${Math.floor(diff / 86400)} ימים`;
    return new Date(d).toLocaleDateString('he-IL');
  }
  // English
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

/** Backward-compat aliases */
const _playerTimeAgo = timeAgo;
const _notifTimeAgo = timeAgo;
const timeAgoSimple = timeAgo;

// ── Date Formatting ──────────────────────────────────────────────────────

/**
 * Format a date string for display (he-IL, dd/mm/yyyy).
 * Handles both "YYYY-MM-DD" (date-only) and ISO datetime strings.
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    // Date-only strings: append T00:00:00 to avoid timezone shift
    const d = dateStr.length === 10
      ? new Date(dateStr + 'T00:00:00')
      : new Date(dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

/** Short Hebrew date (e.g. "5 במרץ") */
function formatDateHe(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  } catch { return dateStr; }
}

/** Message-style date (dd/mm/yyyy, handles SQLite timestamps) */
function formatMsgDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Number Formatting ────────────────────────────────────────────────────

/** Format a number as ₪ currency (no decimals) */
function formatNum(n) {
  if (n == null || isNaN(n)) return '₪0';
  return '₪' + Number(n).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ── String Utilities ─────────────────────────────────────────────────────

/** Convert snake_case to Title Case */
function capitalize(str) {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Modal Helpers ────────────────────────────────────────────────────────

function openModal(id) {
  document.getElementById('notifDropdown')?.classList.remove('open');
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    el.offsetHeight; // force reflow for CSS transition
  }
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}

// Escape key → close topmost modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const all = document.querySelectorAll('.modal-overlay.active');
    if (all.length) {
      closeModal(all[all.length - 1].id);
      e.preventDefault();
    }
  }
});

// Click on overlay (outside .modal box) → close
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('active')) {
    closeModal(e.target.id);
  }
});

// ── Badge Helper ─────────────────────────────────────────────────────────

function setBadge(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = count;
  el.style.display = count > 0 ? 'inline-flex' : 'none';
}

/** Backward-compat alias */
const _setBadge = setBadge;

// ── Sidebar Toggle (mobile) ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
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
