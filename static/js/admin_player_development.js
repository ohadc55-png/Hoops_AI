/**
 * HOOPS AI — Admin Player Development Page
 */

let _players = [];
let _searchTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAPI.token) return;
  loadTeamsFilter();
  loadPlayers();
});

/* ───── Filters ───── */

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
  } catch { /* ignore */ }
}

async function loadPlayers() {
  const teamId = document.getElementById('filterTeam').value;
  const position = document.getElementById('filterPosition').value;
  const search = document.getElementById('searchInput').value.trim();

  let url = '/api/admin/players/?';
  if (teamId) url += `team_id=${teamId}&`;
  if (position) url += `position=${position}&`;
  if (search) url += `search=${encodeURIComponent(search)}&`;

  try {
    const res = await AdminAPI.get(url);
    _players = res.data || [];
    document.getElementById('playersCount').textContent = _players.length + ' players';
    renderPlayers();
  } catch {
    document.getElementById('playersContent').innerHTML =
      '<div class="empty-state-admin"><span class="material-symbols-outlined">error</span><h3>Could not load players</h3></div>';
  }
}

function applyFilters() { loadPlayers(); }

function debounceSearch() {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => loadPlayers(), 300);
}

/* ───── Player Table ───── */

function renderPlayers() {
  const el = document.getElementById('playersContent');
  if (!_players.length) {
    el.innerHTML = `<div class="empty-state-admin">
      <span class="material-symbols-outlined">person_off</span>
      <h3>No players found</h3>
      <p>Try changing your filters</p>
    </div>`;
    return;
  }

  const rows = _players.map(p => `<tr class="contacts-row" style="cursor:pointer;" onclick="openPlayerDetail(${p.player_id})">
    <td>${esc(p.name)}</td>
    <td><span class="badge badge-neutral">${esc(p.position || '-')}</span></td>
    <td>${p.jersey_number != null ? '#' + p.jersey_number : '-'}</td>
    <td>${esc(p.team_name || '')}</td>
    <td>${p.age != null ? p.age : '-'}</td>
    <td>${p.height ? p.height + ' cm' : '-'}</td>
  </tr>`).join('');

  el.innerHTML = `<table class="contacts-table">
    <thead><tr>
      <th>Name</th><th>Position</th><th>Jersey</th><th>Team</th><th>Age</th><th>Height</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/* ───── Player Detail Modal ───── */

async function openPlayerDetail(playerId) {
  const profileEl = document.getElementById('profileTabContent');
  const reportsEl = document.getElementById('reportsTabContent');
  const evalsEl = document.getElementById('evaluationsTabContent');
  const countEl = document.getElementById('reportCount');
  const evalCountEl = document.getElementById('evalCount');

  switchTab('profile');
  profileEl.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted);"><span class="material-symbols-outlined pp-spin" style="font-size:32px;">progress_activity</span><div style="margin-top:8px;">Loading...</div></div>';
  reportsEl.innerHTML = '';
  evalsEl.innerHTML = '';
  countEl.style.display = 'none';
  evalCountEl.style.display = 'none';
  openModal('playerDetailModal');

  try {
    const [profileRes, reportsRes, evalsRes] = await Promise.all([
      AdminAPI.get(`/api/admin/players/${playerId}/profile`),
      AdminAPI.get(`/api/admin/players/${playerId}/reports`),
      AdminAPI.get(`/api/admin/evaluations?player_id=${playerId}`),
    ]);

    // Profile tab
    document.getElementById('detailModalTitle').textContent = profileRes.data.player.name;
    profileEl.innerHTML = renderPlayerProfile(profileRes.data);

    // Reports tab
    const reports = reportsRes.data || [];
    if (reports.length) { countEl.textContent = reports.length; countEl.style.display = ''; }
    renderReportsTab(reports);

    // Evaluations tab
    const evals = evalsRes.data || [];
    if (evals.length) { evalCountEl.textContent = evals.length; evalCountEl.style.display = ''; }
    renderEvaluationsTab(evals);
  } catch {
    profileEl.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted);"><span class="material-symbols-outlined" style="font-size:32px;">error</span><p>Could not load player data</p></div>';
  }
}

function switchTab(tab) {
  const tabs = { profile: 'tabProfile', reports: 'tabReports', evaluations: 'tabEvaluations' };
  const contents = { profile: 'profileTabContent', reports: 'reportsTabContent', evaluations: 'evaluationsTabContent' };
  Object.entries(tabs).forEach(([key, id]) => {
    const btn = document.getElementById(id);
    const el = document.getElementById(contents[key]);
    if (btn) btn.classList.toggle('active', key === tab);
    if (el) el.style.display = key === tab ? '' : 'none';
  });
}

/* ───── Reports Tab ───── */

/* ───── Evaluations Tab ───── */

const EVAL_CATS = [
  { field: 'offensive_rating', label: 'Offensive' },
  { field: 'defensive_rating', label: 'Defensive' },
  { field: 'iq_rating', label: 'Basketball IQ' },
  { field: 'social_rating', label: 'Social' },
  { field: 'leadership_rating', label: 'Leadership' },
  { field: 'work_ethic_rating', label: 'Work Ethic' },
  { field: 'fitness_rating', label: 'Fitness' },
  { field: 'improvement_rating', label: 'Improvement' },
  { field: 'leaving_risk', label: 'Leaving Risk' },
];

function ratingColor(val, isRisk) {
  if (isRisk) return val <= 3 ? 'var(--success,#22c55e)' : val <= 6 ? 'var(--warning,#fbbf24)' : 'var(--error,#ef4444)';
  return val >= 8 ? 'var(--success,#22c55e)' : val >= 5 ? 'var(--warning,#fbbf24)' : 'var(--error,#ef4444)';
}

function renderEvaluationsTab(evals) {
  const el = document.getElementById('evaluationsTabContent');
  if (!evals.length) {
    el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted);"><span class="material-symbols-outlined" style="font-size:40px;">analytics</span><p style="margin-top:8px;">No evaluations for this player yet</p></div>';
    return;
  }
  const periodLabels = { weekly: 'Weekly', monthly: 'Monthly', semi_annual: 'Semi-Annual', annual: 'Annual' };
  el.innerHTML = evals.map((ev, i) => {
    const cats = EVAL_CATS.filter(c => ev[c.field] != null);
    const nonRiskCats = cats.filter(c => c.field !== 'leaving_risk');
    const avg = nonRiskCats.length ? (nonRiskCats.reduce((s, c) => s + ev[c.field], 0) / nonRiskCats.length).toFixed(1) : '-';
    const date = ev.created_at ? ev.created_at.split('T')[0] : '';
    return `<div style="padding:16px 0;${i > 0 ? 'border-top:1px solid var(--border,rgba(148,163,184,0.12));' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div>
          <strong style="font-size:15px;">${periodLabels[ev.period_type] || ev.period_type} — ${esc(ev.period_label)}</strong>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
            <span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">person</span>
            ${esc(ev.coach_name)} &middot; ${date}
          </div>
        </div>
        <div style="text-align:right;">
          <span style="font-size:20px;font-weight:700;color:${ratingColor(parseFloat(avg), false)}">${avg}</span>
          <div style="font-size:10px;color:var(--text-muted)">avg</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;">
        ${cats.map(c => {
          const val = ev[c.field];
          const isRisk = c.field === 'leaving_risk';
          const color = ratingColor(val, isRisk);
          return `<div style="background:var(--bg-card,#1e293b);padding:8px;border-radius:6px;">
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;">${c.label}</div>
            <div style="display:flex;align-items:center;gap:6px;">
              <div style="flex:1;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">
                <div style="height:100%;width:${val*10}%;background:${color};border-radius:2px;"></div>
              </div>
              <span style="font-size:12px;font-weight:700;color:${color};">${val}</span>
            </div>
          </div>`;
        }).join('')}
      </div>
      ${ev.overall_notes ? `<div style="margin-top:10px;font-size:13px;color:var(--text-secondary);line-height:1.5;">${esc(ev.overall_notes)}</div>` : ''}
      ${ev.potential_notes ? `<div style="margin-top:6px;font-size:13px;color:var(--info,#60a5fa);line-height:1.5;"><strong>Potential:</strong> ${esc(ev.potential_notes)}</div>` : ''}
    </div>`;
  }).join('');
}

/* ───── Report Requests ───── */

async function openReportRequestModal() {
  // Populate teams
  const teamSel = document.getElementById('rrTeam');
  teamSel.innerHTML = '<option value="">Select team...</option>';
  try {
    const res = await AdminAPI.get('/api/teams');
    (res.data || []).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      teamSel.appendChild(opt);
    });
  } catch {}

  // Default due date: 7 days from now
  const due = new Date();
  due.setDate(due.getDate() + 7);
  document.getElementById('rrDueDate').value = due.toISOString().split('T')[0];
  document.getElementById('rrCoach').innerHTML = '<option value="">All coaches in team</option>';
  document.getElementById('rrInstructions').value = '';

  openModal('reportRequestModal');
}

async function sendReportRequest() {
  const teamId = document.getElementById('rrTeam').value;
  const coachId = document.getElementById('rrCoach').value;
  const periodType = document.getElementById('rrPeriodType').value;
  const dueDate = document.getElementById('rrDueDate').value;
  const instructions = document.getElementById('rrInstructions').value;

  if (!teamId) { AdminToast.error('Select a team'); return; }
  if (!dueDate) { AdminToast.error('Set a due date'); return; }

  try {
    await AdminAPI.post('/api/admin/evaluations/requests', {
      team_id: parseInt(teamId),
      coach_id: coachId ? parseInt(coachId) : null,
      period_type: periodType,
      due_date: dueDate,
      instructions: instructions || null,
    });
    closeModal('reportRequestModal');
    AdminToast.success('Report request sent to coaches!');
  } catch { AdminToast.error('Failed to send request'); }
}

function renderReportsTab(reports) {
  const el = document.getElementById('reportsTabContent');
  if (!reports.length) {
    el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted);"><span class="material-symbols-outlined" style="font-size:40px;">description</span><p style="margin-top:8px;">No reports written for this player yet</p></div>';
    return;
  }

  el.innerHTML = reports.map((r, i) => {
    const date = r.created_at ? r.created_at.split('T')[0] : '';
    const listHtml = (items, label, icon, color) => {
      if (!items || !items.length) return '';
      return `<div style="margin-top:10px;">
        <div style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:${color};margin-bottom:4px;">
          <span class="material-symbols-outlined" style="font-size:16px;">${icon}</span>${label}
        </div>
        <ul style="margin:0;padding-left:20px;font-size:13px;color:var(--text-secondary);line-height:1.6;">
          ${items.map(s => `<li>${esc(s)}</li>`).join('')}
        </ul>
      </div>`;
    };

    return `<div class="pd-report-card" style="padding:16px 0;${i > 0 ? 'border-top:1px solid var(--border,rgba(148,163,184,0.12));' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <strong style="font-size:15px;">${esc(r.period)}</strong>
          ${r.is_ai_generated ? '<span style="display:inline-block;background:var(--primary,#3b82f6);color:#fff;font-size:9px;padding:2px 6px;border-radius:4px;margin-left:6px;vertical-align:middle;">AI</span>' : ''}
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
            <span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">person</span>
            ${esc(r.coach_name)} &middot; ${date}
          </div>
        </div>
      </div>
      ${listHtml(r.strengths, 'Strengths', 'thumb_up', 'var(--success,#22c55e)')}
      ${listHtml(r.weaknesses, 'Weaknesses', 'trending_down', 'var(--error,#ef4444)')}
      ${listHtml(r.focus_areas, 'Focus Areas', 'target', 'var(--warning,#fbbf24)')}
      ${r.recommendations ? `<div style="margin-top:10px;">
        <div style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:var(--info,#60a5fa);margin-bottom:4px;">
          <span class="material-symbols-outlined" style="font-size:16px;">lightbulb</span>Recommendations
        </div>
        <p style="font-size:13px;color:var(--text-secondary);margin:0;line-height:1.6;">${esc(r.recommendations)}</p>
      </div>` : ''}
      ${r.progress_notes ? `<div style="margin-top:10px;">
        <div style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:4px;">
          <span class="material-symbols-outlined" style="font-size:16px;">edit_note</span>Progress Notes
        </div>
        <p style="font-size:13px;color:var(--text-secondary);margin:0;line-height:1.6;">${esc(r.progress_notes)}</p>
      </div>` : ''}
    </div>`;
  }).join('');
}
