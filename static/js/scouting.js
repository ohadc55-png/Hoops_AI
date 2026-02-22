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

/* ═══ ACTION TYPES ════════════════════════════════════════ */
const ACTION_TYPES = [
  { value: 'pick_and_roll', label: 'Pick & Roll' },
  { value: 'isolation', label: 'Isolation' },
  { value: 'fast_break', label: 'Fast Break' },
  { value: 'defense', label: 'Defense' },
  { value: 'transition', label: 'Transition' },
  { value: 'three_pointer', label: '3-Pointer' },
  { value: 'post_up', label: 'Post Up' },
  { value: 'screen', label: 'Screen' },
  { value: 'turnover', label: 'Turnover' },
  { value: 'rebound', label: 'Rebound' },
  { value: 'free_throw', label: 'Free Throw' },
  { value: 'out_of_bounds', label: 'Out of Bounds' },
  { value: 'other', label: 'Other' },
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
    const res = await API.get('/api/scouting/upload-config');
    _cloudinaryConfig = res.data;
  } catch (e) { console.error('Cloudinary config error:', e); }
}

async function loadRoster() {
  try {
    const res = await API.get('/api/scouting/players');
    _roster = res.data || [];
  } catch (e) { console.error('Roster error:', e); }
}

async function loadTeams() {
  try {
    const res = await API.get('/api/my-teams');
    const teams = res.data || [];
    const sel = document.getElementById('uploadTeam');
    teams.forEach(t => {
      const o = document.createElement('option');
      o.value = t.id;
      o.textContent = t.name;
      sel.appendChild(o);
    });
  } catch (e) { console.error('Teams error:', e); }
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
    document.getElementById('videoGrid').innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;">Failed to load videos</p>';
  }
}

function _expiryBadge(v) {
  if (v.keep_forever) return '<span class="video-card-badge video-card-permanent">Permanent</span>';
  if (!v.expires_at) return '';
  const exp = new Date(v.expires_at.endsWith('Z') ? v.expires_at : v.expires_at + 'Z');
  const now = new Date();
  const diffH = Math.max(0, (exp - now) / 3600000);
  if (diffH <= 0) return '<span class="video-card-badge video-card-expiry-urgent">Expired</span>';
  if (diffH <= 48) return `<span class="video-card-badge video-card-expiry-urgent">${Math.ceil(diffH)}h left</span>`;
  const days = Math.ceil(diffH / 24);
  return `<span class="video-card-badge video-card-expiry">${days}d left</span>`;
}

function renderVideoGrid() {
  const grid = document.getElementById('videoGrid');
  if (!_videos.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:var(--sp-8);color:var(--text-muted);">
      <span class="material-symbols-outlined" style="font-size:3rem;display:block;margin-bottom:var(--sp-2);">videocam_off</span>
      No videos yet. Upload your first game footage!</div>`;
    return;
  }
  grid.innerHTML = _videos.map(v => {
    const thumb = v.thumbnail_url
      ? `<img class="video-card-thumb" src="${v.thumbnail_url}" alt="${v.title}" loading="lazy">`
      : `<div class="video-card-thumb-placeholder"><span class="material-symbols-outlined">videocam</span></div>`;
    const shared = v.shared_with_team ? `<span class="video-card-badge video-card-shared">Shared</span>` : '';
    const parentShared = v.shared_with_parents ? `<span class="video-card-badge video-card-parent-shared">Parents</span>` : '';
    const expiryBadge = _expiryBadge(v);
    const type = v.video_type.replace('_', ' ');
    return `<div class="video-card" onclick="openVideo(${v.id})">
      ${thumb}
      <div class="video-card-body">
        <div class="video-card-title">${esc(v.title)}</div>
        <div class="video-card-meta">
          <span class="video-card-badge">${type}</span>
          ${v.opponent ? `<span>vs ${esc(v.opponent)}</span>` : ''}
          <span>${v.clip_count} clips</span>
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
    const res = await API.get(`/api/scouting/quota?team_id=${teamId}`);
    const d = res.data;
    const usedGB = (d.storage_used_bytes / (1024*1024*1024)).toFixed(1);
    const limitGB = (d.storage_limit_bytes / (1024*1024*1024)).toFixed(0);
    const pct = Math.min(100, (d.storage_used_bytes / d.storage_limit_bytes) * 100);
    document.getElementById('quotaBar').innerHTML = `Storage: ${usedGB} GB / ${limitGB} GB used <div class="quota-fill"><div class="quota-fill-inner" style="width:${pct}%"></div></div>`;
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
    Toast.error('Invalid file type. Use MP4, MOV, or WebM.');
    return;
  }
  if (file.size > 100 * 1024 * 1024) {
    Toast.error('File too large (max 100MB).');
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
    <p>Drag & drop video or click to browse</p>
    <p style="font-size:0.75rem;color:var(--text-muted);">MP4, MOV, WebM — up to 500MB</p>`;
  document.getElementById('uploadTitle').value = '';
  document.getElementById('uploadOpponent').value = '';
  document.getElementById('uploadDate').value = '';
  openModal('uploadModal');
}

async function submitUpload() {
  if (!_pendingFile || !_cloudinaryConfig) return;
  if (!_cloudinaryConfig.cloud_name) {
    Toast.error('Cloudinary not configured. Restart the server after adding credentials to .env');
    return;
  }

  const btn = document.getElementById('uploadSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Uploading...';
  _uploadAborted = false;

  const progressDiv = document.getElementById('uploadProgress');
  const progressFill = document.getElementById('uploadProgressFill');
  const progressText = document.getElementById('uploadProgressText');
  progressDiv.classList.add('active');
  progressFill.style.width = '0%';
  progressText.textContent = 'Uploading... 0%';

  const updateProgress = (pct, text) => {
    progressFill.style.width = pct + '%';
    progressText.textContent = text || `Uploading... ${pct}%`;
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
    updateProgress(100, 'Saving to library...');
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
    Toast.success('Video uploaded successfully!');
    closeModal('uploadModal');
    loadVideos();
  } catch (e) {
    if (!_uploadAborted) {
      Toast.error(e.message || 'Upload failed');
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
        let msg = 'Upload failed';
        try { msg = JSON.parse(xhr.responseText).error?.message || msg; } catch {}
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error('Network error — check your connection and try again'));
    xhr.ontimeout = () => reject(new Error('Upload timed out — try again or check your connection'));

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
    if (_uploadAborted) throw new Error('Upload cancelled');

    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunk = file.slice(start, end);
    const isLast = (i === totalChunks - 1);

    onProgress(
      Math.round((start / totalSize) * 100),
      `Uploading chunk ${i + 1}/${totalChunks}...`
    );

    lastResponse = await uploadChunkWithRetry(chunk, start, end - 1, totalSize, uniqueId, 3);
  }

  if (!lastResponse || !lastResponse.public_id) {
    throw new Error('Upload completed but no valid response received');
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
  throw new Error(`Upload failed after ${maxRetries} retries: ${lastError?.message || 'Unknown error'}`);
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
        let msg = `Chunk upload failed (HTTP ${xhr.status})`;
        try { msg = JSON.parse(xhr.responseText).error?.message || msg; } catch {}
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Chunk upload timed out'));

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
  } catch (e) {
    Toast.error('Failed to load video');
  }
}

function backToGrid() {
  document.getElementById('analysisView').classList.remove('active');
  document.getElementById('gridView').style.display = '';
  if (_vjsPlayer) {
    _vjsPlayer.pause();
  }
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
    constructor(player, options) { super(player, options); this.controlText('Back 5s'); }
    buildCSSClass() { return 'vjs-skip-btn vjs-skip-back ' + super.buildCSSClass(); }
    handleClick() { skipTime(-5); }
  }
  class SkipFwdBtn extends VjsButton {
    constructor(player, options) { super(player, options); this.controlText('Forward 5s'); }
    buildCSSClass() { return 'vjs-skip-btn vjs-skip-fwd ' + super.buildCSSClass(); }
    handleClick() { skipTime(5); }
  }
  _vjsPlayer.controlBar.addChild(new SkipBackBtn(_vjsPlayer), {}, 1);
  _vjsPlayer.controlBar.addChild(new SkipFwdBtn(_vjsPlayer), {}, 2);

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
  const bar = document.getElementById('timelineBar');
  const duration = _vjsPlayer?.duration() || _currentVideo?.duration_seconds || 1;

  _clips.forEach(c => {
    const pct = (c.start_time / duration) * 100;
    const marker = document.createElement('div');
    marker.className = 'timeline-marker ' + (c.rating === 'positive' ? 'positive' : c.rating === 'negative' ? 'negative' : 'neutral');
    marker.style.left = `calc(${pct}% - 2px)`;
    marker.title = `${c.action_type.replace(/_/g, ' ')} (${fmtTime(c.start_time)})`;
    marker.onclick = (e) => { e.stopPropagation(); if (_vjsPlayer) _vjsPlayer.currentTime(c.start_time); };
    bar.appendChild(marker);
  });
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
  text: '#FBBF24', spotlight: '#FFD700',
};
const ANN_LABELS = {
  freehand: '✏️', arrow: '➡️', circle: '⭕', text: '📝', spotlight: '💡',
};
let _selectedAnnIdx = -1;

const ANN_TYPE_NAMES = {
  freehand: 'Draw', arrow: 'Arrow', circle: 'Circle', text: 'Text', spotlight: 'Spotlight',
};

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
    Toast.success('Annotation deleted');
  } catch (e) { Toast.error('Failed to delete'); }
}

// Delete key support for selected annotation
document.addEventListener('keydown', (e) => {
  if (e.key === 'Delete' && _selectedAnnIdx >= 0) {
    // Don't delete if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    deleteAnnotation(_selectedAnnIdx);
  }
});

/* ═══ Clips Sidebar ═══════════════════════════════════════ */
function renderClipsSidebar() {
  const el = document.getElementById('clipsList');
  document.getElementById('clipCount').textContent = `(${_clips.length})`;

  if (!_clips.length) {
    el.innerHTML = '<p style="color:var(--text-muted);text-align:center;font-size:0.82rem;padding:var(--sp-4);">No clips yet. Use the tag buttons below the video to create clips.</p>';
    return;
  }

  el.innerHTML = _clips.map(c => {
    const action = ACTION_TYPES.find(a => a.value === c.action_type)?.label || c.action_type;
    const rating = c.rating === 'positive' ? '👍' : c.rating === 'negative' ? '👎' : '';
    const players = (c.player_tags || []).map(t => `<span class="clip-player-chip">#${t.name || t.player_id}</span>`).join('');
    return `<div class="clip-card" onclick="jumpToClip(${c.id})" data-clip-id="${c.id}">
      <div class="clip-card-header">
        <span class="clip-card-action">${esc(action)} <span class="clip-card-rating">${rating}</span></span>
        <button class="btn-icon" style="font-size:0.7rem;" onclick="event.stopPropagation();deleteClip(${c.id})"><span class="material-symbols-outlined" style="font-size:1rem;">delete</span></button>
      </div>
      <div class="clip-card-time">${fmtTime(c.start_time)} — ${fmtTime(c.end_time)}</div>
      ${players ? `<div class="clip-card-players">${players}</div>` : ''}
      <div class="clip-watch-count">Watched: ${c.watch_count || 0}</div>
    </div>`;
  }).join('');
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
  // Default: 5s before, 5s after (10s total), clamped to video bounds
  const start = Math.max(0, currentTime - 5);
  const end = Math.min(duration, currentTime + 5);

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
    Toast.success('Clip tagged!');
    closeModal('clipModal');

    // Reload clips
    const vRes = await API.get(`/api/scouting/videos/${_currentVideo.id}`);
    _clips = vRes.data.clips || [];
    renderClipsSidebar();
    renderTimelineMarkers(); renderAnnotationTrack();
  } catch (e) {
    Toast.error('Failed to save clip: ' + (e.message || ''));
  }
}

async function deleteClip(clipId) {
  if (!confirm('Delete this clip and its annotations?')) return;
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
    Toast.success('Clip deleted');
  } catch (e) { Toast.error('Failed to delete clip'); }
}

/* ═══ Share / Delete Video ════════════════════════════════ */
async function toggleShare() {
  if (!_currentVideo) return;
  if (_currentVideo.shared_with_team) {
    await API.post(`/api/scouting/videos/${_currentVideo.id}/unshare`);
    _currentVideo.shared_with_team = false;
    Toast.info('Video unshared');
  } else {
    const teamId = _currentVideo.team_id || document.getElementById('uploadTeam')?.options[1]?.value;
    if (!teamId) { Toast.error('No team selected'); return; }
    await API.post(`/api/scouting/videos/${_currentVideo.id}/share`, { team_id: parseInt(teamId) });
    _currentVideo.shared_with_team = true;
    Toast.success('Video shared with team!');
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
    Toast.info('Video unshared from parents');
  } else {
    if (!_currentVideo.shared_with_team) {
      Toast.error('Share with team first before sharing with parents');
      return;
    }
    await API.post(`/api/scouting/videos/${_currentVideo.id}/share-parents`);
    _currentVideo.shared_with_parents = true;
    Toast.success('Video shared with parents!');
  }
  _updateShareParentsBtn();
}

function _updateShareParentsBtn() {
  const btn = document.getElementById('shareParentsBtn');
  if (!btn || !_currentVideo) return;
  btn.innerHTML = _currentVideo.shared_with_parents
    ? '<span class="material-symbols-outlined" style="color:#22c55e;">family_restroom</span>'
    : '<span class="material-symbols-outlined">family_restroom</span>';
  btn.title = _currentVideo.shared_with_parents ? 'Unshare from parents' : 'Share with parents';
}

function _updateExpiryUI() {
  const infoEl = document.getElementById('videoExpiryInfo');
  const btn = document.getElementById('keepForeverBtn');
  if (!_currentVideo || !infoEl || !btn) return;
  if (_currentVideo.keep_forever) {
    infoEl.textContent = 'Permanent';
    infoEl.className = 'video-expiry-info permanent';
    btn.innerHTML = '<span class="material-symbols-outlined" style="color:#22c55e;">all_inclusive</span>';
    btn.title = 'Remove permanent — auto-delete in 14 days';
  } else if (_currentVideo.expires_at) {
    const exp = new Date(_currentVideo.expires_at.endsWith('Z') ? _currentVideo.expires_at : _currentVideo.expires_at + 'Z');
    const diffH = Math.max(0, (exp - new Date()) / 3600000);
    if (diffH <= 48) {
      infoEl.textContent = `${Math.ceil(diffH)}h left`;
      infoEl.className = 'video-expiry-info urgent';
    } else {
      infoEl.textContent = `${Math.ceil(diffH / 24)}d left`;
      infoEl.className = 'video-expiry-info';
    }
    btn.innerHTML = '<span class="material-symbols-outlined">all_inclusive</span>';
    btn.title = 'Keep forever';
  } else {
    infoEl.textContent = '';
    btn.innerHTML = '<span class="material-symbols-outlined">all_inclusive</span>';
    btn.title = 'Keep forever';
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
      Toast.success('Video will be kept permanently');
    } else {
      // Server sets expires_at to now+14d, approximate locally
      const exp = new Date();
      exp.setDate(exp.getDate() + 14);
      _currentVideo.expires_at = exp.toISOString();
      Toast.info('Video will auto-delete in 14 days');
    }
    _updateExpiryUI();
  } catch (e) { Toast.error('Failed to update'); }
}

async function deleteCurrentVideo() {
  if (!_currentVideo) return;
  if (!confirm('Delete this video and all its clips?')) return;
  try {
    await API.del(`/api/scouting/videos/${_currentVideo.id}`);
    Toast.success('Video deleted');
    backToGrid();
    loadVideos();
  } catch (e) { Toast.error('Failed to delete video'); }
}

/* ═══ Telestrator (Canvas Drawing) ════════════════════════ */
const telestrator = {
  canvas: null,
  ctx: null,
  videoEl: null,
  tool: null,       // null = off, 'freehand', 'arrow', 'circle', 'text', 'spotlight'
  color: '#FF0000',
  strokeWidth: 3,
  annotations: [],  // loaded from server
  isDrawing: false,
  currentStroke: null,
  _raf: null,
  _spotlightKeyframes: [],  // [{t, x, y}] — keyframes being built

  init(videoEl, canvasEl) {
    this.videoEl = videoEl;
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.annotations = _annotations || [];
    this._resizeCanvas();

    // ResizeObserver to sync canvas with video
    if (this._ro) this._ro.disconnect();
    this._ro = new ResizeObserver(() => {
      this._resizeCanvas();
      // Re-draw annotations after resize (canvas.width/height assignment clears content)
      this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
    });
    this._ro.observe(canvasEl.parentElement);

    // Pointer events
    canvasEl.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvasEl.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvasEl.addEventListener('pointerup', (e) => this.onPointerUp(e));
    canvasEl.addEventListener('pointerleave', (e) => { if (this.isDrawing) this.onPointerUp(e); });

    // Click-to-edit text annotations — works even without text tool active.
    // Uses capture phase so it fires BEFORE Video.js play/pause toggle.
    const container = canvasEl.parentElement;
    if (!this._containerTextClickBound) {
      container.addEventListener('pointerdown', (e) => {
        if (this.tool) return;              // canvas onPointerDown handles it
        if (this._textEditorEl) return;     // editor already open
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
        const pct = { x: x / rect.width * 100, y: y / rect.height * 100 };
        const hitAnn = this._hitTestTextAnnotation(pct);
        if (hitAnn) {
          e.stopPropagation();
          e.preventDefault();
          if (_vjsPlayer && !_vjsPlayer.paused()) _vjsPlayer.pause();
          this._openTextEditor(
            { x: hitAnn.stroke_data.x, y: hitAnn.stroke_data.y },
            hitAnn.timestamp,
            hitAnn
          );
        }
      }, true); // capture phase

      // Cursor hint: show pointer when hovering over editable text annotation
      container.addEventListener('mousemove', (e) => {
        if (this.tool || this._textEditorEl) { container.style.cursor = ''; return; }
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) { container.style.cursor = ''; return; }
        const pct = { x: x / rect.width * 100, y: y / rect.height * 100 };
        container.style.cursor = this._hitTestTextAnnotation(pct) ? 'pointer' : '';
      });

      this._containerTextClickBound = true;
    }
  },

  _resizeCanvas() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
  },

  setTool(tool) {
    // Close text editor if switching away
    if (this._textEditorEl && tool !== 'text') this._closeTextEditor();
    this.tool = this.tool === tool ? null : tool;
    this.canvas.classList.toggle('drawing', !!this.tool);
  },

  setColor(color) { this.color = color; },

  toPercent(x, y) {
    return { x: x / this.canvas.width * 100, y: y / this.canvas.height * 100 };
  },

  toPixel(px, py) {
    return { x: px / 100 * this.canvas.width, y: py / 100 * this.canvas.height };
  },

  onPointerDown(e) {
    if (!this.tool) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pct = this.toPercent(x, y);

    // Auto-pause
    if (_vjsPlayer && !_vjsPlayer.paused()) _vjsPlayer.pause();

    // ── Spotlight: each click = one keyframe ──
    if (this.tool === 'spotlight') {
      const t = _vjsPlayer ? _vjsPlayer.currentTime() : 0;
      this._spotlightKeyframes.push({ t, x: pct.x, y: pct.y });
      this._updateSpotlightUI();
      this._drawSpotlightPreview();
      return;
    }

    // ── Text: open floating editor instead of prompt ──
    if (this.tool === 'text') {
      if (this._textEditorEl) return; // editor already open
      // Check if clicking on an existing text annotation → edit it
      const hitAnn = this._hitTestTextAnnotation(pct);
      if (hitAnn) {
        this._openTextEditor(
          { x: hitAnn.stroke_data.x, y: hitAnn.stroke_data.y },
          hitAnn.timestamp,
          hitAnn
        );
      } else {
        this._openTextEditor(pct, _vjsPlayer ? _vjsPlayer.currentTime() : 0, null);
      }
      return;
    }

    this.isDrawing = true;
    this.currentStroke = {
      tool: this.tool,
      color: this.color,
      width: this.strokeWidth,
      startPct: pct,
      points: [pct],
      timestamp: _vjsPlayer ? _vjsPlayer.currentTime() : 0,
    };
  },

  onPointerMove(e) {
    if (!this.isDrawing || !this.currentStroke) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pct = this.toPercent(x, y);
    this.currentStroke.points.push(pct);
    this._drawPreview();
  },

  async onPointerUp(e) {
    if (!this.isDrawing || !this.currentStroke) return;
    this.isDrawing = false;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const endPct = this.toPercent(x, y);
    const s = this.currentStroke;

    // Build stroke_data
    let strokeData, annType;
    if (s.tool === 'freehand') {
      strokeData = { points: s.points };
      annType = 'freehand';
    } else if (s.tool === 'arrow') {
      strokeData = { x1: s.startPct.x, y1: s.startPct.y, x2: endPct.x, y2: endPct.y };
      annType = 'arrow';
    } else if (s.tool === 'circle') {
      const dx = endPct.x - s.startPct.x;
      const dy = endPct.y - s.startPct.y;
      strokeData = { cx: s.startPct.x, cy: s.startPct.y, r: Math.sqrt(dx*dx + dy*dy) };
      annType = 'circle';
    }

    // Save to server
    try {
      const res = await API.post(`/api/scouting/videos/${_currentVideo.id}/annotations`, {
        annotation_type: annType,
        timestamp: s.timestamp,
        duration: 3.0,
        stroke_data: strokeData,
        color: s.color,
        stroke_width: s.width,
        text_content: s.text || null,
      });
      this.annotations.push(res.data);
      renderAnnotationTrack();
    } catch (e) {
      console.error('Save annotation error:', e);
    }

    this.currentStroke = null;
    this._clearCanvas();
    this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
  },

  _drawPreview() {
    this._clearCanvas();
    if (!this.currentStroke) return;
    const s = this.currentStroke;
    const ctx = this.ctx;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (s.tool === 'freehand') {
      ctx.beginPath();
      s.points.forEach((p, i) => {
        const px = this.toPixel(p.x, p.y);
        if (i === 0) ctx.moveTo(px.x, px.y);
        else ctx.lineTo(px.x, px.y);
      });
      ctx.stroke();
    } else if (s.tool === 'arrow' && s.points.length > 1) {
      const end = s.points[s.points.length - 1];
      const sp = this.toPixel(s.startPct.x, s.startPct.y);
      const ep = this.toPixel(end.x, end.y);
      this._drawArrow(ctx, sp.x, sp.y, ep.x, ep.y, s.color, s.width);
    } else if (s.tool === 'circle' && s.points.length > 1) {
      const end = s.points[s.points.length - 1];
      const cp = this.toPixel(s.startPct.x, s.startPct.y);
      const ep = this.toPixel(end.x, end.y);
      const r = Math.sqrt((ep.x-cp.x)**2 + (ep.y-cp.y)**2);
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  },

  renderFrame(currentTime) {
    this._clearCanvas();
    const ctx = this.ctx;

    for (const ann of this.annotations) {
      if (ann._hidden) continue; // hidden during text editor preview
      const t0 = ann.timestamp;
      const t1 = t0 + ann.duration;
      if (currentTime < t0 || currentTime > t1) continue;

      // Fade
      let alpha = 1;
      if (currentTime - t0 < 0.3) alpha = (currentTime - t0) / 0.3;
      if (t1 - currentTime < 0.5) alpha = Math.min(alpha, (t1 - currentTime) / 0.5);
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      const sd = ann.stroke_data;
      if (!sd) continue;

      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = ann.stroke_width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (ann.annotation_type === 'freehand' && sd.points) {
        ctx.beginPath();
        sd.points.forEach((p, i) => {
          const px = this.toPixel(p.x, p.y);
          if (i === 0) ctx.moveTo(px.x, px.y);
          else ctx.lineTo(px.x, px.y);
        });
        ctx.stroke();
      } else if (ann.annotation_type === 'arrow') {
        const sp = this.toPixel(sd.x1, sd.y1);
        const ep = this.toPixel(sd.x2, sd.y2);
        this._drawArrow(ctx, sp.x, sp.y, ep.x, ep.y, ann.color, ann.stroke_width);
      } else if (ann.annotation_type === 'circle') {
        const cp = this.toPixel(sd.cx, sd.cy);
        const rPx = sd.r / 100 * this.canvas.width; // r is in % of width
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, rPx, 0, Math.PI * 2);
        ctx.stroke();
      } else if (ann.annotation_type === 'text') {
        const tp = this.toPixel(sd.x, sd.y);
        const fontSize = (sd.fontSize || 4) / 100 * this.canvas.width;
        ctx.font = `bold ${fontSize}px Space Grotesk, sans-serif`;
        ctx.fillText(ann.text_content || '', tp.x, tp.y);
      } else if (ann.annotation_type === 'spotlight') {
        ctx.globalAlpha = 1; // spotlight handles its own alpha
        this._renderSpotlight(ctx, ann, currentTime);
      }

      ctx.globalAlpha = 1;
    }
  },

  _drawArrow(ctx, x1, y1, x2, y2, color, width) {
    const headLen = 12;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI/6), y2 - headLen * Math.sin(angle - Math.PI/6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI/6), y2 - headLen * Math.sin(angle + Math.PI/6));
    ctx.stroke();
  },

  _clearCanvas() {
    if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  },

  async undo() {
    if (!this.annotations.length) return;
    const last = this.annotations.pop();
    try { await API.del(`/api/scouting/annotations/${last.id}`); } catch (e) {}
    this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
    renderAnnotationTrack();
  },

  async clearAll() {
    for (const ann of [...this.annotations]) {
      try { await API.del(`/api/scouting/annotations/${ann.id}`); } catch (e) {}
    }
    this.annotations = [];
    this._clearCanvas();
    renderAnnotationTrack();
  },

  // ── Spotlight helpers ──────────────────────────────────────
  _updateSpotlightUI() {
    const n = this._spotlightKeyframes.length;
    const status = document.getElementById('spotlightStatus');
    const doneBtn = document.getElementById('spotlightDoneBtn');
    if (n > 0) {
      status.textContent = `${n} pt${n > 1 ? 's' : ''}`;
      status.style.display = 'inline';
      doneBtn.style.display = (n >= 2) ? '' : 'none';
    } else {
      status.textContent = '';
      status.style.display = 'none';
      doneBtn.style.display = 'none';
    }
  },

  _drawSpotlightPreview() {
    this._clearCanvas();
    this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
    const ctx = this.ctx;
    // Small crosshair markers to show keyframe positions (non-intrusive)
    for (const kf of this._spotlightKeyframes) {
      const px = this.toPixel(kf.x, kf.y);
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      const s = 8;
      ctx.beginPath();
      ctx.moveTo(px.x - s, px.y); ctx.lineTo(px.x + s, px.y);
      ctx.moveTo(px.x, px.y - s); ctx.lineTo(px.x, px.y + s);
      ctx.stroke();
      ctx.restore();
    }
  },

  async saveSpotlight() {
    const kfs = this._spotlightKeyframes;
    if (kfs.length < 2) { Toast.error('Need at least 2 keyframe points'); return; }

    // Sort by time
    kfs.sort((a, b) => a.t - b.t);
    const startTime = kfs[0].t;
    const HOLD_SECONDS = 4; // hold at final position after last keyframe
    const duration = (kfs[kfs.length - 1].t - startTime) + HOLD_SECONDS;

    try {
      const res = await API.post(`/api/scouting/videos/${_currentVideo.id}/annotations`, {
        annotation_type: 'spotlight',
        timestamp: startTime,
        duration: Math.max(duration, HOLD_SECONDS),
        stroke_data: { keyframes: kfs },
        color: '#FFD700',
        stroke_width: 3,
        text_content: null,
      });
      this.annotations.push(res.data);
      renderAnnotationTrack();
      Toast.success('Spotlight saved!');
    } catch (e) {
      console.error('Save spotlight error:', e);
      Toast.error('Failed to save spotlight');
    }

    this._spotlightKeyframes = [];
    this._updateSpotlightUI();
    this._clearCanvas();
    this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
  },

  _renderSpotlight(ctx, ann, currentTime) {
    const kfs = ann.stroke_data?.keyframes;
    if (!kfs || kfs.length < 2) return;

    // Find surrounding keyframes for interpolation
    let kfBefore = kfs[0], kfAfter = kfs[kfs.length - 1];
    for (let i = 0; i < kfs.length - 1; i++) {
      if (currentTime >= kfs[i].t && currentTime <= kfs[i + 1].t) {
        kfBefore = kfs[i];
        kfAfter = kfs[i + 1];
        break;
      }
    }

    // Interpolate position
    const segDur = kfAfter.t - kfBefore.t;
    const pct = segDur > 0 ? Math.min(1, Math.max(0, (currentTime - kfBefore.t) / segDur)) : 0;
    // Ease in-out
    const ease = pct < 0.5 ? 2 * pct * pct : 1 - Math.pow(-2 * pct + 2, 2) / 2;
    const ix = kfBefore.x + (kfAfter.x - kfBefore.x) * ease;
    const iy = kfBefore.y + (kfAfter.y - kfBefore.y) * ease;
    const pos = this.toPixel(ix, iy);

    const spotR = this.canvas.width * 0.06;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Subtle dark overlay with soft radial gradient cutout — no visible border
    ctx.save();
    const grad = ctx.createRadialGradient(pos.x, pos.y, spotR * 0.5, pos.x, pos.y, spotR * 3);
    grad.addColorStop(0, 'rgba(0,0,0,0)');       // center: fully transparent
    grad.addColorStop(0.3, 'rgba(0,0,0,0)');     // inner area: clear
    grad.addColorStop(0.6, 'rgba(0,0,0,0.15)');  // soft transition
    grad.addColorStop(1, 'rgba(0,0,0,0.3)');     // edges: 30% dim
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  },

  // ── Inline Text Editor (Canva-style) ─────────────────────────
  _textEditorEl: null,   // wrapper div (box + toolbar)
  _textEditorData: null, // { pct, timestamp, fontSize, color, editingAnn }

  _hitTestTextAnnotation(clickPct) {
    const currentTime = _vjsPlayer ? _vjsPlayer.currentTime() : 0;
    for (const ann of this.annotations) {
      if (ann.annotation_type !== 'text') continue;
      if (!ann.stroke_data) continue;
      const t0 = ann.timestamp;
      const t1 = t0 + ann.duration;
      if (currentTime < t0 || currentTime > t1) continue;
      const sd = ann.stroke_data;
      const fontSize = sd.fontSize || 4;
      const textLen = (ann.text_content || '').length || 5;
      const estWidth = Math.max(fontSize * textLen * 0.6, 12);
      const estHeight = Math.max(fontSize * 2.5, 8);
      const pad = 4;
      if (clickPct.x >= sd.x - pad && clickPct.x <= sd.x + estWidth + pad &&
          clickPct.y >= sd.y - estHeight - pad && clickPct.y <= sd.y + pad) {
        return ann;
      }
    }
    return null;
  },

  _openTextEditor(pct, timestamp, existingAnn) {
    this._closeTextEditor();
    const container = this.canvas.parentElement;
    const canvasRect = this.canvas.getBoundingClientRect();
    const isEdit = !!existingAnn;
    const fontSize = isEdit ? (existingAnn.stroke_data?.fontSize || 4) : 4;
    const color = isEdit ? (existingAnn.color || this.color) : this.color;
    const text = isEdit ? (existingAnn.text_content || '') : '';

    this._textEditorData = {
      pct: { ...pct }, timestamp, fontSize, color,
      duration: isEdit ? existingAnn.duration : 3.0,
      editingAnn: existingAnn || null,
    };

    // Convert font size from % of canvas width to CSS px
    const fontPx = fontSize / 100 * canvasRect.width;

    // Wrapper: text box on top, toolbar below
    const wrap = document.createElement('div');
    wrap.className = 'te-wrap';
    // Position: text baseline at pct.y, so text top ≈ pct.y - fontSize
    const leftPx = pct.x / 100 * canvasRect.width;
    const topPx = (pct.y / 100 * canvasRect.height) - fontPx;
    wrap.style.left = leftPx + 'px';
    wrap.style.top = topPx + 'px';

    // Text box first, toolbar below
    wrap.innerHTML = `
      <div class="te-box" style="font-size:${fontPx}px; color:${color};">
        <div class="te-input" contenteditable="true" spellcheck="false">${text.replace(/\n/g,'<br>')}</div>
        <div class="te-handle te-handle-br" title="Resize"></div>
      </div>
      <div class="te-toolbar">
        <div class="te-btn te-move" title="Drag to move"><span class="material-symbols-outlined">open_with</span></div>
        <button class="te-btn" data-act="smaller" title="Smaller"><span class="material-symbols-outlined">text_decrease</span></button>
        <button class="te-btn" data-act="bigger" title="Bigger"><span class="material-symbols-outlined">text_increase</span></button>
        <input type="color" class="te-color" value="${color}" title="Color">
        <button class="te-btn te-btn-del" data-act="delete" title="Delete"><span class="material-symbols-outlined">delete</span></button>
        <button class="te-btn te-btn-ok" data-act="confirm" title="Done"><span class="material-symbols-outlined">check</span></button>
      </div>`;

    container.appendChild(wrap);
    this._textEditorEl = wrap;

    const inputEl = wrap.querySelector('.te-input');
    const boxEl = wrap.querySelector('.te-box');

    // Focus + select all for easy replace
    setTimeout(() => {
      inputEl.focus();
      if (text) { const sel = window.getSelection(); sel.selectAllChildren(inputEl); sel.collapseToEnd(); }
    }, 30);

    // Live preview
    const preview = () => this._textEditorPreview();
    inputEl.addEventListener('input', preview);

    // Toolbar actions
    wrap.querySelectorAll('.te-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = btn.dataset.act;
        if (act === 'smaller' || act === 'bigger') {
          const delta = act === 'bigger' ? 1 : -1;
          this._textEditorData.fontSize = Math.max(1, Math.min(15, this._textEditorData.fontSize + delta));
          const newPx = this._textEditorData.fontSize / 100 * canvasRect.width;
          boxEl.style.fontSize = newPx + 'px';
          preview();
        } else if (act === 'delete') {
          const ann = this._textEditorData.editingAnn;
          this._closeTextEditor();
          if (ann) {
            const idx = this.annotations.findIndex(a => a.id === ann.id);
            if (idx >= 0) deleteAnnotation(idx);
          }
          this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
        } else if (act === 'confirm') {
          this._saveTextAnnotation();
        }
      });
    });

    // Color picker
    wrap.querySelector('.te-color').addEventListener('input', (e) => {
      this._textEditorData.color = e.target.value;
      boxEl.style.color = e.target.value;
      preview();
    });

    // Keys
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._saveTextAnnotation(); }
      if (e.key === 'Escape') { this._closeTextEditor(); this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0); }
      e.stopPropagation(); // don't trigger Delete-annotation handler
    });

    // ── Drag the whole box to move ──
    this._initTextDrag(wrap, boxEl, canvasRect);

    // ── Corner handle: resize (font size) ──
    this._initTextResize(wrap, boxEl, canvasRect);

    preview();
  },

  _initTextDrag(wrap, boxEl, canvasRect) {
    let dragging = false, sx, sy, ox, oy, opx, opy;
    const startDrag = (e) => {
      dragging = true; sx = e.clientX; sy = e.clientY;
      const r = wrap.getBoundingClientRect(); const pr = wrap.parentElement.getBoundingClientRect();
      ox = r.left - pr.left; oy = r.top - pr.top;
      opx = this._textEditorData.pct.x; opy = this._textEditorData.pct.y;
      e.preventDefault();
    };
    // Drag from box border
    boxEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('.te-handle') || e.target.closest('.te-input')) return;
      startDrag(e);
    });
    // Drag from move handle in toolbar
    const moveBtn = wrap.querySelector('.te-move');
    if (moveBtn) moveBtn.addEventListener('mousedown', (e) => startDrag(e));
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      wrap.style.left = (ox + dx) + 'px';
      wrap.style.top = (oy + dy) + 'px';
      this._textEditorData.pct.x = opx + (dx / canvasRect.width) * 100;
      this._textEditorData.pct.y = opy + (dy / canvasRect.height) * 100;
      this._textEditorPreview();
    };
    const onUp = () => { dragging = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    // Store cleanup refs
    this._dragCleanup = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  },

  _initTextResize(wrap, boxEl, canvasRect) {
    const handle = wrap.querySelector('.te-handle-br');
    if (!handle) return;
    let resizing = false, sy, origFontSize;
    handle.addEventListener('mousedown', (e) => {
      resizing = true; sy = e.clientY; origFontSize = this._textEditorData.fontSize;
      e.preventDefault(); e.stopPropagation();
    });
    const onMove = (e) => {
      if (!resizing) return;
      const dy = e.clientY - sy;
      // Drag down = bigger, drag up = smaller
      const deltaSize = (dy / canvasRect.height) * 30;
      this._textEditorData.fontSize = Math.max(1, Math.min(15, origFontSize + deltaSize));
      const newPx = this._textEditorData.fontSize / 100 * canvasRect.width;
      boxEl.style.fontSize = newPx + 'px';
      this._textEditorPreview();
    };
    const onUp = () => { resizing = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    this._resizeCleanup = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  },

  _textEditorPreview() {
    if (!this._textEditorEl || !this._textEditorData) return;
    const inputEl = this._textEditorEl.querySelector('.te-input');
    const text = inputEl ? inputEl.innerText : '';
    this._clearCanvas();
    const d = this._textEditorData;
    const editId = d.editingAnn?.id;
    if (editId) { const o = this.annotations.find(a => a.id === editId); if (o) o._hidden = true; }
    this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
    if (editId) { const o = this.annotations.find(a => a.id === editId); if (o) delete o._hidden; }
    // Don't draw canvas preview — the inline DOM element IS the preview
  },

  async _saveTextAnnotation() {
    if (!this._textEditorEl || !this._textEditorData) return;
    const inputEl = this._textEditorEl.querySelector('.te-input');
    const text = (inputEl ? inputEl.innerText : '').trim();
    if (!text) { Toast.error('Enter some text'); return; }

    const d = this._textEditorData;
    const isEdit = !!d.editingAnn;
    try {
      if (isEdit) {
        const res = await API.put(`/api/scouting/annotations/${d.editingAnn.id}`, {
          stroke_data: { x: d.pct.x, y: d.pct.y, fontSize: d.fontSize },
          color: d.color, text_content: text,
        });
        const idx = this.annotations.findIndex(a => a.id === d.editingAnn.id);
        if (idx >= 0) this.annotations[idx] = res.data;
      } else {
        const res = await API.post(`/api/scouting/videos/${_currentVideo.id}/annotations`, {
          annotation_type: 'text', timestamp: d.timestamp, duration: 3.0,
          stroke_data: { x: d.pct.x, y: d.pct.y, fontSize: d.fontSize },
          color: d.color, stroke_width: 3, text_content: text,
        });
        this.annotations.push(res.data);
      }
      renderAnnotationTrack();
    } catch (e) {
      console.error('Save text error:', e);
      Toast.error('Failed to save');
    }
    this._closeTextEditor();
    this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
  },

  _closeTextEditor() {
    if (this._textEditorEl) {
      this._textEditorEl.remove();
      this._textEditorEl = null;
      this._textEditorData = null;
      if (this._dragCleanup) { this._dragCleanup(); this._dragCleanup = null; }
      if (this._resizeCleanup) { this._resizeCleanup(); this._resizeCleanup = null; }
    }
  },
};

/* ═══ Drawing Toolbar Helpers ═════════════════════════════ */
function setDrawTool(btn) {
  const tool = btn.dataset.tool;
  document.querySelectorAll('.draw-tool-btn[data-tool]').forEach(b => b.classList.remove('active'));

  // If switching away from spotlight with pending keyframes, discard them
  if (telestrator.tool === 'spotlight' && tool !== 'spotlight' && telestrator._spotlightKeyframes.length > 0) {
    if (!confirm('Discard current spotlight keyframes?')) return;
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
function undoDraw() { telestrator.undo(); }
function clearDrawings() {
  if (confirm('Clear all drawings?')) telestrator.clearAll();
}

/* ═══ Utilities ═══════════════════════════════════════════ */
function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
