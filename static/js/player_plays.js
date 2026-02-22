/**
 * HOOPS AI - Player Plays Page
 */
let _playsCache = [];
let _currentViewer = null;

const TPL_NAMES = {
  'empty': 'Empty', '5-out': '5-Out', '4-out-1-in': '4-Out 1-In',
  'horns': 'Horns', 'box': 'Box', '1-4-high': '1-4 High',
  'none': '', 'man': 'Man-to-Man', '23': '2-3 Zone', '32': '3-2 Zone',
};

document.addEventListener('DOMContentLoaded', () => {
  if (!PlayerAPI.token) return;
  loadPlays();
});

async function loadPlays() {
  const el = document.getElementById('playsContent');
  try {
    const res = await PlayerAPI.get('/api/player/plays');
    const plays = res.data || [];
    _playsCache = plays;
    if (plays.length === 0) {
      el.innerHTML = '<div class="empty-state-player"><span class="material-symbols-outlined">sports_basketball</span>No team plays shared yet</div>';
      return;
    }
    el.innerHTML = '<div class="plays-grid">' + plays.map(renderPlayCard).join('') + '</div>';
    // Render mini previews
    plays.forEach(p => {
      const previewEl = document.getElementById('preview-' + p.id);
      if (previewEl) {
        try {
          new PlayViewer(previewEl, {
            players: p.players,
            actions: p.actions,
            ball_holder_id: p.ball_holder_id,
            offense_template: p.offense_template,
            defense_template: p.defense_template,
          }, { static: true });
        } catch (e) { /* silent */ }
      }
    });
  } catch (e) {
    el.innerHTML = '<div class="empty-state-player"><span class="material-symbols-outlined">error</span>Could not load plays</div>';
  }
}

function renderPlayCard(p) {
  const off = TPL_NAMES[p.offense_template] || '';
  const def = TPL_NAMES[p.defense_template] || '';
  const actionCount = (p.actions || []).length;
  const sharedAt = p.shared_at ? timeAgoSimple(p.shared_at) : '';
  const isNew = p.viewed === false;
  return '<div class="play-card' + (isNew ? ' play-card-new' : '') + '" id="play-card-' + p.id + '" onclick="openPlayViewer(' + p.id + ')">'
    + (isNew ? '<span class="play-new-badge">חדש!</span>' : '')
    + '<div class="play-card-preview" id="preview-' + p.id + '"></div>'
    + '<div class="play-card-info">'
    + '<div class="play-card-title">' + esc(p.name) + '</div>'
    + (p.description ? '<div class="play-card-desc">' + esc(p.description) + '</div>' : '')
    + '<div class="play-card-meta">'
    + (off ? '<span class="badge badge-neutral">' + off + '</span>' : '')
    + (def ? '<span class="badge badge-neutral">' + def + '</span>' : '')
    + '<span style="font-size:11px;color:var(--text-muted)">' + actionCount + ' steps</span>'
    + (sharedAt ? '<span style="font-size:11px;color:rgba(74,222,128,0.5)">' + sharedAt + '</span>' : '')
    + '</div></div></div>';
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function timeAgoSimple(ts) {
  if (!ts || ts === 'None') return '';
  try {
    const d = new Date(ts.endsWith('Z') ? ts : ts + 'Z');
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return d.toLocaleDateString();
  } catch { return ''; }
}

function openPlayViewer(playId) {
  const p = _playsCache.find(x => x.id === playId);
  if (!p) return;
  document.getElementById('playViewerTitle').textContent = p.name;
  const body = document.getElementById('playViewerBody');
  body.innerHTML = '';
  _currentViewer = new PlayViewer(body, {
    players: p.players,
    actions: p.actions,
    ball_holder_id: p.ball_holder_id,
    offense_template: p.offense_template,
    defense_template: p.defense_template,
  });
  document.getElementById('playViewerModal').classList.add('active');
  // Mark play as viewed + remove "new" indicator
  PlayerAPI.put('/api/player/plays/' + playId + '/viewed', {}).then(() => {
    const card = document.getElementById('play-card-' + playId);
    if (card) {
      card.classList.remove('play-card-new');
      const badge = card.querySelector('.play-new-badge');
      if (badge) badge.remove();
    }
    if (typeof updatePlayerBadges === 'function') updatePlayerBadges();
  }).catch(() => {});
}

function closePlayViewer() {
  if (_currentViewer) { _currentViewer.destroy(); _currentViewer = null; }
  document.getElementById('playViewerModal').classList.remove('active');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.id === 'playViewerModal') closePlayViewer();
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePlayViewer();
});
