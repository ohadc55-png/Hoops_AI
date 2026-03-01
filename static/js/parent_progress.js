/**
 * HOOPS AI — Parent Progress Page
 */

const MONTHS_HE = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let _attChart = null;
let _drillChart = null;
let _showAllDrills = false;

document.addEventListener('DOMContentLoaded', () => {
  if (!ParentAPI.token) return;
  loadProgress();
  loadAiReports();
});


/* ── Main data load ──────────────────────────────────── */

async function loadProgress() {
  const loading = document.getElementById('progressLoading');
  const noChild = document.getElementById('noChildState');
  const content = document.getElementById('progressContent');

  try {
    const res = await ParentAPI.get('/api/parent/progress');
    loading.style.display = 'none';

    if (!res.data) {
      noChild.style.display = '';
      return;
    }

    content.style.display = '';
    const d = res.data;

    renderPlayerHeader(d.player, d.coach_name);
    renderStatsRow(d.attendance, d.drills, d.player);
    renderProudMoments(d.proud_moments);
    renderDrillsList(d.drills);
    renderCharts(d.charts);
    renderEvaluation(d.latest_evaluation);
  } catch {
    loading.innerHTML = `<span class="material-symbols-outlined" style="font-size:32px;color:var(--text-muted);">error</span>
      <div style="margin-top:8px;color:var(--text-muted);">${t('parent.progress.load_error') || 'Failed to load'}</div>`;
  }
}


/* ── Player Header ───────────────────────────────────── */

function renderPlayerHeader(player, coachName) {
  if (!player) return;
  const el = document.getElementById('playerHeader');
  const initial = (player.name || '?').charAt(0).toUpperCase();
  el.innerHTML = `
    <div class="player-avatar">${esc(initial)}</div>
    <div class="player-info">
      <h2>${esc(player.name)}</h2>
      <div class="player-meta">
        ${player.team_name ? `<span>${esc(player.team_name)}</span>` : ''}
        ${player.position ? ` · <span>${esc(player.position)}</span>` : ''}
        ${player.jersey_number ? ` · #${esc(String(player.jersey_number))}` : ''}
        ${coachName ? ` · <span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">person</span> ${esc(coachName)}` : ''}
      </div>
    </div>`;
}


/* ── Stats Row (attendance + drills) ─────────────────── */

function renderStatsRow(att, drills, player) {
  const el = document.getElementById('statsRow');
  const pct = att.percentage || 0;
  const pctColor = pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#3b82f6';

  const streakHtml = (player.current_streak || 0) > 0
    ? `<div class="stat-sub">${t('parent.progress.current_streak')}: <strong>${player.current_streak}</strong> 🔥</div>` : '';
  const highStreakHtml = (player.highest_streak || 0) > 0
    ? `<div class="stat-sub">${t('parent.progress.highest_streak')}: <strong>${player.highest_streak}</strong></div>` : '';

  const drillPct = drills.completion_rate || 0;

  el.innerHTML = `
    <div class="progress-stat-card">
      <div class="stat-value" style="color:${pctColor}"><span dir="ltr">${pct}%</span></div>
      <div class="stat-label">${t('parent.progress.attendance_rate')}</div>
      <div class="stat-sub">${t('parent.progress.events_attended', { attended: att.attended, total: att.total_events })}</div>
      ${streakHtml}
      ${highStreakHtml}
    </div>
    <div class="progress-stat-card">
      <div class="stat-value" style="color:var(--primary);"><span dir="ltr">${drills.completed}/${drills.total}</span></div>
      <div class="stat-label">${t('parent.progress.drills_completed_label')}</div>
      <div class="stat-sub"><span dir="ltr">${drillPct}%</span> ${t('parent.progress.completion_rate')}</div>
      ${drills.in_progress > 0 ? `<div class="stat-sub">${drills.in_progress} ${t('parent.progress.drills_in_progress')}</div>` : ''}
    </div>`;
}


/* ── Proud Moments ───────────────────────────────────── */

function renderProudMoments(moments) {
  const el = document.getElementById('proudMomentsList');
  if (!moments || !moments.length) {
    el.innerHTML = `<div class="empty-state-parent">
      <span class="material-symbols-outlined">emoji_events</span>
      ${t('parent.progress.no_moments')}
    </div>`;
    return;
  }

  const resultLabels = { win: 'parent.progress.game_result.win', loss: 'parent.progress.game_result.loss', draw: 'parent.progress.game_result.draw' };

  el.innerHTML = moments.map(m => `
    <div class="proud-moment-item">
      <span class="material-symbols-outlined moment-icon">star</span>
      <div class="moment-info">
        <div><strong>${t('parent.progress.standout_in', { opponent: esc(m.opponent) })}</strong></div>
        <div class="moment-date">
          ${formatDate(m.date)}
          ${m.result ? ` · ${t(resultLabels[m.result] || '')}` : ''}
          ${m.score ? ` <span dir="ltr">${esc(m.score)}</span>` : ''}
        </div>
      </div>
    </div>`).join('');
}


/* ── Drills List ─────────────────────────────────────── */

function renderDrillsList(drills) {
  const el = document.getElementById('drillsList');
  const list = drills.list || [];
  if (!list.length) {
    el.innerHTML = `<div class="empty-state-parent">
      <span class="material-symbols-outlined">fitness_center</span>
      ${t('parent.progress.no_drills')}
    </div>`;
    return;
  }

  const statusIcons = { approved: 'check_circle', pending: 'schedule', video_uploaded: 'videocam', rejected: 'refresh' };
  const statusKeys = {
    approved: 'parent.progress.drill_status.approved',
    pending: 'parent.progress.drill_status.pending',
    video_uploaded: 'parent.progress.drill_status.video_uploaded',
    rejected: 'parent.progress.drill_status.rejected',
  };

  const visible = _showAllDrills ? list : list.slice(0, 8);

  let html = visible.map(d => `
    <div class="drill-item">
      <span class="material-symbols-outlined drill-status-icon ${d.status}">${statusIcons[d.status] || 'circle'}</span>
      <div class="drill-info">
        <div class="drill-name">${esc(d.drill_name)}</div>
        <div class="drill-meta">
          <span class="drill-status-badge ${d.status}">${t(statusKeys[d.status] || '')}</span>
          <span class="drill-date">${formatDate(d.assigned_at?.split('T')[0] || d.assigned_at?.split(' ')[0])}</span>
        </div>
        ${d.coach_feedback ? `<div class="drill-feedback"><span class="material-symbols-outlined" style="font-size:14px;">chat</span> ${esc(d.coach_feedback)}</div>` : ''}
      </div>
    </div>`).join('');

  if (list.length > 8 && !_showAllDrills) {
    html += `<button class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px;" onclick="_showAllDrills=true;loadProgress();">
      ${t('parent.progress.show_more')} (${list.length - 8})
    </button>`;
  }

  el.innerHTML = html;
}


/* ── Charts ──────────────────────────────────────────── */

function renderCharts(charts) {
  const isHe = (localStorage.getItem('hoops_language') || 'he') === 'he';
  const monthNames = isHe ? MONTHS_HE : MONTHS_EN;

  // Attendance chart
  const attData = charts.monthly_attendance || [];
  if (attData.length) {
    renderBarChart('attendanceChart', attData, monthNames, '_attChart',
      [
        { key: 'attended', label: t('parent.progress.attended'), color: '#16a34a' },
        { key: '_missed', label: t('parent.progress.missed'), color: 'rgba(220,38,38,0.25)' },
      ],
      true
    );
  }

  // Drills chart
  const drillData = charts.monthly_drills || [];
  if (drillData.length) {
    renderBarChart('drillsChart', drillData, monthNames, '_drillChart',
      [
        { key: 'completed', label: t('parent.progress.drills_completed_label'), color: '#3b82f6' },
        { key: '_remaining', label: t('parent.progress.drills_in_progress'), color: 'rgba(59,130,246,0.2)' },
      ],
      true
    );
  }
}

function renderBarChart(canvasId, data, monthNames, chartVar, datasets, stacked) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Destroy existing chart
  if (chartVar === '_attChart' && _attChart) { _attChart.destroy(); _attChart = null; }
  if (chartVar === '_drillChart' && _drillChart) { _drillChart.destroy(); _drillChart = null; }

  const labels = data.map(d => `${monthNames[d.month - 1]} ${String(d.year).slice(-2)}`);

  const chartDatasets = datasets.map(ds => {
    let values;
    if (ds.key === '_missed') {
      values = data.map(d => Math.max(0, d.total - d.attended));
    } else if (ds.key === '_remaining') {
      values = data.map(d => Math.max(0, d.total - d.completed));
    } else {
      values = data.map(d => d[ds.key] || 0);
    }
    return { label: ds.label, data: values, backgroundColor: ds.color, borderRadius: 4 };
  });

  const chart = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets: chartDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: '#475569', font: { family: 'Space Grotesk', size: 11 } } },
      },
      scales: {
        y: { stacked: !!stacked, beginAtZero: true, ticks: { color: '#94a3b8', stepSize: 1 } },
        x: { stacked: !!stacked, ticks: { color: '#94a3b8', font: { size: 10 } } },
      },
    },
  });

  if (chartVar === '_attChart') _attChart = chart;
  if (chartVar === '_drillChart') _drillChart = chart;
}


/* ── Evaluation ──────────────────────────────────────── */

function renderEvaluation(evalData) {
  if (!evalData) return;
  const section = document.getElementById('evalSection');
  section.style.display = '';

  const categories = [
    { key: 'offensive', label: t('parent.progress.eval_offense') },
    { key: 'defensive', label: t('parent.progress.eval_defense') },
    { key: 'iq', label: t('parent.progress.eval_iq') },
    { key: 'fitness', label: t('parent.progress.eval_fitness') },
    { key: 'work_ethic', label: t('parent.progress.eval_work_ethic') },
    { key: 'leadership', label: t('parent.progress.eval_leadership') },
    { key: 'improvement', label: t('parent.progress.eval_improvement') },
  ];

  const el = document.getElementById('evalContent');
  el.innerHTML = `
    <div class="eval-period">${t('parent.progress.eval_period')}: <strong>${esc(evalData.period_label)}</strong></div>
    ${categories.filter(c => evalData[c.key] != null).map(c => {
      const val = evalData[c.key];
      const pct = val * 10;
      return `<div class="eval-bar-row">
        <div class="eval-bar-label">${c.label}</div>
        <div class="eval-bar-track"><div class="eval-bar-fill" style="width:${pct}%"></div></div>
        <div class="eval-bar-value"><span dir="ltr">${val}/10</span></div>
      </div>`;
    }).join('')}`;
}


/* ── AI Reports ──────────────────────────────────────── */

async function loadAiReports() {
  try {
    const res = await ParentAPI.get('/api/parent/progress/ai-reports');
    if (!res.data) return;
    renderAiReports(res.data);
  } catch { /* silent */ }
}

function renderAiReports(data) {
  const { reports, limits } = data;

  // Generate button visibility
  const btn = document.getElementById('generateReportBtn');
  btn.style.display = limits.can_generate ? '' : 'none';

  // Limits info
  const limitsEl = document.getElementById('reportLimitsInfo');
  if (limits.season_remaining <= 0) {
    limitsEl.innerHTML = `<span>${t('parent.progress.report_none_remaining')}</span>`;
  } else if (!limits.can_generate && limits.next_available) {
    limitsEl.innerHTML = `<span>${t('parent.progress.report_cooldown', { date: formatDate(limits.next_available.split('T')[0] || limits.next_available.split(' ')[0]) })}</span>`;
  } else {
    limitsEl.innerHTML = `<span>${t('parent.progress.report_remaining', { remaining: limits.season_remaining })}</span>`;
  }

  // Reports list
  const el = document.getElementById('aiReportsList');
  if (!reports.length) {
    el.innerHTML = `<div class="empty-state-parent">${t('parent.progress.no_ai_reports')}</div>`;
    return;
  }

  el.innerHTML = reports.map(r => `
    <div class="ai-report-card">
      <div class="ai-report-header">
        <span class="material-symbols-outlined">smart_toy</span>
        <span>${t('parent.progress.season_label')}: ${esc(r.season)}</span>
        <span class="ai-report-date">${formatDate(r.created_at.split('T')[0] || r.created_at.split(' ')[0])}</span>
      </div>
      <div class="ai-report-body">${formatReportContent(r.content)}</div>
    </div>`).join('');
}

async function generateReport() {
  const btn = document.getElementById('generateReportBtn');
  const origHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="material-symbols-outlined spin-icon">progress_activity</span> ${t('parent.progress.generating')}`;

  try {
    await ParentAPI.post('/api/parent/progress/ai-reports/generate');
    ParentToast.success(t('parent.progress.report_generated'));
    await loadAiReports();
  } catch {
    // Error already shown by ParentAPI.request
  } finally {
    btn.disabled = false;
    btn.innerHTML = origHtml;
  }
}


/* ── Helpers ─────────────────────────────────────────── */

/* formatDate → shared-utils.js */

function formatReportContent(text) {
  if (!text) return '';
  return esc(text).replace(/\n/g, '<br>');
}
