/**
 * HOOPS AI — Super Admin Dashboard
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireSuperAdminAuth()) return;
  loadDashboard();
});


async function loadDashboard() {
  try {
    const res = await SuperAdminAPI.get('/api/super/dashboard');
    const d = res.data;

    document.getElementById('statClubs').textContent = d.total_clubs;
    document.getElementById('statUsers').textContent = d.total_users;
    document.getElementById('statActive').textContent = d.active_clubs;
    document.getElementById('statMRR').textContent = `₪${d.mrr.toLocaleString()}`;

    renderRecentClubs(d.recent_clubs);
    renderUsersByRole(d.users_by_role);
  } catch (err) {
    // Toast handled by API wrapper
  }
}


function renderRecentClubs(clubs) {
  const el = document.getElementById('recentClubsList');
  if (!clubs || clubs.length === 0) {
    el.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">domain</span>No clubs yet</div>';
    return;
  }
  el.innerHTML = clubs.map(c => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-3) 0;border-bottom:1px solid var(--border);">
      <div>
        <a href="/super-admin/clubs/${c.id}" style="font-weight:600;color:var(--text);">${esc(c.name)}</a>
        <div class="text-sm text-muted">${timeAgo(c.created_at)}</div>
      </div>
      <span class="status-badge ${c.status}">${c.status}</span>
    </div>
  `).join('');
}


function renderUsersByRole(roles) {
  const el = document.getElementById('usersByRole');
  if (!roles || Object.keys(roles).length === 0) {
    el.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">group</span>No users</div>';
    return;
  }

  const icons = { admin: 'shield_person', coach: 'sports', player: 'sports_basketball', parent: 'family_restroom' };
  const total = Object.values(roles).reduce((s, v) => s + v, 0);

  el.innerHTML = Object.entries(roles).map(([role, count]) => {
    const pct = total > 0 ? Math.round(count / total * 100) : 0;
    return `
      <div style="display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-3) 0;border-bottom:1px solid var(--border);">
        <span class="material-symbols-outlined" style="color:var(--primary);font-size:20px;">${icons[role] || 'person'}</span>
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;">
            <span style="text-transform:capitalize;font-weight:500;">${role === 'coach' ? 'Coaches' : role + 's'}</span>
            <span class="text-muted">${count}</span>
          </div>
          <div style="height:4px;background:var(--bg-card);border-radius:2px;margin-top:4px;">
            <div style="height:100%;width:${pct}%;background:var(--primary);border-radius:2px;"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}


/* timeAgo → shared-utils.js */
