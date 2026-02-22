/**
 * HOOPS AI — Admin Coach Engagement Page
 */

let _coachesData = [];

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
    teams.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      sel.appendChild(opt);
    });
  } catch {}
}

async function loadEngagement() {
  const teamId = document.getElementById('filterTeam').value;
  let url = '/api/admin/coaches/engagement';
  if (teamId) url += `?team_id=${teamId}`;

  const grid = document.getElementById('coachesGrid');
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);"><span class="material-symbols-outlined pp-spin" style="font-size:32px;">progress_activity</span><div style="margin-top:8px;">Loading...</div></div>';

  try {
    const res = await AdminAPI.get(url);
    _coachesData = res.data || [];
    document.getElementById('coachCount').textContent = _coachesData.length + ' coaches';
    renderCoachCards();
  } catch {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);"><span class="material-symbols-outlined" style="font-size:32px;">error</span><h3>Could not load data</h3></div>';
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
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);"><span class="material-symbols-outlined" style="font-size:48px;">person_off</span><h3>No coaches found</h3></div>';
    return;
  }

  grid.innerHTML = _coachesData.map(c => {
    const color = scoreColor(c.overall_score);
    const lastAct = c.last_activity ? timeAgo(c.last_activity) : 'No activity';
    const categories = [
      { label: 'Reports', score: c.reports_score, max: 10 },
      { label: 'Communication', score: c.communication_score, max: 10 },
      { label: 'Training', score: c.training_score, max: 10 },
      { label: 'Attendance', score: c.attendance_score, max: 10 },
      { label: 'AI Usage', score: c.ai_usage_score, max: 10 },
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
            <div style="flex:1;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:${barColor};border-radius:2px;transition:width 300ms;"></div>
            </div>
            <span style="font-size:10px;font-weight:700;color:${barColor};min-width:28px;text-align:right;">${cat.score}/${cat.max}</span>
          </div>`;
        }).join('')}
      </div>
      <!-- Quick Stats -->
      <div style="margin-top:var(--sp-3);display:flex;gap:var(--sp-2);flex-wrap:wrap;">
        ${[
          { icon: 'analytics', val: c.evaluations, label: 'Evals' },
          { icon: 'sports_basketball', val: c.game_reports, label: 'Games' },
          { icon: 'mail', val: c.messages_sent, label: 'Msgs' },
          { icon: 'fitness_center', val: c.drills_created, label: 'Drills' },
        ].map(s => `<div style="background:rgba(255,255,255,0.04);padding:4px 8px;border-radius:4px;font-size:10px;color:var(--text-muted);display:flex;align-items:center;gap:3px;">
          <span class="material-symbols-outlined" style="font-size:12px;">${s.icon}</span>
          <strong style="color:var(--text-primary);">${s.val}</strong> ${s.label}
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

async function openCoachDetail(coachId) {
  const detailEl = document.getElementById('coachDetailContent');
  detailEl.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted);"><span class="material-symbols-outlined pp-spin" style="font-size:32px;">progress_activity</span><div style="margin-top:8px;">Loading...</div></div>';

  const c = _coachesData.find(x => x.coach_id === coachId);
  if (c) document.getElementById('coachDetailTitle').textContent = c.coach_name;
  openModal('coachDetailModal');

  try {
    const res = await AdminAPI.get(`/api/admin/coaches/${coachId}/activity`);
    const data = res.data;
    renderCoachDetail(data, c);
  } catch {
    detailEl.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted);">Could not load activity</div>';
  }
}

function renderCoachDetail(activity, scores) {
  const el = document.getElementById('coachDetailContent');
  const categories = [
    { label: 'Reports', score: scores?.reports_score || 0, max: 10, icon: 'assessment', color: '#3b82f6' },
    { label: 'Communication', score: scores?.communication_score || 0, max: 10, icon: 'mail', color: '#a78bfa' },
    { label: 'Training', score: scores?.training_score || 0, max: 10, icon: 'fitness_center', color: '#22c55e' },
    { label: 'Attendance', score: scores?.attendance_score || 0, max: 10, icon: 'check_circle', color: '#fbbf24' },
    { label: 'AI Usage', score: scores?.ai_usage_score || 0, max: 10, icon: 'smart_toy', color: '#f87171' },
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
    <h3 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-3);color:var(--text-muted);">SCORE BREAKDOWN</h3>
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
    <h3 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-3);color:var(--text-muted);">STATS (90 DAYS)</h3>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sp-2);margin-bottom:var(--sp-5);">
      ${[
        { label: 'Evaluations', val: scores?.evaluations || 0 },
        { label: 'Game Reports', val: scores?.game_reports || 0 },
        { label: 'Player Reports', val: scores?.player_reports || 0 },
        { label: 'Messages', val: scores?.messages_sent || 0 },
        { label: 'Drills', val: scores?.drills_created || 0 },
        { label: 'Practices', val: scores?.practice_sessions || 0 },
        { label: 'Plays', val: scores?.plays_created || 0 },
        { label: 'Assignments', val: scores?.drill_assignments || 0 },
        { label: 'AI Chats', val: scores?.conversations || 0 },
      ].map(s => `<div style="background:rgba(255,255,255,0.03);padding:8px;border-radius:6px;text-align:center;">
        <div style="font-size:18px;font-weight:800;color:var(--text-primary);">${s.val}</div>
        <div style="font-size:10px;color:var(--text-muted);">${s.label}</div>
      </div>`).join('')}
    </div>
  `;

  // Activity Timeline
  if (activity?.timeline?.length) {
    const icons = {
      evaluation: 'analytics', player_report: 'assessment', game_report: 'sports_basketball',
      drill: 'fitness_center', message: 'mail', play: 'schema', practice: 'event_note',
    };
    const colors = {
      evaluation: '#3b82f6', player_report: '#a78bfa', game_report: '#f87171',
      drill: '#22c55e', message: '#60a5fa', play: '#fbbf24', practice: '#34d399',
    };

    html += `<h3 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-3);color:var(--text-muted);">RECENT ACTIVITY</h3>
    <div style="display:flex;flex-direction:column;gap:var(--sp-2);">
      ${activity.timeline.map(item => {
        const icon = icons[item.type] || 'event';
        const color = colors[item.type] || 'var(--text-muted)';
        const date = item.date ? item.date.split('T')[0] : '';
        return `<div style="display:flex;align-items:flex-start;gap:var(--sp-3);padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <span class="material-symbols-outlined" style="font-size:18px;color:${color};margin-top:1px;">${icon}</span>
          <div style="flex:1;">
            <div style="font-size:var(--text-sm);">${esc(item.detail)}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${date}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  el.innerHTML = html;
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  let d = dateStr;
  if (!d.endsWith('Z') && !d.includes('+')) d += 'Z';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + 'm ago';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  if (days < 30) return days + 'd ago';
  return Math.floor(days / 30) + 'mo ago';
}
