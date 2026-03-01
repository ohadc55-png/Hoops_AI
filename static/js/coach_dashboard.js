/**
 * HOOPS AI — Coach Dashboard JS
 */

const EVENT_TYPE_HE = {
  practice: 'אימון', game: 'משחק', meeting: 'ישיבה', tournament: 'טורניר',
  team_building: 'גיבוש', team_dinner: 'ארוחת צוות', social: 'חברתי',
  tactical_video: 'וידאו טקטי', other: 'אחר',
};
const RESULT_MAP = {
  win:  { text: 'ניצחון', cls: 'cd-result-win' },
  loss: { text: 'הפסד',  cls: 'cd-result-loss' },
  draw: { text: 'תיקו',  cls: 'cd-result-draw' },
};
const SEGMENT_TYPE_HE = {
  warmup: 'חימום', drill: 'תרגיל', scrimmage: 'משחקון',
  cooldown: 'שחרור', break: 'הפסקה', film_study: 'צפייה בווידאו',
};

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('hoops_token');
  if (!token) return;
  loadDashboard();
});

async function loadDashboard() {
  try {
    const res = await API.get('/api/coach/dashboard');
    const d = res.data;

    // Stats cards
    document.getElementById('statPlayers').textContent = d.total_players;
    document.getElementById('statDrills').textContent = d.drills_completed;
    document.getElementById('statUpcoming').textContent = d.total_upcoming;
    document.getElementById('statWinRate').textContent = d.win_rate + '%';

    // Sections
    renderUpcoming(d.upcoming_events);
    renderGames(d.recent_games);
    renderAttendance(d.attendance_stats);
    renderDrillLeaderboard(d.drill_leaderboard);
    renderPractices(d.recent_practices);
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

/* ══════════════════════════════════════
   Upcoming Schedule
   ══════════════════════════════════════ */
function renderUpcoming(events) {
  const el = document.getElementById('upcomingEvents');
  if (!events || !events.length) {
    el.innerHTML = '<div class="cd-empty">אין אירועים ב-7 הימים הקרובים</div>';
    return;
  }
  el.innerHTML = events.map(e => {
    const d = new Date(e.date);
    return `
      <div class="cd-event-item">
        <div class="cd-event-date-col">
          <div class="cd-date-day">${d.getDate()}</div>
          <div class="cd-date-month">${d.toLocaleDateString('he-IL', { month: 'short' })}</div>
          <div class="cd-date-dow">${d.toLocaleDateString('he-IL', { weekday: 'short' })}</div>
        </div>
        <div class="cd-event-body">
          <div class="cd-event-title">
            <span class="cd-type-badge ${e.event_type}">${EVENT_TYPE_HE[e.event_type] || e.event_type}</span>
            ${esc(e.title)}
          </div>
          <div class="cd-event-meta">
            ${e.time_start ? e.time_start : ''}${e.time_end ? ' - ' + e.time_end : ''}
            ${e.location ? ' · ' + esc(e.location) : ''}
            ${e.opponent ? ' · vs ' + esc(e.opponent) : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ══════════════════════════════════════
   Recent Game Results
   ══════════════════════════════════════ */
function renderGames(games) {
  const el = document.getElementById('recentGames');
  if (!games || !games.length) {
    el.innerHTML = '<div class="cd-empty">אין תוצאות משחקים</div>';
    return;
  }
  el.innerHTML = games.map(g => {
    const r = RESULT_MAP[g.result] || { text: g.result, cls: '' };
    return `
      <div class="cd-game-item">
        <div class="cd-game-result ${r.cls}">${r.text}</div>
        <div class="cd-game-body">
          <div class="cd-game-score">${g.score_us != null ? g.score_us + ' - ' + g.score_them : '--'}</div>
          <div class="cd-event-meta">vs ${esc(g.opponent)}</div>
        </div>
        <div class="cd-game-date">${formatDateHe(g.date)}</div>
      </div>
    `;
  }).join('');
}

/* ══════════════════════════════════════
   Player Attendance
   ══════════════════════════════════════ */
function renderAttendance(stats) {
  const el = document.getElementById('attendanceStats');
  if (!stats || !stats.length) {
    el.innerHTML = '<div class="cd-empty">אין נתוני נוכחות</div>';
    return;
  }
  el.innerHTML = stats.map(s => {
    const lvl = s.percentage >= 80 ? 'good' : s.percentage >= 60 ? 'avg' : 'low';
    return `
      <div class="cd-att-item">
        <div class="cd-att-header">
          <span class="cd-att-name">
            ${s.jersey_number != null ? '<span class="cd-jersey">#' + s.jersey_number + '</span>' : ''}
            ${esc(s.player_name)}
          </span>
          <span class="cd-att-rate ${lvl}">${s.percentage}%</span>
        </div>
        <div class="cd-att-bar"><div class="cd-att-fill ${lvl}" style="width:${s.percentage}%"></div></div>
      </div>
    `;
  }).join('');
}

/* ══════════════════════════════════════
   Drill Leaderboard
   ══════════════════════════════════════ */
function renderDrillLeaderboard(data) {
  const el = document.getElementById('drillLeaderboard');
  if (!data || !data.length) {
    el.innerHTML = '<div class="cd-empty">אין נתוני תרגילים ביתיים</div>';
    return;
  }
  const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  let html = top3.map((d, i) => `
    <div class="cd-leader-item">
      <div class="cd-leader-rank">${medals[i]}</div>
      <div class="cd-leader-body">
        <div class="cd-leader-name">
          ${d.jersey_number != null ? '<span class="cd-jersey">#' + d.jersey_number + '</span>' : ''}
          ${esc(d.player_name)}
        </div>
        <div class="cd-leader-bar-wrap">
          <div class="cd-leader-bar"><div class="cd-leader-fill" style="width:${d.completion_pct}%"></div></div>
          <span class="cd-leader-pct">${d.completion_pct}%</span>
        </div>
        <div class="cd-leader-detail">${d.completed} / ${d.assigned} תרגילים</div>
      </div>
    </div>
  `).join('');

  if (rest.length > 0) {
    html += `<div id="leaderboardRest" class="cd-leader-rest" style="display:none;">`;
    html += rest.map((d, i) => `
      <div class="cd-leader-item">
        <div class="cd-leader-rank cd-leader-rank-num">${i + 4}</div>
        <div class="cd-leader-body">
          <div class="cd-leader-name">
            ${d.jersey_number != null ? '<span class="cd-jersey">#' + d.jersey_number + '</span>' : ''}
            ${esc(d.player_name)}
          </div>
          <div class="cd-leader-bar-wrap">
            <div class="cd-leader-bar"><div class="cd-leader-fill" style="width:${d.completion_pct}%"></div></div>
            <span class="cd-leader-pct">${d.completion_pct}%</span>
          </div>
          <div class="cd-leader-detail">${d.completed} / ${d.assigned} תרגילים</div>
        </div>
      </div>
    `).join('');
    html += `</div>`;
    html += `<button class="cd-show-all-btn" onclick="toggleLeaderboard(this)">הצג את כולם (${data.length})</button>`;
  }

  el.innerHTML = html;
}

function toggleLeaderboard(btn) {
  const rest = document.getElementById('leaderboardRest');
  if (!rest) return;
  const visible = rest.style.display !== 'none';
  rest.style.display = visible ? 'none' : '';
  btn.textContent = visible ? `הצג את כולם` : 'הצג פחות';
}

/* ══════════════════════════════════════
   Recent Practices
   ══════════════════════════════════════ */
function renderPractices(sessions) {
  const el = document.getElementById('recentPractices');
  if (!sessions || !sessions.length) {
    el.innerHTML = '<div class="cd-empty">אין אימונים אחרונים</div>';
    return;
  }
  el.innerHTML = `<div class="cd-practices-grid">${sessions.map(s => {
    const d = s.date ? new Date(s.date) : null;
    return `
      <div class="cd-practice-card">
        <div class="cd-practice-header">
          ${d ? `<span class="cd-practice-date">${d.getDate()} ${d.toLocaleDateString('he-IL', { month: 'short' })}</span>` : ''}
          ${s.total_duration ? `<span class="cd-practice-duration">${s.total_duration} דק'</span>` : ''}
        </div>
        <div class="cd-practice-title">${esc(s.title)}</div>
        ${s.focus ? `<div class="cd-practice-focus">${esc(s.focus)}</div>` : ''}
        ${s.segments_summary && s.segments_summary.length ? `
          <div class="cd-practice-tags">
            ${s.segments_summary.map(seg => `<span class="cd-seg-tag">${SEGMENT_TYPE_HE[seg] || seg}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('')}</div>`;
}

/* ══════════════════════════════════════
   Helpers
   ══════════════════════════════════════ */
/* formatDateHe → shared-utils.js */
