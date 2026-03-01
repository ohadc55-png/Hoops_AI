/**
 * HOOPS AI — Admin Coach Profile Page
 * Loads and renders a single coach's full profile.
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAPI.token) { window.location.href = '/admin/login'; return; }
  await loadCoachProfile();
});

async function loadCoachProfile() {
  const container = document.getElementById('profileContent');
  try {
    const res = await AdminAPI.get(`/api/admin/coaches/${COACH_ID}/profile`);
    const d = res.data;
    document.getElementById('pageTitle').textContent = d.name || t('admin.coach_profile.title');

    const activity = d.activity || {};
    const scores = activity.scores || {};
    const overall = activity.overall_score ?? null;

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
        <div style="display:flex;align-items:center;gap:var(--sp-4);flex-wrap:wrap;">
          <div style="width:72px;height:72px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span class="material-symbols-outlined" style="font-size:36px;color:#fff;">sports_basketball</span>
          </div>
          <div style="flex:1;min-width:0;">
            <h2 style="font-size:var(--text-xl);font-weight:700;margin:0;">${esc(d.name || '—')}</h2>
            <div style="color:var(--text-muted);font-size:var(--text-sm);margin-top:4px;">
              ${d.email ? `<span><span class="material-symbols-outlined" style="font-size:13px;vertical-align:middle;">mail</span> ${esc(d.email)}</span>` : ''}
              ${d.phone ? `<span style="margin-right:12px;"><span class="material-symbols-outlined" style="font-size:13px;vertical-align:middle;">phone</span> ${esc(d.phone)}</span>` : ''}
            </div>
            <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;">
              ${(d.teams || []).map(t => `<span class="badge badge-neutral">${esc(t.name)}</span>`).join('')}
            </div>
          </div>
          ${overall !== null ? `
          <div style="text-align:center;flex-shrink:0;">
            <div style="font-size:var(--text-3xl);font-weight:800;color:${scoreColor(overall)};">${overall}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);">${t('admin.coach_profile.engagement_score')}</div>
          </div>` : ''}
        </div>
      </div>

      <!-- Engagement Score Breakdown -->
      ${renderEngagementBreakdown(scores)}

      <!-- Activity Timeline -->
      ${renderTimeline(activity.timeline || [])}
    `;
  } catch (e) {
    container.innerHTML = `<div style="text-align:center;padding:48px;color:var(--text-muted);">
      <span class="material-symbols-outlined" style="font-size:48px;">error</span>
      <h3>${t('admin.coach_profile.load_error')}</h3>
      <button class="btn btn-secondary" onclick="history.back()" style="margin-top:16px;" data-i18n="btn.back">Back</button>
    </div>`;
  }
}

function renderEngagementBreakdown(scores) {
  if (!scores || !Object.keys(scores).length) return '';
  const categories = [
    ['reports', t('admin.coach_profile.score.reports'), 'description'],
    ['communication', t('admin.coach_profile.score.communication'), 'forum'],
    ['training', t('admin.coach_profile.score.training'), 'fitness_center'],
    ['attendance', t('admin.coach_profile.score.attendance'), 'event_available'],
    ['ai_usage', t('admin.coach_profile.score.ai_usage'), 'psychology'],
  ];
  const bars = categories.map(([key, label, icon]) => {
    const val = Math.round(scores[key] ?? 0);
    const color = scoreColor(val);
    return `
      <div style="margin-bottom:var(--sp-3);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="material-symbols-outlined" style="font-size:15px;color:var(--text-muted);">${icon}</span>
            <span style="font-size:var(--text-sm);">${esc(label)}</span>
          </div>
          <span style="font-size:var(--text-sm);font-weight:700;color:${color};">${val}/100</span>
        </div>
        <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${val}%;background:${color};border-radius:4px;transition:width 0.6s ease;"></div>
        </div>
      </div>`;
  }).join('');
  return `<div class="card" style="padding:var(--sp-5);margin-bottom:var(--sp-4);">
    <h3 style="font-size:var(--text-base);font-weight:600;margin-bottom:var(--sp-4);">
      <span class="material-symbols-outlined" style="vertical-align:middle;margin-left:6px;">analytics</span>
      ${t('admin.coach_profile.section.engagement')}
    </h3>
    ${bars}
  </div>`;
}

function renderTimeline(timeline) {
  if (!timeline?.length) return '';
  const items = timeline.slice(0, 20).map(item => {
    const icons = {
      drill_created: 'fitness_center',
      drill: 'fitness_center',
      play_created: 'smart_display',
      practice_created: 'event',
      report_submitted: 'description',
      player_report: 'description',
      game_report: 'sports_basketball',
      evaluation: 'assessment',
      evaluation_submitted: 'assessment',
      message_sent: 'mail',
      message: 'mail',
      drill_assigned: 'assignment',
      chat_started: 'chat',
      attendance_recorded: 'event_available',
    };
    const icon = icons[item.type] || 'circle';
    const dateStr = item.date ? new Date(item.date + 'Z').toLocaleDateString() : '';
    return `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);flex-shrink:0;margin-top:2px;">${icon}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:var(--text-sm);">${esc(item.detail || item.description || item.type)}</div>
        ${dateStr ? `<div style="font-size:11px;color:var(--text-muted);">${dateStr}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  return `<div class="card" style="padding:var(--sp-5);margin-bottom:var(--sp-4);">
    <h3 style="font-size:var(--text-base);font-weight:600;margin-bottom:var(--sp-3);">
      <span class="material-symbols-outlined" style="vertical-align:middle;margin-left:6px;">history</span>
      ${t('admin.coach_profile.section.activity')} (${t('admin.coach_profile.last_90_days')})
    </h3>
    ${items}
  </div>`;
}

function scoreColor(val) {
  if (val >= 75) return '#22c55e';
  if (val >= 50) return '#fbbf24';
  return '#ef4444';
}

/* esc → shared-utils.js */

// t() and esc() are provided globally by i18n.js and shared-utils.js
