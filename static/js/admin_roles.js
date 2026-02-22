/**
 * HOOPS AI — Admin Roles Page JS
 * Role CRUD management + Professional Staff (coaches list)
 */

let _roles = [];
let _coachesLoaded = false;

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAPI.token) return;
  loadRoles();
});

// ===== TAB SWITCHING =====

function switchRolesTab(tabId) {
  document.querySelectorAll('.roles-tab').forEach(t => t.classList.remove('active'));
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
      el.innerHTML = '<div class="empty-state-admin"><span class="material-symbols-outlined">badge</span><h3>No roles</h3></div>';
      return;
    }
    el.innerHTML = `<table class="members-table">
      <thead><tr><th>Role</th><th>Description</th><th>Type</th><th></th></tr></thead>
      <tbody>${_roles.map(r => `<tr>
        <td><strong>${esc(r.name)}</strong></td>
        <td class="text-muted text-sm">${esc(r.description || '-')}</td>
        <td>${r.is_default ? '<span class="badge badge-primary">Default</span>' : '<span class="badge badge-neutral">Custom</span>'}</td>
        <td>${!r.is_default ? `<button class="btn btn-ghost btn-xs" onclick="deleteRole(${r.id})" title="Delete"><span class="material-symbols-outlined">delete</span></button>` : ''}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  } catch {
    el.innerHTML = '<div class="empty-state-admin">Could not load roles</div>';
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
    AdminToast.success('Role created');
    loadRoles();
  } catch { /* toast already shown */ }
  return false;
}

async function deleteRole(roleId) {
  if (!confirm('Delete this role?')) return;
  try {
    await AdminAPI.del(`/api/admin/roles/${roleId}`);
    AdminToast.success('Role deleted');
    loadRoles();
  } catch { /* toast already shown */ }
}

// ===== PROFESSIONAL STAFF (COACHES) =====

async function loadCoaches() {
  const el = document.getElementById('coachesContent');
  el.innerHTML = '<div class="loading-state">טוען מאמנים...</div>';
  try {
    const res = await AdminAPI.get('/api/admin/contacts?role=coach');
    const coaches = res.data || [];
    _coachesLoaded = true;

    if (coaches.length === 0) {
      el.innerHTML = '<div class="empty-state-admin"><span class="material-symbols-outlined">sports</span><h3>אין מאמנים במועדון</h3></div>';
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
        <span class="coaches-count">${coaches.length} מאמנים</span>
      </div>
      <table class="members-table coaches-table">
        <thead>
          <tr>
            <th>שם</th>
            <th>קבוצה</th>
            <th>אימייל</th>
            <th>טלפון</th>
            <th>הצטרף</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  } catch {
    el.innerHTML = '<div class="empty-state-admin">שגיאה בטעינת מאמנים</div>';
  }
}
