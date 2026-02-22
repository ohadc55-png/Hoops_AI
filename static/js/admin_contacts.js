/**
 * HOOPS AI — Admin Contacts Page JS
 * Filterable contact list across all teams
 */

let _contacts = [];
let _currentRole = '';
let _searchTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAPI.token) return;
  loadTeamsFilter();
  loadContacts();
});


async function loadTeamsFilter() {
  try {
    const res = await AdminAPI.get('/api/teams');
    const teams = res.data || [];
    const sel = document.getElementById('filterTeam');
    teams.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      sel.appendChild(opt);
    });
  } catch { /* ignore */ }
}


async function loadContacts() {
  const teamId = document.getElementById('filterTeam').value;
  const search = document.getElementById('searchInput').value.trim();
  let url = '/api/admin/contacts?';
  if (teamId) url += `team_id=${teamId}&`;
  if (_currentRole) url += `role=${_currentRole}&`;
  if (search) url += `search=${encodeURIComponent(search)}&`;

  try {
    const res = await AdminAPI.get(url);
    _contacts = res.data || [];
    document.getElementById('contactsCount').textContent = _contacts.length + ' contacts';
    renderContacts();
  } catch {
    document.getElementById('contactsContent').innerHTML =
      '<div class="empty-state-admin">Could not load contacts</div>';
  }
}


function renderContacts() {
  const el = document.getElementById('contactsContent');
  if (_contacts.length === 0) {
    el.innerHTML = `<div class="empty-state-admin">
      <span class="material-symbols-outlined">person_off</span>
      <h3>No contacts found</h3>
      <p>Try changing your filters or invite members to your teams</p>
    </div>`;
    return;
  }

  const roleBadge = role => {
    const cls = role === 'coach' ? 'primary' : role === 'parent' ? 'warning' : 'neutral';
    const label = role.charAt(0).toUpperCase() + role.slice(1);
    return `<span class="badge badge-${cls}">${label}</span>`;
  };

  const rows = _contacts.map(c => {
    let extra = '';
    if (c.role === 'player' && c.player_data) {
      const pd = c.player_data;
      const parts = [];
      if (pd.position) parts.push(pd.position);
      if (pd.jersey_number) parts.push('#' + pd.jersey_number);
      if (pd.birth_date) {
        const age = calcAge(pd.birth_date);
        if (age) parts.push('Age ' + age);
      }
      if (pd.height) parts.push(pd.height + 'cm');
      if (pd.weight) parts.push(pd.weight + 'kg');
      if (parts.length) extra = `<div class="contact-extra">${esc(parts.join(' / '))}</div>`;
    }
    if (c.role === 'parent' && c.linked_child) {
      extra = `<div class="contact-extra">Parent of <strong>${esc(c.linked_child.name)}</strong></div>`;
    }

    const phone = (c.role === 'player' && c.player_data?.phone) || '';

    return `<tr class="contacts-row">
      <td class="contacts-cell">${esc(c.name)}</td>
      <td class="contacts-cell">${esc(c.email)}</td>
      <td class="contacts-cell">${roleBadge(c.role)}</td>
      <td class="contacts-cell">${esc(c.team_name || '')}</td>
      <td class="contacts-cell">${esc(phone)}</td>
      <td class="contacts-cell">${extra}</td>
      <td class="contacts-cell text-muted">${formatDate(c.joined_at)}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `<div style="overflow-x:auto;">
    <table class="contacts-table">
      <thead>
        <tr>
          <th>Name</th><th>Email</th><th>Role</th><th>Team</th><th>Phone</th><th>Details</th><th>Joined</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}


function setRoleFilter(btn) {
  document.querySelectorAll('#roleTabs .role-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _currentRole = btn.dataset.role;
  loadContacts();
}


function applyFilters() {
  loadContacts();
}


function debounceSearch() {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => loadContacts(), 300);
}


function calcAge(bd) {
  if (!bd) return '';
  const d = new Date(bd), now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
}


function formatDate(s) {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString(); } catch { return s; }
}


function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
