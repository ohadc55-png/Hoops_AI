/**
 * HOOPS AI — Admin Player Profile Page
 * Loads and renders a single player's full profile.
 */

let _progressChartInst = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAPI.token) { window.location.href = '/admin/login'; return; }
  await loadPlayerProfile();
  loadAndRenderProgress();
});

async function loadPlayerProfile() {
  const container = document.getElementById('profileContent');
  try {
    const res = await AdminAPI.get(`/api/admin/players/${PLAYER_ID}/profile`);
    const d = res.data;
    const p = d.player || {};
    document.getElementById('pageTitle').textContent = p.name || t('admin.player_profile.title');

    const age = p.birth_date ? calcAge(p.birth_date) : null;
    const ageStr = age ? ` · ${age} ${t('admin.contacts.age_prefix')}` : '';

    container.innerHTML = `
      <!-- Back button -->
      <div style="margin-bottom:var(--sp-4);">
        <button class="btn btn-ghost btn-sm" onclick="history.back()">
          <span class="material-symbols-outlined" style="font-size:16px;">arrow_back</span>
          <span data-i18n="btn.back">Back</span>
        </button>
      </div>

      <!-- Header Card -->
      <div class="card" style="padding:var(--sp-6);margin-bottom:var(--sp-4);">
        <div style="display:flex;align-items:center;gap:var(--sp-4);">
          <div style="width:72px;height:72px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span class="material-symbols-outlined" style="font-size:36px;color:#fff;">person</span>
          </div>
          <div>
            <h2 style="font-size:var(--text-xl);font-weight:700;margin:0;">${esc(p.name || '—')}</h2>
            <div style="color:var(--text-muted);margin-top:4px;">
              ${p.position ? `<span class="badge badge-neutral" style="margin-left:6px;">${esc(p.position)}</span>` : ''}
              ${p.jersey_number ? `<span class="badge badge-primary">#${esc(String(p.jersey_number))}</span>` : ''}
              ${ageStr ? `<span style="margin-right:6px;">${esc(ageStr)}</span>` : ''}
            </div>
            ${p.team_name ? `<div style="color:var(--text-muted);font-size:var(--text-sm);margin-top:4px;"><span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">groups</span> ${esc(p.team_name)}</div>` : ''}
          </div>
        </div>
      </div>

      <!-- Stats Row -->
      ${renderStatsRow(d)}

      <!-- Evaluations -->
      ${d.evaluations?.length ? renderEvaluations(d.evaluations[0]) : ''}

      <!-- Reports -->
      ${d.reports?.length ? renderReports(d.reports) : ''}

      <!-- Attendance -->
      ${d.attendance ? renderAttendance(d.attendance) : ''}

      <!-- Drill Assignments -->
      ${d.drill_assignments?.length ? renderDrills(d.drill_assignments) : ''}

      <!-- Progress section injected by loadAndRenderProgress() -->
      <div id="progressSection"></div>
    `;
  } catch (e) {
    container.innerHTML = `<div style="text-align:center;padding:48px;color:var(--text-muted);">
      <span class="material-symbols-outlined" style="font-size:48px;">error</span>
      <h3>${t('admin.player_profile.load_error')}</h3>
      <button class="btn btn-secondary" onclick="history.back()" style="margin-top:16px;" data-i18n="btn.back">Back</button>
    </div>`;
  }
}

function renderStatsRow(d) {
  const att = d.attendance || {};
  const pct = att.percentage ?? 0;
  const evals = d.evaluations?.length || 0;
  const reports = d.reports?.length || 0;
  const drills = d.drill_assignments?.length || 0;
  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-3);margin-bottom:var(--sp-4);">
      ${statCard('schedule', `${pct}%`, t('admin.player_profile.stat.attendance'), pct < 70 ? '#ef4444' : pct < 85 ? '#fbbf24' : '#22c55e')}
      ${statCard('assessment', evals, t('admin.player_profile.stat.evaluations'), 'var(--primary)')}
      ${statCard('description', reports, t('admin.player_profile.stat.reports'), 'var(--primary)')}
      ${statCard('fitness_center', drills, t('admin.player_profile.stat.drills'), 'var(--primary)')}
    </div>`;
}

function statCard(icon, value, label, color) {
  return `<div class="card" style="padding:var(--sp-4);text-align:center;">
    <span class="material-symbols-outlined" style="font-size:24px;color:${color};">${icon}</span>
    <div style="font-size:var(--text-2xl);font-weight:700;margin-top:4px;">${esc(String(value))}</div>
    <div style="font-size:var(--text-xs);color:var(--text-muted);">${esc(label)}</div>
  </div>`;
}

function renderEvaluations(ev) {
  if (!ev) return '';
  // Keys must match exact field names returned by the API
  const cats = [
    ['offensive_rating', t('admin.player_profile.eval.offensive')],
    ['defensive_rating', t('admin.player_profile.eval.defensive')],
    ['iq_rating', t('admin.player_profile.eval.iq')],
    ['social_rating', t('admin.player_profile.eval.social')],
    ['leadership_rating', t('admin.player_profile.eval.leadership')],
    ['work_ethic_rating', t('admin.player_profile.eval.work_ethic')],
    ['fitness_rating', t('admin.player_profile.eval.fitness')],
    ['improvement_rating', t('admin.player_profile.eval.improvement')],
    ['leaving_risk', t('admin.player_profile.eval.leaving_risk')],
  ];
  const bars = cats.map(([key, label]) => {
    const val = ev[key] || 0;
    const pct = val * 10;
    const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#fbbf24' : '#ef4444';
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <span style="font-size:12px;color:var(--text-muted);min-width:120px;">${esc(label)}</span>
      <div style="flex:1;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;"></div>
      </div>
      <span style="font-size:12px;font-weight:700;min-width:24px;color:${color};">${val}/10</span>
    </div>`;
  }).join('');
  return `<div class="card" style="padding:var(--sp-5);margin-bottom:var(--sp-4);">
    <h3 style="font-size:var(--text-base);font-weight:600;margin-bottom:var(--sp-3);">
      <span class="material-symbols-outlined" style="vertical-align:middle;margin-left:6px;">analytics</span>
      ${t('admin.player_profile.section.evaluation')}
    </h3>
    ${bars}
  </div>`;
}

function renderReports(reports) {
  const items = reports.slice(0, 3).map(r => `
    <div style="border:1px solid var(--border);border-radius:var(--r-md);padding:var(--sp-3);margin-bottom:var(--sp-2);">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">${esc(r.period || '')}</div>
      ${r.strengths?.length ? `<div style="margin-bottom:4px;"><strong style="color:#22c55e;">✅ </strong>${esc(r.strengths.join(', '))}</div>` : ''}
      ${r.weaknesses?.length ? `<div><strong style="color:#ef4444;">⚠️ </strong>${esc(r.weaknesses.join(', '))}</div>` : ''}
    </div>`).join('');
  return `<div class="card" style="padding:var(--sp-5);margin-bottom:var(--sp-4);">
    <h3 style="font-size:var(--text-base);font-weight:600;margin-bottom:var(--sp-3);">
      <span class="material-symbols-outlined" style="vertical-align:middle;margin-left:6px;">description</span>
      ${t('admin.player_profile.section.reports')}
    </h3>
    ${items}
  </div>`;
}

function renderAttendance(att) {
  const pct = att.percentage || 0;
  const color = pct < 70 ? '#ef4444' : pct < 85 ? '#fbbf24' : '#22c55e';
  return `<div class="card" style="padding:var(--sp-5);margin-bottom:var(--sp-4);">
    <h3 style="font-size:var(--text-base);font-weight:600;margin-bottom:var(--sp-3);">
      <span class="material-symbols-outlined" style="vertical-align:middle;margin-left:6px;">event_available</span>
      ${t('admin.player_profile.section.attendance')}
    </h3>
    <div style="display:flex;align-items:center;gap:var(--sp-4);">
      <div style="width:80px;height:80px;border-radius:50%;background:conic-gradient(${color} ${pct * 3.6}deg, rgba(255,255,255,0.08) 0deg);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <div style="width:68px;height:68px;border-radius:50%;background:var(--bg-card);display:flex;align-items:center;justify-content:center;flex-direction:column;">
          <span style="font-size:20px;font-weight:800;color:${color};">${pct}%</span>
        </div>
      </div>
      <div>
        <div style="color:var(--text-muted);font-size:var(--text-sm);">${att.attended || 0} / ${att.total_events || 0} ${t('admin.player_profile.attendance.events')}</div>
        <div style="font-size:var(--text-xs);color:${color};margin-top:4px;">${pct < 70 ? '🔴 ' + t('admin.player_profile.attendance.low') : pct < 85 ? '⚠️ ' + t('admin.player_profile.attendance.medium') : '✅ ' + t('admin.player_profile.attendance.good')}</div>
      </div>
    </div>
  </div>`;
}

function renderDrills(drills) {
  const statusLabel = {
    approved: t('admin.player_profile.drill.approved'),
    rejected: t('admin.player_profile.drill.rejected'),
    pending: t('admin.player_profile.drill.pending'),
    video_uploaded: t('admin.player_profile.drill.video_uploaded'),
  };
  const recent = drills.slice(0, 5);
  const items = recent.map(d => {
    const statusColor = d.status === 'approved' ? '#22c55e' : d.status === 'rejected' ? '#ef4444' : '#fbbf24';
    const label = statusLabel[d.status] || esc(d.status || '');
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <span style="font-size:var(--text-sm);">${esc(d.drill_name || '—')}</span>
      <span style="font-size:11px;color:${statusColor};">${label}</span>
    </div>`;
  }).join('');
  return `<div class="card" style="padding:var(--sp-5);margin-bottom:var(--sp-4);">
    <h3 style="font-size:var(--text-base);font-weight:600;margin-bottom:var(--sp-3);">
      <span class="material-symbols-outlined" style="vertical-align:middle;margin-left:6px;">fitness_center</span>
      ${t('admin.player_profile.section.drills')}
    </h3>
    ${items}
  </div>`;
}

// ===== PROGRESS GRAPH & TIMELINE =====
async function loadAndRenderProgress() {
  try {
    const res = await AdminAPI.get(`/api/admin/players/${PLAYER_ID}/progress`);
    const pd = res.data;
    const section = document.getElementById('progressSection');
    if (!section) return;

    const evals = pd.evaluations || [];
    const standoutCount = pd.standout_count || 0;
    const standoutGames = pd.standout_games || [];
    const reports = pd.reports || [];

    // Build chart HTML
    const standoutBadge = standoutCount > 0
      ? `<span class="badge badge-primary" style="margin-right:auto;">⭐ ${standoutCount}× מצטיין במשחקים</span>`
      : '';

    section.innerHTML = `
      <!-- Progress Graph Card -->
      <div class="card" style="padding:var(--sp-5);margin-bottom:var(--sp-4);" id="progressGraphCard">
        <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-4);">
          <span class="material-symbols-outlined" style="color:var(--primary);font-size:20px;">show_chart</span>
          <h3 style="font-size:var(--text-base);font-weight:600;">גרף התקדמות</h3>
          ${standoutBadge}
        </div>
        ${evals.length >= 2
          ? `<canvas id="adminProgressChart" style="max-height:300px;"></canvas>`
          : `<div style="text-align:center;padding:var(--sp-6);color:var(--text-muted);font-size:var(--text-sm);">נדרשות לפחות 2 הערכות להצגת גרף</div>`
        }
      </div>

      <!-- All Reports Card -->
      <div class="card" style="padding:var(--sp-5);margin-bottom:var(--sp-4);">
        <div style="display:flex;align-items:center;gap:var(--sp-3);margin-bottom:var(--sp-4);flex-wrap:wrap;">
          <span class="material-symbols-outlined" style="color:var(--primary);font-size:20px;">folder_open</span>
          <h3 style="font-size:var(--text-base);font-weight:600;margin-left:0;">כל הדוחות וההערכות</h3>
          <!-- Period filter -->
          <select id="reportsPeriodFilter" class="select" style="margin-right:auto;max-width:180px;padding:4px 8px;font-size:var(--text-sm);" onchange="applyReportsFilter()">
            <option value="6m">6 חודשים אחרונים</option>
            <option value="12m">12 חודשים</option>
            <option value="all">כל הזמן</option>
          </select>
          <!-- Type filter tabs -->
          <div style="display:flex;gap:4px;">
            <button class="btn btn-sm btn-primary" id="rfTab-all" onclick="setReportsTab('all')">הכל</button>
            <button class="btn btn-sm btn-ghost" id="rfTab-eval" onclick="setReportsTab('eval')">הערכות</button>
            <button class="btn btn-sm btn-ghost" id="rfTab-report" onclick="setReportsTab('report')">דוחות תקופתיים</button>
            ${standoutGames.length > 0 ? `<button class="btn btn-sm btn-ghost" id="rfTab-standout" onclick="setReportsTab('standout')">⭐ מצטיין</button>` : ''}
          </div>
        </div>
        <div id="allReportsList"></div>
      </div>

    `;

    // Render chart if enough data
    if (evals.length >= 2) {
      renderAdminProgressChart(evals);
    }

    // Render reports browser (default: 6 months)
    _reportsData = { evals, reports, standoutGames };
    applyReportsFilter();

  } catch(e) {
    console.error('Progress load error:', e);
  }
}

// ===== ALL REPORTS BROWSER =====
let _reportsData = { evals: [], reports: [], standoutGames: [] };
let _reportsTab = 'all';

function setReportsTab(tab) {
  _reportsTab = tab;
  ['all','eval','report','standout'].forEach(t => {
    const btn = document.getElementById(`rfTab-${t}`);
    if (btn) btn.className = `btn btn-sm ${t === tab ? 'btn-primary' : 'btn-ghost'}`;
  });
  applyReportsFilter();
}

function applyReportsFilter() {
  const periodVal = document.getElementById('reportsPeriodFilter')?.value || '6m';
  const now = new Date();
  const cutoff = new Date(now);
  if (periodVal === '6m') cutoff.setMonth(cutoff.getMonth() - 6);
  else if (periodVal === '12m') cutoff.setFullYear(cutoff.getFullYear() - 1);
  else cutoff.setFullYear(2000); // "all"

  const { evals, reports, standoutGames } = _reportsData;
  const list = document.getElementById('allReportsList');
  if (!list) return;

  // Build unified items list
  const items = [];

  if (_reportsTab === 'all' || _reportsTab === 'eval') {
    for (const ev of [...evals].reverse()) {
      const d = new Date(ev.date);
      if (d < cutoff) continue;
      items.push({ _type: 'eval', _date: ev.date, ...ev });
    }
  }

  if (_reportsTab === 'all' || _reportsTab === 'report') {
    for (const r of [...reports].reverse()) {
      const d = new Date(r.date);
      if (d < cutoff) continue;
      items.push({ _type: 'report', _date: r.date, ...r });
    }
  }

  if (_reportsTab === 'all' || _reportsTab === 'standout') {
    for (const g of [...standoutGames]) {
      const d = new Date(g.date);
      if (d < cutoff) continue;
      items.push({ _type: 'standout', _date: g.date, ...g });
    }
  }

  // Sort by date DESC (already reversed above for eval/report)
  items.sort((a, b) => new Date(b._date) - new Date(a._date));

  if (!items.length) {
    list.innerHTML = `<div style="text-align:center;padding:var(--sp-6);color:var(--text-muted);font-size:var(--text-sm);">אין דוחות בתקופה הנבחרת</div>`;
    return;
  }

  list.innerHTML = items.map(item => renderReportRow(item)).join('');
}

function renderReportRow(item) {
  if (item._type === 'eval') {
    const tags = [
      item.personal_improvement_rating != null ? `<span style="background:#f48c2520;color:#f48c25;border-radius:4px;padding:2px 6px;font-size:10px;font-weight:700;">שיפור: ${item.personal_improvement_rating}/10</span>` : '',
      item.team_contribution_rating != null ? `<span style="background:#60A5FA20;color:#60A5FA;border-radius:4px;padding:2px 6px;font-size:10px;font-weight:700;">קבוצה: ${item.team_contribution_rating}/10</span>` : '',
    ].filter(Boolean).join('');
    return `<div style="display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-3) var(--sp-2);border-bottom:1px solid var(--border);">
      <span class="material-symbols-outlined" style="font-size:18px;color:#f48c25;flex-shrink:0;">assessment</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:var(--text-sm);font-weight:600;">הערכה — ${esc(item.period_label || item.date)}</div>
        <div style="font-size:11px;color:var(--text-muted);">${esc(item.date)}</div>
        ${tags ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${tags}</div>` : ''}
      </div>
      <button class="btn btn-sm btn-secondary" style="flex-shrink:0;" onclick="openAdminReportView(${JSON.stringify(item).replace(/"/g,'&quot;')})">
        <span class="material-symbols-outlined" style="font-size:15px;">open_in_new</span> פתח
      </button>
    </div>`;
  }

  if (item._type === 'report') {
    const aiTag = item.is_ai_generated ? '<span class="badge badge-primary" style="font-size:9px;">AI</span>' : '';
    const overallTag = item.overall_rating != null ? `<span style="background:var(--primary)20;color:var(--primary);border-radius:4px;padding:2px 6px;font-size:10px;font-weight:700;">כללי: ${item.overall_rating}/10</span>` : '';
    return `<div style="display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-3) var(--sp-2);border-bottom:1px solid var(--border);">
      <span class="material-symbols-outlined" style="font-size:18px;color:#60A5FA;flex-shrink:0;">description</span>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:var(--text-sm);font-weight:600;">דוח תקופתי — ${esc(item.period)}</span>
          ${aiTag}
        </div>
        <div style="font-size:11px;color:var(--text-muted);">${esc(item.date)}${item.coach_name ? ` · ${esc(item.coach_name)}` : ''}</div>
        ${overallTag ? `<div style="margin-top:4px;">${overallTag}</div>` : ''}
      </div>
      <button class="btn btn-sm btn-secondary" style="flex-shrink:0;" onclick="openAdminReportView(${JSON.stringify(item).replace(/"/g,'&quot;')})">
        <span class="material-symbols-outlined" style="font-size:15px;">open_in_new</span> פתח
      </button>
    </div>`;
  }

  if (item._type === 'standout') {
    return `<div style="display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-3) var(--sp-2);border-bottom:1px solid var(--border);">
      <span style="font-size:18px;flex-shrink:0;">⭐</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:var(--text-sm);font-weight:600;">מצטיין במשחק נגד ${esc(item.opponent || '—')}</div>
        <div style="font-size:11px;color:var(--text-muted);">${esc(item.date)}${item.result ? ` · ${esc(item.result)}` : ''}</div>
      </div>
    </div>`;
  }
  return '';
}

// ===== REPORT VIEW MODAL =====
function openAdminReportView(item) {
  const modal = document.getElementById('adminReportViewModal');
  const body = document.getElementById('adminReportViewBody');
  const title = document.getElementById('adminReportViewTitle');
  if (!modal || !body) return;

  if (item._type === 'eval') {
    title.textContent = `הערכה — ${item.period_label || item.date}`;
    const cats = [
      ['offensive_rating', 'התקפה'], ['defensive_rating', 'הגנה'], ['iq_rating', 'כדורסל IQ'],
      ['social_rating', 'חברתי'], ['leadership_rating', 'מנהיגות'], ['work_ethic_rating', 'מאמץ'],
      ['fitness_rating', 'כושר'], ['improvement_rating', 'שיפור כללי'], ['leaving_risk', 'סיכון עזיבה'],
    ];
    const bars = cats.map(([key, label]) => {
      const val = item[key] ?? 0;
      const pct = val * 10;
      const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#fbbf24' : '#ef4444';
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:12px;color:var(--text-muted);min-width:120px;">${label}</span>
        <div style="flex:1;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;"></div>
        </div>
        <span style="font-size:12px;font-weight:700;min-width:28px;color:${color};">${val}/10</span>
      </div>`;
    }).join('');
    const extraRatings = [
      item.personal_improvement_rating != null ? `<div style="border-top:1px solid var(--border);padding-top:var(--sp-3);margin-top:var(--sp-3);">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-size:12px;color:#f48c25;min-width:120px;font-weight:700;">שיפור אישי *</span>
          <span style="font-size:14px;font-weight:800;color:#f48c25;">${item.personal_improvement_rating}/10</span>
        </div>
        ${item.personal_improvement_notes ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">${esc(item.personal_improvement_notes)}</div>` : ''}
      </div>` : '',
      item.team_contribution_rating != null ? `<div style="border-top:1px solid var(--border);padding-top:var(--sp-3);margin-top:var(--sp-3);">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-size:12px;color:#60A5FA;min-width:120px;font-weight:700;">תרומה לקבוצה *</span>
          <span style="font-size:14px;font-weight:800;color:#60A5FA;">${item.team_contribution_rating}/10</span>
        </div>
        ${item.team_contribution_notes ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">${esc(item.team_contribution_notes)}</div>` : ''}
      </div>` : '',
    ].filter(Boolean).join('');
    const notes = item.overall_notes ? `<div style="margin-top:var(--sp-3);padding-top:var(--sp-3);border-top:1px solid var(--border);font-size:var(--text-xs);color:var(--text-muted);">${esc(item.overall_notes)}</div>` : '';
    body.innerHTML = `<div style="font-size:11px;color:var(--text-muted);margin-bottom:var(--sp-4);">${esc(item.date)}</div>${bars}${extraRatings}${notes}`;
  }

  else if (item._type === 'report') {
    title.textContent = `דוח תקופתי — ${item.period}`;
    const ratingBadge = (label, val, color) => val != null
      ? `<span style="background:${color}20;color:${color};border-radius:4px;padding:3px 10px;font-size:12px;font-weight:700;">${label}: ${val}/10</span>` : '';
    const ratingsRow = [
      ratingBadge('כללי', item.overall_rating, 'var(--primary)'),
      ratingBadge('שיפור אישי', item.personal_improvement_rating, '#f48c25'),
      ratingBadge('תרומה לקבוצה', item.team_contribution_rating, '#60A5FA'),
    ].filter(Boolean).join('');
    const renderList = (arr, icon) => (arr?.length ? `<ul style="margin:6px 0 0 0;padding-right:16px;font-size:var(--text-xs);color:var(--text-muted);">${arr.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : `<div style="font-size:var(--text-xs);color:var(--text-muted);">—</div>`);
    body.innerHTML = `
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:var(--sp-3);">${esc(item.date)}${item.coach_name ? ` · ${esc(item.coach_name)}` : ''}${item.is_ai_generated ? ' · <span class="badge badge-primary" style="font-size:9px;">AI</span>' : ''}</div>
      ${ratingsRow ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:var(--sp-4);">${ratingsRow}</div>` : ''}
      ${item.personal_improvement_notes ? `<div style="margin-bottom:var(--sp-3);"><strong style="font-size:var(--text-xs);color:#f48c25;">שיפור אישי:</strong><div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">${esc(item.personal_improvement_notes)}</div></div>` : ''}
      ${item.team_contribution_notes ? `<div style="margin-bottom:var(--sp-3);"><strong style="font-size:var(--text-xs);color:#60A5FA;">תרומה לקבוצה:</strong><div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">${esc(item.team_contribution_notes)}</div></div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);margin-top:var(--sp-3);">
        <div><strong style="font-size:var(--text-xs);color:#22c55e;">✅ חוזקות</strong>${renderList(item.strengths)}</div>
        <div><strong style="font-size:var(--text-xs);color:#ef4444;">⚠️ חולשות</strong>${renderList(item.weaknesses)}</div>
      </div>
      ${item.focus_areas?.length ? `<div style="margin-top:var(--sp-3);"><strong style="font-size:var(--text-xs);color:var(--text-muted);">🎯 תחומי מיקוד</strong>${renderList(item.focus_areas)}</div>` : ''}
      ${item.progress_notes ? `<div style="margin-top:var(--sp-3);padding-top:var(--sp-3);border-top:1px solid var(--border);"><strong style="font-size:var(--text-xs);">התקדמות:</strong><div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">${esc(item.progress_notes)}</div></div>` : ''}
      ${item.recommendations ? `<div style="margin-top:var(--sp-3);padding-top:var(--sp-3);border-top:1px solid var(--border);"><strong style="font-size:var(--text-xs);">המלצות:</strong><div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">${esc(item.recommendations)}</div></div>` : ''}
    `;
  }

  modal.classList.add('active');
}

function closeAdminReportView() {
  const modal = document.getElementById('adminReportViewModal');
  if (modal) modal.classList.remove('active');
}

function renderAdminProgressChart(evals) {
  const canvas = document.getElementById('adminProgressChart');
  if (!canvas) return;
  if (_progressChartInst) { _progressChartInst.destroy(); _progressChartInst = null; }

  const labels = evals.map(e => e.period_label || e.date);
  const mkData = field => evals.map(e => e[field] ?? null);

  _progressChartInst = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'שיפור אישי', data: mkData('personal_improvement_rating'), borderColor: '#f48c25', backgroundColor: '#f48c2530', tension: 0.3, pointRadius: 5, pointHoverRadius: 7, fill: true },
        { label: 'תרומה לקבוצה', data: mkData('team_contribution_rating'), borderColor: '#60A5FA', backgroundColor: '#60A5FA20', tension: 0.3, pointRadius: 5, pointHoverRadius: 7, fill: true },
        { label: 'התקפה', data: mkData('offensive_rating'), borderColor: '#F87171', backgroundColor: 'transparent', tension: 0.3, pointRadius: 3, borderDash: [5,3] },
        { label: 'הגנה', data: mkData('defensive_rating'), borderColor: '#34D399', backgroundColor: 'transparent', tension: 0.3, pointRadius: 3, borderDash: [5,3] },
        { label: 'IQ', data: mkData('iq_rating'), borderColor: '#A78BFA', backgroundColor: 'transparent', tension: 0.3, pointRadius: 3, borderDash: [5,3] },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#baab9c', font: { family: 'Space Grotesk', size: 12 }, boxWidth: 16 } },
        tooltip: { backgroundColor: 'rgba(0,0,0,0.85)', titleColor: '#fff', bodyColor: '#baab9c' },
      },
      scales: {
        y: { min: 0, max: 10, ticks: { color: '#baab9c', stepSize: 2, font: { family: 'Space Grotesk' } }, grid: { color: '#ffffff12' } },
        x: { ticks: { color: '#baab9c', font: { size: 11, family: 'Space Grotesk' } }, grid: { color: '#ffffff08' } },
      },
    },
  });
}

function renderProgressTimeline(evals, reports, standoutGames) {
  const items = [];

  // Merge evaluations and reports sorted by date DESC
  for (const ev of [...evals].reverse()) {
    const hasPersonal = ev.personal_improvement_rating != null;
    const hasTeam = ev.team_contribution_rating != null;
    if (!hasPersonal && !hasTeam) continue;
    items.push({
      date: ev.date,
      type: 'eval',
      periodLabel: ev.period_label,
      personalRating: ev.personal_improvement_rating,
      personalNotes: ev.personal_improvement_notes,
      teamRating: ev.team_contribution_rating,
      teamNotes: ev.team_contribution_notes,
      overallNotes: ev.overall_notes,
    });
  }

  for (const r of [...reports].reverse()) {
    if (!r.progress_notes && !r.personal_improvement_notes && !r.team_contribution_notes) continue;
    items.push({
      date: r.date,
      type: 'report',
      period: r.period,
      progressNotes: r.progress_notes,
      personalRating: r.personal_improvement_rating,
      personalNotes: r.personal_improvement_notes,
      teamRating: r.team_contribution_rating,
      teamNotes: r.team_contribution_notes,
    });
  }

  if (!items.length && !standoutGames.length) {
    return `<div style="text-align:center;padding:var(--sp-6);color:var(--text-muted);font-size:var(--text-sm);">אין נתוני התקדמות עדיין</div>`;
  }

  const ratingBadge = (label, val, color) => val != null
    ? `<span style="background:${color}20;color:${color};border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;">${label}: ${val}/10</span>` : '';

  const evalCards = items.map(item => {
    if (item.type === 'eval') {
      return `<div style="border-left:3px solid #f48c25;padding:var(--sp-3) var(--sp-4);margin-bottom:var(--sp-3);background:var(--bg-card);border-radius:0 var(--radius) var(--radius) 0;">
        <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-2);">
          <span class="material-symbols-outlined" style="font-size:16px;color:#f48c25;">assessment</span>
          <strong style="font-size:var(--text-sm);">הערכה — ${esc(item.periodLabel || item.date)}</strong>
          <span style="font-size:11px;color:var(--text-muted);">${esc(item.date)}</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);margin-bottom:var(--sp-2);">
          ${ratingBadge('שיפור אישי', item.personalRating, '#f48c25')}
          ${ratingBadge('תרומה לקבוצה', item.teamRating, '#60A5FA')}
        </div>
        ${item.personalNotes ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px;"><strong>שיפור אישי:</strong> ${esc(item.personalNotes)}</div>` : ''}
        ${item.teamNotes ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px;"><strong>תרומה לקבוצה:</strong> ${esc(item.teamNotes)}</div>` : ''}
        ${item.overallNotes ? `<div style="font-size:var(--text-xs);color:var(--text-muted);">${esc(item.overallNotes)}</div>` : ''}
      </div>`;
    } else {
      return `<div style="border-left:3px solid #60A5FA;padding:var(--sp-3) var(--sp-4);margin-bottom:var(--sp-3);background:var(--bg-card);border-radius:0 var(--radius) var(--radius) 0;">
        <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-2);">
          <span class="material-symbols-outlined" style="font-size:16px;color:#60A5FA;">description</span>
          <strong style="font-size:var(--text-sm);">דוח תקופתי — ${esc(item.period || item.date)}</strong>
          <span style="font-size:11px;color:var(--text-muted);">${esc(item.date)}</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);margin-bottom:var(--sp-2);">
          ${ratingBadge('שיפור אישי', item.personalRating, '#f48c25')}
          ${ratingBadge('תרומה לקבוצה', item.teamRating, '#60A5FA')}
        </div>
        ${item.progressNotes ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px;">${esc(item.progressNotes)}</div>` : ''}
        ${item.personalNotes ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px;"><strong>שיפור אישי:</strong> ${esc(item.personalNotes)}</div>` : ''}
        ${item.teamNotes ? `<div style="font-size:var(--text-xs);color:var(--text-muted);">${esc(item.teamNotes)}</div>` : ''}
      </div>`;
    }
  });

  const standoutSection = standoutGames.length > 0
    ? `<div style="border-left:3px solid #FBBF24;padding:var(--sp-3) var(--sp-4);margin-bottom:var(--sp-3);background:var(--bg-card);border-radius:0 var(--radius) var(--radius) 0;">
        <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-2);">
          <span style="font-size:18px;">⭐</span>
          <strong style="font-size:var(--text-sm);">הופיע מצטיין ב-${standoutGames.length} משחקים</strong>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);">
          ${standoutGames.map(g => `<span style="font-size:11px;background:rgba(251,191,36,0.1);border:1px solid #FBBF2440;border-radius:4px;padding:2px 8px;">${esc(g.date)} vs ${esc(g.opponent)}</span>`).join('')}
        </div>
      </div>` : '';

  return standoutSection + evalCards.join('');
}

function calcAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
}
