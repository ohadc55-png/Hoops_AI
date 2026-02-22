/**
 * HOOPS AI — Player Leaderboard
 * Two rankings: Attendance Kings & Drill Champions
 */

const MEDALS = ['', '\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49']; // 🥇🥈🥉

document.addEventListener('DOMContentLoaded', () => {
  if (!PlayerAPI.token) return;
  loadLeaderboard();
});

function loadLeaderboard() {
  PlayerAPI.get('/api/player/leaderboard').then(res => {
    const data = res.data || {};
    const grid = document.getElementById('leaderboardGrid');

    const attHtml = renderRanking(
      '\uD83D\uDD25 Attendance Kings',
      'local_fire_department',
      data.attendance || [],
      renderStreakMetric
    );

    const drillHtml = renderRanking(
      '\uD83D\uDCAA Drill Champions',
      'military_tech',
      data.drills || [],
      renderDrillMetric
    );

    grid.innerHTML = attHtml + drillHtml;
  }).catch(() => {
    document.getElementById('leaderboardGrid').innerHTML =
      '<div class="empty-state-player"><span class="material-symbols-outlined">error</span>Could not load leaderboard</div>';
  });
}

function renderRanking(title, icon, entries, metricFn) {
  if (entries.length === 0) {
    return `<section class="lb-section dashboard-section">
      <div class="section-header"><h2><span class="material-symbols-outlined">${icon}</span> ${title}</h2></div>
      <div class="empty-state-player" style="padding:var(--sp-6);">
        <span class="material-symbols-outlined">emoji_events</span>
        No data yet
      </div>
    </section>`;
  }

  const rows = entries.map((e, i) => {
    const rank = e.rank || i + 1;
    const medal = MEDALS[rank] || '';
    const isTop3 = rank <= 3;
    const classes = ['lb-row'];
    if (e.is_me) classes.push('lb-me');
    if (isTop3) classes.push('lb-top3');

    return `<div class="${classes.join(' ')}">
      <div class="lb-rank">${medal || '#' + rank}</div>
      <div class="lb-jersey">${e.jersey != null ? '#' + e.jersey : ''}</div>
      <div class="lb-name">${esc(e.name)}${e.is_me ? ' <span class="lb-you">(You)</span>' : ''}</div>
      <div class="lb-pos">${esc(e.position || '')}</div>
      <div class="lb-metric">${metricFn(e)}</div>
    </div>`;
  }).join('');

  return `<section class="lb-section dashboard-section">
    <div class="section-header"><h2><span class="material-symbols-outlined">${icon}</span> ${title}</h2></div>
    <div class="lb-header-row">
      <div class="lb-rank"></div>
      <div class="lb-jersey"></div>
      <div class="lb-name">Player</div>
      <div class="lb-pos">Pos</div>
      <div class="lb-metric">Score</div>
    </div>
    ${rows}
  </section>`;
}

function renderStreakMetric(entry) {
  const val = entry.current_streak || 0;
  let cls = 'orange';
  if (val >= 15) cls = 'blue';
  else if (val >= 10) cls = 'red';

  return `<span class="lb-streak-val lb-streak-${cls}">${val} \uD83D\uDD25</span>`;
}

function renderDrillMetric(entry) {
  const rate = entry.rate || 0;
  let barColor = '#fbbf24'; // yellow
  if (rate >= 80) barColor = '#22c55e'; // green
  else if (rate >= 50) barColor = '#60a5fa'; // blue

  return `<div class="lb-drill-metric">
    <span class="lb-rate-text">${entry.approved}/${entry.total} (${rate}%)</span>
    <div class="lb-rate-bar-bg"><div class="lb-rate-bar-fill" style="width:${rate}%;background:${barColor};"></div></div>
  </div>`;
}
