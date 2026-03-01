/**
 * HOOPS AI — Parent Video Feed (Read-Only)
 * Clip feed from parent-shared videos, with read-only telestrator overlay.
 */

let _feedClips = [];
let _clipPlayer = null;
let _clipAnnotations = [];
let _clipCanvas = null;
let _clipCtx = null;
let _clipStartTime = 0;
let _clipEndTime = 0;

/* ═══ Init ════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadFeed();
});

async function loadFeed() {
  try {
    const res = await ParentAPI.get('/api/scouting/parent/feed');
    _feedClips = res.data || [];
    renderFeed();
  } catch (e) {
    console.error('Feed load error:', e);
    document.getElementById('feedList').innerHTML = `<p class="feed-empty">${t('parent.scouting.feed_error')}</p>`;
  }
}

/* ═══ Feed Rendering ═════════════════════════════════════ */
function renderFeed() {
  const el = document.getElementById('feedList');

  if (!_feedClips.length) {
    el.innerHTML = `<div class="feed-empty">
      <span class="material-symbols-outlined">videocam_off</span>
      ${t('parent.scouting.no_clips')}
    </div>`;
    return;
  }

  el.innerHTML = _feedClips.map(c => {
    const action = c.action_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const rating = c.rating === 'positive' ? '👍' : c.rating === 'negative' ? '👎' : '';
    const thumb = c.thumbnail_url
      ? `<div style="position:relative;"><img class="feed-card-thumb" src="${c.thumbnail_url}" alt="${c.video_title}" loading="lazy"><div class="feed-card-play-icon"><span class="material-symbols-outlined" style="font-size:2rem;">play_arrow</span></div></div>`
      : `<div class="feed-card-thumb-placeholder"><span class="material-symbols-outlined">play_circle</span></div>`;
    const dur = Math.round((c.end_time || 0) - (c.start_time || 0));
    const durLabel = dur >= 60 ? `${Math.floor(dur/60)}:${String(dur%60).padStart(2,'0')}` : `0:${String(dur).padStart(2,'0')}`;

    return `<div class="feed-card" data-clip-id="${c.id}">
      <div onclick="openClipViewer(${c.id})">${thumb}</div>
      <div class="feed-card-body">
        <div class="feed-card-action">${action} ${rating}</div>
        <div class="feed-card-meta">
          <span>${esc(c.video_title || '')}</span>
          ${c.opponent ? `<span>vs ${esc(c.opponent)}</span>` : ''}
          <span><span class="material-symbols-outlined" style="font-size:0.85rem;vertical-align:middle;">timer</span> ${durLabel}</span>
        </div>
      </div>
      <div class="feed-card-footer">
        <span>${timeAgo(c.created_at)}</span>
      </div>
    </div>`;
  }).join('');
}

/* ═══ Clip Viewer (Modal) ════════════════════════════════ */
async function openClipViewer(clipId) {
  try {
    const res = await ParentAPI.get(`/api/scouting/parent/clips/${clipId}`);
    const data = res.data;
    _clipAnnotations = data.annotations || [];
    _clipStartTime = data.start_time || 0;
    _clipEndTime = data.end_time || 0;

    document.getElementById('clipViewerTitle').textContent =
      (data.action_type || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) +
      (data.video_title ? ` — ${data.video_title}` : '');

    openModal('clipViewerModal');

    // Dispose old player and recreate elements
    if (_clipPlayer) {
      _clipPlayer.dispose();
      _clipPlayer = null;
    }
    const container = document.getElementById('clipViewerContainer');
    container.innerHTML = '';
    const video = document.createElement('video');
    video.id = 'clipViewerPlayer';
    video.className = 'video-js vjs-default-skin';
    video.setAttribute('playsinline', '');
    container.appendChild(video);
    const canvas = document.createElement('canvas');
    canvas.id = 'clipViewerCanvas';
    canvas.className = 'clip-viewer-canvas';
    container.appendChild(canvas);

    // Build sources
    const sources = [];
    if (data.cloudinary_url) {
      if (data.cloudinary_public_id && _clipStartTime > 0) {
        const startSec = Math.floor(_clipStartTime);
        const endSec = Math.ceil(_clipEndTime);
        const clipUrl = data.cloudinary_url.replace('/upload/', `/upload/so_${startSec},eo_${endSec}/`);
        sources.push({ src: clipUrl, type: 'video/mp4' });
      }
      sources.push({ src: data.cloudinary_url, type: 'video/mp4' });
    }

    _clipPlayer = videojs('clipViewerPlayer', {
      controls: true,
      playbackRates: [0.5, 1, 1.5],
      fluid: true,
      autoplay: false,
      sources: sources,
    });

    _clipCanvas = document.getElementById('clipViewerCanvas');
    _clipCtx = _clipCanvas.getContext('2d');

    _clipPlayer.on('loadedmetadata', () => {
      _clipCanvas.width = _clipCanvas.parentElement.clientWidth;
      _clipCanvas.height = _clipCanvas.parentElement.clientHeight;

      const duration = _clipPlayer.duration();
      if (duration > (_clipEndTime - _clipStartTime + 5)) {
        _clipPlayer.currentTime(_clipStartTime);
      }
      _clipPlayer.play();
    });

    _clipPlayer.on('timeupdate', () => {
      const currentTime = _clipPlayer.currentTime();
      const duration = _clipPlayer.duration();
      const isFullVideo = duration > (_clipEndTime - _clipStartTime + 5);

      if (isFullVideo && currentTime >= _clipEndTime) {
        _clipPlayer.pause();
        _clipPlayer.currentTime(_clipStartTime);
      }

      const videoTime = isFullVideo ? currentTime : currentTime + _clipStartTime;
      renderClipAnnotations(videoTime);
    });
  } catch (e) {
    console.error('Clip viewer error:', e);
    ParentToast.error(t('parent.scouting.clip_error'));
  }
}

function closeClipViewer() {
  if (_clipPlayer) {
    _clipPlayer.pause();
  }
  closeModal('clipViewerModal');
}

/* ═══ Annotation Renderer (Read-Only) ════════════════════ */
function renderClipAnnotations(videoTime) {
  if (!_clipCtx || !_clipCanvas) return;
  _clipCtx.clearRect(0, 0, _clipCanvas.width, _clipCanvas.height);

  for (const ann of _clipAnnotations) {
    const t0 = ann.timestamp;
    const t1 = t0 + ann.duration;
    if (videoTime < t0 || videoTime > t1) continue;

    let alpha = 1;
    if (videoTime - t0 < 0.3) alpha = (videoTime - t0) / 0.3;
    if (t1 - videoTime < 0.5) alpha = Math.min(alpha, (t1 - videoTime) / 0.5);
    _clipCtx.globalAlpha = Math.max(0, Math.min(1, alpha));

    const sd = ann.stroke_data;
    if (!sd) continue;
    const ctx = _clipCtx;
    const w = _clipCanvas.width;
    const h = _clipCanvas.height;

    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = ann.stroke_width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (ann.annotation_type === 'freehand' && sd.points) {
      ctx.beginPath();
      sd.points.forEach((p, i) => {
        const px = p.x / 100 * w, py = p.y / 100 * h;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
    } else if (ann.annotation_type === 'arrow') {
      const x1 = sd.x1/100*w, y1 = sd.y1/100*h, x2 = sd.x2/100*w, y2 = sd.y2/100*h;
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const a = Math.atan2(y2-y1, x2-x1);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 12*Math.cos(a - Math.PI/6), y2 - 12*Math.sin(a - Math.PI/6));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 12*Math.cos(a + Math.PI/6), y2 - 12*Math.sin(a + Math.PI/6));
      ctx.stroke();
    } else if (ann.annotation_type === 'circle') {
      const cx = sd.cx/100*w, cy = sd.cy/100*h, r = sd.r/100*w;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.stroke();
    } else if (ann.annotation_type === 'text') {
      const tx = sd.x/100*w, ty = sd.y/100*h;
      const fs = (sd.fontSize || 4) / 100 * w;
      ctx.font = `bold ${fs}px Space Grotesk, sans-serif`;
      ctx.fillText(ann.text_content || '', tx, ty);
    }

    ctx.globalAlpha = 1;
  }
}

/* ═══ Utilities ══════════════════════════════════════════ */
/* timeAgo → shared-utils.js */
/* esc → shared-utils.js */
/* openModal → shared-utils.js */
/* closeModal → shared-utils.js */
