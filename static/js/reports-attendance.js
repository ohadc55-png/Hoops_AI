/**
 * HOOPS AI - Reports: Attendance Tab
 * Event list, player grid, save attendance, stats
 */

// ===== EVENT LOADING =====
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
  sel.innerHTML = `<option value="">${t('reports.att.select_practice')}</option>`
    + _events.map(e => `<option value="${e.id}">${e.date} — ${esc(e.title)}</option>`).join('');
}

// ===== ATTENDANCE GRID =====
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
    el.innerHTML = `<div class="text-sm text-muted" style="padding:var(--sp-4)">${t('reports.att.no_players')}</div>`;
    return;
  }
  let html = '<div class="att-grid">';
  html += `<div class="att-row att-header"><span>${t('reports.att.header.number')}</span><span>${t('reports.att.header.player')}</span><span>${t('reports.att.header.present')}</span><span>${t('reports.att.header.notes')}</span></div>`;
  _players.forEach(p => {
    const rec = existingMap[p.id] || {};
    html += `<div class="att-row">
      <span style="color:var(--text-muted)">${p.jersey_number || '-'}</span>
      <span style="font-weight:600">${esc(p.name)}</span>
      <span><input type="checkbox" class="att-check" data-pid="${p.id}" ${rec.present ? 'checked' : ''}></span>
      <span><input type="text" class="input" style="height:32px;font-size:var(--text-xs)" data-notes="${p.id}" value="${esc(rec.notes || '')}" placeholder="${t('reports.att.header.notes')}"></span>
    </div>`;
  });
  html += '</div>';
  html += `<button class="btn btn-primary" style="margin-top:var(--sp-3)" onclick="saveAttendance(${eventId})"><span class="material-symbols-outlined" style="font-size:18px">save</span> Save Attendance</button>`;
  el.innerHTML = html;
}

// ===== SAVE ATTENDANCE =====
async function saveAttendance(eventId) {
  const records = _players.map(p => ({
    player_id: p.id,
    present: document.querySelector(`.att-check[data-pid="${p.id}"]`)?.checked || false,
    notes: document.querySelector(`[data-notes="${p.id}"]`)?.value || null,
  }));
  try {
    await API.post(`/api/reports/attendance/${eventId}`, { records });
    Toast.success(t('reports.att.saved'));
    loadAttendanceStats();
  } catch(e) {}
}

// ===== ATTENDANCE STATS =====
async function loadAttendanceStats() {
  try {
    const r = await API.get('/api/reports/attendance/stats');
    const stats = r.data || [];
    const el = document.getElementById('attStats');
    if (!stats.length) { el.innerHTML = `<div class="text-sm text-muted">${t('reports.att.no_data')}</div>`; return; }
    el.innerHTML = `<h3 style="font-size:var(--text-base);font-weight:600;margin-bottom:var(--sp-3)">${t('reports.att.overview')}</h3>` + '<div class="att-stats">'
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
