/**
 * HOOPS AI — Admin Facilities Page JS
 */
let _facilities = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAPI.token) return;
  loadFacilities();
});

async function loadFacilities() {
  const el = document.getElementById('facilitiesContent');
  try {
    const res = await AdminAPI.get('/api/admin/facilities');
    _facilities = res.data || [];
    if (_facilities.length === 0) {
      el.innerHTML = `<div class="empty-state-admin"><span class="material-symbols-outlined">location_on</span><h3>${t('admin.facilities.empty.no_facilities')}</h3><p>${t('admin.facilities.empty.no_facilities_desc')}</p></div>`;
      return;
    }
    el.innerHTML = `<table class="members-table">
      <thead><tr><th>${t('admin.facilities.th.name')}</th><th>${t('admin.facilities.th.type')}</th><th>${t('admin.facilities.th.address')}</th><th>${t('admin.facilities.th.capacity')}</th><th>${t('admin.facilities.th.manager')}</th><th>${t('admin.facilities.th.phone')}</th><th></th></tr></thead>
      <tbody>${_facilities.map(f => `<tr>
        <td><strong>${esc(f.name)}</strong>${f.notes ? '<div style="color:var(--text-muted);font-size:var(--text-xs);margin-top:2px;">' + esc(f.notes) + '</div>' : ''}</td>
        <td><span class="badge badge-neutral">${esc(f.facility_type ? f.facility_type.charAt(0).toUpperCase() + f.facility_type.slice(1) : '')}</span></td>
        <td style="font-size:var(--text-sm);">${esc(f.address || '—')}</td>
        <td style="font-size:var(--text-sm);">${f.capacity || '—'}</td>
        <td style="font-size:var(--text-sm);">${esc(f.manager_name || '—')}</td>
        <td style="font-size:var(--text-sm);">${f.manager_phone ? `<a href="tel:${esc(f.manager_phone)}" style="color:var(--primary);text-decoration:none;">${esc(f.manager_phone)}</a>` : '—'}</td>
        <td>
          <button class="btn btn-ghost btn-xs" onclick="editFacility(${f.id})" title="Edit"><span class="material-symbols-outlined">edit</span></button>
          <button class="btn btn-ghost btn-xs" onclick="deleteFacility(${f.id})" title="Delete"><span class="material-symbols-outlined">delete</span></button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
  } catch {
    el.innerHTML = `<div class="empty-state-admin">${t('admin.facilities.empty.load_error')}</div>`;
  }
}

function openFacilityModal(data) {
  document.getElementById('editFacilityId').value = data?.id || '';
  document.getElementById('facName').value = data?.name || '';
  document.getElementById('facType').value = data?.facility_type || 'gym';
  document.getElementById('facAddress').value = data?.address || '';
  document.getElementById('facCapacity').value = data?.capacity || '';
  document.getElementById('facManagerName').value = data?.manager_name || '';
  document.getElementById('facManagerPhone').value = data?.manager_phone || '';
  document.getElementById('facNotes').value = data?.notes || '';
  document.getElementById('facilityModalTitle').textContent = data ? t('admin.facilities.modal.edit') : t('admin.facilities.modal.add');
  openModal('facilityModal');
}

function editFacility(id) {
  const f = _facilities.find(x => x.id === id);
  if (f) openFacilityModal(f);
}

async function handleSaveFacility(e) {
  e.preventDefault();
  const id = document.getElementById('editFacilityId').value;
  const body = {
    name: document.getElementById('facName').value.trim(),
    facility_type: document.getElementById('facType').value,
    address: document.getElementById('facAddress').value.trim() || null,
    capacity: document.getElementById('facCapacity').value ? parseInt(document.getElementById('facCapacity').value) : null,
    manager_name: document.getElementById('facManagerName').value.trim() || null,
    manager_phone: document.getElementById('facManagerPhone').value.trim() || null,
    notes: document.getElementById('facNotes').value.trim() || null,
  };
  try {
    if (id) {
      await AdminAPI.put(`/api/admin/facilities/${id}`, body);
      AdminToast.success(t('admin.facilities.facility_updated'));
    } else {
      await AdminAPI.post('/api/admin/facilities', body);
      AdminToast.success(t('admin.facilities.facility_created'));
    }
    closeModal('facilityModal');
    loadFacilities();
  } catch { /* toast already shown */ }
  return false;
}

async function deleteFacility(id) {
  if (!confirm(t('admin.facilities.delete_confirm'))) return;
  try {
    await AdminAPI.del(`/api/admin/facilities/${id}`);
    AdminToast.success(t('admin.facilities.facility_deleted'));
    loadFacilities();
  } catch { /* toast already shown */ }
}
