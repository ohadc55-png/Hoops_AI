/**
 * HOOPS AI - Reports: Game Reports Tab
 * Create/edit game reports, standout players multi-select, pending games banner
 */

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
    el.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">sports_basketball</span><h3>${t('reports.games.empty.title')}</h3><p>${t('reports.games.empty.subtitle')}</p></div>`;
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
    ${r.standout_player_names?.length ? `<div class="text-xs text-muted">${t('reports.games.standouts')}: ` + r.standout_player_names.map(p => esc(p)).join(', ') + '</div>' : ''}
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
  document.getElementById('gameReportModalTitle').textContent = data?.id ? t('reports.games.modal.edit') : t('reports.games.modal.new');
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
  if (!body.date || !body.opponent) { Toast.error(t('reports.games.date_opponent_required')); return; }
  try {
    let result;
    if (id) {
      result = await API.put(`/api/reports/games/${id}`, body);
    } else {
      result = await API.post('/api/reports/games', body);
    }
    closeModal('gameReportModal');
    Toast.success(id ? t('reports.games.updated') : t('reports.games.created'));
    loadGameReports();
    loadPendingGames();
  } catch(e) {}
}

async function deleteGameReport(id) {
  if (!confirm(t('reports.games.confirm_delete'))) return;
  try { await API.del(`/api/reports/games/${id}`); closeModal('gameReportModal'); Toast.success(t('reports.games.deleted')); loadGameReports(); } catch(e) {}
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
  }).join('') || `<div style="padding:var(--sp-3);color:var(--text-muted);font-size:var(--text-sm)">${t('reports.games.no_roster')}</div>`;
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
    <span>${_pendingGames.length === 1 ? t('reports.pending.singular') : t('reports.pending.plural', { count: _pendingGames.length })}</span>
  </div>` + _pendingGames.map(e => `<div class="pending-game-card" onclick="openReportForEvent(${e.id})">
    <span class="material-symbols-outlined" style="font-size:18px;color:var(--warning)">sports_basketball</span>
    <div style="flex:1">
      <div style="font-weight:600">${e.opponent ? 'vs ' + esc(e.opponent) : t('reports.pending.vs_unknown')}</div>
      <div class="text-xs text-muted">${e.date} ${e.location ? '- ' + esc(e.location) : ''}</div>
    </div>
    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();openReportForEvent(${e.id})">${t('reports.pending.fill_report')}</button>
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
