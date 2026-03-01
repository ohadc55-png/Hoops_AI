/**
 * HOOPS AI — Video Room / Scouting (Coach View)
 * Upload, playback, clipping, tagging, telestrator, timeline.
 */

/* ═══ State ═══════════════════════════════════════════════ */
let _videos = [];
let _currentVideo = null;
let _clips = [];
let _annotations = [];
let _roster = [];
let _vjsPlayer = null;
let _cloudinaryConfig = null;
let _pendingFile = null;
let _currentFilter = '';
let _clipRating = null;

/* ═══ Phase 1 State ═══════════════════════════════════════ */
let _clipInPoint = null;   // float seconds — set with I key
let _clipOutPoint = null;  // float seconds — set with O key
let _clipPreviewActive = false;
const PLAYBACK_RATES = [0.25, 0.5, 1, 1.5, 2];
const FRAME_DURATION = 1 / 30; // 30fps default

/* ═══ ACTION TYPES ════════════════════════════════════════ */
const ACTION_TYPES = [
  { value: 'pick_and_roll', get label() { return t('scouting.action.pick_and_roll'); } },
  { value: 'isolation', get label() { return t('scouting.action.isolation'); } },
  { value: 'fast_break', get label() { return t('scouting.action.fast_break'); } },
  { value: 'defense', get label() { return t('scouting.action.defense'); } },
  { value: 'transition', get label() { return t('scouting.action.transition'); } },
  { value: 'three_pointer', get label() { return t('scouting.action.three_pointer'); } },
  { value: 'post_up', get label() { return t('scouting.action.post_up'); } },
  { value: 'screen', get label() { return t('scouting.action.screen'); } },
  { value: 'turnover', get label() { return t('scouting.action.turnover'); } },
  { value: 'rebound', get label() { return t('scouting.action.rebound'); } },
  { value: 'free_throw', get label() { return t('scouting.action.free_throw'); } },
  { value: 'out_of_bounds', get label() { return t('scouting.action.out_of_bounds'); } },
  { value: 'other', get label() { return t('scouting.action.other'); } },
];

/* ═══ Init ════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  await loadCloudinaryConfig();
  await loadRoster();
  await loadTeams();
  loadVideos();
  setupUploadZone();
  setupFilters();
  setupSearch();
  populateClipActionSelect();
});

async function loadCloudinaryConfig() {
  try {
    const res = await API.get('/api/scouting/upload-config', { silent: true });
    _cloudinaryConfig = res.data;
  } catch (e) { /* cloudinary not configured */ }
}

async function loadRoster() {
  try {
    const res = await API.get('/api/scouting/players', { silent: true });
    _roster = res.data || [];
  } catch (e) { /* roster load failed silently */ }
}

async function loadTeams() {
  try {
    const res = await API.get('/api/my-teams', { silent: true });
    const teams = res.data || [];
    const sel = document.getElementById('uploadTeam');
    teams.forEach(tm => {
      const o = document.createElement('option');
      o.value = tm.id;
      o.textContent = tm.name;
      sel.appendChild(o);
    });
  } catch (e) { /* teams load failed silently */ }
}

function populateClipActionSelect() {
  const sel = document.getElementById('clipAction');
  sel.innerHTML = ACTION_TYPES.map(a => `<option value="${a.value}">${a.label}</option>`).join('');
}

/* ═══ Video Grid ══════════════════════════════════════════ */
async function loadVideos() {
  try {
    let url = '/api/scouting/videos';
    const params = [];
    if (_currentFilter) params.push(`video_type=${_currentFilter}`);
    const search = document.getElementById('videoSearch')?.value;
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (params.length) url += '?' + params.join('&');

    const res = await API.get(url);
    _videos = res.data || [];
    renderVideoGrid();
    loadQuota();
  } catch (e) {
    console.error('Load videos error:', e);
    document.getElementById('videoGrid').innerHTML = `<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;">${t('scouting.grid.load_failed')}</p>`;
  }
}

function _expiryBadge(v) {
  if (v.keep_forever) return `<span class="video-card-badge video-card-permanent">${t('scouting.badge.permanent')}</span>`;
  if (!v.expires_at) return '';
  const exp = new Date(v.expires_at.endsWith('Z') ? v.expires_at : v.expires_at + 'Z');
  const now = new Date();
  const diffH = Math.max(0, (exp - now) / 3600000);
  if (diffH <= 0) return `<span class="video-card-badge video-card-expiry-urgent">${t('scouting.badge.expired')}</span>`;
  if (diffH <= 48) return `<span class="video-card-badge video-card-expiry-urgent">${t('scouting.badge.hours_left', { count: Math.ceil(diffH) })}</span>`;
  const days = Math.ceil(diffH / 24);
  return `<span class="video-card-badge video-card-expiry">${t('scouting.badge.days_left', { count: days })}</span>`;
}

function renderVideoGrid() {
  const grid = document.getElementById('videoGrid');
  if (!_videos.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:var(--sp-8);color:var(--text-muted);">
      <span class="material-symbols-outlined" style="font-size:3rem;display:block;margin-bottom:var(--sp-2);">videocam_off</span>
      ${t('scouting.grid.empty')}</div>`;
    return;
  }
  grid.innerHTML = _videos.map(v => {
    const thumb = v.thumbnail_url
      ? `<img class="video-card-thumb" src="${v.thumbnail_url}" alt="${v.title}" loading="lazy">`
      : `<div class="video-card-thumb-placeholder"><span class="material-symbols-outlined">videocam</span></div>`;
    const shared = v.shared_with_team ? `<span class="video-card-badge video-card-shared">${t('scouting.badge.shared')}</span>` : '';
    const parentShared = v.shared_with_parents ? `<span class="video-card-badge video-card-parent-shared">${t('scouting.badge.parents')}</span>` : '';
    const expiryBadge = _expiryBadge(v);
    const type = v.video_type.replace('_', ' ');
    // Format duration
    let durStr = '';
    if (v.duration_seconds) {
      const m = Math.floor(v.duration_seconds / 60);
      const s = Math.floor(v.duration_seconds % 60);
      durStr = `${m}:${s.toString().padStart(2, '0')}`;
    }
    // Format date
    let dateStr = '';
    if (v.created_at) {
      const d = new Date(v.created_at.endsWith('Z') ? v.created_at : v.created_at + 'Z');
      dateStr = d.toLocaleDateString('he-IL');
    }
    return `<div class="video-card" onclick="openVideo(${v.id})">
      <div class="video-card-thumb-wrap">
        ${thumb}
        ${durStr ? `<span class="video-card-duration">${durStr}</span>` : ''}
      </div>
      <div class="video-card-body">
        <div class="video-card-title">${esc(v.title)}</div>
        <div class="video-card-info">
          ${dateStr ? `<span><span class="material-symbols-outlined">calendar_today</span>${dateStr}</span>` : ''}
          ${v.opponent ? `<span><span class="material-symbols-outlined">groups</span>vs ${esc(v.opponent)}</span>` : ''}
          <span><span class="material-symbols-outlined">movie</span>${v.clip_count} ${t('scouting.grid.clips_label')}</span>
        </div>
        <div class="video-card-meta">
          <span class="video-card-badge">${type}</span>
          ${shared}${parentShared}${expiryBadge}
        </div>
      </div>
    </div>`;
  }).join('');
}

async function loadQuota() {
  try {
    // Get first team for quota display
    const teamSel = document.getElementById('uploadTeam');
    const teamId = teamSel?.options[1]?.value;
    if (!teamId) return;
    const res = await API.get(`/api/scouting/quota?team_id=${teamId}`, { silent: true });
    const d = res.data;
    const usedGB = (d.storage_used_bytes / (1024*1024*1024)).toFixed(1);
    const limitGB = (d.storage_limit_bytes / (1024*1024*1024)).toFixed(0);
    const pct = Math.min(100, (d.storage_used_bytes / d.storage_limit_bytes) * 100);
    document.getElementById('quotaBar').innerHTML = `${t('scouting.quota.storage', { used: usedGB, limit: limitGB })} <div class="quota-fill"><div class="quota-fill-inner" style="width:${pct}%"></div></div>`;
  } catch (e) {}
}

/* ═══ Filters & Search ════════════════════════════════════ */
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
    timer = setTimeout(loadVideos, 400);
  });
}

/* ═══ Upload ══════════════════════════════════════════════ */
const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB per chunk
let _uploadAborted = false;

function setupUploadZone() {
  const zone = document.getElementById('uploadZone');
  const input = document.getElementById('videoFileInput');

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => { if (input.files[0]) handleFileSelect(input.files[0]); });
}

function handleFileSelect(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!['.mp4', '.mov', '.webm'].includes(ext)) {
    Toast.error(t('scouting.upload.invalid_type'));
    return;
  }
  if (file.size > 100 * 1024 * 1024) {
    Toast.error(t('scouting.upload.too_large'));
    return;
  }
  _pendingFile = file;
  document.getElementById('uploadTitle').value = file.name.replace(/\.[^/.]+$/, '');
  document.getElementById('uploadSubmitBtn').disabled = false;
  document.getElementById('uploadZone').innerHTML = `
    <span class="material-symbols-outlined">check_circle</span>
    <p>${esc(file.name)}</p>
    <p style="font-size:0.75rem;color:var(--text-muted);">${(file.size / (1024*1024)).toFixed(1)} MB</p>`;
}

function cancelUploadModal() {
  _uploadAborted = true;
  closeModal('uploadModal');
}

function openUploadModal() {
  _pendingFile = null;
  _uploadAborted = false;
  document.getElementById('uploadSubmitBtn').disabled = true;
  document.getElementById('uploadProgress').classList.remove('active');
  document.getElementById('uploadZone').innerHTML = `
    <span class="material-symbols-outlined">cloud_upload</span>
    <p>${t('scouting.upload.drag_or_click')}</p>
    <p style="font-size:0.75rem;color:var(--text-muted);">${t('scouting.upload.formats')}</p>`;
  document.getElementById('uploadTitle').value = '';
  document.getElementById('uploadOpponent').value = '';
  document.getElementById('uploadDate').value = '';
  openModal('uploadModal');
}

async function submitUpload() {
  if (!_pendingFile || !_cloudinaryConfig) return;
  if (!_cloudinaryConfig.cloud_name) {
    Toast.error(t('scouting.upload.cloudinary_error'));
    return;
  }

  const btn = document.getElementById('uploadSubmitBtn');
  btn.disabled = true;
  btn.textContent = t('scouting.upload.uploading');
  _uploadAborted = false;

  const progressDiv = document.getElementById('uploadProgress');
  const progressFill = document.getElementById('uploadProgressFill');
  const progressText = document.getElementById('uploadProgressText');
  progressDiv.classList.add('active');
  progressFill.style.width = '0%';
  progressText.textContent = t('scouting.upload.uploading_pct', { pct: 0 });

  const updateProgress = (pct, progressMsg) => {
    progressFill.style.width = pct + '%';
    progressText.textContent = progressMsg || t('scouting.upload.uploading_pct', { pct });
  };

  try {
    let cRes;
    if (_pendingFile.size > CHUNK_SIZE) {
      // Chunked upload for large files (> 6MB)
      cRes = await uploadChunked(_pendingFile, updateProgress);
    } else {
      // Single upload for small files
      cRes = await uploadSingle(_pendingFile, updateProgress);
    }

    if (_uploadAborted) return;

    // Register with our API
    updateProgress(100, t('scouting.upload.saving'));
    const teamVal = document.getElementById('uploadTeam').value;
    await API.post('/api/scouting/videos', {
      cloudinary_public_id: cRes.public_id,
      cloudinary_url: cRes.secure_url,
      original_name: _pendingFile.name,
      file_size: cRes.bytes || _pendingFile.size,
      duration_seconds: cRes.duration || null,
      title: document.getElementById('uploadTitle').value || _pendingFile.name,
      video_type: document.getElementById('uploadType').value,
      opponent: document.getElementById('uploadOpponent').value || null,
      game_date: document.getElementById('uploadDate').value || null,
      team_id: teamVal ? parseInt(teamVal) : null,
      keep_forever: document.getElementById('uploadKeepForever').checked,
    });
    Toast.success(t('scouting.upload.success'));
    closeModal('uploadModal');
    loadVideos();
  } catch (e) {
    if (!_uploadAborted) {
      Toast.error(e.message || t('scouting.upload.failed'));
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Upload';
  }
}

/**
 * Single-request upload for small files (< 6MB).
 */
function uploadSingle(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', _cloudinaryConfig.upload_preset);

    const xhr = new XMLHttpRequest();
    xhr.timeout = 600000; // 10 minutes

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error('Invalid response from Cloudinary')); }
      } else {
        let msg = t('scouting.upload.failed');
        try { msg = JSON.parse(xhr.responseText).error?.message || msg; } catch {}
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error(t('scouting.upload.network_error')));
    xhr.ontimeout = () => reject(new Error(t('scouting.upload.timeout')));

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${_cloudinaryConfig.cloud_name}/video/upload`);
    xhr.send(formData);
  });
}

/**
 * Chunked upload for large files.
 * Splits file into 6MB chunks, each sent with Content-Range + X-Unique-Upload-Id.
 * Retries failed chunks up to 3 times with exponential backoff.
 */
async function uploadChunked(file, onProgress) {
  const totalSize = file.size;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
  const uniqueId = 'hoops_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  let lastResponse = null;

  for (let i = 0; i < totalChunks; i++) {
    if (_uploadAborted) throw new Error(t('scouting.upload.cancelled'));

    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunk = file.slice(start, end);
    const isLast = (i === totalChunks - 1);

    onProgress(
      Math.round((start / totalSize) * 100),
      t('scouting.upload.chunk_progress', { current: i + 1, total: totalChunks })
    );

    lastResponse = await uploadChunkWithRetry(chunk, start, end - 1, totalSize, uniqueId, 3);
  }

  if (!lastResponse || !lastResponse.public_id) {
    throw new Error(t('scouting.upload.no_response'));
  }

  return lastResponse;
}

async function uploadChunkWithRetry(chunk, start, end, total, uniqueId, maxRetries) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadChunk(chunk, start, end, total, uniqueId);
    } catch (e) {
      lastError = e;
      if (_uploadAborted) throw e;
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw new Error(t('scouting.upload.retry_failed', { count: maxRetries, error: lastError?.message || 'Unknown error' }));
}

function uploadChunk(chunk, start, end, total, uniqueId) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', chunk);
    formData.append('upload_preset', _cloudinaryConfig.upload_preset);

    const xhr = new XMLHttpRequest();
    xhr.timeout = 120000; // 2 minutes per chunk

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); } catch { resolve({}); }
      } else {
        let msg = t('scouting.upload.chunk_failed', { status: xhr.status });
        try { msg = JSON.parse(xhr.responseText).error?.message || msg; } catch {}
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error(t('scouting.upload.network_error')));
    xhr.ontimeout = () => reject(new Error(t('scouting.upload.timeout')));

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${_cloudinaryConfig.cloud_name}/video/upload`);
    xhr.setRequestHeader('X-Unique-Upload-Id', uniqueId);
    xhr.setRequestHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    xhr.send(formData);
  });
}

/* ═══ Analysis View ═══════════════════════════════════════ */
async function openVideo(videoId) {
  try {
    const res = await API.get(`/api/scouting/videos/${videoId}`);
    _currentVideo = res.data;
    _clips = res.data.clips || [];
    _annotations = res.data.annotations || [];

    document.getElementById('gridView').style.display = 'none';
    document.getElementById('analysisView').classList.add('active');
    document.getElementById('analysisTitle').textContent = _currentVideo.title;

    // Update share buttons
    document.getElementById('shareBtn').innerHTML = _currentVideo.shared_with_team
      ? '<span class="material-symbols-outlined">visibility_off</span>'
      : '<span class="material-symbols-outlined">share</span>';
    _updateShareParentsBtn();
    _updateExpiryUI();

    initVideoPlayer();
    renderClipsSidebar();
    renderTimelineMarkers(); renderAnnotationTrack();
    loadPlaylists();
    // Populate comparison video picker
    const compSel = document.getElementById('compVideoSelect');
    if (compSel) {
      compSel.innerHTML = `<option value="">${t('scouting.comparison.choose_video')}</option>` +
        _videos.filter(v => v.id !== _currentVideo.id).map(v => `<option value="${v.id}">${esc(v.title)}</option>`).join('');
    }
  } catch (e) {
    Toast.error(t('scouting.analysis.load_failed'));
  }
}

function backToGrid() {
  document.getElementById('analysisView').classList.remove('active');
  document.getElementById('gridView').style.display = '';
  if (_vjsPlayer) {
    _vjsPlayer.pause();
  }
  // Cleanup comparison mode if active
  if (_comparisonMode) toggleComparisonMode();
  // Reset zoom
  telestrator.resetZoom();
  _currentVideo = null;
  telestrator.annotations = [];
}

function initVideoPlayer() {
  if (_vjsPlayer) {
    _vjsPlayer.dispose();
    // Recreate video element
    const container = document.getElementById('videoContainer');
    const oldCanvas = document.getElementById('telestratorCanvas');
    container.innerHTML = '';
    const video = document.createElement('video');
    video.id = 'scoutingPlayer';
    video.className = 'video-js vjs-default-skin';
    video.setAttribute('playsinline', '');
    container.appendChild(video);
    const canvas = document.createElement('canvas');
    canvas.id = 'telestratorCanvas';
    canvas.className = 'telestrator-canvas';
    container.appendChild(canvas);
  }

  const sources = [];
  if (_currentVideo.cloudinary_hls_url) {
    sources.push({ src: _currentVideo.cloudinary_hls_url, type: 'application/x-mpegURL' });
  }
  if (_currentVideo.cloudinary_url) {
    sources.push({ src: _currentVideo.cloudinary_url, type: 'video/mp4' });
  }

  if (!sources.length) {
    const container = document.getElementById('videoPlayerContainer');
    if (container) {
      container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:300px;color:var(--text-muted);flex-direction:column;gap:var(--sp-2);">
        <span class="material-symbols-outlined" style="font-size:48px;">videocam_off</span>
        <p>לא ניתן לטעון את הווידאו — קובץ המדיה לא זמין</p>
      </div>`;
    }
    return;
  }

  _vjsPlayer = videojs('scoutingPlayer', {
    controls: true,
    playbackRates: [0.25, 0.5, 1, 1.5, 2],
    fluid: true,
    sources: sources,
    html5: {
      vhs: { overrideNative: false },
      nativeAudioTracks: true,
      nativeVideoTracks: true,
    },
    crossOrigin: 'anonymous',
  });

  // Force native <video> element to sync on pause/play (fixes HLS audio leak)
  _vjsPlayer.on('pause', () => {
    const el = _vjsPlayer.tech({ IWillNotUseThisInPlugins: true })?.el_;
    if (el && !el.paused) el.pause();
  });
  _vjsPlayer.on('play', () => {
    const el = _vjsPlayer.tech({ IWillNotUseThisInPlugins: true })?.el_;
    if (el && el.paused) el.play();
  });

  // ── Skip buttons in Video.js control bar (next to play) ──
  const VjsButton = videojs.getComponent('Button');
  class SkipBackBtn extends VjsButton {
    constructor(player, options) { super(player, options); this.controlText(t('scouting.shortcuts.back_5s')); }
    buildCSSClass() { return 'vjs-skip-btn vjs-skip-back ' + super.buildCSSClass(); }
    handleClick() { skipTime(-5); }
  }
  class SkipFwdBtn extends VjsButton {
    constructor(player, options) { super(player, options); this.controlText(t('scouting.shortcuts.forward_5s')); }
    buildCSSClass() { return 'vjs-skip-btn vjs-skip-fwd ' + super.buildCSSClass(); }
    handleClick() { skipTime(5); }
  }
  // Frame-by-frame buttons (Phase 1.2)
  class FrameBackBtn extends VjsButton {
    constructor(player, options) { super(player, options); this.controlText(t('scouting.shortcuts.prev_frame')); }
    buildCSSClass() { return 'vjs-skip-btn vjs-frame-back ' + super.buildCSSClass(); }
    handleClick() { this.player().pause(); stepFrame(-1); }
  }
  class FrameFwdBtn extends VjsButton {
    constructor(player, options) { super(player, options); this.controlText(t('scouting.shortcuts.next_frame')); }
    buildCSSClass() { return 'vjs-skip-btn vjs-frame-fwd ' + super.buildCSSClass(); }
    handleClick() { this.player().pause(); stepFrame(1); }
  }
  _vjsPlayer.controlBar.addChild(new FrameBackBtn(_vjsPlayer), {}, 1);
  _vjsPlayer.controlBar.addChild(new SkipBackBtn(_vjsPlayer), {}, 2);
  _vjsPlayer.controlBar.addChild(new SkipFwdBtn(_vjsPlayer), {}, 3);
  _vjsPlayer.controlBar.addChild(new FrameFwdBtn(_vjsPlayer), {}, 4);

  // ── Override fullscreen to use videoWithTools (includes tools sidebar) ──
  const fsToggle = _vjsPlayer.controlBar.getChild('fullscreenToggle');
  if (fsToggle) {
    fsToggle.off('click');
    fsToggle.on('click', () => {
      const wrapper = document.getElementById('videoWithTools');
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        wrapper.requestFullscreen();
      }
    });
  }
  document.addEventListener('fullscreenchange', () => {
    const wrapper = document.getElementById('videoWithTools');
    wrapper.classList.toggle('is-fullscreen', !!document.fullscreenElement);
  });

  // Speed badge (Phase 1.3)
  _vjsPlayer.on('ratechange', () => {
    const rate = _vjsPlayer.playbackRate();
    const badge = document.getElementById('speedBadge');
    if (!badge) return;
    badge.textContent = rate + 'x';
    badge.classList.add('visible');
    if (rate === 1) {
      setTimeout(() => badge.classList.remove('visible'), 800);
    } else {
      // Keep visible while not 1x, but refresh the show timer
      clearTimeout(badge._hideTimer);
      badge._hideTimer = null;
    }
  });

  _vjsPlayer.on('timeupdate', onTimeUpdate);
  _vjsPlayer.on('loadedmetadata', () => {
    document.getElementById('timelineDuration').textContent = fmtTime(_vjsPlayer.duration());
    telestrator.init(document.getElementById('scoutingPlayer'), document.getElementById('telestratorCanvas'));
    renderAnnotationTrack();
  });
}

function onTimeUpdate() {
  if (!_vjsPlayer) return;
  const t = _vjsPlayer.currentTime();
  const d = _vjsPlayer.duration() || 1;
  document.getElementById('timelineProgress').style.width = (t / d * 100) + '%';
  document.getElementById('timelineCurrent').textContent = fmtTime(t);

  // Render telestrator annotations
  telestrator.renderFrame(t);
}

/* ═══ Timeline ════════════════════════════════════════════ */
function renderTimelineMarkers() {
  // Remove old markers
  document.querySelectorAll('.timeline-marker').forEach(m => m.remove());
  document.querySelectorAll('.timeline-io-marker').forEach(m => m.remove());
  const bar = document.getElementById('timelineBar');
  const duration = _vjsPlayer?.duration() || _currentVideo?.duration_seconds || 1;

  // Clip markers
  _clips.forEach(c => {
    const pct = (c.start_time / duration) * 100;
    const marker = document.createElement('div');
    marker.className = 'timeline-marker ' + (c.rating === 'positive' ? 'positive' : c.rating === 'negative' ? 'negative' : 'neutral');
    marker.style.left = `calc(${pct}% - 2px)`;
    marker.title = `${c.action_type.replace(/_/g, ' ')} (${fmtTime(c.start_time)})`;
    marker.onclick = (e) => { e.stopPropagation(); if (_vjsPlayer) _vjsPlayer.currentTime(c.start_time); };
    bar.appendChild(marker);
  });

  // I/O point markers (Phase 1.6)
  if (_clipInPoint !== null) {
    const pct = (_clipInPoint / duration) * 100;
    const m = document.createElement('div');
    m.className = 'timeline-io-marker io-in';
    m.style.left = `${pct}%`;
    m.title = `In: ${fmtTime(_clipInPoint)}`;
    bar.appendChild(m);
  }
  if (_clipOutPoint !== null) {
    const pct = (_clipOutPoint / duration) * 100;
    const m = document.createElement('div');
    m.className = 'timeline-io-marker io-out';
    m.style.left = `${pct}%`;
    m.title = `Out: ${fmtTime(_clipOutPoint)}`;
    bar.appendChild(m);
  }
  // Highlight region between I/O
  if (_clipInPoint !== null && _clipOutPoint !== null && _clipOutPoint > _clipInPoint) {
    const leftPct = (_clipInPoint / duration) * 100;
    const widthPct = ((_clipOutPoint - _clipInPoint) / duration) * 100;
    const region = document.createElement('div');
    region.className = 'timeline-io-region';
    region.style.left = leftPct + '%';
    region.style.width = widthPct + '%';
    bar.appendChild(region);
  }
}

function seekTimeline(e) {
  if (!_vjsPlayer) return;
  const bar = document.getElementById('timelineBar');
  const rect = bar.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  _vjsPlayer.currentTime(pct * _vjsPlayer.duration());
}

function skipTime(seconds) {
  if (!_vjsPlayer) return;
  const t = _vjsPlayer.currentTime() + seconds;
  _vjsPlayer.currentTime(Math.max(0, Math.min(t, _vjsPlayer.duration())));
}

/* ═══ Annotation Track (resizable / draggable bars) ══════ */
const ANN_COLORS = {
  freehand: '#ef4444', arrow: '#60A5FA', circle: '#A78BFA',
  text: '#FBBF24', spotlight: '#FFD700', player_marker: '#f48c25',
};
const ANN_LABELS = {
  freehand: '✏️', arrow: '➡️', circle: '⭕', text: '📝', spotlight: '💡', player_marker: '🏀',
};
let _selectedAnnIdx = -1;

const ANN_TYPE_NAMES = {
  get freehand() { return t('scouting.ann.type.freehand'); },
  get arrow() { return t('scouting.ann.type.arrow'); },
  get circle() { return t('scouting.ann.type.circle'); },
  get text() { return t('scouting.ann.type.text'); },
  get spotlight() { return t('scouting.ann.type.spotlight'); },
  get player_marker() { return t('scouting.ann.type.player_marker'); },
};

/* ═══ Player Marker State (Phase 2.1) ══════════════════════ */
let _playerMarkerNumber = 1;
let _playerMarkerTeam = 'offense'; // 'offense' or 'defense'

function renderAnnotationTrack() {
  const track = document.getElementById('annotationTrack');
  if (!track) return;
  track.innerHTML = '';
  const duration = _vjsPlayer?.duration() || _currentVideo?.duration_seconds || 1;
  const anns = telestrator.annotations?.length ? telestrator.annotations : _annotations;
  if (!anns || !anns.length) { track.style.display = 'none'; return; }
  track.style.display = 'block';

  // Group by annotation type
  const groups = {};
  anns.forEach((ann, idx) => {
    const type = ann.annotation_type || 'other';
    if (!groups[type]) groups[type] = [];
    groups[type].push({ ann, idx });
  });

  // Render a row per type
  for (const type of Object.keys(groups)) {
    const color = ANN_COLORS[type] || '#f48c25';
    const label = ANN_LABELS[type] || '•';
    const typeName = ANN_TYPE_NAMES[type] || type;

    const row = document.createElement('div');
    row.className = 'ann-track-row';

    const rowLabel = document.createElement('div');
    rowLabel.className = 'ann-track-label';
    rowLabel.style.color = color;
    rowLabel.textContent = typeName;
    row.appendChild(rowLabel);

    const rowBars = document.createElement('div');
    rowBars.className = 'ann-track-bars';
    row.appendChild(rowBars);

    for (const { ann, idx } of groups[type]) {
      const leftPct = (ann.timestamp / duration) * 100;
      const widthPct = (ann.duration / duration) * 100;
      const selected = idx === _selectedAnnIdx;

      const bar = document.createElement('div');
      bar.className = 'ann-bar' + (selected ? ' selected' : '');
      bar.style.left = leftPct + '%';
      bar.style.width = Math.max(widthPct, 0.8) + '%';
      bar.style.background = color;
      bar.title = `${typeName} — ${fmtTime(ann.timestamp)} → ${fmtTime(ann.timestamp + ann.duration)}`;
      bar.dataset.annIdx = idx;
      bar.innerHTML = `
        <div class="ann-handle ann-handle-left"></div>
        <span class="ann-bar-label">${label}</span>
        <button class="ann-delete-btn" title="Delete">×</button>
        <div class="ann-handle ann-handle-right"></div>`;

      // Click = select + seek
      bar.addEventListener('click', (e) => {
        if (e.target.classList.contains('ann-handle') || e.target.classList.contains('ann-delete-btn')) return;
        _selectedAnnIdx = idx;
        if (_vjsPlayer) _vjsPlayer.currentTime(ann.timestamp);
        renderAnnotationTrack();
      });

      // Delete button
      bar.querySelector('.ann-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteAnnotation(idx);
      });

      // Drag handles (resize)
      bar.querySelector('.ann-handle-left').addEventListener('mousedown', (e) => startAnnDrag(e, ann, idx, 'left', duration));
      bar.querySelector('.ann-handle-right').addEventListener('mousedown', (e) => startAnnDrag(e, ann, idx, 'right', duration));

      // Middle drag (move freely)
      bar.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('ann-handle') || e.target.classList.contains('ann-delete-btn')) return;
        startAnnDrag(e, ann, idx, 'move', duration);
      });

      rowBars.appendChild(bar);
    }

    track.appendChild(row);
  }
}

function startAnnDrag(e, ann, idx, mode, videoDuration) {
  e.preventDefault();
  e.stopPropagation();
  _selectedAnnIdx = idx;

  const barEl = e.target.closest('.ann-bar');
  if (!barEl) return;
  const barsContainer = barEl.parentElement;
  const trackRect = barsContainer.getBoundingClientRect();
  const origTimestamp = ann.timestamp;
  const origDuration = ann.duration;
  const startX = e.clientX;
  let moved = false;

  // Highlight selected
  document.querySelectorAll('.ann-bar').forEach(b => b.classList.remove('selected'));
  barEl.classList.add('selected');

  function onMove(ev) {
    moved = true;
    const x = ev.clientX - trackRect.left;
    const timePct = Math.max(0, Math.min(1, x / trackRect.width));
    const timePos = timePct * videoDuration;

    if (mode === 'left') {
      const end = origTimestamp + origDuration;
      const newStart = Math.min(timePos, end - 0.3);
      ann.timestamp = Math.max(0, newStart);
      ann.duration = end - ann.timestamp;
    } else if (mode === 'right') {
      const newEnd = Math.max(timePos, ann.timestamp + 0.3);
      ann.duration = Math.min(newEnd - ann.timestamp, videoDuration - ann.timestamp);
    } else {
      const deltaX = ev.clientX - startX;
      const deltaPct = deltaX / trackRect.width;
      const deltaTime = deltaPct * videoDuration;
      let newStart = origTimestamp + deltaTime;
      newStart = Math.max(0, Math.min(newStart, videoDuration - origDuration));
      ann.timestamp = newStart;
    }

    // Update bar CSS directly (no DOM rebuild during drag)
    const leftPct = (ann.timestamp / videoDuration) * 100;
    const widthPct = (ann.duration / videoDuration) * 100;
    barEl.style.left = leftPct + '%';
    barEl.style.width = Math.max(widthPct, 0.8) + '%';
  }

  async function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    renderAnnotationTrack(); // full rebuild on release
    if (!moved) return;
    try {
      await API.put(`/api/scouting/annotations/${ann.id}`, {
        timestamp: Math.round(ann.timestamp * 100) / 100,
        duration: Math.round(ann.duration * 100) / 100,
      });
    } catch (err) {
      ann.timestamp = origTimestamp;
      ann.duration = origDuration;
      renderAnnotationTrack();
    }
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

async function deleteAnnotation(idx) {
  const anns = telestrator.annotations?.length ? telestrator.annotations : _annotations;
  if (!anns || idx < 0 || idx >= anns.length) return;
  const ann = anns[idx];
  try {
    await API.del(`/api/scouting/annotations/${ann.id}`);
    telestrator.annotations = telestrator.annotations.filter(a => a.id !== ann.id);
    _annotations = _annotations.filter(a => a.id !== ann.id);
    _selectedAnnIdx = -1;
    renderAnnotationTrack();
    telestrator.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
    Toast.success(t('scouting.ann.deleted'));
  } catch (e) { Toast.error(t('scouting.ann.delete_failed')); }
}

/* ═══ Keyboard Shortcuts System (Phase 1.1) ═══════════════ */
document.addEventListener('keydown', (e) => {
  // Guard: skip if user is typing in input fields
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.target.isContentEditable) return;
  // Guard: skip if a modal is open
  if (document.querySelector('.modal-overlay.active')) return;
  // Guard: only work when analysis view is active (video loaded)
  const inAnalysis = document.getElementById('analysisView')?.classList.contains('active');

  const key = e.key;
  const ctrl = e.ctrlKey || e.metaKey;
  const shift = e.shiftKey;

  // ? — Toggle keyboard shortcuts overlay (works everywhere)
  if (key === '?' || (shift && key === '/')) {
    e.preventDefault();
    toggleShortcutsOverlay();
    return;
  }

  if (!inAnalysis || !_vjsPlayer) return;

  // ── Playback ──
  if (key === ' ') {
    e.preventDefault();
    _vjsPlayer.paused() ? _vjsPlayer.play() : _vjsPlayer.pause();
    return;
  }

  // Arrow left/right: ±5s when playing, ±1 frame when paused
  if (key === 'ArrowLeft' && !ctrl) {
    e.preventDefault();
    if (shift) { skipTime(-1); }
    else if (_vjsPlayer.paused()) { stepFrame(-1); }
    else { skipTime(-5); }
    return;
  }
  if (key === 'ArrowRight' && !ctrl) {
    e.preventDefault();
    if (shift) { skipTime(1); }
    else if (_vjsPlayer.paused()) { stepFrame(1); }
    else { skipTime(5); }
    return;
  }

  // , and . — frame step (always)
  if (key === ',') { e.preventDefault(); _vjsPlayer.pause(); stepFrame(-1); return; }
  if (key === '.') { e.preventDefault(); _vjsPlayer.pause(); stepFrame(1); return; }

  // [ and ] — slower/faster playback rate
  if (key === '[') { e.preventDefault(); cyclePlaybackRate(-1); return; }
  if (key === ']') { e.preventDefault(); cyclePlaybackRate(1); return; }

  // 1-5 — direct playback rate
  if (!ctrl && !shift && key >= '1' && key <= '5') {
    e.preventDefault();
    const rate = PLAYBACK_RATES[parseInt(key) - 1];
    _vjsPlayer.playbackRate(rate);
    return;
  }

  // ── Drawing Tools ──
  if (!ctrl && !shift) {
    const toolMap = { d: 'freehand', a: 'arrow', c: 'circle', t: 'text', s: 'spotlight', m: 'player_marker' };
    if (toolMap[key.toLowerCase()]) {
      e.preventDefault();
      const toolBtn = document.querySelector(`.draw-tool-btn[data-tool="${toolMap[key.toLowerCase()]}"]`);
      if (toolBtn) setDrawTool(toolBtn);
      return;
    }
  }

  // Escape — deselect tool / deselect annotation
  if (key === 'Escape') {
    if (telestrator.tool) {
      const activeBtn = document.querySelector('.draw-tool-btn.active');
      if (activeBtn) setDrawTool(activeBtn); // toggle off
    } else {
      _selectedAnnIdx = -1;
      renderAnnotationTrack();
    }
    return;
  }

  // Ctrl+Z — undo annotation
  if (ctrl && key === 'z') {
    e.preventDefault();
    telestrator.undo();
    return;
  }

  // Delete — delete selected annotation
  if (key === 'Delete' && _selectedAnnIdx >= 0) {
    deleteAnnotation(_selectedAnnIdx);
    return;
  }

  // I — set clip In-point
  if (key === 'i' && !ctrl && !shift) {
    e.preventDefault();
    setClipInPoint();
    return;
  }

  // O — set clip Out-point
  if (key === 'o' && !ctrl && !shift) {
    e.preventDefault();
    setClipOutPoint();
    return;
  }

  // Ctrl+C — copy selected annotation(s)
  if (ctrl && key === 'c' && _selectedAnnIdx >= 0) {
    e.preventDefault();
    copyAnnotations();
    return;
  }

  // Ctrl+V — paste annotations
  if (ctrl && key === 'v' && _copiedAnnotations.length) {
    e.preventDefault();
    pasteAnnotations();
    return;
  }

  // + / = — zoom in, - — zoom out, 0 — reset zoom
  if (key === '+' || key === '=') { e.preventDefault(); zoomIn(); return; }
  if (key === '-') { e.preventDefault(); zoomOut(); return; }
  if (key === '0' && !ctrl) { e.preventDefault(); resetZoom(); return; }
});

/* ── Frame-by-frame stepping ── */
function stepFrame(direction) {
  if (!_vjsPlayer) return;
  const t = _vjsPlayer.currentTime() + (direction * FRAME_DURATION);
  _vjsPlayer.currentTime(Math.max(0, Math.min(t, _vjsPlayer.duration())));
}

/* ── Playback rate cycling ── */
function cyclePlaybackRate(direction) {
  if (!_vjsPlayer) return;
  const current = _vjsPlayer.playbackRate();
  let idx = PLAYBACK_RATES.indexOf(current);
  if (idx === -1) idx = PLAYBACK_RATES.findIndex(r => r >= current) || 2;
  idx = Math.max(0, Math.min(PLAYBACK_RATES.length - 1, idx + direction));
  _vjsPlayer.playbackRate(PLAYBACK_RATES[idx]);
}

/* ── Shortcuts overlay toggle ── */
function toggleShortcutsOverlay() {
  const overlay = document.getElementById('shortcutsOverlay');
  if (overlay) overlay.classList.toggle('active');
}

/* ═══ Clip In/Out Points (Phase 1.6) ═══════════════════════ */
function setClipInPoint() {
  if (!_vjsPlayer) return;
  _clipInPoint = _vjsPlayer.currentTime();
  Toast.success(`${t('scouting.io.in')}: ${fmtTime(_clipInPoint)}`);
  _updateIOBar();
  renderTimelineMarkers();
}

function setClipOutPoint() {
  if (!_vjsPlayer) return;
  _clipOutPoint = _vjsPlayer.currentTime();
  Toast.success(`${t('scouting.io.out')}: ${fmtTime(_clipOutPoint)}`);
  _updateIOBar();
  renderTimelineMarkers();
}

function clearIOPoints() {
  _clipInPoint = null;
  _clipOutPoint = null;
  _updateIOBar();
  renderTimelineMarkers();
}

function _updateIOBar() {
  const bar = document.getElementById('clipIOBar');
  if (!bar) return;
  if (_clipInPoint !== null || _clipOutPoint !== null) {
    const inText = _clipInPoint !== null ? fmtTime(_clipInPoint) : '--:--';
    const outText = _clipOutPoint !== null ? fmtTime(_clipOutPoint) : '--:--';
    const canCreate = _clipInPoint !== null && _clipOutPoint !== null && _clipOutPoint > _clipInPoint;
    bar.innerHTML = `
      <span class="io-label">${t('scouting.io.in')} <strong>${inText}</strong></span>
      <span class="io-separator">→</span>
      <span class="io-label">${t('scouting.io.out')} <strong>${outText}</strong></span>
      ${canCreate ? `<span class="io-duration">${Math.round(_clipOutPoint - _clipInPoint)}s</span>` : ''}
      ${canCreate ? `<button class="btn btn-primary btn-sm" onclick="createClipFromIO()">${t('scouting.io.create_clip')}</button>` : ''}
      <button class="btn-icon io-clear" onclick="clearIOPoints()" title="Clear"><span class="material-symbols-outlined">close</span></button>`;
    bar.style.display = 'flex';
  } else {
    bar.style.display = 'none';
  }
}

function createClipFromIO() {
  if (_clipInPoint === null || _clipOutPoint === null) return;
  if (!_vjsPlayer) return;

  document.getElementById('clipStart').value = fmtTime(_clipInPoint);
  document.getElementById('clipEnd').value = fmtTime(_clipOutPoint);
  document.getElementById('clipAction').value = 'other';
  document.getElementById('clipNotes').value = '';
  _clipRating = null;
  document.getElementById('ratingPos').classList.remove('active');
  document.getElementById('ratingNeg').classList.remove('active');

  const playersEl = document.getElementById('clipPlayers');
  playersEl.innerHTML = _roster.map(p =>
    `<div class="player-check" onclick="this.classList.toggle('selected');" data-player-id="${p.id}">
      <span>#${p.jersey_number || ''} ${esc(p.name)}</span>
    </div>`
  ).join('');

  _updateClipDuration();
  openModal('clipModal');
}

/* ═══ Annotation Copy/Paste (Phase 2.3 prep) ══════════════ */
let _copiedAnnotations = [];

function copyAnnotations() {
  const anns = telestrator.annotations?.length ? telestrator.annotations : _annotations;
  if (_selectedAnnIdx >= 0 && _selectedAnnIdx < anns.length) {
    const ann = anns[_selectedAnnIdx];
    _copiedAnnotations = [JSON.parse(JSON.stringify(ann))];
    Toast.info(t('scouting.ann.copied'));
  }
}

async function pasteAnnotations() {
  if (!_copiedAnnotations.length || !_currentVideo || !_vjsPlayer) return;
  const currentTime = _vjsPlayer.currentTime();
  for (const ann of _copiedAnnotations) {
    try {
      const res = await API.post(`/api/scouting/videos/${_currentVideo.id}/annotations`, {
        annotation_type: ann.annotation_type,
        timestamp: currentTime,
        duration: ann.duration,
        stroke_data: ann.stroke_data,
        color: ann.color,
        stroke_width: ann.stroke_width,
        text_content: ann.text_content || null,
      });
      telestrator.annotations.push(res.data);
    } catch (e) { console.error('Paste error:', e); }
  }
  renderAnnotationTrack();
  telestrator.renderFrame(currentTime);
  Toast.success(t('scouting.ann.pasted'));
}

/* ═══ Clip Trim Preview (Phase 1.7) ═══════════════════════ */
function previewClip() {
  if (!_vjsPlayer) return;
  const start = parseTimeInput(document.getElementById('clipStart').value);
  const end = parseTimeInput(document.getElementById('clipEnd').value);
  if (end <= start) { Toast.error(t('scouting.clips.invalid_range')); return; }

  const previewBtn = document.getElementById('clipPreviewBtn');
  if (_clipPreviewActive) {
    // Stop preview
    _clipPreviewActive = false;
    _vjsPlayer.pause();
    if (previewBtn) previewBtn.textContent = t('scouting.clip.preview');
    return;
  }

  _clipPreviewActive = true;
  if (previewBtn) previewBtn.textContent = t('scouting.clip.stop');
  _vjsPlayer.currentTime(start);
  _vjsPlayer.play();

  const onUpdate = () => {
    if (!_clipPreviewActive) { _vjsPlayer.off('timeupdate', onUpdate); return; }
    if (_vjsPlayer.currentTime() >= end) {
      _vjsPlayer.currentTime(start); // loop
    }
  };
  _vjsPlayer.on('timeupdate', onUpdate);
}

function stopClipPreview() {
  _clipPreviewActive = false;
  const previewBtn = document.getElementById('clipPreviewBtn');
  if (previewBtn) previewBtn.textContent = t('scouting.clip.preview');
}

/* ═══ Clips Sidebar ═══════════════════════════════════════ */
function renderClipsSidebar() {
  const el = document.getElementById('clipsList');
  document.getElementById('clipCount').textContent = `(${_clips.length})`;

  if (_clipSidebarTab === 'playlists') {
    renderPlaylistsSidebar();
    return;
  }

  // Filter chips
  const chipBox = document.getElementById('clipFilterChips');
  const compileBtn = document.getElementById('compileClipsBtn');
  if (_clips.length >= 2) {
    const types = [...new Set(_clips.map(c => c.action_type))];
    if (types.length > 1) {
      chipBox.style.display = '';
      chipBox.innerHTML = `<button class="clip-filter-chip${!_clipFilterType ? ' active' : ''}" onclick="setClipFilter('')">${t('scouting.compile.filter_all')}</button>` +
        types.map(ty => {
          const label = ACTION_TYPES.find(a => a.value === ty)?.label || ty;
          return `<button class="clip-filter-chip${_clipFilterType === ty ? ' active' : ''}" onclick="setClipFilter('${ty}')">${esc(label)}</button>`;
        }).join('');
    } else { chipBox.style.display = 'none'; }
    compileBtn.style.display = '';
  } else {
    chipBox.style.display = 'none';
    if (compileBtn) compileBtn.style.display = 'none';
  }

  if (!_clips.length) {
    el.innerHTML = `<p style="color:var(--text-muted);text-align:center;font-size:0.82rem;padding:var(--sp-4);">${t('scouting.clips.empty')}</p>`;
    return;
  }

  const filtered = _clipFilterType ? _clips.filter(c => c.action_type === _clipFilterType) : _clips;

  el.innerHTML = filtered.map(c => {
    const action = ACTION_TYPES.find(a => a.value === c.action_type)?.label || c.action_type;
    const rating = c.rating === 'positive' ? '👍' : c.rating === 'negative' ? '👎' : '';
    const players = (c.player_tags || []).map(pt => `<span class="clip-player-chip">#${pt.name || pt.player_id}</span>`).join('');
    const selected = _selectedClipIds.has(c.id) ? ' batch-selected' : '';
    return `<div class="clip-card${selected}" onclick="jumpToClip(${c.id})" data-clip-id="${c.id}">
      <div class="clip-card-header">
        <input type="checkbox" class="clip-batch-check" ${_selectedClipIds.has(c.id) ? 'checked' : ''} onclick="toggleClipSelection(${c.id}, event)">
        <span class="clip-card-action">${esc(action)} <span class="clip-card-rating">${rating}</span></span>
        <button class="btn-icon" style="font-size:0.7rem;" onclick="event.stopPropagation();deleteClip(${c.id})"><span class="material-symbols-outlined" style="font-size:1rem;">delete</span></button>
      </div>
      <div class="clip-card-time">${fmtTime(c.start_time)} — ${fmtTime(c.end_time)}</div>
      ${players ? `<div class="clip-card-players">${players}</div>` : ''}
      <div class="clip-watch-count">${t('scouting.clips.watched', { count: c.watch_count || 0 })}</div>
    </div>`;
  }).join('');
}

function setClipFilter(type) {
  _clipFilterType = type;
  renderClipsSidebar();
}

/* ═══ Clip Compilation ═══════════════════════════════════ */
let _compiling = false;
let _compiledNewVideoId = null;
let _compileOriginalVideoId = null;

function openCompileModal() {
  if (_clips.length < 2) { Toast.error(t('scouting.compile.min_clips')); return; }
  // Default title
  document.getElementById('compileTitle').value = `${t('scouting.compile.btn')} — ${_currentVideo?.title || ''}`.trim();
  // Populate filter dropdown with available action_types
  const filterSel = document.getElementById('compileFilter');
  const types = [...new Set(_clips.map(c => c.action_type))];
  filterSel.innerHTML = `<option value="">${t('scouting.compile.filter_all')}</option>` +
    types.map(ty => {
      const label = ACTION_TYPES.find(a => a.value === ty)?.label || ty;
      return `<option value="${ty}">${esc(label)}</option>`;
    }).join('');
  // Reset state
  document.getElementById('compileSortBy').value = 'chrono';
  document.getElementById('compileFilter').value = '';
  document.getElementById('compileProgress').style.display = 'none';
  document.getElementById('compileGenerateBtn').disabled = false;
  // Init selection — all clips selected
  _compileSelectedIds = new Set(_clips.map(c => c.id));
  renderCompileClipList();
  openModal('compileModal');
}

let _compileSelectedIds = new Set();

function _sortCompileClips(clips, sortBy) {
  const sorted = [...clips];
  if (sortBy === 'action') {
    sorted.sort((a, b) => a.action_type.localeCompare(b.action_type) || a.start_time - b.start_time);
  } else if (sortBy === 'rating') {
    const order = { positive: 0, negative: 2 };
    sorted.sort((a, b) => (order[a.rating] ?? 1) - (order[b.rating] ?? 1) || a.start_time - b.start_time);
  } else {
    sorted.sort((a, b) => a.start_time - b.start_time);
  }
  return sorted;
}

function renderCompileClipList() {
  const sortBy = document.getElementById('compileSortBy').value;
  const filterType = document.getElementById('compileFilter').value;
  let clips = filterType ? _clips.filter(c => c.action_type === filterType) : [..._clips];
  clips = _sortCompileClips(clips, sortBy);

  const el = document.getElementById('compileClipList');
  el.innerHTML = clips.map(c => {
    const action = ACTION_TYPES.find(a => a.value === c.action_type)?.label || c.action_type;
    const rating = c.rating === 'positive' ? ' 👍' : c.rating === 'negative' ? ' 👎' : '';
    const checked = _compileSelectedIds.has(c.id) ? 'checked' : '';
    return `<label class="compile-clip-item" style="display:flex;align-items:center;gap:var(--sp-2);padding:6px 8px;border-radius:var(--r-md);cursor:pointer;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background=''">
      <input type="checkbox" ${checked} onchange="compileToggleClip(${c.id}, this.checked)">
      <span style="flex:1;font-size:0.82rem;">${fmtTime(c.start_time)}–${fmtTime(c.end_time)}</span>
      <span style="font-size:0.75rem;color:var(--text-muted);">${esc(action)}${rating}</span>
    </label>`;
  }).join('');

  // Summary
  const selected = clips.filter(c => _compileSelectedIds.has(c.id));
  const totalDur = selected.reduce((s, c) => s + (c.end_time - c.start_time), 0);
  document.getElementById('compileSummary').textContent = t('scouting.compile.summary', {
    count: selected.length,
    duration: fmtTime(totalDur),
  });
}

function compileToggleClip(clipId, checked) {
  if (checked) _compileSelectedIds.add(clipId);
  else _compileSelectedIds.delete(clipId);
  renderCompileClipList();
}

function compileToggleAll(selectAll) {
  const filterType = document.getElementById('compileFilter').value;
  const clips = filterType ? _clips.filter(c => c.action_type === filterType) : _clips;
  if (selectAll) clips.forEach(c => _compileSelectedIds.add(c.id));
  else clips.forEach(c => _compileSelectedIds.delete(c.id));
  renderCompileClipList();
}

async function startCompilation() {
  if (_compiling) return;
  const sortBy = document.getElementById('compileSortBy').value;
  const filterType = document.getElementById('compileFilter').value;
  let clips = filterType ? _clips.filter(c => c.action_type === filterType) : [..._clips];
  clips = _sortCompileClips(clips, sortBy).filter(c => _compileSelectedIds.has(c.id));
  if (clips.length < 1) { Toast.error(t('scouting.compile.no_clips')); return; }

  _compiling = true;
  _compileOriginalVideoId = _currentVideo?.id || null;
  const btn = document.getElementById('compileGenerateBtn');
  btn.disabled = true;
  const progress = document.getElementById('compileProgress');
  const label = document.getElementById('compileProgressLabel');
  const fill = document.getElementById('compileProgressFill');
  progress.style.display = '';
  fill.style.width = '0%';

  // Prevent accidental tab close
  const beforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
  window.addEventListener('beforeunload', beforeUnload);

  try {
    // Access the underlying video element
    const videoEl = _vjsPlayer.tech({ IWillNotUseThisInPlugins: true })?.el_;
    if (!videoEl) throw new Error('Cannot access video element');

    const vw = videoEl.videoWidth || 1280;
    const vh = videoEl.videoHeight || 720;
    const compCanvas = document.createElement('canvas');
    compCanvas.width = vw;
    compCanvas.height = vh;
    const compCtx = compCanvas.getContext('2d');

    // Setup MediaRecorder
    const stream = compCanvas.captureStream(30);
    // Try to capture audio from video element
    try {
      const videoStream = videoEl.captureStream ? videoEl.captureStream() : null;
      if (videoStream) {
        const audioTrack = videoStream.getAudioTracks()[0];
        if (audioTrack) stream.addTrack(audioTrack);
      }
    } catch (e) { /* audio capture not available, continue video-only */ }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    const totalDuration = clips.reduce((s, c) => s + (c.end_time - c.start_time), 0);
    let processedDuration = 0;

    // Save original playback rate
    const origRate = _vjsPlayer.playbackRate();
    _vjsPlayer.playbackRate(1);
    _vjsPlayer.muted(true); // mute during processing

    recorder.start(100); // 100ms chunks
    const showTags = document.getElementById('compileShowTags')?.checked;
    const isRTL = document.documentElement.dir === 'rtl' || document.documentElement.lang === 'he';
    const tagFontSize = Math.round(vw * 0.028); // ~36px at 1280w
    const tagPad = tagFontSize * 0.5;

    // Process each clip sequentially
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const clipDur = clip.end_time - clip.start_time;
      label.textContent = t('scouting.compile.processing', { current: i + 1, total: clips.length });

      // Seek to clip start
      _vjsPlayer.currentTime(clip.start_time);
      await new Promise(r => setTimeout(r, 400)); // wait for seek
      _vjsPlayer.play();

      // Frame capture loop for this clip
      await new Promise((resolve) => {
        const captureFrame = () => {
          if (!_compiling) { resolve(); return; }
          const t = _vjsPlayer.currentTime();
          if (t >= clip.end_time) {
            _vjsPlayer.pause();
            resolve();
            return;
          }
          // Draw video frame
          compCtx.drawImage(videoEl, 0, 0, vw, vh);
          // Draw annotations (scale telestrator to export canvas)
          const origW = telestrator.canvas.width;
          const origH = telestrator.canvas.height;
          telestrator.canvas.width = vw;
          telestrator.canvas.height = vh;
          telestrator.renderFrame(t);
          compCtx.drawImage(telestrator.canvas, 0, 0);
          telestrator.canvas.width = origW;
          telestrator.canvas.height = origH;
          // Draw action type tag overlay
          if (showTags && clip.action_type) {
            const tagLabel = ACTION_TYPES.find(a => a.value === clip.action_type)?.label || clip.action_type;
            compCtx.save();
            compCtx.direction = 'ltr';
            compCtx.font = `bold ${tagFontSize}px "Space Grotesk", sans-serif`;
            const tw = compCtx.measureText(tagLabel).width;
            const pillW = tw + tagPad * 2;
            const pillH = tagFontSize * 1.4;
            const pillX = isRTL ? (vw - pillW - tagPad) : tagPad;
            const pillY = tagPad;
            // Background pill
            compCtx.fillStyle = 'rgba(0,0,0,0.65)';
            compCtx.beginPath();
            compCtx.roundRect(pillX, pillY, pillW, pillH, tagFontSize * 0.25);
            compCtx.fill();
            // Text
            compCtx.fillStyle = '#ffffff';
            compCtx.textAlign = isRTL ? 'right' : 'left';
            compCtx.textBaseline = 'middle';
            const textX = isRTL ? (pillX + pillW - tagPad) : (pillX + tagPad);
            compCtx.fillText(tagLabel, textX, pillY + pillH / 2);
            compCtx.restore();
          }
          // Update progress
          const clipProgress = t - clip.start_time;
          const overallPct = Math.round(((processedDuration + clipProgress) / totalDuration) * 100);
          fill.style.width = Math.min(overallPct, 99) + '%';
          requestAnimationFrame(captureFrame);
        };
        requestAnimationFrame(captureFrame);
      });

      processedDuration += clipDur;
    }

    // Stop recording
    const exportDone = new Promise(r => { recorder.onstop = r; });
    recorder.stop();
    await exportDone;

    _vjsPlayer.muted(false);
    _vjsPlayer.playbackRate(origRate);

    // Create blob
    const blob = new Blob(chunks, { type: 'video/webm' });
    console.log('Compilation blob:', blob.size, 'bytes, type:', blob.type, 'chunks:', chunks.length);
    if (blob.size < 1000) throw new Error('Compilation produced empty video');
    label.textContent = t('scouting.compile.uploading');
    fill.style.width = '100%';

    // Upload to Cloudinary (reuse existing upload logic)
    const cRes = await _uploadBlobToCloudinary(blob, (pct) => {
      label.textContent = `${t('scouting.compile.uploading')} ${pct}%`;
    });

    // Register as new video via API
    const title = document.getElementById('compileTitle').value || `Compilation — ${_currentVideo?.title || ''}`;
    const teamVal = _currentVideo?.team_id || null;
    const res = await API.post('/api/scouting/videos', {
      cloudinary_public_id: cRes.public_id,
      cloudinary_url: cRes.secure_url,
      original_name: `${title}.webm`,
      file_size: cRes.bytes || blob.size,
      duration_seconds: cRes.duration || totalDuration,
      title,
      video_type: 'highlight',
      team_id: teamVal,
      keep_forever: false,
    });

    _compiledNewVideoId = res.data?.id;
    closeModal('compileModal');
    // Restore canvas
    telestrator._resizeCanvas();
    telestrator.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
    // Show delete-original prompt
    openModal('compileDeleteModal');

  } catch (e) {
    console.error('Compilation error:', e);
    Toast.error(t('scouting.compile.failed') + ': ' + (e.message || ''));
    _vjsPlayer.muted(false);
  } finally {
    _compiling = false;
    _vjsPlayer.pause();
    btn.disabled = false;
    progress.style.display = 'none';
    window.removeEventListener('beforeunload', beforeUnload);
    telestrator._resizeCanvas();
    telestrator.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
  }
}

async function _uploadBlobToCloudinary(blob, onProgress) {
  if (!_cloudinaryConfig?.cloud_name) throw new Error('Cloudinary not configured');
  console.log('Upload blob size:', blob.size, 'type:', blob.type);
  const file = new File([blob], 'compilation.webm', { type: 'video/webm' });
  // Use /auto/upload to let Cloudinary auto-detect resource type (webm may not be in video preset)
  const url = `https://api.cloudinary.com/v1_1/${_cloudinaryConfig.cloud_name}/auto/upload`;

  if (file.size > CHUNK_SIZE) {
    // Chunked upload
    const uniqueId = `compile_${Date.now()}`;
    const totalSize = file.size;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
    let result;
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalSize);
      const chunk = file.slice(start, end);
      const fd = new FormData();
      fd.append('file', chunk);
      fd.append('upload_preset', _cloudinaryConfig.upload_preset);
      result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.setRequestHeader('X-Unique-Upload-Id', uniqueId);
        xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${totalSize}`);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
          else {
            let msg = `Upload chunk failed (${xhr.status})`;
            try { const err = JSON.parse(xhr.responseText); msg = err.error?.message || msg; console.error('Cloudinary chunk error:', err); } catch {}
            reject(new Error(msg));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(fd);
      });
      if (onProgress) onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
    return result;
  } else {
    // Single upload
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', _cloudinaryConfig.upload_preset);
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
        else {
          let msg = `Upload failed (${xhr.status})`;
          try { const err = JSON.parse(xhr.responseText); msg = err.error?.message || msg; console.error('Cloudinary error:', err); } catch {}
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(fd);
    });
  }
}

async function compileDeleteOriginal() {
  closeModal('compileDeleteModal');
  const origId = _compileOriginalVideoId;
  if (origId) {
    try {
      await API.del(`/api/scouting/videos/${origId}`);
      Toast.success(t('scouting.video.deleted'));
    } catch (e) {
      Toast.error(t('scouting.video.delete_failed'));
    }
  }
  // Navigate to the new compiled video
  if (_compiledNewVideoId) {
    loadVideos();
    setTimeout(() => openVideo(_compiledNewVideoId), 500);
  } else {
    loadVideos();
  }
}

function compileKeepOriginal() {
  closeModal('compileDeleteModal');
  // Navigate to the new compiled video
  if (_compiledNewVideoId) {
    loadVideos();
    setTimeout(() => openVideo(_compiledNewVideoId), 500);
  } else {
    loadVideos();
  }
}

function jumpToClip(clipId) {
  const clip = _clips.find(c => c.id === clipId);
  if (clip && _vjsPlayer) {
    _vjsPlayer.currentTime(clip.start_time);
    _vjsPlayer.play();
  }
  // Highlight
  document.querySelectorAll('.clip-card').forEach(c => c.classList.remove('active'));
  document.querySelector(`[data-clip-id="${clipId}"]`)?.classList.add('active');
}

/* ═══ Quick Tag (Clip Creation) ═══════════════════════════ */
function quickTag(btn) {
  if (!_vjsPlayer) return;
  const actionType = btn.dataset.action;
  const currentTime = _vjsPlayer.currentTime();
  const duration = _vjsPlayer.duration() || currentTime + 30;
  // Use I/O points if both set, otherwise default: 5s before/after
  let start, end;
  if (_clipInPoint !== null && _clipOutPoint !== null && _clipOutPoint > _clipInPoint) {
    start = _clipInPoint;
    end = _clipOutPoint;
  } else {
    start = Math.max(0, currentTime - 5);
    end = Math.min(duration, currentTime + 5);
  }

  _vjsPlayer.pause();

  document.getElementById('clipStart').value = fmtTime(start);
  document.getElementById('clipEnd').value = fmtTime(end);
  document.getElementById('clipAction').value = actionType;
  document.getElementById('clipNotes').value = '';
  _clipRating = null;
  document.getElementById('ratingPos').classList.remove('active');
  document.getElementById('ratingNeg').classList.remove('active');

  // Populate players
  const playersEl = document.getElementById('clipPlayers');
  playersEl.innerHTML = _roster.map(p =>
    `<div class="player-check" onclick="this.classList.toggle('selected');" data-player-id="${p.id}">
      <span>#${p.jersey_number || ''} ${esc(p.name)}</span>
    </div>`
  ).join('');

  _updateClipDuration();
  openModal('clipModal');
}

/* Parse "M:SS" or "MM:SS" or raw seconds back to float */
function parseTimeInput(str) {
  if (!str) return 0;
  str = str.trim();
  if (str.includes(':')) {
    const parts = str.split(':');
    return Math.max(0, parseInt(parts[0] || 0) * 60 + parseFloat(parts[1] || 0));
  }
  return Math.max(0, parseFloat(str) || 0);
}

/* +/- 1 second buttons */
function adjustClipTime(which, delta) {
  const el = document.getElementById(which === 'start' ? 'clipStart' : 'clipEnd');
  const duration = _vjsPlayer ? (_vjsPlayer.duration() || 9999) : 9999;
  let val = parseTimeInput(el.value) + delta;
  val = Math.max(0, Math.min(duration, val));
  el.value = fmtTime(val);
  _updateClipDuration();
}

/* When user manually edits the time input */
function onClipTimeChange() {
  const duration = _vjsPlayer ? (_vjsPlayer.duration() || 9999) : 9999;
  const startEl = document.getElementById('clipStart');
  const endEl = document.getElementById('clipEnd');
  let s = parseTimeInput(startEl.value);
  let e = parseTimeInput(endEl.value);
  s = Math.max(0, Math.min(duration, s));
  e = Math.max(s + 1, Math.min(duration, e)); // end must be > start
  startEl.value = fmtTime(s);
  endEl.value = fmtTime(e);
  _updateClipDuration();
}

function _updateClipDuration() {
  const s = parseTimeInput(document.getElementById('clipStart').value);
  const e = parseTimeInput(document.getElementById('clipEnd').value);
  const dur = Math.max(0, e - s);
  const badge = document.getElementById('clipDuration');
  if (badge) badge.textContent = dur < 60 ? `${Math.round(dur)}s` : `${fmtTime(dur)}`;
}

function setRating(rating) {
  _clipRating = _clipRating === rating ? null : rating;
  document.getElementById('ratingPos').classList.toggle('active', _clipRating === 'positive');
  document.getElementById('ratingNeg').classList.toggle('active', _clipRating === 'negative');
}

async function saveClip() {
  if (!_currentVideo) return;
  const selectedPlayers = [...document.querySelectorAll('#clipPlayers .player-check.selected')].map(el => parseInt(el.dataset.playerId));
  const startTime = parseTimeInput(document.getElementById('clipStart').value);
  const endTime = parseTimeInput(document.getElementById('clipEnd').value);

  try {
    const res = await API.post(`/api/scouting/videos/${_currentVideo.id}/clips`, {
      start_time: startTime,
      end_time: endTime,
      action_type: document.getElementById('clipAction').value,
      rating: _clipRating,
      notes: document.getElementById('clipNotes').value || null,
      player_ids: selectedPlayers,
    });
    Toast.success(t('scouting.clips.tagged'));
    closeModal('clipModal');

    // Reload clips
    const vRes = await API.get(`/api/scouting/videos/${_currentVideo.id}`);
    _clips = vRes.data.clips || [];
    renderClipsSidebar();
    renderTimelineMarkers(); renderAnnotationTrack();
  } catch (e) {
    Toast.error(t('scouting.clips.save_failed', { error: e.message || '' }));
  }
}

async function deleteClip(clipId) {
  if (!confirm(t('scouting.clips.confirm_delete'))) return;
  try {
    // Find clip time range before removing
    const clip = _clips.find(c => c.id === clipId);

    await API.del(`/api/scouting/clips/${clipId}`);
    _clips = _clips.filter(c => c.id !== clipId);

    // Delete annotations within the clip's time range
    if (clip) {
      const toRemove = telestrator.annotations.filter(a =>
        a.timestamp >= clip.start_time - 0.5 && a.timestamp <= clip.end_time + 0.5
      );
      for (const ann of toRemove) {
        try { await API.del(`/api/scouting/annotations/${ann.id}`); } catch (_) {}
      }
      telestrator.annotations = telestrator.annotations.filter(a =>
        !(a.timestamp >= clip.start_time - 0.5 && a.timestamp <= clip.end_time + 0.5)
      );
      telestrator.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
    }

    renderClipsSidebar();
    renderTimelineMarkers(); renderAnnotationTrack();
    Toast.success(t('scouting.clips.deleted'));
  } catch (e) { Toast.error(t('scouting.clips.delete_failed')); }
}

/* ═══ Share / Delete Video ════════════════════════════════ */
async function toggleShare() {
  if (!_currentVideo) return;
  if (_currentVideo.shared_with_team) {
    await API.post(`/api/scouting/videos/${_currentVideo.id}/unshare`);
    _currentVideo.shared_with_team = false;
    Toast.info(t('scouting.share.unshared'));
  } else {
    const teamId = _currentVideo.team_id || document.getElementById('uploadTeam')?.options[1]?.value;
    if (!teamId) { Toast.error(t('scouting.share.no_team')); return; }
    await API.post(`/api/scouting/videos/${_currentVideo.id}/share`, { team_id: parseInt(teamId) });
    _currentVideo.shared_with_team = true;
    Toast.success(t('scouting.share.shared_team'));
  }
  document.getElementById('shareBtn').innerHTML = _currentVideo.shared_with_team
    ? '<span class="material-symbols-outlined">visibility_off</span>'
    : '<span class="material-symbols-outlined">share</span>';
  _updateShareParentsBtn();
}

async function toggleShareParents() {
  if (!_currentVideo) return;
  if (_currentVideo.shared_with_parents) {
    await API.post(`/api/scouting/videos/${_currentVideo.id}/unshare-parents`);
    _currentVideo.shared_with_parents = false;
    Toast.info(t('scouting.share.unshared_parents'));
  } else {
    if (!_currentVideo.shared_with_team) {
      Toast.error(t('scouting.share.share_team_first'));
      return;
    }
    await API.post(`/api/scouting/videos/${_currentVideo.id}/share-parents`);
    _currentVideo.shared_with_parents = true;
    Toast.success(t('scouting.share.shared_parents'));
  }
  _updateShareParentsBtn();
}

function _updateShareParentsBtn() {
  const btn = document.getElementById('shareParentsBtn');
  if (!btn || !_currentVideo) return;
  btn.innerHTML = _currentVideo.shared_with_parents
    ? '<span class="material-symbols-outlined" style="color:#22c55e;">family_restroom</span>'
    : '<span class="material-symbols-outlined">family_restroom</span>';
  btn.title = _currentVideo.shared_with_parents ? t('scouting.share.parents_tooltip_unshare') : t('scouting.share.parents_tooltip_share');
}

function _updateExpiryUI() {
  const infoEl = document.getElementById('videoExpiryInfo');
  const btn = document.getElementById('keepForeverBtn');
  if (!_currentVideo || !infoEl || !btn) return;
  if (_currentVideo.keep_forever) {
    infoEl.textContent = t('scouting.expiry.permanent');
    infoEl.className = 'video-expiry-info permanent';
    btn.innerHTML = '<span class="material-symbols-outlined" style="color:#22c55e;">all_inclusive</span>';
    btn.title = t('scouting.expiry.remove_permanent_tooltip');
  } else if (_currentVideo.expires_at) {
    const exp = new Date(_currentVideo.expires_at.endsWith('Z') ? _currentVideo.expires_at : _currentVideo.expires_at + 'Z');
    const diffH = Math.max(0, (exp - new Date()) / 3600000);
    if (diffH <= 48) {
      infoEl.textContent = t('scouting.badge.hours_left', { count: Math.ceil(diffH) });
      infoEl.className = 'video-expiry-info urgent';
    } else {
      infoEl.textContent = t('scouting.badge.days_left', { count: Math.ceil(diffH / 24) });
      infoEl.className = 'video-expiry-info';
    }
    btn.innerHTML = '<span class="material-symbols-outlined">all_inclusive</span>';
    btn.title = t('scouting.expiry.keep_forever_tooltip');
  } else {
    infoEl.textContent = '';
    btn.innerHTML = '<span class="material-symbols-outlined">all_inclusive</span>';
    btn.title = t('scouting.expiry.keep_forever_tooltip');
  }
}

async function toggleKeepForever() {
  if (!_currentVideo) return;
  const newVal = !_currentVideo.keep_forever;
  try {
    await API.put(`/api/scouting/videos/${_currentVideo.id}`, { keep_forever: newVal });
    _currentVideo.keep_forever = newVal;
    if (newVal) {
      _currentVideo.expires_at = null;
      Toast.success(t('scouting.expiry.keep_forever'));
    } else {
      // Server sets expires_at to now+14d, approximate locally
      const exp = new Date();
      exp.setDate(exp.getDate() + 14);
      _currentVideo.expires_at = exp.toISOString();
      Toast.info(t('scouting.expiry.auto_delete'));
    }
    _updateExpiryUI();
  } catch (e) { Toast.error(t('scouting.expiry.update_failed')); }
}

async function deleteCurrentVideo() {
  if (!_currentVideo) return;
  if (!confirm(t('scouting.video.confirm_delete'))) return;
  try {
    await API.del(`/api/scouting/videos/${_currentVideo.id}`);
    Toast.success(t('scouting.video.deleted'));
    backToGrid();
    loadVideos();
  } catch (e) { Toast.error(t('scouting.video.delete_failed')); }
}

/* telestrator → scouting-telestrator.js */

/* ═══ Drawing Toolbar Helpers ═════════════════════════════ */
function setDrawTool(btn) {
  const tool = btn.dataset.tool;
  document.querySelectorAll('.draw-tool-btn[data-tool]').forEach(b => b.classList.remove('active'));

  // If switching away from spotlight with pending keyframes, discard them
  if (telestrator.tool === 'spotlight' && tool !== 'spotlight' && telestrator._spotlightKeyframes.length > 0) {
    if (!confirm(t('scouting.spotlight.discard'))) return;
    telestrator._spotlightKeyframes = [];
    telestrator._updateSpotlightUI();
  }

  if (telestrator.tool === tool) {
    telestrator.setTool(null);
  } else {
    btn.classList.add('active');
    telestrator.setTool(tool);
  }
}

function finishSpotlight() {
  telestrator.saveSpotlight();
}

function setDrawColor(color) { telestrator.setColor(color); }

/* ═══ Player Marker Helpers (Phase 2.1) ═══════════════════ */
function setPlayerMarkerNumber(num) {
  _playerMarkerNumber = num;
  document.querySelectorAll('.pm-num-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.num) === num));
}
function setPlayerMarkerTeam(team) {
  _playerMarkerTeam = team;
  document.querySelectorAll('.pm-team-btn').forEach(b => b.classList.toggle('active', b.dataset.team === team));
}
function togglePlayerMarkerPopover() {
  const pop = document.getElementById('playerMarkerPopover');
  if (pop) pop.classList.toggle('active');
}

/* ═══ Court Overlay Toggle (Phase 2.2) ═════════════════════ */
function toggleCourtOverlay() {
  telestrator.courtOverlayVisible = !telestrator.courtOverlayVisible;
  document.getElementById('courtOverlayBtn')?.classList.toggle('active', telestrator.courtOverlayVisible);
  telestrator.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
}
function setStrokeWidth(val) {
  telestrator.strokeWidth = parseInt(val) || 3;
  const preview = document.getElementById('strokeWidthPreview');
  if (preview) { preview.style.width = val + 'px'; preview.style.height = val + 'px'; }
}
function setDrawOpacity(val) {
  telestrator.opacity = parseInt(val) / 100;
  telestrator.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
}
function undoDraw() { telestrator.undo(); }
function clearDrawings() {
  if (confirm(t('scouting.draw.clear_confirm'))) telestrator.clearAll();
}

/* ═══ Playlists (Phase 3.1) ═════════════════════════════════ */
let _playlists = [];
let _activePlaylist = null;
let _clipSidebarTab = 'clips'; // 'clips' or 'playlists'
let _clipFilterType = ''; // action_type filter for clips sidebar

async function loadPlaylists() {
  try {
    const res = await API.get('/api/scouting/playlists', { silent: true });
    _playlists = res.data || [];
    if (_clipSidebarTab === 'playlists') renderPlaylistsSidebar();
  } catch (e) { /* playlists not available yet */ }
}

function switchClipSidebarTab(tab) {
  _clipSidebarTab = tab;
  document.querySelectorAll('.clips-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  if (tab === 'clips') {
    renderClipsSidebar();
  } else {
    renderPlaylistsSidebar();
  }
}

function renderPlaylistsSidebar() {
  const el = document.getElementById('clipsList');
  if (!_playlists.length) {
    el.innerHTML = `<div style="text-align:center;padding:var(--sp-4);">
      <p style="color:var(--text-muted);font-size:0.82rem;">${t('scouting.playlist.empty')}</p>
      <button class="btn btn-primary btn-sm" onclick="createPlaylistPrompt()" style="margin-top:var(--sp-2);">${t('scouting.playlist.create')}</button>
    </div>`;
    return;
  }
  el.innerHTML = _playlists.map(p => `
    <div class="clip-card playlist-card" data-playlist-id="${p.id}">
      <div class="clip-card-header">
        <span class="clip-card-action">📋 ${esc(p.name)}</span>
        <span style="color:var(--text-muted);font-size:0.72rem;">${t('scouting.playlist.clips', { count: p.item_count })}</span>
      </div>
      <div style="display:flex;gap:4px;margin-top:4px;">
        <button class="btn btn-ghost" style="font-size:0.68rem;padding:2px 6px;" onclick="event.stopPropagation(); deletePlaylist(${p.id})">Delete</button>
      </div>
    </div>
  `).join('') + `<button class="btn btn-ghost" onclick="createPlaylistPrompt()" style="width:100%;margin-top:var(--sp-2);font-size:0.78rem;">${t('scouting.playlist.new')}</button>`;
}

async function createPlaylistPrompt() {
  const name = prompt(t('scouting.playlist.prompt'));
  if (!name) return;
  try {
    await API.post('/api/scouting/playlists', { name });
    Toast.success(t('scouting.playlist.created'));
    loadPlaylists();
  } catch (e) { Toast.error(t('scouting.playlist.create_failed')); }
}

async function deletePlaylist(id) {
  if (!confirm(t('scouting.playlist.confirm_delete'))) return;
  try {
    await API.del(`/api/scouting/playlists/${id}`);
    _playlists = _playlists.filter(p => p.id !== id);
    renderPlaylistsSidebar();
    Toast.success(t('scouting.playlist.deleted'));
  } catch (e) { Toast.error(t('scouting.playlist.delete_failed')); }
}

async function addClipToPlaylist(clipId) {
  if (!_playlists.length) {
    Toast.error(t('scouting.playlist.create_first'));
    return;
  }
  // Simple: add to first playlist. TODO: playlist selector
  const pl = _playlists[0];
  try {
    await API.post(`/api/scouting/playlists/${pl.id}/items`, { clip_id: clipId });
    Toast.success(t('scouting.playlist.added', { name: pl.name }));
    loadPlaylists();
  } catch (e) { Toast.error(t('scouting.playlist.add_failed')); }
}

/* ═══ Batch Clip Operations (Phase 3.3) ════════════════════ */
let _selectedClipIds = new Set();

function toggleClipSelection(clipId, e) {
  e.stopPropagation();
  if (_selectedClipIds.has(clipId)) {
    _selectedClipIds.delete(clipId);
  } else {
    _selectedClipIds.add(clipId);
  }
  _updateBatchBar();
  document.querySelector(`[data-clip-id="${clipId}"]`)?.classList.toggle('batch-selected', _selectedClipIds.has(clipId));
}

function selectAllClips() {
  _clips.forEach(c => _selectedClipIds.add(c.id));
  _updateBatchBar();
  document.querySelectorAll('.clip-card').forEach(c => c.classList.add('batch-selected'));
}

function deselectAllClips() {
  _selectedClipIds.clear();
  _updateBatchBar();
  document.querySelectorAll('.clip-card').forEach(c => c.classList.remove('batch-selected'));
}

function _updateBatchBar() {
  const bar = document.getElementById('batchBar');
  if (!bar) return;
  if (_selectedClipIds.size > 0) {
    bar.style.display = 'flex';
    bar.querySelector('.batch-count').textContent = t('scouting.batch.selected', { count: _selectedClipIds.size });
  } else {
    bar.style.display = 'none';
  }
}

async function batchDeleteClips() {
  if (!_selectedClipIds.size) return;
  if (!confirm(t('scouting.batch.delete_confirm', { count: _selectedClipIds.size }))) return;
  try {
    await API.post('/api/scouting/clips/batch-delete', { clip_ids: [..._selectedClipIds] });
    _clips = _clips.filter(c => !_selectedClipIds.has(c.id));
    _selectedClipIds.clear();
    renderClipsSidebar();
    renderTimelineMarkers(); renderAnnotationTrack();
    _updateBatchBar();
    Toast.success(t('scouting.batch.deleted'));
  } catch (e) { Toast.error(t('scouting.batch.delete_failed')); }
}

async function batchRateClips(rating) {
  if (!_selectedClipIds.size) return;
  try {
    await API.post('/api/scouting/clips/batch-update', { clip_ids: [..._selectedClipIds], rating });
    _clips.forEach(c => { if (_selectedClipIds.has(c.id)) c.rating = rating; });
    renderClipsSidebar();
    Toast.success(t('scouting.batch.updated'));
  } catch (e) { Toast.error(t('scouting.batch.update_failed')); }
}

/* ═══ Phase 4.1: Zoom Controls ═════════════════════════════ */
function zoomIn() { telestrator.setZoom(telestrator.zoom + 0.5); }
function zoomOut() { telestrator.setZoom(telestrator.zoom - 0.5); }
function resetZoom() { telestrator.resetZoom(); }

function _updateZoomBadge() {
  const badge = document.getElementById('zoomBadge');
  if (!badge) return;
  if (telestrator.zoom > 1) {
    badge.textContent = `${telestrator.zoom.toFixed(1)}x`;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

/* ═══ Phase 4.2: Side-by-Side Comparison ═══════════════════ */
let _comparisonMode = false;
let _compPlayer2 = null;

function toggleComparisonMode() {
  _comparisonMode = !_comparisonMode;
  const layout = document.querySelector('.analysis-layout');
  const compPanel = document.getElementById('comparisonPanel');
  const compBtn = document.getElementById('comparisonBtn');

  if (_comparisonMode) {
    layout?.classList.add('comparison-mode');
    if (compPanel) compPanel.style.display = '';
    if (compBtn) compBtn.classList.add('active');
    _initComparisonPlayer();
  } else {
    layout?.classList.remove('comparison-mode');
    if (compPanel) compPanel.style.display = 'none';
    if (compBtn) compBtn.classList.remove('active');
    _disposeComparisonPlayer();
  }
}

function _initComparisonPlayer() {
  const container = document.getElementById('compVideo2Container');
  if (!container) return;
  container.innerHTML = '<video id="compPlayer2" class="video-js vjs-default-skin" playsinline></video>';
  // Don't init until user picks a video
}

function loadComparisonVideo(videoId) {
  const video = _videos.find(v => v.id === parseInt(videoId));
  if (!video) return;

  if (_compPlayer2) { _compPlayer2.dispose(); _compPlayer2 = null; }

  const container = document.getElementById('compVideo2Container');
  container.innerHTML = '<video id="compPlayer2" class="video-js vjs-default-skin" playsinline></video>';

  const sources = [];
  if (video.cloudinary_hls_url) sources.push({ src: video.cloudinary_hls_url, type: 'application/x-mpegURL' });
  if (video.cloudinary_url) sources.push({ src: video.cloudinary_url, type: 'video/mp4' });

  if (!sources.length) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--text-muted);flex-direction:column;gap:var(--sp-2);">
      <span class="material-symbols-outlined" style="font-size:36px;">videocam_off</span>
      <p>לא ניתן לטעון את הווידאו</p>
    </div>`;
    return;
  }

  _compPlayer2 = videojs('compPlayer2', {
    controls: true,
    fluid: true,
    sources: sources,
    html5: { vhs: { overrideNative: false }, nativeAudioTracks: true, nativeVideoTracks: true },
  });

  document.getElementById('compTitle2').textContent = video.title;

  // Sync controls
  const syncCheckbox = document.getElementById('compSync');
  if (syncCheckbox?.checked) _setupCompSync();
}

function _setupCompSync() {
  if (!_vjsPlayer || !_compPlayer2) return;
  _vjsPlayer.on('play', () => { if (document.getElementById('compSync')?.checked) _compPlayer2.play(); });
  _vjsPlayer.on('pause', () => { if (document.getElementById('compSync')?.checked) _compPlayer2.pause(); });
  _vjsPlayer.on('seeked', () => {
    if (document.getElementById('compSync')?.checked) _compPlayer2.currentTime(_vjsPlayer.currentTime());
  });
}

function _disposeComparisonPlayer() {
  if (_compPlayer2) { _compPlayer2.dispose(); _compPlayer2 = null; }
}

/* ═══ Phase 4.3: Clip Export (burn-in annotations) ═════════ */
let _exporting = false;

async function exportClipWithAnnotations() {
  if (_exporting) return;
  if (!_vjsPlayer || !_currentVideo) { Toast.error(t('scouting.export.no_video')); return; }

  // Use I/O points or currently playing clip
  let startTime = _clipInPoint;
  let endTime = _clipOutPoint;
  if (startTime === null || endTime === null || endTime <= startTime) {
    // Try to find the active clip
    const activeCard = document.querySelector('.clip-card.active');
    if (activeCard) {
      const clipId = parseInt(activeCard.dataset.clipId);
      const clip = _clips.find(c => c.id === clipId);
      if (clip) { startTime = clip.start_time; endTime = clip.end_time; }
    }
  }
  if (startTime === null || endTime === null || endTime <= startTime) {
    Toast.error('Set In/Out points (I/O keys) or select a clip first');
    return;
  }

  _exporting = true;
  const exportBtn = document.getElementById('exportBtn');
  const progressBar = document.getElementById('exportProgress');
  if (exportBtn) exportBtn.disabled = true;
  if (progressBar) progressBar.style.display = '';

  try {
    // Create hidden compositing canvas
    const videoEl = _vjsPlayer.tech({ IWillNotUseThisInPlugins: true })?.el_;
    if (!videoEl) throw new Error('Cannot access video element');

    const vw = videoEl.videoWidth || 1280;
    const vh = videoEl.videoHeight || 720;
    const compCanvas = document.createElement('canvas');
    compCanvas.width = vw;
    compCanvas.height = vh;
    const compCtx = compCanvas.getContext('2d');

    // Setup MediaRecorder
    const stream = compCanvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm',
      videoBitsPerSecond: 5000000,
    });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    const exportDone = new Promise((resolve) => { recorder.onstop = resolve; });

    // Seek to start and play at 1x
    _vjsPlayer.playbackRate(1);
    _vjsPlayer.currentTime(startTime);
    await new Promise(r => setTimeout(r, 300)); // wait for seek

    recorder.start();
    _vjsPlayer.play();

    const duration = endTime - startTime;

    // Frame capture loop
    const captureFrame = () => {
      if (!_exporting) { recorder.stop(); return; }
      const t = _vjsPlayer.currentTime();

      if (t >= endTime) {
        _vjsPlayer.pause();
        recorder.stop();
        return;
      }

      // Draw video frame
      compCtx.drawImage(videoEl, 0, 0, vw, vh);

      // Draw annotations at current time (scale from display canvas to export canvas)
      const origW = telestrator.canvas.width;
      const origH = telestrator.canvas.height;
      telestrator.canvas.width = vw;
      telestrator.canvas.height = vh;
      telestrator.renderFrame(t);
      compCtx.drawImage(telestrator.canvas, 0, 0);
      telestrator.canvas.width = origW;
      telestrator.canvas.height = origH;

      // Update progress
      const pct = Math.round(((t - startTime) / duration) * 100);
      if (progressBar) progressBar.querySelector('.export-progress-fill').style.width = pct + '%';

      requestAnimationFrame(captureFrame);
    };
    requestAnimationFrame(captureFrame);

    await exportDone;

    // Create download
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${_currentVideo.title || 'clip'}_export.webm`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('Export complete!');

  } catch (e) {
    console.error('Export error:', e);
    Toast.error('Export failed: ' + (e.message || ''));
  } finally {
    _exporting = false;
    _vjsPlayer.pause();
    if (exportBtn) exportBtn.disabled = false;
    if (progressBar) progressBar.style.display = 'none';
    // Restore canvas size
    telestrator._resizeCanvas();
    telestrator.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
  }
}

function cancelExport() {
  _exporting = false;
}

/* ═══ Utilities ═══════════════════════════════════════════ */
function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/* esc → shared-utils.js */
