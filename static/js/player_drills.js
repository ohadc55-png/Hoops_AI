/**
 * HOOPS AI - Player Drills Page
 */
let _currentFilter = '';
let _drillsCache = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!PlayerAPI.token) return;
  loadDrills();
});

function switchFilter(btn) {
  document.querySelectorAll('.drill-filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _currentFilter = btn.dataset.filter;
  loadDrills();
}

async function loadDrills() {
  const el = document.getElementById('drillsContent');
  const params = _currentFilter ? `?filter=${_currentFilter}` : '';
  try {
    const res = await PlayerAPI.get(`/api/player/drills${params}`);
    const drills = res.data || [];
    _drillsCache = drills;
    if (drills.length === 0) {
      const msgs = {
        'completed': t('player.drills.empty_completed'),
        'pending': t('player.drills.empty_pending'),
        'video_uploaded': t('player.drills.empty_review'),
        '': t('player.drills.empty_all'),
      };
      el.innerHTML = `<div class="empty-state-player"><span class="material-symbols-outlined">fitness_center</span>${msgs[_currentFilter] || msgs['']}</div>`;
      return;
    }
    el.innerHTML = drills.map(d => renderDrillCard(d)).join('');
  } catch {
    el.innerHTML = '<div class="empty-state-player">' + t('player.drills.load_error') + '</div>';
  }
}

function getStatusInfo(d) {
  const status = d.status || (d.is_completed ? 'approved' : 'pending');
  switch (status) {
    case 'approved':
      return { cls: 'completed', icon: 'check_circle', text: t('player.drills.status.approved') };
    case 'video_uploaded':
      return { cls: 'video-uploaded', icon: 'hourglass_top', text: t('player.drills.status.under_review') };
    case 'rejected':
      return { cls: 'rejected', icon: 'replay', text: t('player.drills.status.try_again') };
    default:
      return { cls: 'pending', icon: 'videocam', text: t('player.drills.status.upload_video') };
  }
}

function renderDrillCard(d) {
  const diffColors = { beginner: 'success', intermediate: 'warning', advanced: 'error' };
  const si = getStatusInfo(d);

  const statusBadge = `<span class="drill-status-badge ${si.cls}"><span class="material-symbols-outlined" style="font-size:14px;">${si.icon}</span> ${si.text}</span>`;

  const hasVideo = !!d.video_url;

  return `<div class="drill-card" onclick="openDrillDetail(${d.assignment_id})" style="cursor:pointer;">
    <div class="drill-card-header">
      <div class="drill-card-title">${esc(d.title)}</div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
        <span class="badge badge-${diffColors[d.difficulty] || 'neutral'}">${esc(tDifficulty(d.difficulty))}</span>
        <span class="badge badge-neutral">${esc(tCategory(d.category))}</span>
        ${statusBadge}
      </div>
    </div>
    ${d.description ? `<div class="drill-card-desc" style="margin-top:8px;">${esc(d.description)}</div>` : ''}
    <div class="drill-card-footer">
      <span style="font-size:11px;color:rgba(74,222,128,0.5);">${t('player.drills.assigned', { time: timeAgoSimple(d.assigned_at) })}</span>
      <div style="display:flex;gap:8px;align-items:center;">
        ${hasVideo ? '<span style="display:flex;align-items:center;gap:4px;font-size:11px;color:#22c55e;"><span class="material-symbols-outlined" style="font-size:16px;">play_circle</span> Video</span>' : ''}
        ${d.coach_note ? '<span style="display:flex;align-items:center;gap:4px;font-size:11px;color:rgba(74,222,128,0.5);"><span class="material-symbols-outlined" style="font-size:16px;">comment</span></span>' : ''}
        <span style="font-size:11px;color:rgba(74,222,128,0.4);display:flex;align-items:center;gap:2px;"><span class="material-symbols-outlined" style="font-size:16px;">open_in_new</span></span>
      </div>
    </div>
  </div>`;
}

/* ═══ Detail Modal ═══ */

function openDrillDetail(assignmentId) {
  const d = _drillsCache.find(x => x.assignment_id === assignmentId);
  if (!d) return;

  const diffColors = { beginner: 'success', intermediate: 'warning', advanced: 'error' };
  const si = getStatusInfo(d);
  document.getElementById('drillDetailTitle').textContent = d.title;

  // Drill reference video (YouTube embed from drill.video_url)
  let videoHtml = '';
  if (d.video_url) {
    const embedUrl = youtubeEmbedUrl(d.video_url);
    if (embedUrl) {
      videoHtml = `<div class="drill-video-container" style="margin-bottom:16px;">
        <iframe src="${embedUrl}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
      </div>`;
    } else {
      videoHtml = `<a href="${esc(d.video_url)}" target="_blank" rel="noopener" class="drill-video-link" style="margin-bottom:12px;">
        <span class="material-symbols-outlined" style="font-size:18px;">play_circle</span> ${t('player.drills.watch_video')}
      </a>`;
    }
  }

  // Status badge
  const statusBadge = `<span class="drill-status-badge ${si.cls}"><span class="material-symbols-outlined" style="font-size:14px;">${si.icon}</span> ${si.text}</span>`;

  // Player's proof video
  const proofVideoHtml = d.proof_video_url ? `
    <div style="margin-bottom:16px;">
      <h4 style="font-weight:600;font-size:14px;color:#f0fdf4;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
        <span class="material-symbols-outlined" style="font-size:18px;color:#22c55e;">videocam</span> ${t('player.drills.my_video_proof')}
      </h4>
      <video controls style="width:100%;border-radius:8px;border:1px solid rgba(34,197,94,0.15);max-height:300px;" src="${esc(d.proof_video_url)}"></video>
    </div>` : '';

  // Coach feedback
  const status = d.status || (d.is_completed ? 'approved' : 'pending');
  const feedbackHtml = d.coach_feedback ? `
    <div style="display:flex;align-items:flex-start;gap:8px;background:${status === 'rejected' ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)'};border-left:3px solid ${status === 'rejected' ? '#ef4444' : '#22c55e'};padding:12px;border-radius:0 8px 8px 0;margin-bottom:16px;">
      <span class="material-symbols-outlined" style="font-size:18px;color:${status === 'rejected' ? '#ef4444' : '#22c55e'};flex-shrink:0;">rate_review</span>
      <div>
        <div style="font-size:11px;font-weight:600;color:${status === 'rejected' ? '#ef4444' : '#22c55e'};margin-bottom:4px;">${t('player.drills.coach_feedback')}</div>
        <div style="font-size:13px;color:#bbf7d0;line-height:1.5;">${esc(d.coach_feedback)}</div>
      </div>
    </div>` : '';

  document.getElementById('drillDetailBody').innerHTML = `
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">
      <span class="badge badge-${diffColors[d.difficulty] || 'neutral'}">${esc(tDifficulty(d.difficulty))}</span>
      <span class="badge badge-neutral">${esc(tCategory(d.category))}</span>
      <span class="badge badge-neutral">${d.duration_minutes || '?'} ${t('player.drills.min')}</span>
      ${statusBadge}
    </div>
    ${videoHtml}
    ${d.description ? `<p style="color:#bbf7d0;font-size:14px;margin-bottom:16px;line-height:1.6;">${esc(d.description)}</p>` : ''}
    ${d.instructions ? `<div style="margin-bottom:16px;">
      <h4 style="font-weight:600;font-size:14px;color:#f0fdf4;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
        <span class="material-symbols-outlined" style="font-size:18px;color:#22c55e;">list_alt</span> ${t('player.drills.instructions')}
      </h4>
      <pre style="white-space:pre-wrap;font-size:13px;color:#bbf7d0;background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;font-family:'Space Grotesk',sans-serif;line-height:1.6;margin:0;">${esc(d.instructions)}</pre>
    </div>` : ''}
    ${d.coaching_points?.length ? `<div style="margin-bottom:16px;">
      <h4 style="font-weight:600;font-size:14px;color:#f0fdf4;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
        <span class="material-symbols-outlined" style="font-size:18px;color:#22c55e;">tips_and_updates</span> ${t('player.drills.coaching_points')}
      </h4>
      <ul style="padding-left:20px;font-size:13px;color:#bbf7d0;line-height:1.6;">${d.coaching_points.map(p => `<li style="margin-bottom:4px;">${esc(p)}</li>`).join('')}</ul>
    </div>` : ''}
    ${d.coach_note ? `<div style="display:flex;align-items:flex-start;gap:8px;background:rgba(34,197,94,0.06);border-left:3px solid #22c55e;padding:12px;border-radius:0 8px 8px 0;margin-bottom:16px;">
      <span class="material-symbols-outlined" style="font-size:18px;color:#22c55e;flex-shrink:0;">comment</span>
      <div>
        <div style="font-size:11px;font-weight:600;color:#22c55e;margin-bottom:4px;">${t('player.drills.coach_note')}</div>
        <div style="font-size:13px;color:#bbf7d0;line-height:1.5;">${esc(d.coach_note)}</div>
      </div>
    </div>` : ''}
    ${proofVideoHtml}
    ${feedbackHtml}
    ${(d.tags?.length) ? `<div style="display:flex;gap:6px;flex-wrap:wrap;">${d.tags.map(tag => `<span class="drill-tag">${esc(tag)}</span>`).join('')}</div>` : ''}
  `;

  // Footer action based on status
  let footerAction;
  if (status === 'approved') {
    footerAction = '<span class="drill-completed-badge"><span class="material-symbols-outlined" style="font-size:16px;">check_circle</span> ' + t('player.drills.status.approved') + '</span>';
  } else if (status === 'video_uploaded') {
    footerAction = '<span class="drill-status-badge video-uploaded" style="padding:8px 16px;font-size:13px;"><span class="material-symbols-outlined" style="font-size:16px;">hourglass_top</span> ' + t('player.drills.waiting_review') + '</span>';
  } else if (status === 'rejected') {
    footerAction = `<button class="drill-complete-btn" onclick="openVideoUpload(${d.assignment_id})" style="background:#ef4444;">
      <span class="material-symbols-outlined" style="font-size:18px;">replay</span> ${t('player.drills.reupload_video')}
    </button>`;
  } else {
    footerAction = `<button class="drill-complete-btn" onclick="openVideoUpload(${d.assignment_id})">
      <span class="material-symbols-outlined" style="font-size:18px;">videocam</span> ${t('player.drills.upload_video_proof')}
    </button>`;
  }

  document.getElementById('drillDetailFooter').innerHTML = `
    <span style="font-size:11px;color:rgba(74,222,128,0.4);">${t('player.drills.assigned', { time: timeAgoSimple(d.assigned_at) })}</span>
    ${footerAction}
  `;

  openDrillModal();
}

function openDrillModal() {
  document.getElementById('drillDetailModal').classList.add('active');
}

function closeDrillModal() {
  document.getElementById('drillDetailModal').classList.remove('active');
  // Stop any playing video/iframe
  const body = document.getElementById('drillDetailBody');
  const iframe = body.querySelector('iframe');
  if (iframe) iframe.src = '';
  const video = body.querySelector('video');
  if (video) video.pause();
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.id === 'drillDetailModal') closeDrillModal();
});

/* ═══ Video Upload ═══ */

function openVideoUpload(assignmentId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      PlayerToast.error(t('player.drills.video_too_large'));
      return;
    }

    // Show uploading state
    const footer = document.getElementById('drillDetailFooter');
    if (footer) {
      footer.innerHTML = `<span style="font-size:11px;color:rgba(74,222,128,0.4);"></span>
        <span class="drill-status-badge video-uploaded" style="padding:8px 16px;font-size:13px;">
          <span class="material-symbols-outlined" style="font-size:16px;">upload</span> ${t('player.drills.uploading')}
        </span>`;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/player/drills/${assignmentId}/upload-proof`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${PlayerAPI.token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || t('player.drills.upload_failed'));

      PlayerToast.success(t('player.drills.upload_success'));
      closeDrillModal();
      loadDrills();
    } catch (err) {
      PlayerToast.error(err.message || t('player.drills.upload_failed'));
      if (footer) {
        footer.innerHTML = `<span style="font-size:11px;color:rgba(74,222,128,0.4);"></span>
          <button class="drill-complete-btn" onclick="openVideoUpload(${assignmentId})">
            <span class="material-symbols-outlined" style="font-size:18px;">videocam</span> ${t('player.drills.upload_video_proof')}
          </button>`;
      }
    }
  };
  input.click();
}

/* ═══ Legacy: Mark as Completed (backward compat) ═══ */

async function completeDrillFromModal(assignmentId) {
  const btn = document.querySelector('#drillDetailFooter .drill-complete-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">hourglass_empty</span> ' + t('player.drills.saving');
  }
  try {
    await PlayerAPI.put(`/api/player/drills/${assignmentId}/complete`);
    PlayerToast.success(t('player.drills.completed'));
    closeDrillModal();
    loadDrills();
  } catch {
    PlayerToast.error(t('player.drills.complete_failed'));
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">check</span> ' + t('player.drills.mark_completed');
    }
  }
}

/* ═══ Helpers ═══ */

function tDifficulty(d) {
  return d ? (t('difficulty.' + d) || capitalize(d)) : '';
}

function tCategory(c) {
  return c ? (t('drill.category.' + c) || capitalize(c)) : '';
}

function youtubeEmbedUrl(url) {
  if (!url) return null;
  let videoId = null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      videoId = u.searchParams.get('v');
      if (!videoId && u.pathname.startsWith('/embed/')) {
        videoId = u.pathname.split('/embed/')[1].split('?')[0];
      }
      if (!videoId && u.pathname.startsWith('/shorts/')) {
        videoId = u.pathname.split('/shorts/')[1].split('?')[0];
      }
    } else if (u.hostname === 'youtu.be') {
      videoId = u.pathname.slice(1).split('?')[0];
    }
  } catch {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (match) videoId = match[1];
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

/* timeAgoSimple → shared-utils.js */
