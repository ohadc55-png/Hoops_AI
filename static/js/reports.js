/**
 * HOOPS AI - Reports Page
 */
let _players = [], _events = [], _gameReports = [], _playerReports = [];
let _selectedStandouts = [];
let _pendingGames = [];
let _evaluations = [], _evalRequests = [];

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#reportTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#reportTabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      ['attendance','games','playerReports','evaluations'].forEach(t => document.getElementById('tab-'+t).classList.add('hidden'));
      document.getElementById('tab-'+tab.dataset.tab).classList.remove('hidden');
    });
  });
  loadPlayers();
  loadPracticeEvents();
  loadAttendanceStats();
  loadGameReports();
  loadPendingGames();
  loadEvalRequests();
  updatePeriodLabel();

  // Auto-open game report from notification bell click
  const storedEvent = localStorage.getItem('hoops_open_game_report');
  if (storedEvent) {
    localStorage.removeItem('hoops_open_game_report');
    try {
      const event = JSON.parse(storedEvent);
      document.querySelector('[data-tab="games"]')?.click();
      setTimeout(() => {
        openGameReportModal({
          date: event.date,
          opponent: event.opponent || '',
          location: event.location || '',
          team_event_id: event.id,
        });
      }, 300);
    } catch(e) {}
  }

  // Close standout dropdown on outside click
  document.addEventListener('click', (e) => {
    const container = document.getElementById('grStandoutsContainer');
    if (container && !container.contains(e.target)) {
      document.getElementById('grStandoutsDropdown')?.classList.remove('open');
    }
  });
});

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

// ===== DATA LOADING =====
async function loadPlayers() {
  try { const r = await API.get('/api/players'); _players = r.data || []; } catch(e) {}
}

async function loadPracticeEvents() {
  try {
    const r = await API.get('/api/events');
    _events = (r.data || []).filter(e => e.event_type === 'practice').sort((a,b) => b.date.localeCompare(a.date));
    renderEventDropdown();
  } catch(e) {}
}

function renderEventDropdown() {
  const sel = document.getElementById('attEventSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select practice...</option>'
    + _events.map(e => `<option value="${e.id}">${e.date} — ${esc(e.title)}</option>`).join('');
}

// ===== ATTENDANCE =====
async function loadAttendanceForEvent() {
  const eventId = document.getElementById('attEventSelect').value;
  if (!eventId) { document.getElementById('attGrid').innerHTML = ''; return; }
  try {
    const r = await API.get(`/api/reports/attendance/${eventId}`);
    const existing = r.data || [];
    const map = {};
    existing.forEach(a => map[a.player_id] = a);
    renderAttendanceGrid(parseInt(eventId), map);
  } catch(e) {}
}

function renderAttendanceGrid(eventId, existingMap) {
  const el = document.getElementById('attGrid');
  if (!_players.length) {
    el.innerHTML = '<div class="text-sm text-muted" style="padding:var(--sp-4)">No players in roster. Add players in Team Management first.</div>';
    return;
  }
  let html = '<div class="att-grid">';
  html += '<div class="att-row att-header"><span>#</span><span>Player</span><span>Present</span><span>Notes</span></div>';
  _players.forEach(p => {
    const rec = existingMap[p.id] || {};
    html += `<div class="att-row">
      <span style="color:var(--text-muted)">${p.jersey_number || '-'}</span>
      <span style="font-weight:600">${esc(p.name)}</span>
      <span><input type="checkbox" class="att-check" data-pid="${p.id}" ${rec.present ? 'checked' : ''}></span>
      <span><input type="text" class="input" style="height:32px;font-size:var(--text-xs)" data-notes="${p.id}" value="${esc(rec.notes || '')}" placeholder="Notes"></span>
    </div>`;
  });
  html += '</div>';
  html += `<button class="btn btn-primary" style="margin-top:var(--sp-3)" onclick="saveAttendance(${eventId})"><span class="material-symbols-outlined" style="font-size:18px">save</span> Save Attendance</button>`;
  el.innerHTML = html;
}

async function saveAttendance(eventId) {
  const records = _players.map(p => ({
    player_id: p.id,
    present: document.querySelector(`.att-check[data-pid="${p.id}"]`)?.checked || false,
    notes: document.querySelector(`[data-notes="${p.id}"]`)?.value || null,
  }));
  try {
    await API.post(`/api/reports/attendance/${eventId}`, { records });
    Toast.success('Attendance saved!');
    loadAttendanceStats();
  } catch(e) {}
}

async function loadAttendanceStats() {
  try {
    const r = await API.get('/api/reports/attendance/stats');
    const stats = r.data || [];
    const el = document.getElementById('attStats');
    if (!stats.length) { el.innerHTML = '<div class="text-sm text-muted">No attendance data yet</div>'; return; }
    el.innerHTML = '<h3 style="font-size:var(--text-base);font-weight:600;margin-bottom:var(--sp-3)">Attendance Overview</h3><div class="att-stats">'
      + stats.map(s => {
        const player = _players.find(p => p.id === s.player_id);
        const name = player ? player.name : `Player #${s.player_id}`;
        const pct = s.percentage;
        const cls = pct >= 80 ? 'green' : pct >= 60 ? 'yellow' : 'red';
        const barColor = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--error)';
        return `<div class="att-stat-card">
          <span class="player-name">${esc(name)}</span>
          <div class="att-bar-wrap"><div class="att-bar" style="width:${pct}%;background:${barColor}"></div></div>
          <span class="att-pct ${cls}">${pct}%</span>
          <span class="text-xs text-muted">${s.attended}/${s.total}</span>
        </div>`;
      }).join('')
      + '</div>';
  } catch(e) {}
}

// ===== GAME REPORTS =====
async function loadGameReports() {
  try {
    const r = await API.get('/api/reports/games');
    _gameReports = r.data || [];
    renderGameReports();
  } catch(e) {}
}

function renderGameReports() {
  const el = document.getElementById('gameReportsList');
  if (!_gameReports.length) {
    el.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">sports_basketball</span><h3>No game reports</h3><p>Create your first game report</p></div>';
    return;
  }
  el.innerHTML = _gameReports.map(r => `<div class="game-report-card" onclick="viewGameReport(${r.id})">
    <div class="gr-top">
      <div>
        <strong style="font-size:var(--text-base)">vs ${esc(r.opponent)}</strong>
        <div class="text-xs text-muted" style="margin-top:2px">${r.date} ${r.location ? '• ' + esc(r.location) : ''}</div>
      </div>
      <div style="text-align:right">
        <span class="gr-score">${r.score_us ?? '-'} : ${r.score_them ?? '-'}</span>
        <div><span class="result-badge ${r.result}">${r.result}</span></div>
      </div>
    </div>
    ${r.standout_player_names?.length ? '<div class="text-xs text-muted">Standouts: ' + r.standout_player_names.map(p => esc(p)).join(', ') + '</div>' : ''}
  </div>`).join('');
}

function openGameReportModal(data) {
  document.getElementById('grId').value = data?.id || '';
  document.getElementById('grTeamEventId').value = data?.team_event_id || '';
  document.getElementById('grDate').value = data?.date || '';
  document.getElementById('grOpponent').value = data?.opponent || '';
  document.getElementById('grLocation').value = data?.location || '';
  document.getElementById('grResult').value = data?.result || 'win';
  document.getElementById('grScoreUs').value = data?.score_us ?? '';
  document.getElementById('grScoreThem').value = data?.score_them ?? '';

  // Standout players: populate selected IDs
  _selectedStandouts = [];
  if (data?.standout_players?.length) {
    data.standout_players.forEach(s => {
      if (typeof s === 'number') {
        _selectedStandouts.push(s);
      } else {
        // Legacy: match by name
        const found = _players.find(p => p.name === s);
        if (found) _selectedStandouts.push(found.id);
      }
    });
  }
  renderStandoutChips();
  document.getElementById('grStandoutsDropdown').classList.remove('open');

  document.getElementById('grImprove').value = (data?.areas_to_improve || []).join(', ');
  document.getElementById('grNotable').value = data?.notable_events || '';
  document.getElementById('grNotes').value = data?.notes || '';
  document.getElementById('gameReportModalTitle').textContent = data?.id ? 'Edit Game Report' : 'New Game Report';
  document.getElementById('grDeleteBtn').style.display = data?.id ? '' : 'none';
  openModal('gameReportModal');
}

function viewGameReport(id) {
  const r = _gameReports.find(x => x.id === id);
  if (r) openGameReportModal(r);
}

async function saveGameReport() {
  const id = document.getElementById('grId').value;
  const teamEventId = document.getElementById('grTeamEventId').value;
  const body = {
    date: document.getElementById('grDate').value,
    opponent: document.getElementById('grOpponent').value,
    location: document.getElementById('grLocation').value || null,
    result: document.getElementById('grResult').value,
    score_us: document.getElementById('grScoreUs').value ? parseInt(document.getElementById('grScoreUs').value) : null,
    score_them: document.getElementById('grScoreThem').value ? parseInt(document.getElementById('grScoreThem').value) : null,
    standout_players: _selectedStandouts,
    areas_to_improve: document.getElementById('grImprove').value.split(',').map(s => s.trim()).filter(Boolean),
    notable_events: document.getElementById('grNotable').value || null,
    notes: document.getElementById('grNotes').value || null,
    team_event_id: teamEventId ? parseInt(teamEventId) : null,
  };
  if (!body.date || !body.opponent) { Toast.error('Date and opponent are required'); return; }
  try {
    if (id) await API.put(`/api/reports/games/${id}`, body);
    else await API.post('/api/reports/games', body);
    closeModal('gameReportModal');
    Toast.success(id ? 'Report updated!' : 'Report created!');
    loadGameReports();
    loadPendingGames();
  } catch(e) {}
}

async function deleteGameReport(id) {
  if (!confirm('Delete this game report?')) return;
  try { await API.del(`/api/reports/games/${id}`); closeModal('gameReportModal'); Toast.success('Deleted'); loadGameReports(); } catch(e) {}
}

// ===== STANDOUT PLAYERS MULTI-SELECT =====
function toggleStandoutDropdown() {
  const dropdown = document.getElementById('grStandoutsDropdown');
  if (dropdown.classList.contains('open')) { dropdown.classList.remove('open'); return; }
  dropdown.innerHTML = _players.map(p => {
    const checked = _selectedStandouts.includes(p.id) ? 'checked' : '';
    const sel = _selectedStandouts.includes(p.id) ? 'selected' : '';
    return `<label class="multi-select-option ${sel}">
      <input type="checkbox" ${checked} onchange="toggleStandout(${p.id})">
      <span>#${p.jersey_number || '-'} ${esc(p.name)}</span>
    </label>`;
  }).join('') || '<div style="padding:var(--sp-3);color:var(--text-muted);font-size:var(--text-sm)">No players in roster</div>';
  dropdown.classList.add('open');
}

function toggleStandout(playerId) {
  const idx = _selectedStandouts.indexOf(playerId);
  if (idx >= 0) _selectedStandouts.splice(idx, 1);
  else _selectedStandouts.push(playerId);
  renderStandoutChips();
  // Re-render dropdown to update checkmarks
  const dropdown = document.getElementById('grStandoutsDropdown');
  if (dropdown.classList.contains('open')) {
    dropdown.classList.remove('open');
    toggleStandoutDropdown();
  }
}

function renderStandoutChips() {
  const el = document.getElementById('grStandoutsChips');
  if (!el) return;
  el.innerHTML = _selectedStandouts.map(id => {
    const p = _players.find(x => x.id === id);
    const name = p ? p.name : `#${id}`;
    return `<span class="multi-select-chip">
      ${esc(name)}
      <span class="material-symbols-outlined remove-chip" onclick="toggleStandout(${id})">close</span>
    </span>`;
  }).join('');
}

// ===== PENDING GAME REPORTS =====
async function loadPendingGames() {
  try {
    const r = await API.get('/api/reports/games/pending');
    _pendingGames = r.data || [];
    renderPendingBanner();
  } catch(e) {}
}

function renderPendingBanner() {
  let el = document.getElementById('pendingGamesBanner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'pendingGamesBanner';
    const list = document.getElementById('gameReportsList');
    if (list) list.before(el);
  }
  if (!_pendingGames.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="pending-banner">
    <span class="material-symbols-outlined" style="font-size:20px">warning</span>
    <span>${_pendingGames.length} ${_pendingGames.length === 1 ? 'game needs' : 'games need'} a report</span>
  </div>` + _pendingGames.map(e => `<div class="pending-game-card" onclick="openReportForEvent(${e.id})">
    <span class="material-symbols-outlined" style="font-size:18px;color:var(--warning)">sports_basketball</span>
    <div style="flex:1">
      <div style="font-weight:600">vs ${esc(e.opponent || 'Unknown')}</div>
      <div class="text-xs text-muted">${e.date} ${e.location ? '- ' + esc(e.location) : ''}</div>
    </div>
    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();openReportForEvent(${e.id})">Fill Report</button>
  </div>`).join('');
}

function openReportForEvent(eventId) {
  const ev = _pendingGames.find(e => e.id === eventId);
  if (!ev) return;
  openGameReportModal({
    date: ev.date,
    opponent: ev.opponent || '',
    location: ev.location || '',
    team_event_id: ev.id,
  });
}

// ===== PLAYER REPORTS =====
async function loadPlayerReports() {
  const playerId = document.getElementById('prPlayerSelect').value;
  if (!playerId) { document.getElementById('playerReportsList').innerHTML = ''; return; }
  try {
    const r = await API.get(`/api/reports/players?player_id=${playerId}`);
    _playerReports = r.data || [];
    renderPlayerReports();
  } catch(e) {}
}

function renderPlayerReports() {
  const el = document.getElementById('playerReportsList');
  if (!_playerReports.length) {
    el.innerHTML = '<div class="text-sm text-muted" style="padding:var(--sp-4)">No reports for this player yet</div>';
    return;
  }
  el.innerHTML = _playerReports.map(r => {
    const renderList = (items, cls) => items?.length
      ? `<ul class="pr-list ${cls}">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
      : '<span class="text-xs text-muted">—</span>';
    return `<div class="player-report-card">
      <div class="pr-header">
        <div>
          <strong>${esc(r.period)}</strong>
          ${r.is_ai_generated ? '<span class="badge badge-primary" style="font-size:9px;margin-left:var(--sp-2)">AI</span>' : ''}
        </div>
        <div class="flex gap-2">
          <span class="text-xs text-muted">${r.created_at?.split('T')[0] || ''}</span>
          <button class="btn-icon" style="width:24px;height:24px" onclick="deletePlayerReport(${r.id})"><span class="material-symbols-outlined" style="font-size:14px">delete</span></button>
        </div>
      </div>
      <div class="pr-section"><h4>Strengths</h4>${renderList(r.strengths, 'strengths')}</div>
      <div class="pr-section"><h4>Weaknesses</h4>${renderList(r.weaknesses, 'weaknesses')}</div>
      <div class="pr-section"><h4>Focus Areas</h4>${renderList(r.focus_areas, 'focus')}</div>
      ${r.progress_notes ? '<div class="pr-section"><h4>Progress</h4><div class="pr-text">' + esc(r.progress_notes) + '</div></div>' : ''}
      ${r.recommendations ? '<div class="pr-section"><h4>Recommendations</h4><div class="pr-text">' + esc(r.recommendations) + '</div></div>' : ''}
    </div>`;
  }).join('');
}

function populatePlayerDropdowns() {
  const sels = document.querySelectorAll('.player-select');
  sels.forEach(sel => {
    sel.innerHTML = '<option value="">Select player...</option>'
      + _players.map(p => `<option value="${p.id}">#${p.jersey_number || '-'} ${esc(p.name)}</option>`).join('');
  });
}

async function generatePlayerReport() {
  const playerId = document.getElementById('prPlayerSelect').value;
  const now = new Date();
  const period = now.getFullYear() + '-H' + (now.getMonth() < 6 ? '1' : '2');
  if (!playerId) { Toast.error('Select a player first'); return; }
  const btn = document.getElementById('genReportBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Generating...';
  try {
    await API.post('/api/reports/players/generate', { player_id: parseInt(playerId), period });
    Toast.success('AI report generated!');
    loadPlayerReports();
  } catch(e) { Toast.error('Failed to generate report'); }
  finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">auto_awesome</span> AI Generate Report';
  }
}

async function deletePlayerReport(id) {
  if (!confirm('Delete this report?')) return;
  try { await API.del(`/api/reports/players/${id}`); Toast.success('Deleted'); loadPlayerReports(); } catch(e) {}
}

// After players load, populate dropdowns
const _origLoadPlayers = loadPlayers;
loadPlayers = async function() {
  await _origLoadPlayers();
  populatePlayerDropdowns();
  // Add "All Players" option to eval dropdown only
  const evalSel = document.getElementById('evalPlayerSelect');
  if (evalSel) {
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'All Players';
    evalSel.insertBefore(allOpt, evalSel.options[1]);
  }
};

// ===== PLAYER EVALUATIONS =====
const EVAL_CATEGORIES = [
  { key: 'offensive', label: 'Offensive', ratingId: 'evalOffRating', notesId: 'evalOffNotes', field: 'offensive_rating', notesField: 'offensive_notes' },
  { key: 'defensive', label: 'Defensive', ratingId: 'evalDefRating', notesId: 'evalDefNotes', field: 'defensive_rating', notesField: 'defensive_notes' },
  { key: 'iq', label: 'Basketball IQ', ratingId: 'evalIqRating', notesId: 'evalIqNotes', field: 'iq_rating', notesField: 'iq_notes' },
  { key: 'social', label: 'Social', ratingId: 'evalSocialRating', notesId: 'evalSocialNotes', field: 'social_rating', notesField: 'social_notes' },
  { key: 'leadership', label: 'Leadership', ratingId: 'evalLeaderRating', notesId: 'evalLeaderNotes', field: 'leadership_rating', notesField: 'leadership_notes' },
  { key: 'work_ethic', label: 'Work Ethic', ratingId: 'evalWorkRating', notesId: 'evalWorkNotes', field: 'work_ethic_rating', notesField: 'work_ethic_notes' },
  { key: 'fitness', label: 'Fitness', ratingId: 'evalFitRating', notesId: 'evalFitNotes', field: 'fitness_rating', notesField: 'fitness_notes' },
  { key: 'improvement', label: 'Improvement', ratingId: 'evalImpRating', notesId: 'evalImpNotes', field: 'improvement_rating', notesField: 'improvement_notes' },
  { key: 'leaving_risk', label: 'Leaving Risk', ratingId: 'evalLeaveRating', notesId: 'evalLeaveNotes', field: 'leaving_risk', notesField: 'leaving_risk_notes' },
];

function updatePeriodLabel() {
  const type = document.getElementById('evalModalPeriodType')?.value || 'monthly';
  const now = new Date();
  let label = '';
  if (type === 'weekly') {
    const d = new Date(now); d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week = Math.ceil(((d - new Date(d.getFullYear(),0,4)) / 86400000 + 1) / 7);
    label = `${now.getFullYear()}-W${String(week).padStart(2,'0')}`;
  } else if (type === 'monthly') {
    label = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  } else if (type === 'semi_annual') {
    label = `${now.getFullYear()}-H${now.getMonth() < 6 ? '1' : '2'}`;
  } else if (type === 'annual') {
    const sy = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    label = `${sy}-${sy+1}`;
  }
  const el = document.getElementById('evalModalPeriodLabel');
  if (el) el.value = label;
}

async function loadEvalRequests() {
  try {
    const r = await API.get('/api/evaluations/requests');
    _evalRequests = r.data || [];
    renderEvalRequestsBanner();
  } catch(e) {}
}

function renderEvalRequestsBanner() {
  const el = document.getElementById('evalRequestsBanner');
  if (!el) return;
  if (!_evalRequests.length) { el.innerHTML = ''; return; }
  const periodLabels = { weekly: 'Weekly', monthly: 'Monthly', semi_annual: 'Semi-Annual', annual: 'Annual' };
  el.innerHTML = `<div class="pending-banner" style="background:rgba(59,130,246,0.1);border-color:var(--info);">
    <span class="material-symbols-outlined" style="font-size:20px;color:var(--info)">assignment</span>
    <span>${_evalRequests.length} pending evaluation ${_evalRequests.length === 1 ? 'request' : 'requests'} from management</span>
  </div>` + _evalRequests.map(r => `<div class="pending-game-card" style="border-left-color:var(--info);">
    <span class="material-symbols-outlined" style="font-size:18px;color:var(--info)">assignment</span>
    <div style="flex:1">
      <div style="font-weight:600">${periodLabels[r.period_type] || r.period_type} Evaluation</div>
      <div class="text-xs text-muted">Due: ${r.due_date}${r.instructions ? ' — ' + esc(r.instructions) : ''}</div>
    </div>
    <button class="btn btn-sm btn-primary" onclick="openEvaluationModal({report_request_id:${r.id},period_type:'${r.period_type}'})">Fill Now</button>
  </div>`).join('');
}

async function loadEvaluations() {
  const playerId = document.getElementById('evalPlayerSelect')?.value;
  if (!playerId) { document.getElementById('evaluationsList').innerHTML = ''; return; }
  try {
    const url = playerId === 'all' ? '/api/evaluations' : `/api/evaluations?player_id=${playerId}`;
    const r = await API.get(url);
    _evaluations = r.data || [];
    renderEvaluations();
  } catch(e) {}
}

function ratingColor(val) {
  if (val >= 8) return 'var(--success)';
  if (val >= 5) return 'var(--warning)';
  return 'var(--error)';
}

function renderEvaluations() {
  const el = document.getElementById('evaluationsList');
  const showAll = document.getElementById('evalPlayerSelect')?.value === 'all';
  if (!_evaluations.length) {
    el.innerHTML = '<div class="text-sm text-muted" style="padding:var(--sp-4)">No evaluations yet</div>';
    return;
  }
  const periodLabels = { weekly: 'Weekly', monthly: 'Monthly', semi_annual: 'Semi-Annual', annual: 'Annual' };
  el.innerHTML = _evaluations.map(ev => {
    const cats = EVAL_CATEGORIES.filter(c => ev[c.field] != null);
    const avg = cats.length ? Math.round(cats.reduce((s,c) => s + (c.field === 'leaving_risk' ? 0 : ev[c.field]), 0) / cats.filter(c => c.field !== 'leaving_risk').length * 10) / 10 : '-';
    const playerInfo = showAll ? _players.find(p => p.id === ev.player_id) : null;
    const playerLabel = playerInfo ? `#${playerInfo.jersey_number || '-'} ${esc(playerInfo.name)} — ` : '';
    return `<div class="game-report-card" onclick="viewEvaluation(${ev.id})" style="cursor:pointer;">
      <div class="gr-top">
        <div>
          <strong>${playerLabel}${periodLabels[ev.period_type] || ev.period_type} — ${esc(ev.period_label)}</strong>
          <div class="text-xs text-muted" style="margin-top:2px">${ev.created_at?.split('T')[0] || ''}</div>
        </div>
        <div style="text-align:right;">
          <span style="font-size:var(--text-lg);font-weight:700;color:${ratingColor(avg)}">${avg}</span>
          <div class="text-xs text-muted">avg rating</div>
        </div>
      </div>
      <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-top:var(--sp-2);">
        ${cats.map(c => {
          const val = ev[c.field];
          const isRisk = c.field === 'leaving_risk';
          const color = isRisk ? (val <= 3 ? 'var(--success)' : val <= 6 ? 'var(--warning)' : 'var(--error)') : ratingColor(val);
          return `<div style="flex:1;min-width:80px;">
            <div class="text-xs text-muted">${c.label}</div>
            <div class="att-bar-wrap" style="height:6px;margin-top:2px;"><div class="att-bar" style="width:${val*10}%;background:${color};height:100%;border-radius:3px;"></div></div>
            <div style="font-size:10px;font-weight:600;color:${color}">${val}/10</div>
          </div>`;
        }).join('')}
      </div>
      ${ev.overall_notes ? `<div class="text-sm" style="margin-top:var(--sp-2);color:var(--text-secondary)">${esc(ev.overall_notes).substring(0,120)}${ev.overall_notes.length > 120 ? '...' : ''}</div>` : ''}
    </div>`;
  }).join('');
}

function openEvaluationModal(data) {
  const isEdit = data?.id;
  document.getElementById('evalId').value = data?.id || '';
  document.getElementById('evalRequestId').value = data?.report_request_id || '';
  document.getElementById('evalModalTitle').textContent = isEdit ? 'Edit Evaluation' : 'New Player Evaluation';
  document.getElementById('evalDeleteBtn').style.display = isEdit ? '' : 'none';

  // Player & period
  document.getElementById('evalModalPlayer').value = data?.player_id || document.getElementById('evalPlayerSelect')?.value || '';
  document.getElementById('evalModalPeriodType').value = data?.period_type || 'monthly';
  updatePeriodLabel();
  if (data?.period_label) document.getElementById('evalModalPeriodLabel').value = data.period_label;

  // Ratings
  EVAL_CATEGORIES.forEach(c => {
    const slider = document.getElementById(c.ratingId);
    const notes = document.getElementById(c.notesId);
    const val = data?.[c.field] ?? (c.field === 'leaving_risk' ? 1 : 5);
    if (slider) { slider.value = val; slider.nextElementSibling.textContent = val; }
    if (notes) notes.value = data?.[c.notesField] || '';
  });

  document.getElementById('evalOverall').value = data?.overall_notes || '';
  document.getElementById('evalPotential').value = data?.potential_notes || '';

  openModal('evaluationModal');
}

function viewEvaluation(id) {
  const ev = _evaluations.find(e => e.id === id);
  if (ev) openEvaluationModal(ev);
}

async function saveEvaluation() {
  const id = document.getElementById('evalId').value;
  const playerId = document.getElementById('evalModalPlayer').value;
  if (!playerId) { Toast.error('Select a player'); return; }

  const body = {
    player_id: parseInt(playerId),
    period_type: document.getElementById('evalModalPeriodType').value,
    period_label: document.getElementById('evalModalPeriodLabel').value || null,
    overall_notes: document.getElementById('evalOverall').value || null,
    potential_notes: document.getElementById('evalPotential').value || null,
    report_request_id: document.getElementById('evalRequestId').value ? parseInt(document.getElementById('evalRequestId').value) : null,
  };

  EVAL_CATEGORIES.forEach(c => {
    body[c.field] = parseInt(document.getElementById(c.ratingId).value);
    body[c.notesField] = document.getElementById(c.notesId).value || null;
  });

  try {
    if (id) await API.put(`/api/evaluations/${id}`, body);
    else await API.post('/api/evaluations', body);
    closeModal('evaluationModal');
    Toast.success(id ? 'Evaluation updated!' : 'Evaluation saved!');
    loadEvaluations();
    loadEvalRequests();
  } catch(e) { Toast.error('Failed to save evaluation'); }
}

async function deleteEvaluation(id) {
  if (!confirm('Delete this evaluation?')) return;
  try {
    await API.del(`/api/evaluations/${id}`);
    closeModal('evaluationModal');
    Toast.success('Deleted');
    loadEvaluations();
  } catch(e) {}
}
