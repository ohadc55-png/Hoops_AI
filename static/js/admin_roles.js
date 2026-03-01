/**
 * HOOPS AI — Admin Roles Page JS
 * Role CRUD management + Professional Staff (coaches list)
 */

let _roles = [];
let _coachesLoaded = false;
let _editingRoleId = null;

const ALL_SECTIONS = [
  { key: 'dashboard',         label: 'Dashboard / דשבורד' },
  { key: 'schedule',          label: 'Schedule / לוח זמנים' },
  { key: 'teams',             label: 'Teams / קבוצות' },
  { key: 'messages',          label: 'Messages / הודעות' },
  { key: 'contacts',          label: 'Contacts / אנשי קשר' },
  { key: 'scouting',          label: 'Video Room / חדר וידאו' },
  { key: 'player_development',label: 'Player Development / פיתוח שחקנים' },
  { key: 'coaches',           label: 'Coach Engagement / מעורבות מאמנים' },
  { key: 'facilities',        label: 'Facilities / מתקנים' },
  { key: 'transport',         label: 'Transport / הסעות' },
  { key: 'billing',           label: 'Finance / כספים' },
  { key: 'roles',             label: 'Roles / תפקידים' },
  { key: 'insights',          label: 'AI Insights / תובנות AI' },
  { key: 'knowledge',         label: 'Knowledge Base / בסיס ידע' },
];

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAPI.token) return;
  loadRoles();
});

// ===== TAB SWITCHING =====

function switchRolesTab(tabId) {
  document.querySelectorAll('.roles-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelector(`.roles-tab[data-tab="${tabId}"]`).classList.add('active');

  document.querySelectorAll('.roles-panel').forEach(p => {
    p.style.display = 'none';
    p.classList.remove('active');
  });
  const panel = document.getElementById(`panel-${tabId}`);
  panel.style.display = '';
  panel.classList.add('active');

  if (tabId === 'coaches' && !_coachesLoaded) {
    loadCoaches();
  }
}

// ===== ADMIN ROLES =====

async function loadRoles() {
  const el = document.getElementById('rolesContent');
  try {
    const res = await AdminAPI.get('/api/admin/roles');
    _roles = res.data || [];
    if (_roles.length === 0) {
      el.innerHTML = `<div class="empty-state-admin"><span class="material-symbols-outlined">badge</span><h3>${t('admin.roles.empty.no_roles')}</h3></div>`;
      return;
    }
    el.innerHTML = `<table class="members-table">
      <thead><tr>
        <th>${t('admin.roles.th.role')}</th>
        <th>${t('admin.roles.th.description')}</th>
        <th>${t('admin.roles.th.type')}</th>
        <th>${t('admin.roles.th.permissions')}</th>
        <th></th>
      </tr></thead>
      <tbody>${_roles.map(r => {
        const allowed = r.permissions?.allowed_pages;
        const permBadge = allowed
          ? `<span style="font-size:11px;color:var(--text-muted);">${allowed.length} ${t('admin.roles.permissions.sections')}</span>`
          : `<span class="badge badge-primary" style="font-size:10px;">${t('admin.roles.permissions.all_access')}</span>`;
        return `<tr>
          <td><strong>${esc(r.name)}</strong></td>
          <td class="text-muted text-sm">${esc(r.description || '-')}</td>
          <td>${r.is_default ? `<span class="badge badge-primary">${t('admin.roles.badge.default')}</span>` : `<span class="badge badge-neutral">${t('admin.roles.badge.custom')}</span>`}</td>
          <td>${permBadge}</td>
          <td style="display:flex;gap:4px;">
            <button class="btn btn-ghost btn-xs" onclick="openPermissionsModal(${r.id})" title="${t('admin.roles.permissions.edit')}">
              <span class="material-symbols-outlined">tune</span>
            </button>
            ${!r.is_default ? `<button class="btn btn-ghost btn-xs" onclick="deleteRole(${r.id})" title="Delete"><span class="material-symbols-outlined">delete</span></button>` : ''}
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  } catch {
    el.innerHTML = `<div class="empty-state-admin">${t('admin.roles.empty.load_error')}</div>`;
  }
}

function openCreateRoleModal() {
  document.getElementById('roleName').value = '';
  document.getElementById('roleDescription').value = '';
  openModal('createRoleModal');
}

async function handleCreateRole(e) {
  e.preventDefault();
  const name = document.getElementById('roleName').value.trim();
  if (!name) return;
  try {
    await AdminAPI.post('/api/admin/roles', { name, description: document.getElementById('roleDescription').value.trim() || null });
    closeModal('createRoleModal');
    AdminToast.success(t('admin.roles.role_created'));
    loadRoles();
  } catch { /* toast already shown */ }
  return false;
}

function openPermissionsModal(roleId) {
  const role = _roles.find(r => r.id === roleId);
  if (!role) return;
  _editingRoleId = roleId;

  document.getElementById('permRoleName').textContent = role.name;
  const allowed = role.permissions?.allowed_pages || null;

  const container = document.getElementById('permCheckboxes');
  container.innerHTML = ALL_SECTIONS.map(s => `
    <label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.04);">
      <input type="checkbox" value="${s.key}" ${!allowed || allowed.includes(s.key) ? 'checked' : ''}
        style="width:16px;height:16px;accent-color:var(--primary);cursor:pointer;">
      <span style="font-size:var(--text-sm);">${esc(s.label)}</span>
    </label>`).join('');

  // "All access" toggle
  document.getElementById('permAllAccess').checked = !allowed;
  toggleAllAccessUI(!allowed);

  openModal('permissionsModal');
}

function toggleAllAccessUI(allAccess) {
  const container = document.getElementById('permCheckboxes');
  container.style.opacity = allAccess ? '0.4' : '1';
  container.style.pointerEvents = allAccess ? 'none' : '';
}

async function savePermissions() {
  const roleId = _editingRoleId;
  if (!roleId) return;

  const allAccess = document.getElementById('permAllAccess').checked;
  let permissions = null;
  if (!allAccess) {
    const checked = [...document.querySelectorAll('#permCheckboxes input[type=checkbox]:checked')].map(cb => cb.value);
    permissions = { allowed_pages: checked };
  }

  try {
    await AdminAPI.put(`/api/admin/roles/${roleId}`, { permissions });
    closeModal('permissionsModal');
    AdminToast.success(t('admin.roles.permissions.saved'));
    loadRoles();
  } catch { /* toast already shown */ }
}

async function deleteRole(roleId) {
  if (!confirm(t('admin.roles.delete_confirm'))) return;
  try {
    await AdminAPI.del(`/api/admin/roles/${roleId}`);
    AdminToast.success(t('admin.roles.role_deleted'));
    loadRoles();
  } catch { /* toast already shown */ }
}

// ===== PROFESSIONAL STAFF (COACHES) =====

async function loadCoaches() {
  const el = document.getElementById('coachesContent');
  el.innerHTML = `<div class="loading-state">${t('admin.roles.coaches.loading')}</div>`;
  try {
    const res = await AdminAPI.get('/api/admin/contacts?role=coach');
    const coaches = res.data || [];
    _coachesLoaded = true;

    if (coaches.length === 0) {
      el.innerHTML = `<div class="empty-state-admin"><span class="material-symbols-outlined">sports</span><h3>${t('admin.roles.coaches.empty')}</h3></div>`;
      return;
    }

    const rows = coaches.map(c => {
      const joined = c.joined_at
        ? new Date(c.joined_at).toLocaleDateString('he-IL')
        : '—';
      return `<tr>
        <td>
          <div class="coach-name-cell">
            <span class="coach-avatar"><span class="material-symbols-outlined">sports</span></span>
            <strong>${esc(c.name || '—')}</strong>
          </div>
        </td>
        <td>${esc(c.team_name || '—')}</td>
        <td>${esc(c.email || '—')}</td>
        <td>${esc(c.phone || '—')}</td>
        <td>${joined}</td>
      </tr>`;
    }).join('');

    el.innerHTML = `
      <div class="coaches-summary">
        <span class="coaches-count">${t('admin.roles.coaches.count', { count: coaches.length })}</span>
      </div>
      <table class="members-table coaches-table">
        <thead>
          <tr>
            <th>${t('admin.roles.coaches.th.name')}</th>
            <th>${t('admin.roles.coaches.th.team')}</th>
            <th>${t('admin.roles.coaches.th.email')}</th>
            <th>${t('admin.roles.coaches.th.phone')}</th>
            <th>${t('admin.roles.coaches.th.joined')}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  } catch {
    el.innerHTML = `<div class="empty-state-admin">${t('admin.roles.coaches.load_error')}</div>`;
  }
}
