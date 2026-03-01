/**
 * HOOPS AI — Admin Video Room (Read-Only Oversight)
 * Team picker, video grid, analysis view with Video.js + read-only telestrator.
 */

/* ═══ State ═══════════════════════════════════════════════ */
let _videos = [];
let _currentVideo = null;
let _clips = [];
let _annotations = [];
let _vjsPlayer = null;
let _currentFilter = '';
let _selectedTeam = '';
let _canvas = null;
let _ctx = null;

function ACTION_TYPES_MAP() {
  return {
    pick_and_roll: t('admin.scouting.action.pick_and_roll'), isolation: t('admin.scouting.action.isolation'), fast_break: t('admin.scouting.action.fast_break'),
    defense: t('admin.scouting.action.defense'), transition: t('admin.scouting.action.transition'), three_pointer: t('admin.scouting.action.three_pointer'),
    post_up: t('admin.scouting.action.post_up'), screen: t('admin.scouting.action.screen'), turnover: t('admin.scouting.action.turnover'),
    rebound: t('admin.scouting.action.rebound'), free_throw: t('admin.scouting.action.free_throw'), out_of_bounds: t('admin.scouting.action.out_of_bounds'),
    other: t('admin.scouting.action.other'),
  };
}

/* ═══ Init ════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  await loadTeams();
  loadVideos();
  setupFilters();
  setupSearch();
  setupTeamPicker();
});

async function loadTeams() {
  try {
    const res = await AdminAPI.get('/api/scouting/admin/teams');
    const sel = document.getElementById('teamPicker');
    (res.data || []).forEach(tm => {
      const opt = document.createElement('option');
      opt.value = tm.id;
      opt.textContent = tm.name;
      sel.appendChild(opt);
    });
  } catch (e) { console.error('Load teams error:', e); }
}

async function loadVideos() {
  try {
    let url = '/api/scouting/admin/videos?';
    if (_selectedTeam) url += `team_id=${_selectedTeam}&`;
    if (_currentFilter) url += `video_type=${_currentFilter}&`;
    const search = document.getElementById('videoSearch')?.value;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    const res = await AdminAPI.get(url);
    _videos = res.data || [];
    renderVideoGrid();
  } catch (e) {
    console.error('Load videos error:', e);
    document.getElementById('videoGrid').innerHTML =
      `<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:var(--sp-8);">${t('admin.scouting.empty.load_error')}</p>`;
  }
}

/* ═══ Video Grid ═════════════════════════════════════════ */
function renderVideoGrid() {
  const grid = document.getElementById('videoGrid');
  if (!_videos.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:var(--sp-8);color:var(--text-muted);">
      <span class="material-symbols-outlined" style="font-size:3rem;display:block;margin-bottom:var(--sp-2);">videocam_off</span>
      ${t('admin.scouting.empty.no_videos')}</div>`;
    return;
  }
  grid.innerHTML = _videos.map(v => {
    const thumb = v.thumbnail_url
      ? `<img class="video-card-thumb" src="${v.thumbnail_url}" alt="${esc(v.title)}" loading="lazy">`
      : `<div class="video-card-thumb-placeholder"><span class="material-symbols-outlined">videocam</span></div>`;
    const shared = v.shared_with_team ? `<span class="video-card-badge video-card-shared">${t('admin.scouting.shared')}</span>` : '';
    const parentShared = v.shared_with_parents ? `<span class="video-card-badge video-card-parent-shared">${t('admin.scouting.parents')}</span>` : '';
    const type = v.video_type.replace('_', ' ');
    return `<div class="video-card" onclick="openVideo(${v.id})">
      ${thumb}
      <div class="video-card-body">
        <div class="video-card-title">${esc(v.title)}</div>
        <div class="video-card-meta">
          <span class="video-card-badge">${type}</span>
          ${v.opponent ? `<span>vs ${esc(v.opponent)}</span>` : ''}
          <span>${v.clip_count} ${t('admin.scouting.clips')}</span>
          ${shared}${parentShared}
        </div>
        <div class="video-card-coach">
          <span class="material-symbols-outlined">person</span> ${esc(v.coach_name || '')}
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ═══ Filters & Search ═══════════════════════════════════ */
function setupFilters() {
  document.querySelectorAll('#typeFilters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#typeFilters .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _currentFilter = btn.dataset.type;
      loadVideos();
    });
  });
}

function setupSearch() {
  let timer;
  document.getElementById('videoSearch')?.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => loadVideos(), 400);
  });
}

function setupTeamPicker() {
  document.getElementById('teamPicker')?.addEventListener('change', (e) => {
    _selectedTeam = e.target.value;
    loadVideos();
  });
}

/* ═══ Analysis View ══════════════════════════════════════ */
async function openVideo(videoId) {
  try {
    const res = await AdminAPI.get(`/api/scouting/admin/videos/${videoId}`);
    _currentVideo = res.data;
    _clips = res.data.clips || [];
    _annotations = res.data.annotations || [];

    document.getElementById('gridView').style.display = 'none';
    document.getElementById('analysisView').classList.add('active');
    document.getElementById('analysisTitle').textContent = _currentVideo.title;
    document.getElementById('coachBadge').textContent = _currentVideo.coach_name || '';

    initVideoPlayer();
    renderClipsSidebar();
    renderTimelineMarkers();
  } catch (e) {
    AdminToast.error(t('admin.scouting.load_video_error'));
  }
}

function backToGrid() {
  document.getElementById('analysisView').classList.remove('active');
  document.getElementById('gridView').style.display = '';
  if (_vjsPlayer) {
    _vjsPlayer.pause();
    _vjsPlayer.dispose();
    _vjsPlayer = null;
  }
  // Recreate video element
  const container = document.getElementById('videoContainer');
  const oldVideo = container.querySelector('video');
  if (oldVideo) oldVideo.remove();
  const newVideo = document.createElement('video');
  newVideo.id = 'scoutingPlayer';
  newVideo.className = 'video-js vjs-default-skin';
  newVideo.setAttribute('playsinline', '');
  container.insertBefore(newVideo, container.firstChild);
  loadVideos();
}

/* ═══ Video.js Player ════════════════════════════════════ */
function initVideoPlayer() {
  if (_vjsPlayer) {
    _vjsPlayer.dispose();
    _vjsPlayer = null;
    // Recreate elements
    const container = document.getElementById('videoContainer');
    const oldVideo = container.querySelector('video');
    if (oldVideo) oldVideo.remove();
    const newVideo = document.createElement('video');
    newVideo.id = 'scoutingPlayer';
    newVideo.className = 'video-js vjs-default-skin';
    newVideo.setAttribute('playsinline', '');
    container.insertBefore(newVideo, container.firstChild);
  }

  const sources = [];
  if (_currentVideo.cloudinary_hls_url) {
    sources.push({ src: _currentVideo.cloudinary_hls_url, type: 'application/x-mpegURL' });
  }
  if (_currentVideo.cloudinary_url) {
    sources.push({ src: _currentVideo.cloudinary_url, type: 'video/mp4' });
  }

  _vjsPlayer = videojs('scoutingPlayer', {
    controls: true,
    fluid: true,
    playbackRates: [0.5, 1, 1.5, 2],
    sources: sources,
  });

  // Init canvas
  _canvas = document.getElementById('telestratorCanvas');
  _ctx = _canvas ? _canvas.getContext('2d') : null;

  _vjsPlayer.on('loadedmetadata', () => {
    if (_canvas) {
      _canvas.width = _canvas.parentElement.clientWidth;
      _canvas.height = _canvas.parentElement.clientHeight;
    }
    const dur = _vjsPlayer.duration();
    document.getElementById('timelineDuration').textContent = fmtTime(dur);
  });

  _vjsPlayer.on('timeupdate', () => {
    const cur = _vjsPlayer.currentTime();
    const dur = _vjsPlayer.duration() || 1;
    document.getElementById('timelineCurrent').textContent = fmtTime(cur);
    document.getElementById('timelineProgress').style.width = (cur / dur * 100) + '%';
    renderAnnotations(cur);
  });

  // Resize observer
  if (_canvas) {
    new ResizeObserver(() => {
      _canvas.width = _canvas.parentElement.clientWidth;
      _canvas.height = _canvas.parentElement.clientHeight;
    }).observe(_canvas.parentElement);
  }
}

function seekTimeline(event) {
  if (!_vjsPlayer) return;
  const bar = document.getElementById('timelineBar');
  const rect = bar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  _vjsPlayer.currentTime(pct * (_vjsPlayer.duration() || 0));
}

/* ═══ Read-Only Annotation Renderer ══════════════════════ */
function renderAnnotations(videoTime) {
  if (!_ctx || !_canvas) return;
  _ctx.clearRect(0, 0, _canvas.width, _canvas.height);

  for (const ann of _annotations) {
    const t0 = ann.timestamp;
    const t1 = t0 + ann.duration;
    if (videoTime < t0 || videoTime > t1) continue;

    let alpha = 1;
    if (videoTime - t0 < 0.3) alpha = (videoTime - t0) / 0.3;
    if (t1 - videoTime < 0.5) alpha = Math.min(alpha, (t1 - videoTime) / 0.5);
    _ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    const sd = ann.stroke_data;
    if (!sd) continue;
    const w = _canvas.width;
    const h = _canvas.height;

    _ctx.strokeStyle = ann.color;
    _ctx.fillStyle = ann.color;
    _ctx.lineWidth = ann.stroke_width;
    _ctx.lineCap = 'round';
    _ctx.lineJoin = 'round';

    if (ann.annotation_type === 'freehand' && sd.points) {
      _ctx.beginPath();
      sd.points.forEach((p, i) => {
        const px = p.x / 100 * w, py = p.y / 100 * h;
        if (i === 0) _ctx.moveTo(px, py); else _ctx.lineTo(px, py);
      });
      _ctx.stroke();
    } else if (ann.annotation_type === 'arrow') {
      const x1 = sd.x1/100*w, y1 = sd.y1/100*h, x2 = sd.x2/100*w, y2 = sd.y2/100*h;
      _ctx.beginPath();
      _ctx.moveTo(x1, y1); _ctx.lineTo(x2, y2); _ctx.stroke();
      const a = Math.atan2(y2-y1, x2-x1);
      _ctx.beginPath();
      _ctx.moveTo(x2, y2);
      _ctx.lineTo(x2 - 12*Math.cos(a - Math.PI/6), y2 - 12*Math.sin(a - Math.PI/6));
      _ctx.moveTo(x2, y2);
      _ctx.lineTo(x2 - 12*Math.cos(a + Math.PI/6), y2 - 12*Math.sin(a + Math.PI/6));
      _ctx.stroke();
    } else if (ann.annotation_type === 'circle') {
      const cx = sd.cx/100*w, cy = sd.cy/100*h, r = sd.r/100*w;
      _ctx.beginPath();
      _ctx.arc(cx, cy, r, 0, Math.PI*2);
      _ctx.stroke();
    } else if (ann.annotation_type === 'text') {
      const tx = sd.x/100*w, ty = sd.y/100*h;
      const fs = (sd.fontSize || 4) / 100 * w;
      _ctx.font = `bold ${fs}px Space Grotesk, sans-serif`;
      _ctx.fillText(ann.text_content || '', tx, ty);
    } else if (ann.annotation_type === 'spotlight' && sd.keyframes && sd.keyframes.length >= 2) {
      // Spotlight: radial gradient dim with moving bright spot
      const progress = (videoTime - t0) / (ann.duration || 3);
      const kfs = sd.keyframes;
      // Find segment
      let seg = 0;
      for (let i = 0; i < kfs.length - 1; i++) {
        if (progress >= kfs[i].t && progress <= kfs[i+1].t) { seg = i; break; }
      }
      const k0 = kfs[seg], k1 = kfs[Math.min(seg+1, kfs.length-1)];
      const segP = k1.t > k0.t ? (progress - k0.t) / (k1.t - k0.t) : 0;
      const ease = segP < 0.5 ? 2*segP*segP : 1 - Math.pow(-2*segP+2,2)/2;
      const sx = (k0.x + (k1.x - k0.x) * ease) / 100 * w;
      const sy = (k0.y + (k1.y - k0.y) * ease) / 100 * h;
      const spotR = Math.max(w, h) * 0.15;

      _ctx.save();
      const grad = _ctx.createRadialGradient(sx, sy, spotR * 0.3, sx, sy, spotR);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.6)');
      _ctx.fillStyle = grad;
      _ctx.fillRect(0, 0, w, h);
      _ctx.restore();
    }

    _ctx.globalAlpha = 1;
  }
}

/* ═══ Timeline Markers ═══════════════════════════════════ */
function renderTimelineMarkers() {
  const bar = document.getElementById('timelineBar');
  // Remove old markers
  bar.querySelectorAll('.timeline-marker').forEach(m => m.remove());

  const dur = _vjsPlayer?.duration() || _currentVideo?.duration_seconds || 1;
  _clips.forEach(c => {
    const pct = (c.start_time / dur) * 100;
    const widthPct = Math.max(0.5, ((c.end_time - c.start_time) / dur) * 100);
    const cls = c.rating === 'positive' ? 'positive' : c.rating === 'negative' ? 'negative' : 'neutral';
    const marker = document.createElement('div');
    marker.className = `timeline-marker ${cls}`;
    marker.style.left = pct + '%';
    marker.style.width = widthPct + '%';
    marker.title = `${ACTION_TYPES_MAP()[c.action_type] || c.action_type} (${fmtTime(c.start_time)})`;
    marker.onclick = (e) => { e.stopPropagation(); jumpToClip(c.id); };
    bar.appendChild(marker);
  });
}

/* ═══ Clips Sidebar (Read-Only) ══════════════════════════ */
function renderClipsSidebar() {
  const el = document.getElementById('clipsList');
  document.getElementById('clipCount').textContent = t('admin.scouting.clip_count', { count: _clips.length });

  if (!_clips.length) {
    el.innerHTML = `<p style="color:var(--text-muted);font-size:0.82rem;text-align:center;padding:var(--sp-4);">${t('admin.scouting.empty.no_clips')}</p>`;
    return;
  }

  el.innerHTML = _clips.map(c => {
    const action = ACTION_TYPES_MAP()[c.action_type] || c.action_type;
    const rating = c.rating === 'positive' ? '👍' : c.rating === 'negative' ? '👎' : '';
    const players = (c.player_tags || []).map(tag => `<span class="clip-player-chip">${esc(tag.name)}</span>`).join('');
    return `<div class="clip-card" data-clip-id="${c.id}" onclick="jumpToClip(${c.id})">
      <div class="clip-card-header">
        <span class="clip-card-action">${action} ${rating}</span>
        <span class="clip-card-time">${fmtTime(c.start_time)} – ${fmtTime(c.end_time)}</span>
      </div>
      ${c.notes ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">${esc(c.notes)}</div>` : ''}
      ${players ? `<div class="clip-card-players">${players}</div>` : ''}
      ${c.watch_count ? `<div class="clip-watch-count"><span class="material-symbols-outlined" style="font-size:0.75rem;vertical-align:middle;">visibility</span> ${c.watch_count} ${t('admin.scouting.views')}</div>` : ''}
    </div>`;
  }).join('');
}

function jumpToClip(clipId) {
  const clip = _clips.find(c => c.id === clipId);
  if (!clip || !_vjsPlayer) return;
  _vjsPlayer.currentTime(clip.start_time);
  _vjsPlayer.play();
  // Highlight card
  document.querySelectorAll('.clip-card').forEach(c => c.classList.remove('active'));
  document.querySelector(`.clip-card[data-clip-id="${clipId}"]`)?.classList.add('active');
}

/* ═══ Utilities ══════════════════════════════════════════ */
function fmtTime(s) {
  if (!s && s !== 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/* esc → shared-utils.js */
