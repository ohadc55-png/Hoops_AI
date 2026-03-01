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
        <h3>${t('admin.teams.empty.no_teams')}</h3>
        <p>${t('admin.teams.empty.no_teams_desc')}</p>
      </div>`;
      return;
    }
    el.innerHTML = _teams.map(tm => renderTeamCard(tm)).join('');
  } catch {
    el.innerHTML = `<div class="empty-state-admin">${t('admin.teams.empty.load_error')}</div>`;
  }
}


function renderTeamCard(tm) {
  const memberCount = tm.member_count || 0;
  const coaches = (tm.members || []).filter(m => m.role_in_team === 'coach').length;
  const players = (tm.members || []).filter(m => m.role_in_team === 'player').length;
  const parents = (tm.members || []).filter(m => m.role_in_team === 'parent').length;
  const origin = window.location.origin;

  return `<div class="team-card" id="team-${tm.id}">
    <div class="team-card-header">
      <div class="team-card-title">
        <h3>${esc(tm.name)}</h3>
        <span class="team-meta">${[tm.age_group, tm.level, tm.club_name].filter(Boolean).join(' / ')}</span>
      </div>
      <div class="team-card-stats">
        <span class="badge badge-neutral">${coaches} ${t('admin.teams.coaches')}</span>
        <span class="badge badge-neutral">${players} ${t('admin.teams.players')}</span>
        <span class="badge badge-neutral">${parents} ${t('admin.teams.parents')}</span>
      </div>
    </div>

    <div class="invite-section">
      <div class="invite-row">
        <div class="invite-label">${t('admin.teams.coach_invite_code')}</div>
        <div class="invite-value">
          <code class="invite-code">${esc(tm.coach_invite_code)}</code>
          <button class="btn btn-ghost btn-xs" onclick="copyText('${esc(tm.coach_invite_code)}', this)" title="${t('admin.teams.copy_code')}">
            <span class="material-symbols-outlined">content_copy</span>
          </button>
          <button class="btn btn-ghost btn-xs" onclick="regenCoachCode(${tm.id})" title="${t('admin.teams.regenerate')}">
            <span class="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </div>
      <div class="invite-row">
        <div class="invite-label">${t('admin.teams.coach_invite_link')}</div>
        <div class="invite-value">
          <button class="btn btn-ghost btn-xs" onclick="copyText('${origin}/join/coach/${esc(tm.coach_invite_token)}', this)" title="${t('admin.teams.copy_link')}">
            <span class="material-symbols-outlined">link</span> ${t('admin.teams.copy_link')}
          </button>
        </div>
      </div>
      <div class="invite-row">
        <div class="invite-label">${t('admin.teams.player_invite_code')}</div>
        <div class="invite-value">
          <code class="invite-code">${esc(tm.player_invite_code)}</code>
          <button class="btn btn-ghost btn-xs" onclick="copyText('${esc(tm.player_invite_code)}', this)" title="${t('admin.teams.copy_code')}">
            <span class="material-symbols-outlined">content_copy</span>
          </button>
          <button class="btn btn-ghost btn-xs" onclick="regenPlayerCode(${tm.id})" title="${t('admin.teams.regenerate')}">
            <span class="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </div>
      <div class="invite-row">
        <div class="invite-label">${t('admin.teams.player_invite_link')}</div>
        <div class="invite-value">
          <button class="btn btn-ghost btn-xs" onclick="copyText('${origin}/join/player/${esc(tm.player_invite_token)}', this)" title="${t('admin.teams.copy_link')}">
            <span class="material-symbols-outlined">link</span> ${t('admin.teams.copy_link')}
          </button>
        </div>
      </div>
      ${tm.parent_invite_code ? `
      <div class="invite-row">
        <div class="invite-label">${t('admin.teams.parent_invite_code')}</div>
        <div class="invite-value">
          <code class="invite-code">${esc(tm.parent_invite_code)}</code>
          <button class="btn btn-ghost btn-xs" onclick="copyText('${esc(tm.parent_invite_code)}', this)" title="${t('admin.teams.copy_code')}">
            <span class="material-symbols-outlined">content_copy</span>
          </button>
          <button class="btn btn-ghost btn-xs" onclick="regenParentCode(${tm.id})" title="${t('admin.teams.regenerate')}">
            <span class="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </div>
      <div class="invite-row">
        <div class="invite-label">${t('admin.teams.parent_invite_link')}</div>
        <div class="invite-value">
          <button class="btn btn-ghost btn-xs" onclick="copyText('${origin}/join/parent/${esc(tm.parent_invite_token)}', this)" title="${t('admin.teams.copy_link')}">
            <span class="material-symbols-outlined">link</span> ${t('admin.teams.copy_link')}
          </button>
        </div>
      </div>` : ''}
    </div>


${memberCount > 0 ? `
    <div class="members-section">
      <button class="btn btn-ghost btn-sm members-toggle" onclick="toggleMembers(${tm.id})">
        <span class="material-symbols-outlined">expand_more</span>
        ${memberCount} ${t('admin.teams.members')}
      </button>
      <div class="members-list hidden" id="members-${tm.id}">
        ${renderMembers(tm)}
      </div>
    </div>` : `<div class="members-section"><span class="text-muted text-sm">${t('admin.teams.no_members')}</span></div>`}
  </div>`;
}


function renderMembers(tm) {
  const members = tm.members || [];
  if (members.length === 0) return `<div class="text-muted text-sm">${t('admin.teams.no_members_table')}</div>`;
  return `<table class="members-table">
    <thead><tr><th>${t('admin.teams.th.role')}</th><th>${t('admin.teams.th.name')}</th><th>${t('admin.teams.th.email')}</th><th>${t('admin.teams.th.joined')}</th><th></th></tr></thead>
    <tbody>${members.map(m => {
      const extra = m.role_in_team === 'parent' && m.child_name ? ` <span class="text-muted">(${t('admin.teams.parent_of')} ${esc(m.child_name)})</span>` : '';
      const nameHtml = m.role_in_team === 'player' && m.player_id
        ? `<a href="javascript:void(0)" class="player-name-link" onclick="event.stopPropagation();openAdminPlayerProfile(${m.player_id})">${esc(m.name || '—')}</a>`
        : esc(m.name || '—');
      return `<tr>
      <td><span class="badge badge-${m.role_in_team === 'coach' ? 'primary' : m.role_in_team === 'parent' ? 'warning' : 'neutral'}">${esc(m.role_in_team)}</span></td>
      <td>${nameHtml}${extra}</td>
      <td class="text-muted">${esc(m.email || '—')}</td>
      <td>${new Date(m.joined_at).toLocaleDateString()}</td>
      <td><button class="btn btn-ghost btn-xs" onclick="removeMember(${tm.id}, ${m.id})" title="${t('admin.teams.remove_title')}"><span class="material-symbols-outlined">person_remove</span></button></td>
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
    AdminToast.success(t('admin.teams.coach_code_regenerated'));
    loadTeams();
  } catch { /* toast already shown */ }
}

async function regenPlayerCode(teamId) {
  try {
    await AdminAPI.post(`/api/teams/${teamId}/regenerate-player-code`);
    AdminToast.success(t('admin.teams.player_code_regenerated'));
    loadTeams();
  } catch { /* toast already shown */ }
}

async function regenParentCode(teamId) {
  try {
    await AdminAPI.post(`/api/teams/${teamId}/regenerate-parent-code`);
    AdminToast.success(t('admin.teams.parent_code_regenerated'));
    loadTeams();
  } catch { /* toast already shown */ }
}


async function removeMember(teamId, memberId) {
  if (!confirm(t('admin.teams.remove_confirm'))) return;
  try {
    await AdminAPI.del(`/api/teams/${teamId}/members/${memberId}`);
    AdminToast.success(t('admin.teams.member_removed'));
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
    AdminToast.success(t('admin.teams.team_created'));
    loadTeams();
  } catch { /* toast already shown */ }
  return false;
}


async function openAdminPlayerProfile(playerId) {
  const content = document.getElementById('playerProfileContent');
  content.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);"><span class="material-symbols-outlined pp-spin" style="font-size:32px;">progress_activity</span><div style="margin-top:8px;">${t('admin.teams.loading_player')}</div></div>`;
  openModal('playerProfileModal');
  try {
    const r = await AdminAPI.get(`/api/admin/players/${playerId}/profile`);
    document.getElementById('profileModalTitle').textContent = r.data.player.name;
    content.innerHTML = renderPlayerProfile(r.data);
  } catch (e) {
    content.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);"><span class="material-symbols-outlined" style="font-size:32px;">error</span><p>${t('admin.teams.player_load_error')}</p></div>`;
  }
}


