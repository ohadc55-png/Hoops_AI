/**
 * HOOPS AI — Admin Teams Page JS
 * Team cards, invite codes, member management
 */

let _teams = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAPI.token) return;
  loadTeams();
});


async function loadTeams() {
  const el = document.getElementById('teamsContent');
  try {
    const res = await AdminAPI.get('/api/teams');
    _teams = res.data || [];
    if (_teams.length === 0) {
      el.innerHTML = `<div class="empty-state-admin">
        <span class="material-symbols-outlined">group_add</span>
        <h3>No teams yet</h3>
        <p>Create a team to get started</p>
      </div>`;
      return;
    }
    el.innerHTML = _teams.map(t => renderTeamCard(t)).join('');
  } catch {
    el.innerHTML = '<div class="empty-state-admin">Could not load teams</div>';
  }
}


function renderTeamCard(t) {
  const memberCount = t.member_count || 0;
  const coaches = (t.members || []).filter(m => m.role_in_team === 'coach').length;
  const players = (t.members || []).filter(m => m.role_in_team === 'player').length;
  const parents = (t.members || []).filter(m => m.role_in_team === 'parent').length;
  const origin = window.location.origin;

  return `<div class="team-card" id="team-${t.id}">
    <div class="team-card-header">
      <div class="team-card-title">
        <h3>${esc(t.name)}</h3>
        <span class="team-meta">${[t.age_group, t.level, t.club_name].filter(Boolean).join(' / ')}</span>
      </div>
      <div class="team-card-stats">
        <span class="badge badge-neutral">${coaches} coaches</span>
        <span class="badge badge-neutral">${players} players</span>
        <span class="badge badge-neutral">${parents} parents</span>
      </div>
    </div>

    <div class="invite-section">
      <div class="invite-row">
        <div class="invite-label">Coach Invite Code</div>
        <div class="invite-value">
          <code class="invite-code">${esc(t.coach_invite_code)}</code>
          <button class="btn btn-ghost btn-xs" onclick="copyText('${esc(t.coach_invite_code)}', this)" title="Copy code">
            <span class="material-symbols-outlined">content_copy</span>
          </button>
          <button class="btn btn-ghost btn-xs" onclick="regenCoachCode(${t.id})" title="Regenerate">
            <span class="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </div>
      <div class="invite-row">
        <div class="invite-label">Coach Invite Link</div>
        <div class="invite-value">
          <button class="btn btn-ghost btn-xs" onclick="copyText('${origin}/join/coach/${esc(t.coach_invite_token)}', this)" title="Copy link">
            <span class="material-symbols-outlined">link</span> Copy Link
          </button>
        </div>
      </div>
      <div class="invite-row">
        <div class="invite-label">Player Invite Code</div>
        <div class="invite-value">
          <code class="invite-code">${esc(t.player_invite_code)}</code>
          <button class="btn btn-ghost btn-xs" onclick="copyText('${esc(t.player_invite_code)}', this)" title="Copy code">
            <span class="material-symbols-outlined">content_copy</span>
          </button>
          <button class="btn btn-ghost btn-xs" onclick="regenPlayerCode(${t.id})" title="Regenerate">
            <span class="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </div>
      <div class="invite-row">
        <div class="invite-label">Player Invite Link</div>
        <div class="invite-value">
          <button class="btn btn-ghost btn-xs" onclick="copyText('${origin}/join/player/${esc(t.player_invite_token)}', this)" title="Copy link">
            <span class="material-symbols-outlined">link</span> Copy Link
          </button>
        </div>
      </div>
      ${t.parent_invite_code ? `
      <div class="invite-row">
        <div class="invite-label">Parent Invite Code</div>
        <div class="invite-value">
          <code class="invite-code">${esc(t.parent_invite_code)}</code>
          <button class="btn btn-ghost btn-xs" onclick="copyText('${esc(t.parent_invite_code)}', this)" title="Copy code">
            <span class="material-symbols-outlined">content_copy</span>
          </button>
          <button class="btn btn-ghost btn-xs" onclick="regenParentCode(${t.id})" title="Regenerate">
            <span class="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </div>
      <div class="invite-row">
        <div class="invite-label">Parent Invite Link</div>
        <div class="invite-value">
          <button class="btn btn-ghost btn-xs" onclick="copyText('${origin}/join/parent/${esc(t.parent_invite_token)}', this)" title="Copy link">
            <span class="material-symbols-outlined">link</span> Copy Link
          </button>
        </div>
      </div>` : ''}
    </div>

    ${memberCount > 0 ? `
    <div class="members-section">
      <button class="btn btn-ghost btn-sm members-toggle" onclick="toggleMembers(${t.id})">
        <span class="material-symbols-outlined">expand_more</span>
        ${memberCount} Members
      </button>
      <div class="members-list hidden" id="members-${t.id}">
        ${renderMembers(t)}
      </div>
    </div>` : '<div class="members-section"><span class="text-muted text-sm">No members yet</span></div>'}
  </div>`;
}


function renderMembers(t) {
  const members = t.members || [];
  if (members.length === 0) return '<div class="text-muted text-sm">No members</div>';
  return `<table class="members-table">
    <thead><tr><th>Role</th><th>Name</th><th>Email</th><th>Joined</th><th></th></tr></thead>
    <tbody>${members.map(m => {
      const extra = m.role_in_team === 'parent' && m.child_name ? ` <span class="text-muted">(parent of ${esc(m.child_name)})</span>` : '';
      const nameHtml = m.role_in_team === 'player' && m.player_id
        ? `<a href="javascript:void(0)" class="player-name-link" onclick="event.stopPropagation();openAdminPlayerProfile(${m.player_id})">${esc(m.name || '—')}</a>`
        : esc(m.name || '—');
      return `<tr>
      <td><span class="badge badge-${m.role_in_team === 'coach' ? 'primary' : m.role_in_team === 'parent' ? 'warning' : 'neutral'}">${esc(m.role_in_team)}</span></td>
      <td>${nameHtml}${extra}</td>
      <td class="text-muted">${esc(m.email || '—')}</td>
      <td>${new Date(m.joined_at).toLocaleDateString()}</td>
      <td><button class="btn btn-ghost btn-xs" onclick="removeMember(${t.id}, ${m.id})" title="Remove"><span class="material-symbols-outlined">person_remove</span></button></td>
    </tr>`;}).join('')}</tbody>
  </table>`;
}


function toggleMembers(teamId) {
  const el = document.getElementById('members-' + teamId);
  if (el) el.classList.toggle('hidden');
}


async function regenCoachCode(teamId) {
  try {
    await AdminAPI.post(`/api/teams/${teamId}/regenerate-coach-code`);
    AdminToast.success('Coach invite code regenerated');
    loadTeams();
  } catch { /* toast already shown */ }
}

async function regenPlayerCode(teamId) {
  try {
    await AdminAPI.post(`/api/teams/${teamId}/regenerate-player-code`);
    AdminToast.success('Player invite code regenerated');
    loadTeams();
  } catch { /* toast already shown */ }
}

async function regenParentCode(teamId) {
  try {
    await AdminAPI.post(`/api/teams/${teamId}/regenerate-parent-code`);
    AdminToast.success('Parent invite code regenerated');
    loadTeams();
  } catch { /* toast already shown */ }
}


async function removeMember(teamId, memberId) {
  if (!confirm('Remove this member from the team?')) return;
  try {
    await AdminAPI.del(`/api/teams/${teamId}/members/${memberId}`);
    AdminToast.success('Member removed');
    loadTeams();
  } catch { /* toast already shown */ }
}


function openCreateTeamModal() {
  document.getElementById('teamName').value = '';
  document.getElementById('teamClub').value = '';
  document.getElementById('teamAgeGroup').value = '';
  document.getElementById('teamLevel').value = '';
  openModal('createTeamModal');
}


async function handleCreateTeam(e) {
  e.preventDefault();
  const name = document.getElementById('teamName').value.trim();
  if (!name) return;
  try {
    await AdminAPI.post('/api/teams', {
      name,
      club_name: document.getElementById('teamClub').value.trim() || null,
      age_group: document.getElementById('teamAgeGroup').value || null,
      level: document.getElementById('teamLevel').value || null,
    });
    closeModal('createTeamModal');
    AdminToast.success('Team created');
    loadTeams();
  } catch { /* toast already shown */ }
  return false;
}


async function openAdminPlayerProfile(playerId) {
  const content = document.getElementById('playerProfileContent');
  content.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);"><span class="material-symbols-outlined pp-spin" style="font-size:32px;">progress_activity</span><div style="margin-top:8px;">Loading player data...</div></div>';
  openModal('playerProfileModal');
  try {
    const r = await AdminAPI.get(`/api/admin/players/${playerId}/profile`);
    document.getElementById('profileModalTitle').textContent = r.data.player.name;
    content.innerHTML = renderPlayerProfile(r.data);
  } catch (e) {
    content.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);"><span class="material-symbols-outlined" style="font-size:32px;">error</span><p>Could not load player profile</p></div>';
  }
}
