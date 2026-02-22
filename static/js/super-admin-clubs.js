/**
 * HOOPS AI — Super Admin Club List
 */
let allClubs = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!requireSuperAdminAuth()) return;
  loadClubs();

  document.getElementById('searchInput').addEventListener('input', debounce(loadClubs, 300));
  document.getElementById('statusFilter').addEventListener('change', loadClubs);
});


async function loadClubs() {
  const search = document.getElementById('searchInput').value.trim();
  const status = document.getElementById('statusFilter').value;

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  const url = '/api/super/clubs' + (params.toString() ? '?' + params.toString() : '');

  try {
    const res = await SuperAdminAPI.get(url);
    allClubs = res.data;
    renderClubTable(allClubs);
  } catch (err) {
    document.getElementById('clubsTableBody').innerHTML =
      '<tr><td colspan="6" class="empty-state">Failed to load clubs</td></tr>';
  }
}


function renderClubTable(clubs) {
  const tbody = document.getElementById('clubsTableBody');

  if (!clubs.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span class="material-symbols-outlined">domain</span>No clubs found</td></tr>';
    return;
  }

  tbody.innerHTML = clubs.map(c => `
    <tr onclick="window.location.href='/super-admin/clubs/${c.id}'">
      <td style="font-weight:600;">${esc(c.name)}</td>
      <td><span class="status-badge ${c.status}">${c.status}</span></td>
      <td><span class="tier-badge">${esc(c.tier_label || '—')}</span></td>
      <td>${c.total_users}</td>
      <td>₪${c.monthly_price?.toLocaleString() || 0}</td>
      <td class="text-muted text-sm">${formatDate(c.created_at)}</td>
    </tr>
  `).join('');
}


function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}


function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}
