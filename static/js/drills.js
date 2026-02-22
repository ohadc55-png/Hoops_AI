/**
 * HOOPS AI - Drills Page
 */
let _assignDrillId = null;
let _allPlayersSelected = false;

document.addEventListener('DOMContentLoaded', () => {
  loadDrills();
  updateReviewBadge();
  document.getElementById('drillSearch').addEventListener('input', debounce(loadDrills, 300));
  document.getElementById('categoryFilter').addEventListener('change', loadDrills);
  document.getElementById('difficultyFilter').addEventListener('change', loadDrills);
});

async function loadDrills() {
  const search = document.getElementById('drillSearch').value;
  const category = document.getElementById('categoryFilter').value;
  const difficulty = document.getElementById('difficultyFilter').value;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  if (difficulty) params.set('difficulty', difficulty);

  try {
    const res = await API.get(`/api/drills?${params}`);
    renderDrills(res.data);
  } catch (e) { /* silent */ }
}

function renderDrills(drills) {
  const grid = document.getElementById('drillGrid');
  if (!drills.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><span class="material-symbols-outlined">fitness_center</span><h3>No drills found</h3><p>Create your first drill or adjust filters</p></div>';
    return;
  }
  const diffColors = { beginner: 'success', intermediate: 'warning', advanced: 'error' };
  grid.innerHTML = drills.map(d => `
    <div class="card card-interactive" onclick="viewDrill(${d.id})">
      <div class="flex items-center justify-between" style="margin-bottom:var(--sp-3);">
        <span class="badge badge-neutral">${capitalize(d.category)}</span>
        <span class="badge badge-${diffColors[d.difficulty] || 'neutral'}">${capitalize(d.difficulty)}</span>
      </div>
      <h3 style="font-size:var(--text-base);font-weight:700;margin-bottom:var(--sp-2);">${d.title}</h3>
      <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--sp-3);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${d.description || ''}</p>
      <div class="flex items-center justify-between text-xs text-muted">
        <span>${d.duration_minutes} min</span>
        <div class="flex gap-2 items-center">
          ${d.video_url ? '<span class="badge badge-neutral" style="font-size:9px;">VIDEO</span>' : ''}
          ${d.is_ai_generated ? '<span class="badge badge-primary" style="font-size:9px;">AI</span>' : ''}
          ${d.assignment_count > 0 ? `<span class="badge badge-warning" style="font-size:9px;">Assigned: ${d.assignment_count}</span>` : ''}
        </div>
      </div>
      <div style="margin-top:var(--sp-3);padding-top:var(--sp-3);border-top:1px solid var(--border-subtle, rgba(255,255,255,0.06));display:flex;justify-content:flex-end;">
        <button class="btn btn-secondary" style="font-size:var(--text-xs);padding:var(--sp-1) var(--sp-3);border-color:var(--primary);color:var(--primary);" onclick="event.stopPropagation();openAssignModal(${d.id})">
          <span class="material-symbols-outlined" style="font-size:16px;">assignment_ind</span> Assign
        </button>
      </div>
    </div>
  `).join('');
}

async function createDrill() {
  try {
    await API.post('/api/drills', {
      title: document.getElementById('drillTitle').value,
      description: document.getElementById('drillDesc').value,
      category: document.getElementById('drillCategory').value,
      difficulty: document.getElementById('drillDifficulty').value,
      duration_minutes: parseInt(document.getElementById('drillDuration').value),
      instructions: document.getElementById('drillInstructions').value,
      video_url: document.getElementById('drillVideoUrl').value || null,
    });
    closeModal('drillModal');
    Toast.success('Drill created!');
    loadDrills();
  } catch (e) { /* handled */ }
}

async function generateDrill() {
  const btn = document.getElementById('genDrillBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Generating...';
  try {
    await API.post('/api/drills/generate', {
      category: document.getElementById('genCategory').value,
      difficulty: document.getElementById('genDifficulty').value,
      focus: document.getElementById('genFocus').value,
    });
    closeModal('generateDrillModal');
    Toast.success('AI drill generated!');
    loadDrills();
  } catch (e) { /* handled */ }
  finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined">auto_awesome</span> Generate';
  }
}

function youtubeEmbedUrl(url) {
  if (!url) return null;
  let videoId = null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      videoId = u.searchParams.get('v');
      if (!videoId && u.pathname.startsWith('/embed/')) {
        videoId = u.pathname.split('/embed/')[1];
      }
    } else if (u.hostname === 'youtu.be') {
      videoId = u.pathname.slice(1);
    }
  } catch { return null; }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

async function viewDrill(id) {
  try {
    const res = await API.get(`/api/drills/${id}`);
    const d = res.data;
    const diffColors = { beginner: 'success', intermediate: 'warning', advanced: 'error' };
    document.getElementById('detailTitle').textContent = d.title;

    const embedUrl = youtubeEmbedUrl(d.video_url);
    const videoHtml = embedUrl
      ? `<div style="position:relative;padding-bottom:56.25%;height:0;margin-bottom:var(--sp-4);border-radius:var(--r-md);overflow:hidden;"><iframe src="${embedUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe></div>`
      : (d.video_url ? `<div style="margin-bottom:var(--sp-4);"><a href="${escHtml(d.video_url)}" target="_blank" rel="noopener" style="color:var(--primary);font-size:var(--text-sm);display:flex;align-items:center;gap:4px;"><span class="material-symbols-outlined" style="font-size:18px;">play_circle</span> Watch Video</a></div>` : '');

    document.getElementById('detailBody').innerHTML = `
      <div class="flex gap-2" style="margin-bottom:var(--sp-4);">
        <span class="badge badge-neutral">${capitalize(d.category)}</span>
        <span class="badge badge-${diffColors[d.difficulty] || 'neutral'}">${capitalize(d.difficulty)}</span>
        <span class="badge badge-neutral">${d.duration_minutes} min</span>
        ${d.is_ai_generated ? '<span class="badge badge-primary">AI Generated</span>' : ''}
      </div>
      ${videoHtml}
      ${d.description ? `<p style="margin-bottom:var(--sp-4);color:var(--text-secondary);">${escHtml(d.description)}</p>` : ''}
      ${d.instructions ? `<div style="margin-bottom:var(--sp-4);"><h4 style="font-weight:600;margin-bottom:var(--sp-2);">Instructions</h4><pre style="white-space:pre-wrap;font-size:var(--text-sm);color:var(--text-secondary);background:var(--bg-card);padding:var(--sp-3);border-radius:var(--r-md);">${escHtml(d.instructions)}</pre></div>` : ''}
      ${d.coaching_points?.length ? `<div style="margin-bottom:var(--sp-4);"><h4 style="font-weight:600;margin-bottom:var(--sp-2);">Coaching Points</h4><ul style="padding-left:var(--sp-5);color:var(--text-secondary);font-size:var(--text-sm);">${d.coaching_points.map(p => `<li style="margin-bottom:var(--sp-1);">${escHtml(p)}</li>`).join('')}</ul></div>` : ''}
      ${d.tags?.length ? `<div class="flex gap-2" style="margin-bottom:var(--sp-4);">${d.tags.map(t => `<span class="badge badge-neutral">${escHtml(t)}</span>`).join('')}</div>` : ''}
      <div id="assignmentStatus_${d.id}"></div>
    `;

    document.getElementById('detailFooter').innerHTML = `
      <button class="btn btn-secondary" onclick="deleteDrill(${d.id})"><span class="material-symbols-outlined" style="font-size:18px;">delete</span> Delete</button>
      <button class="btn btn-secondary" onclick="openAssignModal(${d.id})" style="border-color:var(--primary);color:var(--primary);"><span class="material-symbols-outlined" style="font-size:18px;">assignment_ind</span> Assign</button>
      <button class="btn btn-primary" onclick="closeModal('drillDetailModal')">Close</button>
    `;
    openModal('drillDetailModal');

    // Load assignment status
    loadAssignmentStatus(d.id);
  } catch(e) {}
}

async function loadAssignmentStatus(drillId) {
  const container = document.getElementById(`assignmentStatus_${drillId}`);
  if (!container) return;
  try {
    const res = await API.get(`/api/drills/${drillId}/assignments`);
    const assignments = res.data || [];
    if (!assignments.length) {
      container.innerHTML = '<p style="font-size:var(--text-sm);color:var(--text-muted);margin-top:var(--sp-2);">Not assigned to any players yet.</p>';
      return;
    }
    container.innerHTML = `
      <h4 style="font-weight:600;margin-bottom:var(--sp-2);display:flex;align-items:center;gap:var(--sp-2);">
        <span class="material-symbols-outlined" style="font-size:18px;color:var(--primary);">group</span>
        Assignments (${assignments.length})
      </h4>
      <div style="max-height:200px;overflow-y:auto;">
        ${assignments.map(a => {
          const statusMap = {
            'approved': { color: 'var(--success, #22c55e)', text: 'Approved', icon: 'check_circle' },
            'video_uploaded': { color: 'var(--info, #3b82f6)', text: 'Video Pending', icon: 'rate_review' },
            'rejected': { color: 'var(--error, #ef4444)', text: 'Rejected', icon: 'close' },
            'pending': { color: 'var(--warning, #f59e0b)', text: 'Pending', icon: 'schedule' },
          };
          const st = a.status || (a.is_completed ? 'approved' : 'pending');
          const s = statusMap[st] || statusMap.pending;
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-2) 0;border-bottom:1px solid var(--border-subtle, rgba(255,255,255,0.06));font-size:var(--text-sm);">
            <span style="font-weight:500;">${escHtml(a.player_name)}</span>
            <div style="display:flex;align-items:center;gap:var(--sp-2);">
              ${a.video_url ? '<span class="material-symbols-outlined" style="font-size:14px;color:var(--text-muted);" title="Has video">videocam</span>' : ''}
              <span style="color:${s.color};display:flex;align-items:center;gap:4px;font-size:var(--text-xs);">
                <span class="material-symbols-outlined" style="font-size:16px;">${s.icon}</span>
                ${s.text}
              </span>
            </div>
          </div>`;
        }).join('')}
      </div>
    `;
  } catch { container.innerHTML = ''; }
}

async function openAssignModal(drillId) {
  _assignDrillId = drillId;
  _allPlayersSelected = false;
  const listEl = document.getElementById('assignPlayerList');
  document.getElementById('assignNote').value = '';
  listEl.innerHTML = '<div style="text-align:center;padding:var(--sp-4);color:var(--text-muted);">Loading players...</div>';
  openModal('assignDrillModal');

  try {
    const res = await API.get('/api/drills/my-players');
    const players = res.data || [];
    if (!players.length) {
      listEl.innerHTML = '<div style="text-align:center;padding:var(--sp-4);color:var(--text-muted);">No players found in your teams.</div>';
      return;
    }

    // Group by team
    const teams = {};
    for (const p of players) {
      if (!teams[p.team_name]) teams[p.team_name] = [];
      teams[p.team_name].push(p);
    }

    let html = '';
    for (const [teamName, teamPlayers] of Object.entries(teams)) {
      html += `<div style="margin-bottom:var(--sp-3);">`;
      if (Object.keys(teams).length > 1) {
        html += `<div style="font-weight:600;font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--sp-2);padding-bottom:var(--sp-1);border-bottom:1px solid rgba(255,255,255,0.06);">${escHtml(teamName)}</div>`;
      }
      for (const p of teamPlayers) {
        html += `<label style="display:flex;align-items:center;gap:var(--sp-2);padding:var(--sp-2);cursor:pointer;border-radius:var(--r-sm);">
          <input type="checkbox" class="assign-player-cb" value="${p.id}" style="accent-color:var(--primary);">
          <span style="font-weight:500;font-size:var(--text-sm);">${escHtml(p.name)}</span>
          ${p.jersey_number != null ? `<span style="color:var(--text-muted);font-size:var(--text-xs);">#${p.jersey_number}</span>` : ''}
          ${p.position ? `<span style="color:var(--text-muted);font-size:var(--text-xs);">${p.position}</span>` : ''}
        </label>`;
      }
      html += `</div>`;
    }
    listEl.innerHTML = html;
  } catch {
    listEl.innerHTML = '<div style="text-align:center;padding:var(--sp-4);color:var(--text-muted);">Failed to load players.</div>';
  }
}

function toggleAllPlayers() {
  _allPlayersSelected = !_allPlayersSelected;
  document.querySelectorAll('.assign-player-cb').forEach(cb => cb.checked = _allPlayersSelected);
}

async function submitAssignment() {
  const checked = [...document.querySelectorAll('.assign-player-cb:checked')].map(cb => parseInt(cb.value));
  if (!checked.length) {
    Toast.error('Select at least one player');
    return;
  }
  try {
    const note = document.getElementById('assignNote').value || null;
    const res = await API.post(`/api/drills/${_assignDrillId}/assign`, {
      player_ids: checked,
      note: note,
    });
    closeModal('assignDrillModal');
    Toast.success(`Drill assigned to ${res.data.assigned} player${res.data.assigned !== 1 ? 's' : ''}`);
    loadAssignmentStatus(_assignDrillId);
    loadDrills();
  } catch (e) {
    Toast.error('Failed to assign drill');
  }
}

function escHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

async function deleteDrill(id) {
  if (!confirm('Delete this drill?')) return;
  try {
    await API.del(`/api/drills/${id}`);
    closeModal('drillDetailModal');
    Toast.success('Drill deleted');
    loadDrills();
  } catch(e) {}
}

function debounce(fn, ms) {
  let timer;
  return function(...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), ms); };
}

/* ═══ Player Tracking ═══ */

async function openTrackingModal() {
  const body = document.getElementById('trackingBody');
  body.innerHTML = '<div style="text-align:center;padding:var(--sp-6);color:var(--text-muted);">Loading...</div>';
  openModal('trackingModal');

  try {
    const res = await API.get('/api/drills/player-tracking');
    const players = res.data || [];
    if (!players.length) {
      body.innerHTML = '<div style="text-align:center;padding:var(--sp-6);color:var(--text-muted);">No players with drill assignments yet.<br>Assign drills to players to start tracking.</div>';
      return;
    }

    // Group by team
    const teams = {};
    for (const p of players) {
      if (!teams[p.team_name]) teams[p.team_name] = [];
      teams[p.team_name].push(p);
    }

    let html = '';
    for (const [teamName, teamPlayers] of Object.entries(teams)) {
      // Team summary
      const teamAssigned = teamPlayers.reduce((s, p) => s + p.assigned, 0);
      const teamCompleted = teamPlayers.reduce((s, p) => s + p.completed, 0);
      const teamPct = teamAssigned > 0 ? Math.round(teamCompleted / teamAssigned * 100) : 0;

      html += `<div style="margin-bottom:var(--sp-5);">`;
      html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-3);padding-bottom:var(--sp-2);border-bottom:1px solid var(--border-subtle, rgba(255,255,255,0.06));">
        <span style="font-weight:600;font-size:var(--text-base);">${escHtml(teamName)}</span>
        <span style="font-size:var(--text-sm);color:var(--text-secondary);">${teamCompleted}/${teamAssigned} completed (${teamPct}%)</span>
      </div>`;

      for (const p of teamPlayers) {
        const pct = p.completion_pct;
        const barColor = pct >= 80 ? 'var(--success, #22c55e)' : pct >= 50 ? 'var(--warning, #fbbf24)' : pct > 0 ? 'var(--error, #ef4444)' : 'var(--text-muted, #666)';
        const statusIcon = pct >= 80 ? 'check_circle' : pct >= 50 ? 'trending_up' : p.assigned > 0 ? 'warning' : 'remove';
        const statusColor = pct >= 80 ? 'var(--success, #22c55e)' : pct >= 50 ? 'var(--warning, #fbbf24)' : p.assigned > 0 ? 'var(--error, #ef4444)' : 'var(--text-muted, #666)';
        const lastActivity = p.last_completed ? timeAgoTracking(p.last_completed) : 'Never';

        html += `<div style="display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-3) 0;border-bottom:1px solid rgba(255,255,255,0.03);">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--bg-card, rgba(255,255,255,0.05));display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="font-weight:700;font-size:var(--text-sm);color:var(--text-secondary);">${p.jersey_number != null ? '#' + p.jersey_number : '?'}</span>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:var(--text-sm);margin-bottom:2px;">${escHtml(p.player_name)}</div>
            <div style="display:flex;align-items:center;gap:var(--sp-2);">
              <div style="flex:1;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;transition:width 0.3s;"></div>
              </div>
              <span style="font-size:var(--text-xs);color:var(--text-muted);white-space:nowrap;min-width:60px;text-align:right;">${p.completed}/${p.assigned}</span>
            </div>
          </div>
          <div style="text-align:right;min-width:80px;">
            <div style="display:flex;align-items:center;gap:4px;justify-content:flex-end;">
              <span class="material-symbols-outlined" style="font-size:18px;color:${statusColor};">${statusIcon}</span>
              <span style="font-weight:700;font-size:var(--text-sm);color:${statusColor};">${pct}%</span>
            </div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${lastActivity}</div>
          </div>
        </div>`;
      }
      html += `</div>`;
    }

    body.innerHTML = html;
  } catch {
    body.innerHTML = '<div style="text-align:center;padding:var(--sp-6);color:var(--text-muted);">Failed to load tracking data.</div>';
  }
}

function timeAgoTracking(dateStr) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 0) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

/* ═══ Video Reviews ═══ */

async function openReviewsModal() {
  const body = document.getElementById('reviewsBody');
  body.innerHTML = '<div style="text-align:center;padding:var(--sp-6);color:var(--text-muted);">Loading...</div>';
  openModal('reviewsModal');

  try {
    const res = await API.get('/api/drills/pending-reviews');
    const reviews = res.data || [];
    if (!reviews.length) {
      body.innerHTML = '<div style="text-align:center;padding:var(--sp-6);color:var(--text-muted);"><span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:var(--sp-2);">check_circle</span>No pending video reviews</div>';
      return;
    }

    body.innerHTML = reviews.map(r => `
      <div class="review-item" id="review-${r.assignment_id}" style="padding:var(--sp-4);margin-bottom:var(--sp-3);background:var(--bg-card, rgba(255,255,255,0.03));border:1px solid rgba(255,255,255,0.06);border-radius:var(--r-lg);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-3);">
          <div>
            <div style="font-weight:600;font-size:var(--text-base);">${escHtml(r.drill_title)}</div>
            <div style="font-size:var(--text-sm);color:var(--text-secondary);display:flex;align-items:center;gap:var(--sp-2);margin-top:4px;">
              <span>${escHtml(r.player_name)}</span>
              ${r.jersey_number != null ? `<span style="color:var(--text-muted);">#${r.jersey_number}</span>` : ''}
              <span style="color:var(--text-muted);">&bull; ${timeAgoTracking(r.uploaded_at)}</span>
            </div>
          </div>
        </div>
        <video controls style="width:100%;border-radius:var(--r-md);max-height:300px;margin-bottom:var(--sp-3);background:#000;" src="${escHtml(r.video_url)}"></video>
        <div class="input-group" style="margin-bottom:var(--sp-3);">
          <label style="font-size:var(--text-sm);color:var(--text-secondary);">Feedback (optional)</label>
          <textarea class="textarea" id="feedback-${r.assignment_id}" placeholder="Write feedback for the player..." rows="2" style="background:var(--bg-input, rgba(255,255,255,0.05));border:1px solid rgba(255,255,255,0.08);border-radius:var(--r-md);padding:var(--sp-2) var(--sp-3);color:var(--text-primary);font-size:var(--text-sm);width:100%;resize:vertical;"></textarea>
        </div>
        <div style="display:flex;gap:var(--sp-3);justify-content:flex-end;">
          <button class="btn btn-secondary" style="border-color:var(--error, #ef4444);color:var(--error, #ef4444);" onclick="reviewDrill(${r.assignment_id}, 'reject')">
            <span class="material-symbols-outlined" style="font-size:18px;">close</span> Reject
          </button>
          <button class="btn btn-primary" onclick="reviewDrill(${r.assignment_id}, 'approve')">
            <span class="material-symbols-outlined" style="font-size:18px;">check</span> Approve
          </button>
        </div>
      </div>
    `).join('');
  } catch {
    body.innerHTML = '<div style="text-align:center;padding:var(--sp-6);color:var(--text-muted);">Failed to load reviews.</div>';
  }
}

async function reviewDrill(assignmentId, action) {
  const feedbackEl = document.getElementById(`feedback-${assignmentId}`);
  const feedback = feedbackEl ? feedbackEl.value.trim() || null : null;
  const item = document.getElementById(`review-${assignmentId}`);

  try {
    await API.post(`/api/drills/${assignmentId}/review`, { action, feedback });
    Toast.success(action === 'approve' ? 'Video approved!' : 'Video rejected');

    // Remove item with animation
    if (item) {
      item.style.opacity = '0';
      item.style.transform = 'translateX(20px)';
      item.style.transition = 'all 250ms ease';
      setTimeout(() => {
        item.remove();
        const remaining = document.querySelectorAll('.review-item');
        if (!remaining.length) {
          document.getElementById('reviewsBody').innerHTML = '<div style="text-align:center;padding:var(--sp-6);color:var(--text-muted);"><span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:var(--sp-2);">check_circle</span>All reviews complete!</div>';
        }
        updateReviewBadge();
      }, 250);
    }

    loadDrills();
  } catch {
    Toast.error('Review failed');
  }
}

async function updateReviewBadge() {
  try {
    const res = await API.get('/api/drills/pending-reviews', { silent: true });
    if (!res) return;
    const count = res.data?.length || 0;
    const badge = document.getElementById('reviewBadge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  } catch {}
}
