/**
 * HOOPS AI — Admin Transport Detail Page JS
 * Shows event details, Google Maps embed, and edit form
 */

let _eventData = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAPI.token) return;
  loadEventDetail();
});

async function loadEventDetail() {
  const cardEl = document.getElementById('eventInfoCard');
  try {
    const res = await AdminAPI.get(`/api/transport/away-games/${EVENT_ID}`);
    _eventData = res.data;
    renderEventInfo();
    // Populate edit form
    document.getElementById('editDepartureTime').value = _eventData.departure_time || '';
    document.getElementById('editVenueAddress').value = _eventData.venue_address || '';
    // Show map if address exists
    if (_eventData.venue_address) {
      renderMap(_eventData.venue_address);
    }
  } catch {
    cardEl.innerHTML = `<div class="empty-state-admin">${t('admin.transport_detail.empty.load_error')}</div>`;
  }
}

function renderEventInfo() {
  const e = _eventData;
  const d = new Date(e.date + 'T00:00:00');
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  document.getElementById('eventInfoCard').innerHTML = `
    <div class="section-header">
      <h2><span class="material-symbols-outlined">sports_basketball</span> ${esc(e.title)}</h2>
      <span class="badge" style="background:rgba(248,113,113,0.15);color:#F87171;padding:4px 10px;border-radius:6px;">${t('admin.transport_detail.away_game')}</span>
    </div>
    <div class="section-content">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);">
        <div>
          <div style="color:var(--text-muted);font-size:var(--text-xs);text-transform:uppercase;margin-bottom:2px;">${t('admin.transport_detail.date')}</div>
          <div style="font-weight:600;">${dateStr}</div>
        </div>
        <div>
          <div style="color:var(--text-muted);font-size:var(--text-xs);text-transform:uppercase;margin-bottom:2px;">${t('admin.transport_detail.team')}</div>
          <div style="font-weight:600;">${esc(e.team_name)}</div>
        </div>
        <div>
          <div style="color:var(--text-muted);font-size:var(--text-xs);text-transform:uppercase;margin-bottom:2px;">${t('admin.transport_detail.game_time')}</div>
          <div style="font-weight:600;">${e.time_start || '-'}${e.time_end ? ' - ' + e.time_end : ''}</div>
        </div>
        <div>
          <div style="color:var(--text-muted);font-size:var(--text-xs);text-transform:uppercase;margin-bottom:2px;">${t('admin.transport_detail.opponent')}</div>
          <div style="font-weight:600;">${e.opponent ? esc(e.opponent) : '-'}</div>
        </div>
        <div>
          <div style="color:var(--text-muted);font-size:var(--text-xs);text-transform:uppercase;margin-bottom:2px;">${t('admin.transport_detail.departure_time')}</div>
          <div style="font-weight:600;color:${e.departure_time ? '#34D399' : 'var(--text-muted)'};">
            <span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">schedule</span>
            ${e.departure_time || t('admin.transport_detail.not_set')}
          </div>
        </div>
        <div>
          <div style="color:var(--text-muted);font-size:var(--text-xs);text-transform:uppercase;margin-bottom:2px;">${t('admin.transport_detail.venue_address')}</div>
          <div style="font-weight:600;">
            <span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">location_on</span>
            ${e.venue_address ? esc(e.venue_address) : t('admin.transport_detail.not_set')}
          </div>
        </div>
      </div>
      ${e.location ? `<div style="margin-top:var(--sp-3);color:var(--text-secondary);font-size:var(--text-sm);">${t('admin.transport_detail.location')} ${esc(e.location)}</div>` : ''}
      ${e.notes ? `<div style="margin-top:var(--sp-2);color:var(--text-secondary);font-size:var(--text-sm);">${t('admin.transport_detail.notes')} ${esc(e.notes)}</div>` : ''}
    </div>
  `;
}

function renderMap(address) {
  const encoded = encodeURIComponent(address);
  const mapSection = document.getElementById('mapSection');
  const mapContainer = document.getElementById('mapContainer');
  const navButtons = document.getElementById('navButtons');
  mapContainer.innerHTML = `<iframe
    width="100%" height="400" frameborder="0" style="border:0;border-radius:var(--r-lg);"
    src="https://maps.google.com/maps?q=${encoded}&output=embed"
    allowfullscreen loading="lazy"
    referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  navButtons.innerHTML = `
    <a href="https://waze.com/ul?q=${encoded}&navigate=yes" target="_blank" rel="noopener"
       class="btn btn-xs" style="background:#33ccff;color:#000;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
      <span class="material-symbols-outlined" style="font-size:16px;">navigation</span> ${t('admin.transport_detail.navigate_waze')}
    </a>
    <a href="https://www.google.com/maps/search/${encoded}" target="_blank" rel="noopener"
       class="btn btn-xs" style="background:#4285F4;color:#fff;text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
      <span class="material-symbols-outlined" style="font-size:16px;">map</span> ${t('admin.transport_detail.google_maps')}
    </a>`;
  mapSection.style.display = 'block';
}

function updateMap() {
  const address = document.getElementById('editVenueAddress').value.trim();
  if (address) {
    renderMap(address);
  } else {
    AdminToast.error(t('admin.transport_detail.address_required'));
  }
}

async function saveTransportInfo(e) {
  e.preventDefault();
  const departureTime = document.getElementById('editDepartureTime').value || null;
  const venueAddress = document.getElementById('editVenueAddress').value.trim() || null;

  try {
    await AdminAPI.put(`/api/schedule/events/${EVENT_ID}`, {
      departure_time: departureTime,
      venue_address: venueAddress,
    });
    AdminToast.success(t('admin.transport_detail.saved'));
    // Reload details
    loadEventDetail();
  } catch {
    /* toast already shown by AdminAPI */
  }
  return false;
}
