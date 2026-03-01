/**
 * HOOPS AI - Reports: Evaluations Tab
 * 9-slider evaluation modal, admin requests banner, evaluation cards
 */

// ===== EVALUATION CATEGORIES =====
const EVAL_CATEGORIES = [
  { key: 'offensive', get label() { return t('reports.eval.category.offensive'); }, ratingId: 'evalOffRating', notesId: 'evalOffNotes', field: 'offensive_rating', notesField: 'offensive_notes' },
  { key: 'defensive', get label() { return t('reports.eval.category.defensive'); }, ratingId: 'evalDefRating', notesId: 'evalDefNotes', field: 'defensive_rating', notesField: 'defensive_notes' },
  { key: 'iq', get label() { return t('reports.eval.category.iq'); }, ratingId: 'evalIqRating', notesId: 'evalIqNotes', field: 'iq_rating', notesField: 'iq_notes' },
  { key: 'social', get label() { return t('reports.eval.category.social'); }, ratingId: 'evalSocialRating', notesId: 'evalSocialNotes', field: 'social_rating', notesField: 'social_notes' },
  { key: 'leadership', get label() { return t('reports.eval.category.leadership'); }, ratingId: 'evalLeaderRating', notesId: 'evalLeaderNotes', field: 'leadership_rating', notesField: 'leadership_notes' },
  { key: 'work_ethic', get label() { return t('reports.eval.category.work_ethic'); }, ratingId: 'evalWorkRating', notesId: 'evalWorkNotes', field: 'work_ethic_rating', notesField: 'work_ethic_notes' },
  { key: 'fitness', get label() { return t('reports.eval.category.fitness'); }, ratingId: 'evalFitRating', notesId: 'evalFitNotes', field: 'fitness_rating', notesField: 'fitness_notes' },
  { key: 'improvement', get label() { return t('reports.eval.category.improvement'); }, ratingId: 'evalImpRating', notesId: 'evalImpNotes', field: 'improvement_rating', notesField: 'improvement_notes' },
  { key: 'leaving_risk', get label() { return t('reports.eval.category.leaving_risk'); }, ratingId: 'evalLeaveRating', notesId: 'evalLeaveNotes', field: 'leaving_risk', notesField: 'leaving_risk_notes' },
  { key: 'personal_improvement', label: 'שיפור אישי', ratingId: 'evalPersonalRating', notesId: 'evalPersonalNotes', field: 'personal_improvement_rating', notesField: 'personal_improvement_notes', required: true },
  { key: 'team_contribution', label: 'תרומה לקבוצה', ratingId: 'evalTeamContribRating', notesId: 'evalTeamContribNotes', field: 'team_contribution_rating', notesField: 'team_contribution_notes', required: true },
];

// ===== PERIOD LABEL CALCULATION =====
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

// ===== EVAL REQUESTS =====
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
  const periodLabels = { weekly: t('reports.eval.period.weekly'), monthly: t('reports.eval.period.monthly'), semi_annual: t('reports.eval.period.semi_annual'), annual: t('reports.eval.period.annual') };
  el.innerHTML = `<div class="pending-banner" style="background:rgba(59,130,246,0.1);border-color:var(--info);">
    <span class="material-symbols-outlined" style="font-size:20px;color:var(--info)">assignment</span>
    <span>${_evalRequests.length === 1 ? t('reports.eval_request.singular') : t('reports.eval_request.plural', { count: _evalRequests.length })}</span>
  </div>` + _evalRequests.map(r => `<div class="pending-game-card" style="border-left-color:var(--info);">
    <span class="material-symbols-outlined" style="font-size:18px;color:var(--info)">assignment</span>
    <div style="flex:1">
      <div style="font-weight:600">${periodLabels[r.period_type] || r.period_type} ${t('reports.eval_request.evaluation')}</div>
      <div class="text-xs text-muted">${t('reports.eval_request.due')}: ${r.due_date}${r.instructions ? ' — ' + esc(r.instructions) : ''}</div>
    </div>
    <button class="btn btn-sm btn-primary" onclick="openEvaluationModal({report_request_id:${r.id},period_type:'${r.period_type}'})">${t('reports.eval_request.fill_now')}</button>
  </div>`).join('');
}

// ===== LOAD & RENDER EVALUATIONS =====
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

function renderEvaluations() {
  const el = document.getElementById('evaluationsList');
  const showAll = document.getElementById('evalPlayerSelect')?.value === 'all';
  if (!_evaluations.length) {
    el.innerHTML = `<div class="text-sm text-muted" style="padding:var(--sp-4)">${t('reports.eval.no_evaluations')}</div>`;
    return;
  }
  const periodLabels = { weekly: t('reports.eval.period.weekly'), monthly: t('reports.eval.period.monthly'), semi_annual: t('reports.eval.period.semi_annual'), annual: t('reports.eval.period.annual') };
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
          <div class="text-xs text-muted">${t('reports.eval.avg_rating')}</div>
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

// ===== EVALUATION MODAL =====
function openEvaluationModal(data) {
  const isEdit = data?.id;
  document.getElementById('evalId').value = data?.id || '';
  document.getElementById('evalRequestId').value = data?.report_request_id || '';
  document.getElementById('evalModalTitle').textContent = isEdit ? t('reports.eval.modal.edit') : t('reports.eval.modal.new');
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
  if (!playerId) { Toast.error(t('reports.eval.select_player')); return; }

  // Validate required fields
  const personalNotes = document.getElementById('evalPersonalNotes').value.trim();
  const teamNotes = document.getElementById('evalTeamContribNotes').value.trim();
  if (!personalNotes) { Toast.error('יש למלא תיאור לשיפור אישי'); document.getElementById('evalPersonalNotes').focus(); return; }
  if (!teamNotes) { Toast.error('יש למלא תיאור לתרומה לקבוצה'); document.getElementById('evalTeamContribNotes').focus(); return; }

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
    Toast.success(id ? t('reports.eval.updated') : t('reports.eval.saved'));
    loadEvaluations();
    loadEvalRequests();
  } catch(e) { Toast.error(t('reports.eval.save_failed')); }
}

async function deleteEvaluation(id) {
  if (!confirm(t('reports.eval.confirm_delete'))) return;
  try {
    await API.del(`/api/evaluations/${id}`);
    closeModal('evaluationModal');
    Toast.success(t('reports.games.deleted'));
    loadEvaluations();
  } catch(e) {}
}
