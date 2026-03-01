/**
 * HOOPS AI — Admin Practice Plans
 */

let _allData = { teams: [], sessions: [] };
let _activeTeamId = null;

function _esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAPI.token) return;
  loadPracticePlans();
});

async function loadPracticePlans() {
  const days = document.getElementById('periodFilter')?.value || 30;
  document.getElementById('sessionsList').innerHTML = `
    <div style="text-align:center;padding:48px;color:var(--text-muted);">
      <span class="material-symbols-outlined pp-spin" style="font-size:32px;">progress_activity</span>
      <div style="margin-top:8px;">טוען...</div>
    </div>`;

  try {
    const res = await AdminAPI.get(`/api/admin/practice-plans?days=${days}`);
    _allData = res.data || { teams: [], sessions: [] };

    renderTeamTabs();

    // Default to first team if not yet set
    if (_allData.teams.length > 0) {
      if (!_activeTeamId || !_allData.teams.find(t => t.id === _activeTeamId)) {
        _activeTeamId = _allData.teams[0].id;
      }
    }

    renderForTeam(_activeTeamId);
  } catch(e) {
    document.getElementById('sessionsList').innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-outlined">error</span>
        <h3>שגיאה בטעינת הנתונים</h3>
      </div>`;
  }
}

function renderTeamTabs() {
  const tabs = document.getElementById('teamTabs');
  if (!tabs) return;
  if (!_allData.teams.length) {
    tabs.innerHTML = `<div style="color:var(--text-muted);font-size:var(--text-sm);">אין קבוצות</div>`;
    return;
  }
  tabs.innerHTML = _allData.teams.map(team => {
    const isActive = team.id === _activeTeamId;
    return `<button
      class="btn ${isActive ? 'btn-primary' : 'btn-secondary'}"
      onclick="selectTeam(${team.id})"
      style="font-size:var(--text-sm);"
    >${_esc(team.name)}</button>`;
  }).join('');
}

function selectTeam(teamId) {
  _activeTeamId = teamId;
  renderTeamTabs();
  renderForTeam(teamId);
}

function renderForTeam(teamId) {
  if (!teamId) return;
  const sessions = _allData.sessions.filter(s => s.team_id === teamId);
  renderStatsRow(sessions);
  renderSessionsList(sessions);
}

function renderStatsRow(sessions) {
  const el = document.getElementById('statsRow');
  if (!el) return;
  const total = sessions.length;
  const withSummary = sessions.filter(s => s.goal_achieved).length;
  const withoutSummary = total - withSummary;
  const avgDuration = total > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (s.total_duration || 0), 0) / total)
    : 0;

  el.innerHTML = [
    { icon: 'event_note', label: 'סה"כ אימונים', val: total, color: 'var(--primary)' },
    { icon: 'check_circle', label: 'עם סיכום', val: withSummary, color: '#22c55e' },
    { icon: 'cancel', label: 'ללא סיכום', val: withoutSummary, color: '#ef4444' },
    { icon: 'schedule', label: 'משך ממוצע', val: total > 0 ? avgDuration + ' דק׳' : '—', color: '#60A5FA' },
  ].map(s => `
    <div class="card" style="padding:var(--sp-4);text-align:center;">
      <span class="material-symbols-outlined" style="font-size:24px;color:${s.color};">${s.icon}</span>
      <div style="font-size:var(--text-xl);font-weight:700;margin:var(--sp-2) 0;">${s.val}</div>
      <div style="font-size:var(--text-xs);color:var(--text-muted);">${s.label}</div>
    </div>`).join('');
}

function renderSessionsList(sessions) {
  const el = document.getElementById('sessionsList');
  if (!el) return;

  if (!sessions.length) {
    el.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-outlined">event_busy</span>
        <h3>אין אימונים בתקופה הנבחרת</h3>
      </div>`;
    return;
  }

  el.innerHTML = sessions.map(s => {
    const goalIcon = s.goal_achieved === 'yes' ? '✅'
      : s.goal_achieved === 'partial' ? '🔶'
      : s.goal_achieved === 'no' ? '❌' : null;
    const goalLabel = s.goal_achieved === 'yes' ? 'הושגה המטרה'
      : s.goal_achieved === 'partial' ? 'הושגה חלקית'
      : s.goal_achieved === 'no' ? 'לא הושגה' : null;
    const hasSummary = !!s.goal_achieved;

    const goalBadge = goalIcon
      ? `<span style="background:rgba(255,255,255,0.06);padding:3px 10px;border-radius:4px;font-size:11px;">${goalIcon} ${goalLabel}</span>`
      : `<span style="background:rgba(255,255,255,0.04);padding:3px 10px;border-radius:4px;font-size:11px;color:var(--text-muted);">ללא סיכום</span>`;

    const aiBadge = s.is_ai_generated
      ? `<span class="badge badge-primary" style="font-size:9px;">AI</span>` : '';

    const summarySection = hasSummary ? `
      <div id="summary-${s.id}" style="display:none;border-top:1px solid var(--border);padding-top:var(--sp-3);margin-top:var(--sp-3);">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);margin-bottom:var(--sp-3);">
          <div>
            <div style="font-size:var(--text-xs);font-weight:700;color:#22c55e;margin-bottom:4px;">✅ מה עבד</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);">${_esc(s.what_worked || '—')}</div>
          </div>
          <div>
            <div style="font-size:var(--text-xs);font-weight:700;color:#ef4444;margin-bottom:4px;">⚠️ מה לא עבד</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);">${_esc(s.what_didnt_work || '—')}</div>
          </div>
        </div>
        ${s.standout_players?.length ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--sp-2);">⭐ בלטו: ${s.standout_players.map(p => _esc(p)).join(', ')}</div>` : ''}
        ${s.attention_players?.length ? `<div style="font-size:var(--text-xs);color:var(--text-muted);">👁 תשומת לב: ${s.attention_players.map(p => _esc(p)).join(', ')}</div>` : ''}
      </div>` : '';

    return `
      <div class="card" style="padding:var(--sp-4);margin-bottom:var(--sp-3);">
        <div style="display:flex;align-items:flex-start;gap:var(--sp-3);">
          <div style="flex:1;min-width:0;${hasSummary ? 'cursor:pointer;' : ''}"
               onclick="${hasSummary ? `toggleSummary(${s.id})` : ''}">
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:var(--sp-2);margin-bottom:var(--sp-2);">
              <span style="font-size:var(--text-sm);font-weight:700;">${_esc(s.title)}</span>
              ${aiBadge}
              <span style="font-size:11px;color:var(--text-muted);">· ${_esc(s.coach_name)}</span>
            </div>
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:var(--sp-2);">
              <span class="badge badge-neutral">${_esc(s.date)}</span>
              ${s.focus ? `<span style="font-size:11px;color:var(--primary);">${_esc(s.focus)}</span>` : ''}
              <span style="font-size:11px;color:var(--text-muted);">${s.total_duration} דק׳</span>
              <span style="font-size:11px;color:var(--text-muted);">${s.segments_count} קטעים</span>
              ${goalBadge}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:var(--sp-2);flex-shrink:0;">
            <button class="btn btn-sm btn-ghost" onclick="openPlanDetail(${s.id})" title="צפה בתוכנית המלאה" style="padding:var(--sp-1) var(--sp-2);">
              <span class="material-symbols-outlined" style="font-size:18px;">visibility</span>
            </button>
            ${hasSummary ? `<span class="material-symbols-outlined" id="chevron-${s.id}" style="font-size:18px;color:var(--text-muted);cursor:pointer;" onclick="toggleSummary(${s.id})">expand_more</span>` : ''}
          </div>
        </div>
        ${summarySection}
      </div>`;
  }).join('');
}

function toggleSummary(sessionId) {
  const summaryDiv = document.getElementById(`summary-${sessionId}`);
  const chevron = document.getElementById(`chevron-${sessionId}`);
  if (!summaryDiv) return;
  const isOpen = summaryDiv.style.display !== 'none';
  summaryDiv.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.textContent = isOpen ? 'expand_more' : 'expand_less';
}


/* ── Plan Detail Modal ── */

const SEG_TYPE_COLORS = {
  warmup: '#F87171', drill: '#f48c25', scrimmage: '#34D399',
  cooldown: '#60A5FA', film_study: '#A78BFA', break: '#9CA3AF'
};
const SEG_TYPE_LABELS = {
  warmup: 'חימום', drill: 'תרגיל', scrimmage: 'משחק',
  cooldown: 'סיום', film_study: 'וידאו', break: 'הפסקה'
};

async function openPlanDetail(sessionId) {
  document.getElementById('planDetailLoading').style.display = '';
  document.getElementById('planDetailContent').style.display = 'none';
  document.getElementById('planDetailTitle').textContent = '';
  document.getElementById('planDetailMeta').innerHTML = '';
  openModal('planDetailModal');

  try {
    const res = await AdminAPI.get(`/api/admin/practice-plans/${sessionId}`);
    const s = res.data;
    renderPlanDetail(s);
  } catch (e) {
    document.getElementById('planDetailLoading').style.display = 'none';
    document.getElementById('planDetailContent').style.display = '';
    document.getElementById('planDetailContent').innerHTML = `
      <div style="text-align:center;padding:var(--sp-6);color:var(--text-muted);">
        <span class="material-symbols-outlined" style="font-size:40px;">error</span>
        <p style="margin-top:var(--sp-2);">שגיאה בטעינת התוכנית</p>
      </div>`;
  }
}

function renderPlanDetail(s) {
  document.getElementById('planDetailLoading').style.display = 'none';
  document.getElementById('planDetailContent').style.display = '';

  // Header
  document.getElementById('planDetailTitle').textContent = s.title;
  const aiBadge = s.is_ai_generated ? `<span class="badge badge-primary" style="font-size:9px;">AI</span>` : '';
  document.getElementById('planDetailMeta').innerHTML =
    `<span>${_esc(s.date)}</span><span>·</span><span>${s.total_duration} דק׳</span>` +
    `<span>·</span><span>${_esc(s.coach_name)}</span>` +
    (s.focus ? `<span>·</span><span style="color:var(--primary);">${_esc(s.focus)}</span>` : '') +
    ` ${aiBadge}`;

  // Summary
  const summaryEl = document.getElementById('planDetailSummary');
  if (s.goal_achieved) {
    summaryEl.style.display = '';
    const goalIcon = s.goal_achieved === 'yes' ? '✅' : s.goal_achieved === 'partial' ? '🔶' : '❌';
    const goalLabel = s.goal_achieved === 'yes' ? 'הושגה המטרה' : s.goal_achieved === 'partial' ? 'הושגה חלקית' : 'לא הושגה';
    const badge = document.getElementById('planDetailGoalBadge');
    badge.textContent = goalIcon + ' ' + goalLabel;
    badge.style.background = s.goal_achieved === 'yes' ? 'rgba(34,197,94,0.15)' : s.goal_achieved === 'partial' ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.15)';
    badge.style.color = s.goal_achieved === 'yes' ? '#22c55e' : s.goal_achieved === 'partial' ? '#fbbf24' : '#ef4444';

    document.getElementById('planDetailSummaryBody').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);">
        <div>
          <div style="font-size:var(--text-xs);font-weight:700;color:#22c55e;margin-bottom:4px;">✅ מה עבד</div>
          <div style="color:var(--text-secondary);font-size:var(--text-xs);">${_esc(s.what_worked || '—')}</div>
        </div>
        <div>
          <div style="font-size:var(--text-xs);font-weight:700;color:#ef4444;margin-bottom:4px;">⚠️ מה לא עבד</div>
          <div style="color:var(--text-secondary);font-size:var(--text-xs);">${_esc(s.what_didnt_work || '—')}</div>
        </div>
      </div>
      ${s.standout_players?.length ? `<div style="font-size:var(--text-xs);color:var(--text-muted);">⭐ בלטו: ${s.standout_players.map(p => _esc(p)).join(', ')}</div>` : ''}
      ${s.attention_players?.length ? `<div style="font-size:var(--text-xs);color:var(--text-muted);">👁 תשומת לב: ${s.attention_players.map(p => _esc(p)).join(', ')}</div>` : ''}`;
  } else {
    summaryEl.style.display = 'none';
  }

  // Notes (AI full plan)
  const notesEl = document.getElementById('planDetailNotes');
  if (s.notes && s.notes.trim()) {
    notesEl.style.display = '';
    document.getElementById('planDetailNotesBody').innerHTML = _mdToHtml(s.notes);
  } else {
    notesEl.style.display = 'none';
  }

  // Segments
  const segsEl = document.getElementById('planDetailSegments');
  if (s.segments && s.segments.length) {
    segsEl.style.display = '';
    document.getElementById('planDetailSegmentsList').innerHTML = s.segments.map(seg => {
      const color = SEG_TYPE_COLORS[seg.segment_type] || '#9CA3AF';
      const label = SEG_TYPE_LABELS[seg.segment_type] || seg.segment_type;
      return `<div class="plan-seg-row">
        <span class="plan-seg-badge" style="background:${color}22;color:${color};">${label}</span>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:var(--text-sm);">${_esc(seg.title)}</div>
          ${seg.notes ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${_esc(seg.notes)}</div>` : ''}
        </div>
        <span style="font-size:var(--text-xs);color:var(--text-muted);white-space:nowrap;">${seg.duration_minutes} דק׳</span>
      </div>`;
    }).join('');
  } else {
    segsEl.style.display = 'none';
  }

  // Empty state
  const emptyEl = document.getElementById('planDetailEmpty');
  emptyEl.style.display = (!s.notes || !s.notes.trim()) && (!s.segments || !s.segments.length) ? '' : 'none';
}

/* Minimal markdown → HTML */
function _mdToHtml(md) {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---+$/gm, '<hr>')
    .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)*/g, m => '<ul>' + m + '</ul>');
  html = html.split(/\n{2,}/).map(block => {
    if (/^<(h[1-3]|ul|hr|li)/.test(block.trim())) return block;
    const trimmed = block.trim();
    if (!trimmed) return '';
    return '<p>' + trimmed.replace(/\n/g, '<br>') + '</p>';
  }).join('\n');
  return html;
}
