/**
 * HOOPS AI - Reports Page
 * Player Reports tab + Progress Chart
 *
 * Module structure:
 *   reports-core.js        — shared state, init, tab switching, common helpers
 *   reports-attendance.js  — attendance tab
 *   reports-games.js       — game reports tab
 *   reports-evaluations.js — evaluations tab
 *   reports.js (this file) — player reports tab + progress chart
 */

/* esc → shared-utils.js */

// ===== PLAYER REPORTS =====
async function loadPlayerReports() {
  const playerId = document.getElementById('prPlayerSelect').value;
  if (!playerId) {
    document.getElementById('playerReportsList').innerHTML = '';
    const wrap = document.getElementById('playerProgressChartWrap');
    if (wrap) wrap.style.display = 'none';
    return;
  }
  try {
    const r = await API.get(`/api/reports/players?player_id=${playerId}`);
    _playerReports = r.data || [];
    renderPlayerReports();
    renderPlayerProgressChart(playerId);
  } catch(e) {}
}

function renderPlayerReports() {
  const el = document.getElementById('playerReportsList');
  if (!_playerReports.length) {
    el.innerHTML = `<div class="text-sm text-muted" style="padding:var(--sp-4)">${t('reports.player.no_reports')}</div>`;
    return;
  }
  el.innerHTML = _playerReports.map(r => {
    const renderList = (items, cls) => items?.length
      ? `<ul class="pr-list ${cls}">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
      : '<span class="text-xs text-muted">—</span>';
    const mkRatingBadge = (label, val, color) => val != null
      ? `<div style="display:flex;align-items:center;gap:var(--sp-2);padding:var(--sp-2) var(--sp-3);background:${color}15;border-radius:var(--radius-sm);border-left:3px solid ${color};">
          <span style="font-weight:600;font-size:var(--text-xs);color:${color};">${label}</span>
          <span style="font-weight:700;font-size:var(--text-sm);color:${color};">${val}/10</span>
         </div>` : '';
    const ratingsRow = (r.personal_improvement_rating != null || r.team_contribution_rating != null || r.overall_rating != null)
      ? `<div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-bottom:var(--sp-3);">
           ${mkRatingBadge('כללי', r.overall_rating, '#9CA3AF')}
           ${mkRatingBadge('שיפור אישי', r.personal_improvement_rating, '#f48c25')}
           ${mkRatingBadge('תרומה לקבוצה', r.team_contribution_rating, '#60A5FA')}
         </div>` : '';
    const personalBlock = r.personal_improvement_notes
      ? `<div class="pr-section"><h4 style="color:#f48c25;">שיפור אישי</h4><div class="pr-text">${esc(r.personal_improvement_notes)}</div></div>` : '';
    const teamBlock = r.team_contribution_notes
      ? `<div class="pr-section"><h4 style="color:#60A5FA;">תרומה לקבוצה</h4><div class="pr-text">${esc(r.team_contribution_notes)}</div></div>` : '';
    return `<div class="player-report-card">
      <div class="pr-header">
        <div>
          <strong>${esc(_periodDisplayLabel(r.period))}</strong>
          ${r.is_ai_generated ? '<span class="badge badge-primary" style="font-size:9px;margin-left:var(--sp-2)">AI</span>' : ''}
        </div>
        <div style="display:flex;align-items:center;gap:var(--sp-2);">
          <span class="text-xs text-muted">${r.created_at?.split('T')[0] || ''}</span>
          <button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:11px;" onclick="openPlayerReportModal(${JSON.stringify(r).replace(/"/g,'&quot;')})"><span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">edit</span></button>
        </div>
      </div>
      ${ratingsRow}
      ${personalBlock}${teamBlock}
      <div class="pr-section"><h4>${t('reports.player.strengths')}</h4>${renderList(r.strengths, 'strengths')}</div>
      <div class="pr-section"><h4>${t('reports.player.weaknesses')}</h4>${renderList(r.weaknesses, 'weaknesses')}</div>
      <div class="pr-section"><h4>${t('reports.player.focus_areas')}</h4>${renderList(r.focus_areas, 'focus')}</div>
      ${r.progress_notes ? `<div class="pr-section"><h4>${t('reports.player.progress')}</h4><div class="pr-text">` + esc(r.progress_notes) + '</div></div>' : ''}
      ${r.recommendations ? `<div class="pr-section"><h4>${t('reports.player.recommendations')}</h4><div class="pr-text">` + esc(r.recommendations) + '</div></div>' : ''}
    </div>`;
  }).join('');
}

async function generatePlayerReport() {
  const playerId = document.getElementById('prPlayerSelect').value;
  const period = _calcPeriodFromType('semi_annual');
  if (!playerId) { Toast.error(t('reports.player.select_first')); return; }
  const btn = document.getElementById('genReportBtn');
  btn.disabled = true;
  btn.innerHTML = `<span class="material-symbols-outlined">hourglass_empty</span> ${t('reports.player.generate_loading')}`;
  try {
    await API.post('/api/reports/players/generate', { player_id: parseInt(playerId), period });
    Toast.success(t('reports.player.generate_success'));
    loadPlayerReports();
  } catch(e) { Toast.error(t('reports.player.generate_failed')); }
  finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px">auto_awesome</span> ${t('reports.player.generate_btn')}`;
  }
}

async function deletePlayerReport(id) {
  if (!confirm(t('reports.player.confirm_delete'))) return;
  try { await API.del(`/api/reports/players/${id}`); Toast.success(t('reports.games.deleted')); loadPlayerReports(); } catch(e) {}
}

// ===== PLAYER REPORT MANUAL MODAL =====
const REPORT_TYPE_LABELS = {
  season_start: 'תחילת עונה',
  monthly: 'חודשי',
  semi_annual: 'חצי שנתי',
  season_end: 'סוף עונה',
};

function _periodDisplayLabel(period) {
  if (!period) return '';
  if (period.includes('season-start')) return `תחילת עונה ${period.slice(0,4)}`;
  if (period.includes('season-end'))   return `סוף עונה ${period.slice(0,4)}`;
  if (period.includes('-H'))           return `חצי שנתי ${period}`;
  if (period.includes('-M')) {
    const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
    const m = parseInt(period.slice(-2)) - 1;
    return `חודשי — ${months[m] || ''} ${period.slice(0,4)}`;
  }
  return period; // fallback for legacy formats
}

function _calcPeriodFromType(type) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-12
  switch (type) {
    case 'season_start': return `${y}-season-start`;
    case 'monthly': {
      const selMonth = document.getElementById('prModalMonth')?.value;
      const mo = selMonth ? parseInt(selMonth) : m;
      return `${y}-M${String(mo).padStart(2,'0')}`;
    }
    case 'semi_annual':  return `${y}-H${m <= 6 ? '1' : '2'}`;
    case 'season_end':   return `${y}-season-end`;
    default:             return `${y}-M${String(m).padStart(2,'0')}`;
  }
}

function onReportTypeChange() {
  const type = document.getElementById('prModalReportType').value;
  const monthGroup = document.getElementById('prMonthGroup');
  const grid = document.getElementById('prTopGrid');
  if (type === 'monthly') {
    monthGroup.style.display = '';
    grid.style.gridTemplateColumns = '1fr 1fr 1fr';
  } else {
    monthGroup.style.display = 'none';
    grid.style.gridTemplateColumns = '1fr 1fr';
  }
}

function _guessReportType(period) {
  if (!period) return 'monthly';
  if (period.includes('season-start')) return 'season_start';
  if (period.includes('season-end')) return 'season_end';
  if (period.includes('-H')) return 'semi_annual';
  if (period.includes('-M')) return 'monthly';
  return 'monthly';
}

function openPlayerReportModal(data) {
  const isEdit = !!(data?.id);
  const playerId = data?.player_id || document.getElementById('prPlayerSelect').value;

  document.getElementById('prId').value = data?.id || '';
  document.getElementById('prModalTitle').textContent = isEdit ? 'עריכת דוח שחקן' : 'דוח שחקן תקופתי';
  document.getElementById('prDeleteBtn').style.display = isEdit ? '' : 'none';

  const sel = document.getElementById('prModalPlayer');
  if (sel) {
    sel.innerHTML = '<option value="">בחר שחקן...</option>'
      + _players.map(p => `<option value="${p.id}" ${p.id == playerId ? 'selected' : ''}>#${p.jersey_number || '-'} ${esc(p.name)}</option>`).join('');
  }
  const reportType = isEdit ? _guessReportType(data?.period) : 'monthly';
  document.getElementById('prModalReportType').value = reportType;

  // Set month if editing a monthly report
  if (reportType === 'monthly' && data?.period?.includes('-M')) {
    document.getElementById('prModalMonth').value = parseInt(data.period.slice(-2));
  } else {
    document.getElementById('prModalMonth').value = new Date().getMonth() + 1;
  }
  onReportTypeChange();

  const ratings = [
    ['prOverallRating', 'prOverallRatingVal', data?.overall_rating ?? 5],
    ['prPersonalRating', 'prPersonalRatingVal', data?.personal_improvement_rating ?? 5],
    ['prTeamContribRating', 'prTeamContribRatingVal', data?.team_contribution_rating ?? 5],
  ];
  ratings.forEach(([id, valId, val]) => {
    const el = document.getElementById(id);
    if (el) { el.value = val; document.getElementById(valId).textContent = val; }
  });

  document.getElementById('prPersonalNotes').value = data?.personal_improvement_notes || '';
  document.getElementById('prTeamContribNotes').value = data?.team_contribution_notes || '';
  document.getElementById('prProgressNotes').value = data?.progress_notes || '';
  document.getElementById('prRecommendations').value = data?.recommendations || '';

  openModal('playerReportModal');
}

async function saveManualPlayerReport() {
  const reportId = document.getElementById('prId').value;
  const playerId = document.getElementById('prModalPlayer').value;
  const reportType = document.getElementById('prModalReportType').value;
  const period = _calcPeriodFromType(reportType);
  if (!playerId) { Toast.error('יש לבחור שחקן'); return; }
  const personalNotes = document.getElementById('prPersonalNotes').value.trim();
  const teamNotes = document.getElementById('prTeamContribNotes').value.trim();
  if (!personalNotes) { Toast.error('יש למלא תיאור לשיפור אישי'); document.getElementById('prPersonalNotes').focus(); return; }
  if (!teamNotes) { Toast.error('יש למלא תיאור לתרומה לקבוצה'); document.getElementById('prTeamContribNotes').focus(); return; }

  const btn = document.getElementById('prSaveBtn');
  btn.disabled = true;
  const body = {
    player_id: parseInt(playerId),
    period,
    progress_notes: document.getElementById('prProgressNotes').value.trim() || null,
    recommendations: document.getElementById('prRecommendations').value.trim() || null,
    overall_rating: parseInt(document.getElementById('prOverallRating').value),
    personal_improvement_rating: parseInt(document.getElementById('prPersonalRating').value),
    personal_improvement_notes: personalNotes,
    team_contribution_rating: parseInt(document.getElementById('prTeamContribRating').value),
    team_contribution_notes: teamNotes,
  };
  try {
    if (reportId) {
      await API.put(`/api/reports/players/${reportId}`, body);
      Toast.success('הדוח עודכן בהצלחה');
    } else {
      await API.post('/api/reports/players', body);
      document.getElementById('prPlayerSelect').value = playerId;
      Toast.success('הדוח נשמר בהצלחה');
    }
    closeModal('playerReportModal');
    loadPlayerReports();
  } catch(e) { Toast.error('שגיאה בשמירת הדוח'); }
  finally { btn.disabled = false; }
}

async function deletePlayerReportFromModal() {
  const id = document.getElementById('prId').value;
  if (!id || !confirm('למחוק את הדוח?')) return;
  try {
    await API.del(`/api/reports/players/${id}`);
    closeModal('playerReportModal');
    Toast.success('הדוח נמחק');
    loadPlayerReports();
  } catch(e) { Toast.error('שגיאה במחיקת הדוח'); }
}

// ===== PROGRESS CHART (coach view) =====
let _progressChartInst = null;

async function renderPlayerProgressChart(playerId) {
  const wrap = document.getElementById('playerProgressChartWrap');
  if (!wrap) return;
  if (!playerId) { wrap.style.display = 'none'; return; }

  try {
    const r = await API.get(`/api/evaluations?player_id=${playerId}`);
    const evals = (r.data || []).slice().reverse(); // ASC order
    if (!evals.length) { wrap.style.display = 'none'; return; }

    wrap.style.display = '';

    // Single evaluation — show summary instead of flat chart
    if (evals.length === 1) {
      const canvas = document.getElementById('playerProgressChart');
      if (_progressChartInst) { _progressChartInst.destroy(); _progressChartInst = null; }
      const parent = canvas.parentElement;
      const existingMsg = parent.querySelector('.single-eval-msg');
      if (existingMsg) existingMsg.remove();
      const msg = document.createElement('div');
      msg.className = 'single-eval-msg';
      msg.style.cssText = 'text-align:center;padding:var(--sp-4);color:var(--text-muted);font-size:var(--text-sm);';
      const e = evals[0];
      const label = e.period_label || e.created_at?.slice(0, 10);
      msg.innerHTML = `<p>הערכה אחת בלבד (${label}) — נדרשות לפחות 2 הערכות להצגת גרף התקדמות</p>`;
      canvas.style.display = 'none';
      parent.appendChild(msg);
      return;
    }

    // Restore canvas if hidden from single eval
    const canvas2 = document.getElementById('playerProgressChart');
    canvas2.style.display = '';
    const existingMsg = canvas2.parentElement.querySelector('.single-eval-msg');
    if (existingMsg) existingMsg.remove();

    const labels = evals.map(e => e.period_label || e.created_at?.slice(0,10));
    const mkData = field => evals.map(e => e[field] ?? null);

    const datasets = [
      { label: 'שיפור אישי', data: mkData('personal_improvement_rating'), borderColor: '#f48c25', backgroundColor: '#f48c2530', tension: 0.3, pointRadius: 4 },
      { label: 'תרומה לקבוצה', data: mkData('team_contribution_rating'), borderColor: '#60A5FA', backgroundColor: '#60A5FA30', tension: 0.3, pointRadius: 4 },
      { label: 'התקפה', data: mkData('offensive_rating'), borderColor: '#F87171', backgroundColor: 'transparent', tension: 0.3, pointRadius: 3, borderDash: [4,3] },
      { label: 'הגנה', data: mkData('defensive_rating'), borderColor: '#34D399', backgroundColor: 'transparent', tension: 0.3, pointRadius: 3, borderDash: [4,3] },
      { label: 'IQ', data: mkData('iq_rating'), borderColor: '#A78BFA', backgroundColor: 'transparent', tension: 0.3, pointRadius: 3, borderDash: [4,3] },
    ];

    const canvas = document.getElementById('playerProgressChart');
    if (_progressChartInst) { _progressChartInst.destroy(); _progressChartInst = null; }
    _progressChartInst = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#baab9c', font: { family: 'Space Grotesk', size: 11 } } } },
        scales: {
          y: { min: 0, max: 10, ticks: { color: '#baab9c', stepSize: 2 }, grid: { color: '#ffffff10' } },
          x: { ticks: { color: '#baab9c', font: { size: 10 } }, grid: { color: '#ffffff10' } },
        },
      },
    });
  } catch(e) { console.error('Progress chart error:', e); }
}
