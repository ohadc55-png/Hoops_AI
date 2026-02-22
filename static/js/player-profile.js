/**
 * HOOPS AI - Player Profile Card (shared rendering)
 * Used by coach logistics page and admin teams page.
 */

function renderPlayerProfile(d) {
  const p = d.player;
  const att = d.attendance;
  const dr = d.drills;
  const report = d.latest_report;
  const highlights = d.game_highlights;

  function pctColor(pct) {
    if (pct >= 80) return 'green';
    if (pct >= 50) return 'yellow';
    return 'red';
  }
  function pctColorVar(pct) {
    if (pct >= 80) return 'var(--success, #22c55e)';
    if (pct >= 50) return 'var(--warning, #fbbf24)';
    return 'var(--error, #ef4444)';
  }
  function _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function _cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  // ── Header: jersey badge + name + position ──
  let html = `<div class="pp-header">
    <div class="pp-jersey">${p.jersey_number != null ? '#' + p.jersey_number : '?'}</div>
    <div>
      <h3 class="pp-name">${_esc(p.name)}</h3>
      <div class="pp-meta">${[p.position, p.age ? p.age + ' yrs' : null, p.gender ? _cap(p.gender) : null].filter(Boolean).join(' \u00B7 ')}</div>
    </div>
  </div>`;

  // ── Physical Info ──
  const physicalItems = [];
  if (p.height) physicalItems.push(['height', p.height + ' cm']);
  if (p.weight) physicalItems.push(['monitor_weight', p.weight + ' kg']);
  if (p.birth_date) physicalItems.push(['cake', p.birth_date]);

  if (physicalItems.length) {
    html += `<div class="pp-section">
      <h4 class="pp-section-title"><span class="material-symbols-outlined">straighten</span> Physical</h4>
      <div class="pp-info-grid">
        ${physicalItems.map(([icon, val]) => `<div class="pp-info-item"><span class="material-symbols-outlined">${icon}</span><span>${val}</span></div>`).join('')}
      </div>
    </div>`;
  }

  // ── Contact Info ──
  const contactItems = [];
  if (p.phone) contactItems.push(['phone', _esc(p.phone), 'Player Phone']);
  if (p.email) contactItems.push(['mail', _esc(p.email), 'Player Email']);

  const hasParent = p.parent_phone || p.parent_email;
  if (contactItems.length || hasParent) {
    html += `<div class="pp-section">
      <h4 class="pp-section-title"><span class="material-symbols-outlined">contacts</span> Contact</h4>
      <div class="pp-contact-list">
        ${contactItems.map(([icon, val, label]) => `<div class="pp-contact-row"><span class="material-symbols-outlined">${icon}</span><div><div class="pp-contact-label">${label}</div><div class="pp-contact-value">${val}</div></div></div>`).join('')}
        ${hasParent ? `<div class="pp-contact-divider"></div>
          <div class="pp-contact-subtitle"><span class="material-symbols-outlined" style="font-size:16px;">family_restroom</span> Parents</div>
          ${p.parent_phone ? `<div class="pp-contact-row"><span class="material-symbols-outlined">phone</span><div><div class="pp-contact-label">Parent Phone</div><div class="pp-contact-value">${_esc(p.parent_phone)}</div></div></div>` : ''}
          ${p.parent_email ? `<div class="pp-contact-row"><span class="material-symbols-outlined">mail</span><div><div class="pp-contact-label">Parent Email</div><div class="pp-contact-value">${_esc(p.parent_email)}</div></div></div>` : ''}
        ` : ''}
      </div>
    </div>`;
  }

  // ── Attendance ──
  html += `<div class="pp-section">
    <h4 class="pp-section-title"><span class="material-symbols-outlined">event_available</span> Attendance</h4>
    ${att.total > 0 ? `
      <div class="pp-stat-row">
        <div class="pp-stat-bar-wrap"><div class="pp-stat-bar" style="width:${att.percentage}%;background:${pctColorVar(att.percentage)}"></div></div>
        <span class="pp-stat-value ${pctColor(att.percentage)}">${att.percentage}%</span>
      </div>
      <div class="pp-stat-detail">${att.attended} / ${att.total} events attended</div>
    ` : '<div class="pp-empty">No attendance data yet</div>'}
  </div>`;

  // ── Drill Completion ──
  html += `<div class="pp-section">
    <h4 class="pp-section-title"><span class="material-symbols-outlined">fitness_center</span> Drill Completion</h4>
    ${dr.assigned > 0 ? `
      <div class="pp-stat-row">
        <div class="pp-stat-bar-wrap"><div class="pp-stat-bar" style="width:${dr.percentage}%;background:${pctColorVar(dr.percentage)}"></div></div>
        <span class="pp-stat-value ${pctColor(dr.percentage)}">${dr.percentage}%</span>
      </div>
      <div class="pp-stat-detail">${dr.completed} / ${dr.assigned} drills completed${dr.last_completed ? ' \u00B7 Last: ' + new Date(dr.last_completed.endsWith('Z') ? dr.last_completed : dr.last_completed + 'Z').toLocaleDateString() : ''}</div>
    ` : '<div class="pp-empty">No drills assigned yet</div>'}
  </div>`;

  // ── Latest Report (collapsible, starts open) ──
  if (report) {
    html += `<div class="pp-section pp-collapsible open">
      <h4 class="pp-section-title pp-toggle" onclick="this.parentElement.classList.toggle('open')">
        <span class="material-symbols-outlined">description</span> Latest Report (${_esc(report.period)})
        <span class="material-symbols-outlined pp-chevron">expand_more</span>
      </h4>
      <div class="pp-collapse-body">`;

    if (report.strengths.length) {
      html += `<div class="pp-report-block">
        <h5><span class="material-symbols-outlined" style="font-size:16px;color:var(--success,#22c55e);">thumb_up</span> Strengths</h5>
        <ul class="pp-report-list">${report.strengths.map(s => `<li>${_esc(s)}</li>`).join('')}</ul>
      </div>`;
    }
    if (report.weaknesses.length) {
      html += `<div class="pp-report-block">
        <h5><span class="material-symbols-outlined" style="font-size:16px;color:var(--error,#ef4444);">trending_down</span> Weaknesses</h5>
        <ul class="pp-report-list">${report.weaknesses.map(s => `<li>${_esc(s)}</li>`).join('')}</ul>
      </div>`;
    }
    if (report.focus_areas.length) {
      html += `<div class="pp-report-block">
        <h5><span class="material-symbols-outlined" style="font-size:16px;color:var(--warning,#fbbf24);">target</span> Focus Areas</h5>
        <ul class="pp-report-list">${report.focus_areas.map(s => `<li>${_esc(s)}</li>`).join('')}</ul>
      </div>`;
    }
    if (report.recommendations) {
      html += `<div class="pp-report-block">
        <h5><span class="material-symbols-outlined" style="font-size:16px;color:var(--info,#60a5fa);">lightbulb</span> Recommendations</h5>
        <p class="pp-report-text">${_esc(report.recommendations)}</p>
      </div>`;
    }
    if (report.progress_notes) {
      html += `<div class="pp-report-block">
        <h5><span class="material-symbols-outlined" style="font-size:16px;color:var(--text-secondary);">edit_note</span> Progress Notes</h5>
        <p class="pp-report-text">${_esc(report.progress_notes)}</p>
      </div>`;
    }

    html += `</div></div>`;
  } else {
    html += `<div class="pp-section">
      <h4 class="pp-section-title"><span class="material-symbols-outlined">description</span> Player Reports</h4>
      <div class="pp-empty">No reports yet</div>
    </div>`;
  }

  // ── Game Highlights (collapsible, starts open) ──
  if (highlights.length) {
    html += `<div class="pp-section pp-collapsible open">
      <h4 class="pp-section-title pp-toggle" onclick="this.parentElement.classList.toggle('open')">
        <span class="material-symbols-outlined">emoji_events</span> Game Highlights (${highlights.length})
        <span class="material-symbols-outlined pp-chevron">expand_more</span>
      </h4>
      <div class="pp-collapse-body">
        ${highlights.map(g => `<div class="pp-game-row">
          <span class="pp-result-badge ${g.result}">${g.result === 'win' ? 'W' : g.result === 'loss' ? 'L' : 'D'}</span>
          <span style="flex:1;">vs ${_esc(g.opponent)}</span>
          <span style="font-weight:600;">${g.score_us}-${g.score_them}</span>
          <span style="color:var(--text-muted,#7a6f63);font-size:12px;">${g.date}</span>
        </div>`).join('')}
      </div>
    </div>`;
  }

  // ── Coach Notes ──
  if (p.notes) {
    html += `<div class="pp-section">
      <h4 class="pp-section-title"><span class="material-symbols-outlined">edit_note</span> Coach Notes</h4>
      <div class="pp-notes">${_esc(p.notes)}</div>
    </div>`;
  }

  return html;
}
