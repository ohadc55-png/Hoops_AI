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
      el.innerHTML = '<div class="empty-state-admin"><span class="material-symbols-outlined">location_on</span><h3>No facilities</h3><p>Add your first facility</p></div>';
      return;
    }
    el.innerHTML = `<table class="members-table">
      <thead><tr><th>Name</th><th>Type</th><th>Address</th><th>Capacity</th><th></th></tr></thead>
      <tbody>${_facilities.map(f => `<tr>
        <td><strong>${esc(f.name)}</strong>${f.notes ? '<div style="color:var(--text-muted);font-size:var(--text-xs);margin-top:2px;">' + esc(f.notes) + '</div>' : ''}</td>
        <td><span class="badge badge-neutral">${esc(f.facility_type ? f.facility_type.charAt(0).toUpperCase() + f.facility_type.slice(1) : '')}</span></td>
        <td style="font-size:var(--text-sm);">${esc(f.address || '—')}</td>
        <td style="font-size:var(--text-sm);">${f.capacity || '—'}</td>
        <td>
          <button class="btn btn-ghost btn-xs" onclick="editFacility(${f.id})" title="Edit"><span class="material-symbols-outlined">edit</span></button>
          <button class="btn btn-ghost btn-xs" onclick="deleteFacility(${f.id})" title="Delete"><span class="material-symbols-outlined">delete</span></button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
  } catch {
    el.innerHTML = '<div class="empty-state-admin">Could not load facilities</div>';
  }
}

function openFacilityModal(data) {
  document.getElementById('editFacilityId').value = data?.id || '';
  document.getElementById('facName').value = data?.name || '';
  document.getElementById('facType').value = data?.facility_type || 'gym';
  document.getElementById('facAddress').value = data?.address || '';
  document.getElementById('facCapacity').value = data?.capacity || '';
  document.getElementById('facNotes').value = data?.notes || '';
  document.getElementById('facilityModalTitle').textContent = data ? 'Edit Facility' : 'Add Facility';
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
    notes: document.getElementById('facNotes').value.trim() || null,
  };
  try {
    if (id) {
      await AdminAPI.put(`/api/admin/facilities/${id}`, body);
      AdminToast.success('Facility updated');
    } else {
      await AdminAPI.post('/api/admin/facilities', body);
      AdminToast.success('Facility created');
    }
    closeModal('facilityModal');
    loadFacilities();
  } catch { /* toast already shown */ }
  return false;
}

async function deleteFacility(id) {
  if (!confirm('Delete this facility?')) return;
  try {
    await AdminAPI.del(`/api/admin/facilities/${id}`);
    AdminToast.success('Facility deleted');
    loadFacilities();
  } catch { /* toast already shown */ }
}
