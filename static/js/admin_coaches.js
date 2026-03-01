/**
 * HOOPS AI — Admin Coach Engagement Page
 */

let _coachesData = [];
let _currentTimeline = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAPI.token) return;
  loadTeamsFilter();
  loadEngagement();
});

async function loadTeamsFilter() {
  try {
    const res = await AdminAPI.get('/api/teams');
    const teams = res.data || [];
    const sel = document.getElementById('filterTeam');
    teams.forEach(tm => {
      const opt = document.createElement('option');
      opt.value = tm.id;
      opt.textContent = tm.name;
      sel.appendChild(opt);
    });
  } catch {}
}

async function loadEngagement() {
  const teamId = document.getElementById('filterTeam').value;
  let url = '/api/admin/coaches/engagement';
  if (teamId) url += `?team_id=${teamId}`;

  const grid = document.getElementById('coachesGrid');
  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);"><span class="material-symbols-outlined pp-spin" style="font-size:32px;">progress_activity</span><div style="margin-top:8px;">${t('admin.coaches.loading')}</div></div>`;

  try {
    const res = await AdminAPI.get(url);
    _coachesData = res.data || [];
    document.getElementById('coachCount').textContent = t('admin.coaches.count', { count: _coachesData.length });
    renderCoachCards();
  } catch {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);"><span class="material-symbols-outlined" style="font-size:32px;">error</span><h3>${t('admin.coaches.load_error')}</h3></div>`;
  }
}

function scoreColor(score) {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#fbbf24';
  return '#ef4444';
}

function renderCoachCards() {
  const grid = document.getElementById('coachesGrid');
  if (!_coachesData.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);"><span class="material-symbols-outlined" style="font-size:48px;">person_off</span><h3>${t('admin.coaches.empty')}</h3></div>`;
    return;
  }

  grid.innerHTML = _coachesData.map(c => {
    const color = scoreColor(c.overall_score);
    const lastAct = c.last_activity ? timeAgo(c.last_activity) : t('admin.coaches.no_activity');
    const categories = [
      { label: t('admin.coaches.cat.reports'), score: c.reports_score, max: 10,
        sub: c.total_players > 0 ? `כיסוי: <span dir="ltr">${c.players_with_reports}/${c.total_players} (${c.player_report_coverage_pct}%)</span>` : null },
      { label: t('admin.coaches.cat.communication'), score: c.communication_score, max: 10 },
      { label: t('admin.coaches.cat.training'), score: c.training_score, max: 10,
        sub: c.practice_sessions > 0 ? `סיכומי אימון: <span dir="ltr">${c.practice_summary_pct}%</span>` : null },
      { label: t('admin.coaches.cat.attendance'), score: c.attendance_score, max: 10 },
      { label: t('admin.coaches.cat.ai_usage'), score: c.ai_usage_score, max: 10 },
    ];

    return `<div class="coach-engage-card" onclick="openCoachDetail(${c.coach_id})" style="
      padding:var(--sp-4);background:var(--bg-card);border:1px solid var(--border);
      border-radius:var(--r-lg);cursor:pointer;transition:all 150ms;">
      <div style="display:flex;align-items:center;gap:var(--sp-4);">
        <!-- Score Gauge -->
        <div style="position:relative;width:72px;height:72px;flex-shrink:0;">
          <div style="width:72px;height:72px;border-radius:50%;background:conic-gradient(${color} ${c.overall_score * 3.6}deg, rgba(255,255,255,0.08) 0deg);display:flex;align-items:center;justify-content:center;">
            <div style="width:62px;height:62px;border-radius:50%;background:var(--bg-card);display:flex;align-items:center;justify-content:center;flex-direction:column;">
              <span style="font-size:22px;font-weight:800;color:#fff;">${c.overall_score}</span>
              <span style="font-size:8px;color:${color};margin-top:-2px;">/ 100</span>
            </div>
          </div>
        </div>
        <!-- Info -->
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:var(--text-base);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(c.coach_name)}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">${esc(c.team_name)}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">
            <span class="material-symbols-outlined" style="font-size:12px;vertical-align:middle;">schedule</span>
            ${lastAct}
          </div>
        </div>
      </div>
      <!-- Category Bars -->
      <div style="margin-top:var(--sp-3);display:flex;flex-direction:column;gap:6px;">
        ${categories.map(cat => {
          const pct = (cat.score / cat.max * 100).toFixed(0);
          const barColor = pct >= 80 ? '#22c55e' : pct >= 50 ? '#fbbf24' : '#ef4444';
          return `<div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:10px;color:var(--text-muted);width:80px;">${cat.label}</span>
            <div style="flex:1;">
              <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${barColor};border-radius:2px;transition:width 300ms;"></div>
              </div>
              ${cat.sub ? `<div style="font-size:9px;color:var(--text-muted);margin-top:2px;">${cat.sub}</div>` : ''}
            </div>
            <span style="font-size:10px;font-weight:700;color:${barColor};min-width:28px;text-align:right;">${cat.score}/${cat.max}</span>
          </div>`;
        }).join('')}
      </div>
      <!-- Quick Stats -->
      <div style="margin-top:var(--sp-3);display:flex;gap:var(--sp-2);flex-wrap:wrap;">
        ${[
          { icon: 'analytics', val: c.evaluations, label: t('admin.coaches.stat.evals') },
          { icon: 'sports_basketball', val: c.game_reports, label: t('admin.coaches.stat.games') },
          { icon: 'mail', val: c.messages_sent, label: t('admin.coaches.stat.msgs') },
          { icon: 'fitness_center', val: c.drills_created, label: t('admin.coaches.stat.drills') },
        ].map(s => `<div style="background:rgba(255,255,255,0.04);padding:4px 8px;border-radius:4px;font-size:10px;color:var(--text-muted);display:flex;align-items:center;gap:3px;">
          <span class="material-symbols-outlined" style="font-size:12px;">${s.icon}</span>
          <strong style="color:var(--text-primary);">${s.val}</strong> ${s.label}
        </div>`).join('')}
      </div>
      <!-- Full Profile Link -->
      <div style="margin-top:var(--sp-3);display:flex;justify-content:flex-end;">
        <a href="/admin/coach/${c.coach_id}" onclick="event.stopPropagation();"
           style="font-size:11px;color:var(--primary);text-decoration:none;display:flex;align-items:center;gap:3px;"
           onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">
          <span class="material-symbols-outlined" style="font-size:13px;">open_in_new</span>
          ${t('admin.coaches.view_profile')}
        </a>
      </div>
    </div>`;
  }).join('');
}

async function openCoachDetail(coachId) {
  const detailEl = document.getElementById('coachDetailContent');
  detailEl.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted);"><span class="material-symbols-outlined pp-spin" style="font-size:32px;">progress_activity</span><div style="margin-top:8px;">${t('admin.coaches.detail.loading')}</div></div>`;

  const c = _coachesData.find(x => x.coach_id === coachId);
  if (c) document.getElementById('coachDetailTitle').textContent = c.coach_name;
  openModal('coachDetailModal');

  try {
    const res = await AdminAPI.get(`/api/admin/coaches/${coachId}/activity`);
    const data = res.data;
    renderCoachDetail(data, c);
  } catch {
    detailEl.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted);">${t('admin.coaches.detail.load_error')}</div>`;
  }
}

function renderCoachDetail(activity, scores) {
  const el = document.getElementById('coachDetailContent');
  const categories = [
    { label: t('admin.coaches.cat.reports'), score: scores?.reports_score || 0, max: 10, icon: 'assessment', color: '#3b82f6' },
    { label: t('admin.coaches.cat.communication'), score: scores?.communication_score || 0, max: 10, icon: 'mail', color: '#a78bfa' },
    { label: t('admin.coaches.cat.training'), score: scores?.training_score || 0, max: 10, icon: 'fitness_center', color: '#22c55e' },
    { label: t('admin.coaches.cat.attendance'), score: scores?.attendance_score || 0, max: 10, icon: 'check_circle', color: '#fbbf24' },
    { label: t('admin.coaches.cat.ai_usage'), score: scores?.ai_usage_score || 0, max: 10, icon: 'smart_toy', color: '#f87171' },
  ];

  const overallColor = scoreColor(scores?.overall_score || 0);

  let html = `
    <!-- Overall Score -->
    <div style="text-align:center;padding:var(--sp-4);margin-bottom:var(--sp-4);">
      <div style="width:100px;height:100px;margin:0 auto;border-radius:50%;background:conic-gradient(${overallColor} ${(scores?.overall_score || 0) * 3.6}deg, rgba(255,255,255,0.08) 0deg);display:flex;align-items:center;justify-content:center;">
        <div style="width:88px;height:88px;border-radius:50%;background:var(--bg-card);display:flex;align-items:center;justify-content:center;flex-direction:column;">
          <span style="font-size:30px;font-weight:800;color:#fff;">${scores?.overall_score || 0}</span>
          <span style="font-size:10px;color:${overallColor};">/ 100</span>
        </div>
      </div>
    </div>

    <!-- Category Breakdown -->
    <h3 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-3);color:var(--text-muted);">${t('admin.coaches.detail.score_breakdown')}</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);margin-bottom:var(--sp-5);">
      ${categories.map(cat => {
        const pct = (cat.score / cat.max * 100).toFixed(0);
        return `<div style="background:rgba(255,255,255,0.03);padding:var(--sp-3);border-radius:var(--r-md);">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span class="material-symbols-outlined" style="font-size:16px;color:${cat.color};">${cat.icon}</span>
            <span style="font-size:var(--text-sm);font-weight:600;">${cat.label}</span>
            <span style="margin-left:auto;font-weight:700;color:${cat.color};">${cat.score}/${cat.max}</span>
          </div>
          <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${cat.color};border-radius:3px;"></div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- Stats -->
    <h3 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-3);color:var(--text-muted);">${t('admin.coaches.detail.stats_90_days')}</h3>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sp-2);margin-bottom:var(--sp-5);">
      ${[
        { label: t('admin.coaches.detail.evaluations'), val: scores?.evaluations || 0 },
        { label: t('admin.coaches.detail.game_reports'), val: scores?.game_reports || 0 },
        { label: t('admin.coaches.detail.player_reports'), val: scores?.player_reports || 0 },
        { label: t('admin.coaches.detail.messages'), val: scores?.messages_sent || 0 },
        { label: t('admin.coaches.detail.drills'), val: scores?.drills_created || 0 },
        { label: t('admin.coaches.detail.practices'), val: scores?.practice_sessions || 0 },
        { label: t('admin.coaches.detail.plays'), val: scores?.plays_created || 0 },
        { label: t('admin.coaches.detail.assignments'), val: scores?.drill_assignments || 0 },
        { label: t('admin.coaches.detail.ai_chats'), val: scores?.conversations || 0 },
        { label: 'כיסוי דוחות', val: `${scores?.players_with_reports || 0}/${scores?.total_players || 0}`, sub: `${scores?.player_report_coverage_pct || 0}%`, color: '#3b82f6' },
        { label: 'סיכומי אימון', val: `${scores?.practice_summary_pct || 0}%`, sub: `${scores?.sessions_with_summary || 0}/${scores?.practice_sessions || 0} אימונים`, color: '#34d399' },
      ].map(s => `<div style="background:rgba(255,255,255,0.03);padding:8px;border-radius:6px;text-align:center;">
        <div style="font-size:18px;font-weight:800;color:${s.color || 'var(--text-primary)'};">${s.val}</div>
        ${s.sub ? `<div style="font-size:9px;color:var(--text-muted);">${s.sub}</div>` : ''}
        <div style="font-size:10px;color:var(--text-muted);">${s.label}</div>
      </div>`).join('')}
    </div>
  `;

  // Activity Timeline with filters
  if (activity?.timeline?.length) {
    _currentTimeline = activity.timeline;

    html += `<div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-3);flex-wrap:wrap;">
      <h3 style="font-size:var(--text-sm);font-weight:600;color:var(--text-muted);margin:0;">${t('admin.coaches.detail.recent_activity')}</h3>
      <select class="select" id="activityTypeFilter" onchange="filterTimeline()" style="font-size:11px;padding:4px 8px;min-width:120px;">
        <option value="all">הכל</option>
        <option value="evaluation">הערכות</option>
        <option value="player_report">דוחות שחקנים</option>
        <option value="game_report">דוחות משחק</option>
        <option value="drill">תרגילים</option>
        <option value="message">הודעות</option>
        <option value="play">משחקונים</option>
        <option value="practice">אימונים</option>
      </select>
      <select class="select" id="activityRangeFilter" onchange="filterTimeline()" style="font-size:11px;padding:4px 8px;min-width:120px;">
        <option value="all">כל התקופה</option>
        <option value="7">שבוע אחרון</option>
        <option value="30" selected>חודש אחרון</option>
        <option value="180">חצי שנה</option>
      </select>
    </div>
    <div id="activityTimelineList"></div>`;
  }

  el.innerHTML = html;
  if (_currentTimeline.length) filterTimeline();
}

const _actIcons = {
  evaluation: 'analytics', player_report: 'assessment', game_report: 'sports_basketball',
  drill: 'fitness_center', message: 'mail', play: 'schema', practice: 'event_note',
};
const _actColors = {
  evaluation: '#3b82f6', player_report: '#a78bfa', game_report: '#f87171',
  drill: '#22c55e', message: '#60a5fa', play: '#fbbf24', practice: '#34d399',
};

function filterTimeline() {
  const typeFilter = document.getElementById('activityTypeFilter')?.value || 'all';
  const rangeFilter = document.getElementById('activityRangeFilter')?.value || 'all';

  let items = _currentTimeline;

  // Filter by type
  if (typeFilter !== 'all') {
    items = items.filter(i => i.type === typeFilter);
  }

  // Filter by date range
  if (rangeFilter !== 'all') {
    const days = parseInt(rangeFilter);
    const cutoff = new Date(Date.now() - days * 86400000);
    items = items.filter(i => {
      let d = i.date;
      if (d && !d.endsWith('Z') && !d.includes('+')) d += 'Z';
      return new Date(d) >= cutoff;
    });
  }

  const el = document.getElementById('activityTimelineList');
  if (!el) return;

  if (!items.length) {
    el.innerHTML = '<div style="text-align:center;padding:var(--sp-4);color:var(--text-muted);font-size:var(--text-sm);">אין פעילות בטווח הנבחר</div>';
    return;
  }

  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:var(--sp-2);">
    ${items.map(item => {
      const icon = _actIcons[item.type] || 'event';
      const color = _actColors[item.type] || 'var(--text-muted)';
      const date = item.date ? item.date.split('T')[0] : '';
      const time = item.date && item.date.includes('T') ? item.date.split('T')[1]?.slice(0,5) : '';
      const eyeBtn = item.id ? `<button class="btn btn-sm" style="padding:2px 6px;background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:4px;cursor:pointer;" onclick="viewActivityDetail('${item.type}',${item.id})" title="צפייה"><span class="material-symbols-outlined" style="font-size:16px;color:var(--text-muted);">visibility</span></button>` : '';
      return `<div style="display:flex;align-items:flex-start;gap:var(--sp-3);padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span class="material-symbols-outlined" style="font-size:18px;color:${color};margin-top:1px;">${icon}</span>
        <div style="flex:1;">
          <div style="font-size:var(--text-sm);">${esc(item.detail)}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${time} ${date}</div>
        </div>
        ${eyeBtn}
      </div>`;
    }).join('')}
  </div>`;
}

/* timeAgo → shared-utils.js */

// ===== ACTIVITY DETAIL MODAL =====
async function viewActivityDetail(type, id) {
  const el = document.getElementById('actDetailContent');
  const titleEl = document.getElementById('actDetailTitle');
  el.innerHTML = '<div style="text-align:center;padding:var(--sp-6);"><div class="loading-spinner"></div></div>';
  titleEl.textContent = 'טוען...';
  openModal('activityDetailModal');

  try {
    const res = await AdminAPI.get(`/api/admin/coaches/activity-detail/${type}/${id}`);
    const d = res.data;
    titleEl.textContent = d.title;

    let html = '';

    // Meta row (date + coach)
    const metaParts = [];
    if (d.date) metaParts.push(d.date.split('T')[0]);
    if (d.coach) metaParts.push(d.coach);
    if (d.period) metaParts.push(d.period);
    if (metaParts.length) {
      html += `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--sp-4);">${metaParts.map(esc).join(' · ')}</div>`;
    }

    if (type === 'evaluation') {
      // Ratings grid
      if (d.categories?.length) {
        html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-2);margin-bottom:var(--sp-4);">`;
        d.categories.forEach(c => {
          const pct = (c.rating || 0) * 10;
          const clr = pct >= 70 ? '#22c55e' : pct >= 40 ? '#fbbf24' : '#ef4444';
          html += `<div style="background:rgba(255,255,255,0.03);padding:8px;border-radius:6px;text-align:center;">
            <div style="font-size:18px;font-weight:800;color:${clr};">${c.rating}/10</div>
            <div style="font-size:10px;color:var(--text-muted);">${esc(c.label)}</div>
            ${c.notes ? `<div style="font-size:10px;color:var(--text-secondary);margin-top:4px;">${esc(c.notes)}</div>` : ''}
          </div>`;
        });
        html += `</div>`;
      }
      if (d.personal_improvement_rating != null) {
        html += _detailRatingBadge('שיפור אישי', d.personal_improvement_rating, '#f48c25', d.personal_improvement_notes);
      }
      if (d.team_contribution_rating != null) {
        html += _detailRatingBadge('תרומה לקבוצה', d.team_contribution_rating, '#60a5fa', d.team_contribution_notes);
      }
      if (d.overall_notes) {
        html += _detailSection('הערות כלליות', d.overall_notes);
      }

    } else if (type === 'player_report') {
      // Ratings
      const badges = [];
      if (d.overall_rating != null) badges.push(['כללי', d.overall_rating, '#9CA3AF']);
      if (d.personal_improvement_rating != null) badges.push(['שיפור אישי', d.personal_improvement_rating, '#f48c25']);
      if (d.team_contribution_rating != null) badges.push(['תרומה לקבוצה', d.team_contribution_rating, '#60a5fa']);
      if (badges.length) {
        html += `<div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-bottom:var(--sp-4);">`;
        badges.forEach(([label, val, color]) => {
          html += `<div style="display:flex;align-items:center;gap:var(--sp-2);padding:6px 12px;background:${color}15;border-radius:6px;border-left:3px solid ${color};">
            <span style="font-weight:600;font-size:var(--text-xs);color:${color};">${label}</span>
            <span style="font-weight:700;font-size:var(--text-sm);color:${color};">${val}/10</span>
          </div>`;
        });
        html += `</div>`;
      }
      if (d.personal_improvement_notes) html += _detailSection('שיפור אישי', d.personal_improvement_notes);
      if (d.team_contribution_notes) html += _detailSection('תרומה לקבוצה', d.team_contribution_notes);
      if (d.strengths?.length) html += _detailList('חוזקות', d.strengths, '#22c55e');
      if (d.weaknesses?.length) html += _detailList('חולשות', d.weaknesses, '#ef4444');
      if (d.focus_areas?.length) html += _detailList('תחומי מיקוד', d.focus_areas, '#fbbf24');
      if (d.progress_notes) html += _detailSection('הערות התקדמות', d.progress_notes);
      if (d.recommendations) html += _detailSection('המלצות', d.recommendations);
      if (d.is_ai_generated) html += `<div style="margin-top:var(--sp-3);"><span class="badge badge-primary" style="font-size:9px;">AI</span></div>`;

    } else if (type === 'game_report') {
      html += `<div style="display:flex;gap:var(--sp-3);margin-bottom:var(--sp-4);flex-wrap:wrap;">
        <div style="background:rgba(255,255,255,0.03);padding:8px 16px;border-radius:6px;text-align:center;">
          <div style="font-size:20px;font-weight:800;">${esc(d.score)}</div>
          <div style="font-size:10px;color:var(--text-muted);">תוצאה</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);padding:8px 16px;border-radius:6px;text-align:center;">
          <div style="font-size:14px;font-weight:700;color:${d.result === 'ניצחון' ? '#22c55e' : d.result === 'הפסד' ? '#ef4444' : '#fbbf24'};">${esc(d.result)}</div>
        </div>
      </div>`;
      if (d.location) html += _detailSection('מיקום', d.location);
      if (d.standout_players?.length) html += _detailList('שחקנים בולטים', d.standout_players, '#22c55e');
      if (d.areas_to_improve?.length) html += _detailList('תחומים לשיפור', d.areas_to_improve, '#fbbf24');
      if (d.notable_events) html += _detailSection('אירועים בולטים', d.notable_events);
      if (d.notes) html += _detailSection('הערות', d.notes);

    } else if (type === 'drill') {
      const catLabels = { offense: 'התקפה', defense: 'הגנה', shooting: 'קליעה', ball_handling: 'כדרור', passing: 'מסירות', conditioning: 'כושר', team: 'קבוצתי', warmup: 'חימום', other: 'אחר' };
      const diffLabels = { beginner: 'מתחיל', intermediate: 'בינוני', advanced: 'מתקדם' };
      html += `<div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-bottom:var(--sp-4);">
        <span class="badge" style="background:var(--primary)15;color:var(--primary);">${catLabels[d.category] || d.category}</span>
        <span class="badge">${diffLabels[d.difficulty] || d.difficulty}</span>
        ${d.duration ? `<span class="badge">${d.duration} דק׳</span>` : ''}
        ${d.is_ai_generated ? '<span class="badge badge-primary" style="font-size:9px;">AI</span>' : ''}
      </div>`;
      if (d.tags?.length) html += `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:var(--sp-3);">${d.tags.map(t => `<span style="font-size:10px;background:rgba(255,255,255,0.05);padding:2px 8px;border-radius:4px;">${esc(t)}</span>`).join('')}</div>`;
      if (d.description) html += _detailSection('תיאור', d.description);
      if (d.instructions) html += _detailSection('הוראות', d.instructions);

    } else if (type === 'message') {
      const targetLabels = { all_club: 'כל המועדון', all_coaches: 'כל המאמנים', all_players: 'כל השחקנים', all_parents: 'כל ההורים', team: 'קבוצה', individual: 'אישי' };
      if (d.target_type) html += `<div style="margin-bottom:var(--sp-3);"><span class="badge">${targetLabels[d.target_type] || d.target_type}</span></div>`;
      if (d.body) html += `<div style="font-size:var(--text-sm);line-height:1.6;white-space:pre-wrap;">${esc(d.body)}</div>`;
    }

    el.innerHTML = html || '<div style="text-align:center;color:var(--text-muted);padding:var(--sp-4);">אין פרטים נוספים</div>';
  } catch (e) {
    el.innerHTML = '<div style="text-align:center;color:var(--error);padding:var(--sp-4);">שגיאה בטעינת הפרטים</div>';
  }
}

function _detailSection(title, text) {
  return `<div style="margin-bottom:var(--sp-3);">
    <div style="font-size:var(--text-xs);font-weight:600;color:var(--text-muted);margin-bottom:4px;">${title}</div>
    <div style="font-size:var(--text-sm);line-height:1.5;white-space:pre-wrap;">${esc(text)}</div>
  </div>`;
}

function _detailList(title, items, color) {
  return `<div style="margin-bottom:var(--sp-3);">
    <div style="font-size:var(--text-xs);font-weight:600;color:${color};margin-bottom:4px;">${title}</div>
    <ul style="margin:0;padding-right:var(--sp-4);font-size:var(--text-sm);">${items.map(i => `<li style="margin-bottom:2px;">${esc(i)}</li>`).join('')}</ul>
  </div>`;
}

function _detailRatingBadge(label, rating, color, notes) {
  return `<div style="margin-bottom:var(--sp-3);padding:8px 12px;background:${color}15;border-radius:6px;border-right:3px solid ${color};">
    <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:${notes ? '4px' : '0'};">
      <span style="font-weight:600;font-size:var(--text-xs);color:${color};">${label}</span>
      <span style="font-weight:700;color:${color};">${rating}/10</span>
    </div>
    ${notes ? `<div style="font-size:var(--text-xs);color:var(--text-secondary);">${esc(notes)}</div>` : ''}
  </div>`;
}
