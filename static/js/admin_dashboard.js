/**
 * HOOPS AI — Admin Dashboard JS
 * Rich dashboard with data from across the system
 */

const EVENT_TYPE_HE = {
  practice: 'אימון', game: 'משחק', meeting: 'ישיבה', tournament: 'טורניר',
  team_building: 'גיבוש', team_dinner: 'ארוחת צוות', social: 'חברתי',
  tactical_video: 'וידאו טקטי', other: 'אחר',
};
const RESULT_MAP = {
  win:  { text: 'ניצחון', cls: 'result-win' },
  loss: { text: 'הפסד',  cls: 'result-loss' },
  draw: { text: 'תיקו',  cls: 'result-draw' },
};
const ROLE_HE = { coach: 'מאמן', player: 'שחקן', parent: 'הורה' };
const ROLE_ICON = { coach: 'sports', player: 'person', parent: 'family_restroom' };

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAPI.token) return;
  loadDashboard();
});

async function loadDashboard() {
  try {
    const res = await AdminAPI.get('/api/admin/dashboard');
    const d = res.data;

    // Stats cards
    document.getElementById('statTeams').textContent = d.total_teams;
    document.getElementById('statCoaches').textContent = d.total_coaches;
    document.getElementById('statPlayers').textContent = d.total_players;
    document.getElementById('statParents').textContent = d.total_parents;

    // Sections
    renderTodaysEvents(d.todays_events);
    renderPendingRequests(d.pending_requests);
    renderUpcomingEvents(d.upcoming_events);
    renderRecentGames(d.recent_games);
    renderAttendance(d.attendance_by_team);
    renderNewMembers(d.new_members);
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

/* ══════════════════════════════════════
   Today's Activities
   ══════════════════════════════════════ */
function renderTodaysEvents(events) {
  const el = document.getElementById('todaysEvents');
  const badge = document.getElementById('todayCount');
  if (!events || !events.length) {
    el.innerHTML = `<div class="dash-empty">${t('admin.dashboard.empty.today')}</div>`;
    return;
  }
  badge.textContent = events.length;
  badge.style.display = '';
  const show = events.slice(0, 4);
  const more = events.length - show.length;
  el.innerHTML = show.map(e => `
    <div class="dash-event-item">
      <div class="dash-event-time">${e.time_start || '--:--'}${e.time_end ? ' - ' + e.time_end : ''}</div>
      <div class="dash-event-body">
        <div class="dash-event-title">
          <span class="schedule-type ${e.event_type}">${EVENT_TYPE_HE[e.event_type] || e.event_type}</span>
          ${esc(e.title)}
        </div>
        <div class="dash-event-meta">
          ${e.team_name ? '<span class="dash-team-tag">' + esc(e.team_name) + '</span>' : ''}
          ${e.location ? '<span class="material-symbols-outlined" style="font-size:13px;">location_on</span> ' + esc(e.location) : ''}
          ${e.opponent ? ' · vs ' + esc(e.opponent) : ''}
        </div>
      </div>
    </div>
  `).join('') + (more > 0 ? `<a href="/admin/schedule" class="dash-more-link">+${more} ${t('admin.dashboard.more_calendar')} →</a>` : '');
}

/* ══════════════════════════════════════
   Pending Approvals
   ══════════════════════════════════════ */
function renderPendingRequests(requests) {
  const el = document.getElementById('pendingRequests');
  const badge = document.getElementById('pendingBadge');
  if (!requests || !requests.length) {
    el.innerHTML = `<div class="dash-empty">${t('admin.dashboard.empty.pending')}</div>`;
    return;
  }
  badge.textContent = requests.length;
  badge.style.display = '';
  el.innerHTML = requests.map(r => `
    <div class="dash-request-item" id="request-${r.id}">
      <div class="dash-request-body">
        <div class="dash-event-title">
          <span class="schedule-type ${r.event_type}">${EVENT_TYPE_HE[r.event_type] || r.event_type}</span>
          ${esc(r.title)}
        </div>
        <div class="dash-event-meta">
          <span>${esc(r.coach_name)}</span>
          <span class="dash-team-tag">${esc(r.team_name)}</span>
          <span>${formatDateHe(r.date)}${r.time_start ? ' ' + r.time_start : ''}</span>
        </div>
      </div>
      <div class="dash-request-actions">
        <button class="dash-action-btn approve" onclick="quickApprove(${r.id})" title="${t('admin.dashboard.approve_title')}">
          <span class="material-symbols-outlined">check</span>
        </button>
        <button class="dash-action-btn reject" onclick="quickReject(${r.id})" title="${t('admin.dashboard.reject_title')}">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>
  `).join('');
}

async function quickApprove(id) {
  try {
    await AdminAPI.put(`/api/schedule-requests/${id}/approve`, {});
    document.getElementById(`request-${id}`)?.remove();
    AdminToast.success(t('admin.dashboard.request_approved'));
    _updatePendingCount();
  } catch { AdminToast.error(t('admin.dashboard.approve_error')); }
}

async function quickReject(id) {
  try {
    await AdminAPI.put(`/api/schedule-requests/${id}/reject`, {});
    document.getElementById(`request-${id}`)?.remove();
    AdminToast.success(t('admin.dashboard.request_rejected'));
    _updatePendingCount();
  } catch { AdminToast.error(t('admin.dashboard.reject_error')); }
}

function _updatePendingCount() {
  const badge = document.getElementById('pendingBadge');
  const container = document.getElementById('pendingRequests');
  const remaining = container.querySelectorAll('.dash-request-item').length;
  if (remaining === 0) {
    badge.style.display = 'none';
    container.innerHTML = `<div class="dash-empty">${t('admin.dashboard.empty.pending')}</div>`;
  } else {
    badge.textContent = remaining;
  }
}

/* ══════════════════════════════════════
   Upcoming Events (7 days)
   ══════════════════════════════════════ */
function renderUpcomingEvents(events) {
  const el = document.getElementById('upcomingEvents');
  if (!events || !events.length) {
    el.innerHTML = `<div class="dash-empty">${t('admin.dashboard.empty.upcoming')}</div>`;
    return;
  }
  const show = events.slice(0, 4);
  const more = events.length - show.length;
  el.innerHTML = show.map(e => {
    const d = new Date(e.date);
    return `
      <div class="dash-event-item">
        <div class="dash-event-date-col">
          <div class="dash-date-day">${d.getDate()}</div>
          <div class="dash-date-month">${d.toLocaleDateString('he-IL', { month: 'short' })}</div>
          <div class="dash-date-dow">${d.toLocaleDateString('he-IL', { weekday: 'short' })}</div>
        </div>
        <div class="dash-event-body">
          <div class="dash-event-title">
            <span class="schedule-type ${e.event_type}">${EVENT_TYPE_HE[e.event_type] || e.event_type}</span>
            ${esc(e.title)}
          </div>
          <div class="dash-event-meta">
            ${e.team_name ? '<span class="dash-team-tag">' + esc(e.team_name) + '</span>' : ''}
            ${e.time_start ? e.time_start : ''}
            ${e.location ? ' · ' + esc(e.location) : ''}
            ${e.opponent ? ' · vs ' + esc(e.opponent) : ''}
          </div>
        </div>
      </div>
    `;
  }).join('') + (more > 0 ? `<a href="/admin/schedule" class="dash-more-link">+${more} ${t('admin.dashboard.more_calendar')} →</a>` : '');
}

/* ══════════════════════════════════════
   Recent Game Results
   ══════════════════════════════════════ */
function renderRecentGames(games) {
  const el = document.getElementById('recentGames');
  if (!games || !games.length) {
    el.innerHTML = `<div class="dash-empty">${t('admin.dashboard.empty.games')}</div>`;
    return;
  }
  el.innerHTML = games.map(g => {
    const r = RESULT_MAP[g.result] || { text: g.result, cls: '' };
    return `
      <div class="dash-game-item">
        <div class="dash-game-result ${r.cls}">${r.text}</div>
        <div class="dash-game-body">
          <div class="dash-game-score">${g.score_us != null ? '<span dir="ltr">' + g.score_us + ' - ' + g.score_them + '</span>' : t('admin.dashboard.score_pending')}</div>
          <div class="dash-event-meta">
            vs ${esc(g.opponent)}
            ${g.team_name ? ' · <span class="dash-team-tag">' + esc(g.team_name) + '</span>' : ''}
          </div>
        </div>
        <div class="dash-game-date">${formatDateHe(g.date)}</div>
      </div>
    `;
  }).join('');
}

/* ══════════════════════════════════════
   Attendance Overview
   ══════════════════════════════════════ */
function renderAttendance(teams) {
  const el = document.getElementById('attendanceSummary');
  if (!teams || !teams.length) {
    el.innerHTML = `<div class="dash-empty">${t('admin.dashboard.empty.attendance')}</div>`;
    return;
  }
  el.innerHTML = teams.map(tm => {
    const lvl = tm.rate >= 80 ? 'good' : tm.rate >= 60 ? 'avg' : 'low';
    return `
      <div class="dash-att-item">
        <div class="dash-att-header">
          <span class="dash-team-tag">${esc(tm.team_name)}</span>
          <span class="dash-att-rate ${lvl}">${tm.rate}%</span>
        </div>
        <div class="dash-att-bar"><div class="dash-att-fill ${lvl}" style="width:${tm.rate}%"></div></div>
        <div class="dash-att-detail">${tm.present} / ${tm.total} ${t('admin.dashboard.attendance_records')}</div>
      </div>
    `;
  }).join('');
}

/* ══════════════════════════════════════
   New Members
   ══════════════════════════════════════ */
function renderNewMembers(members) {
  const el = document.getElementById('newMembers');
  if (!members || !members.length) {
    el.innerHTML = `<div class="dash-empty">${t('admin.dashboard.empty.new_members')}</div>`;
    return;
  }
  el.innerHTML = members.map(m => `
    <div class="dash-member-item">
      <div class="dash-member-avatar">
        <span class="material-symbols-outlined">${ROLE_ICON[m.role] || 'person'}</span>
      </div>
      <div class="dash-member-body">
        <div class="dash-member-name">${esc(m.name)}</div>
        <div class="dash-event-meta">
          <span class="dash-role-chip ${m.role}">${ROLE_HE[m.role] || m.role}</span>
          <span class="dash-team-tag">${esc(m.team_name)}</span>
        </div>
      </div>
      <div class="dash-member-time">${timeAgoShort(m.joined_at)}</div>
    </div>
  `).join('');
}

/* ══════════════════════════════════════
   Helpers
   ══════════════════════════════════════ */
/* formatDateHe → shared-utils.js */

function timeAgoShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return t('admin.dashboard.today');
  if (days === 1) return t('admin.dashboard.yesterday');
  return t('admin.dashboard.days_ago', { count: days });
}
