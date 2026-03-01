/**
 * HOOPS AI — Player Dashboard JS
 * Welcome card with next event, attendance streak, drill progress, leaderboard preview
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!PlayerAPI.token) return;
  loadWelcome();
  loadDrillProgress();
  loadLeaderboardPreview();

  // Re-render dynamic content on language change
  if (typeof I18N !== 'undefined') {
    I18N.onLanguageChange(() => {
      loadWelcome();
      loadDrillProgress();
      loadLeaderboardPreview();
    });
  }
});

function loadWelcome() {
  const name = PlayerAPI.user?.name || 'Player';
  document.getElementById('welcomeName').textContent = t('player.dashboard.welcome', { name: esc(name) });

  // Load team info for welcome card
  PlayerAPI.get('/api/player/team').then(res => {
    const teams = res.data?.teams || [];
    if (teams.length > 0) {
      document.getElementById('welcomeTeam').textContent = teams[0].name + (teams[0].club_name ? ' — ' + teams[0].club_name : '');
    }
  }).catch(() => {});

  // Show next event
  PlayerAPI.get('/api/player/schedule').then(res => {
    const events = res.data || [];
    if (events.length > 0) {
      const e = events[0];
      const d = new Date(e.date + 'T00:00:00');
      const lang = (typeof I18N !== 'undefined' && I18N.getLang() === 'he') ? 'he-IL' : 'en-US';
      const dateStr = d.toLocaleDateString(lang, { month: 'short', day: 'numeric' }) + (e.time ? (I18N.getLang() === 'he' ? ' ב-' : ' at ') + e.time : '');
      document.getElementById('welcomeNext').textContent =
        t('player.dashboard.next_event', { title: e.title, date: dateStr });
    }
  }).catch(() => {});

  // Load attendance streak
  loadStreak();
}

function loadStreak() {
  PlayerAPI.get('/api/player/streak').then(res => {
    const data = res.data || {};
    const current = data.current || 0;
    if (current < 1) return;

    const display = document.getElementById('streakDisplay');
    const flame = document.getElementById('streakFlame');
    const count = document.getElementById('streakCount');
    if (!display || !flame || !count) return;

    // Dynamic flame color: 5=Orange, 10=Red, 15+=Blue
    let level;
    if (current >= 15) {
      level = 'blue';
      flame.style.filter = 'hue-rotate(200deg) saturate(1.5)';
    } else if (current >= 10) {
      level = 'red';
      flame.style.filter = 'hue-rotate(-10deg) saturate(1.5)';
    } else {
      level = 'orange';
      flame.style.filter = 'none';
    }

    flame.textContent = '\uD83D\uDD25';
    count.textContent = current;
    display.setAttribute('data-level', level);
    display.style.display = 'flex';
  }).catch(() => {});
}

/* ═══════════════════════════════════════
   Drill Progress Summary
   ═══════════════════════════════════════ */

function loadDrillProgress() {
  PlayerAPI.get('/api/player/drills').then(res => {
    const drills = res.data || [];
    if (drills.length === 0) return;

    const section = document.getElementById('drillProgressSection');
    section.style.display = '';

    // Count by status
    let pending = 0, underReview = 0, approved = 0, rejected = 0;
    for (const d of drills) {
      const st = d.status || 'pending';
      if (st === 'pending') pending++;
      else if (st === 'video_uploaded') underReview++;
      else if (st === 'approved') approved++;
      else if (st === 'rejected') rejected++;
    }

    // Render stat mini-cards
    const statsEl = document.getElementById('drillProgressStats');
    statsEl.innerHTML = `
      <div class="dp-stat">
        <span class="dp-stat-num">${drills.length}</span>
        <span class="dp-stat-label">${t('player.dashboard.drill_total')}</span>
      </div>
      <div class="dp-stat dp-pending">
        <span class="dp-stat-num">${pending + rejected}</span>
        <span class="dp-stat-label">${t('player.dashboard.drill_pending')}</span>
      </div>
      <div class="dp-stat dp-review">
        <span class="dp-stat-num">${underReview}</span>
        <span class="dp-stat-label">${t('player.dashboard.drill_under_review')}</span>
      </div>
      <div class="dp-stat dp-approved">
        <span class="dp-stat-num">${approved}</span>
        <span class="dp-stat-label">${t('player.dashboard.drill_approved')}</span>
      </div>
    `;

    // Render recent activity (last 3 drills with non-pending status)
    const recent = drills.filter(d => d.status !== 'pending').slice(0, 3);
    const recentEl = document.getElementById('drillProgressRecent');
    if (recent.length === 0) {
      recentEl.innerHTML = '<p style="color:var(--text-muted);font-size:var(--text-sm);margin-top:var(--sp-3);">' + t('player.dashboard.drill_no_activity') + '</p>';
      return;
    }

    const statusMap = {
      video_uploaded: { icon: 'hourglass_top', label: t('player.dashboard.drill_under_review'), cls: 'review' },
      approved:       { icon: 'check_circle',  label: t('player.dashboard.drill_approved'),     cls: 'approved' },
      rejected:       { icon: 'replay',        label: t('player.drills.status.try_again'),      cls: 'rejected' },
    };

    recentEl.innerHTML = '<h4 style="font-size:var(--text-sm);font-weight:600;margin:var(--sp-3) 0 var(--sp-2);color:var(--text-secondary);">' + t('player.dashboard.recent_activity') + '</h4>' +
      recent.map(d => {
        const s = statusMap[d.status] || statusMap.video_uploaded;
        return `<div class="dp-recent-item">
          <span class="material-symbols-outlined dp-recent-icon dp-${s.cls}">${s.icon}</span>
          <span class="dp-recent-title">${esc(d.title)}</span>
          <span class="dp-recent-status dp-${s.cls}">${s.label}</span>
        </div>`;
      }).join('');
  }).catch(() => {});
}

/* ═══════════════════════════════════════
   Leaderboard Preview (Top 3)
   ═══════════════════════════════════════ */

const LB_MEDALS = ['', '\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];

function loadLeaderboardPreview() {
  PlayerAPI.get('/api/player/leaderboard').then(res => {
    const data = res.data || {};
    const att = (data.attendance || []).slice(0, 3);
    const drills = (data.drills || []).slice(0, 3);

    if (att.length === 0 && drills.length === 0) return;

    const section = document.getElementById('leaderboardPreview');
    section.style.display = '';

    const grid = document.getElementById('lbPreviewGrid');

    const attCol = att.length > 0
      ? `<div class="lb-preview-col">
          <h4 class="lb-preview-title">\uD83D\uDD25 ${t('player.dashboard.attendance_kings')}</h4>
          ${att.map((e, i) => `<div class="lb-preview-row${e.is_me ? ' lb-me' : ''}">
            <span class="lb-preview-medal">${LB_MEDALS[i + 1]}</span>
            <span class="lb-preview-name">${esc(e.name)}</span>
            <span class="lb-preview-val">${e.current_streak}\uD83D\uDD25</span>
          </div>`).join('')}
        </div>` : '';

    const drillCol = drills.length > 0
      ? `<div class="lb-preview-col">
          <h4 class="lb-preview-title">\uD83D\uDCAA ${t('player.dashboard.drill_champions')}</h4>
          ${drills.map((e, i) => `<div class="lb-preview-row${e.is_me ? ' lb-me' : ''}">
            <span class="lb-preview-medal">${LB_MEDALS[i + 1]}</span>
            <span class="lb-preview-name">${esc(e.name)}</span>
            <span class="lb-preview-val">${e.rate}%</span>
          </div>`).join('')}
        </div>` : '';

    grid.innerHTML = attCol + drillCol;
  }).catch(() => {});
}
