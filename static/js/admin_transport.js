/**
 * HOOPS AI — Admin Transport Page JS
 * Lists upcoming away games with transport info
 */

let _awayGames = [];
let _transportTeams = [];

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAPI.token) return;
  loadTeams();
  loadAwayGames();
});

async function loadTeams() {
  try {
    const res = await AdminAPI.get('/api/teams');
    _transportTeams = res.data || [];
    const sel = document.getElementById('transportTeamFilter');
    if (sel) {
      sel.innerHTML = '<option value="">All Teams</option>'
        + _transportTeams.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
    }
  } catch { /* ignore */ }
}

async function loadAwayGames() {
  const el = document.getElementById('awayGamesList');
  try {
    const res = await AdminAPI.get('/api/transport/away-games');
    _awayGames = res.data || [];

    // Apply team filter
    const filterTeam = document.getElementById('transportTeamFilter')?.value;
    const filtered = filterTeam
      ? _awayGames.filter(g => g.team_id === parseInt(filterTeam))
      : _awayGames;

    // Update stats
    document.getElementById('awayCount').textContent = filtered.length;
    const uniqueTeams = new Set(filtered.map(g => g.team_id));
    document.getElementById('teamsWithAway').textContent = uniqueTeams.size;
    if (filtered.length > 0) {
      const nextDate = new Date(filtered[0].date + 'T00:00:00');
      document.getElementById('nextAwayDate').textContent =
        `${nextDate.getDate()} ${MONTHS_SHORT[nextDate.getMonth()]}`;
    } else {
      document.getElementById('nextAwayDate').textContent = '-';
    }

    if (filtered.length === 0) {
      el.innerHTML = '<div class="empty-state-admin"><span class="material-symbols-outlined">directions_bus</span><h3>No upcoming away games</h3><p>Create a game event and mark it as "Away Game" in the schedule</p></div>';
      return;
    }

    el.innerHTML = filtered.map(renderAwayGame).join('');
  } catch {
    el.innerHTML = '<div class="empty-state-admin">Could not load away games</div>';
  }
}

function renderAwayGame(e) {
  const d = new Date(e.date + 'T00:00:00');
  const day = d.getDate();
  const month = MONTHS_SHORT[d.getMonth()];
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });

  return `<div class="event-item" style="border-left:3px solid #F87171;">
    <div class="event-date-col">
      <div class="event-date-day">${day}</div>
      <div class="event-date-month">${month}</div>
      <div style="font-size:10px;color:var(--text-muted);">${weekday}</div>
    </div>
    <div class="event-info" style="flex:1;">
      <div class="event-title">
        ${esc(e.title)}
        <span class="badge" style="background:rgba(248,113,113,0.15);color:#F87171;font-size:10px;padding:2px 6px;border-radius:4px;">Away</span>
      </div>
      <div class="event-meta">
        ${e.team_name ? esc(e.team_name) + ' · ' : ''}
        ${e.opponent ? 'vs ' + esc(e.opponent) + ' · ' : ''}
        ${e.time_start || ''} ${e.time_end ? '- ' + e.time_end : ''}
      </div>
      <div style="display:flex;gap:var(--sp-4);margin-top:var(--sp-1);font-size:var(--text-sm);">
        <span style="color:${e.departure_time ? '#34D399' : 'var(--text-muted)'};">
          <span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">schedule</span>
          Departure: ${e.departure_time || 'Not set'}
        </span>
        <span style="color:${e.venue_address ? 'var(--text-secondary)' : 'var(--text-muted)'};">
          <span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">location_on</span>
          ${e.venue_address ? esc(e.venue_address) : 'No address'}
        </span>
        ${e.venue_address ? `<a href="https://waze.com/ul?q=${encodeURIComponent(e.venue_address)}&navigate=yes" target="_blank" rel="noopener"
          style="color:#33ccff;font-size:var(--text-xs);text-decoration:none;font-weight:600;display:inline-flex;align-items:center;gap:3px;">
          <span class="material-symbols-outlined" style="font-size:14px;">navigation</span>Waze
        </a>` : ''}
      </div>
    </div>
    <div class="event-actions">
      <a href="/admin/transport/${e.id}" class="btn btn-primary btn-xs" style="text-decoration:none;">
        <span class="material-symbols-outlined" style="font-size:16px;">visibility</span> Details
      </a>
    </div>
  </div>`;
}
