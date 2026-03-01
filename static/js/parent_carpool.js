/**
 * HOOPS AI — Parent Carpool
 */

let _events = [];
let _selectedEventId = null;
let _currentRides = [];
let _standingCarpools = [];
let _myTeams = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!ParentAPI.token) return;
  loadStandingCarpools();
  loadEvents();
  loadMyTeams();
});

/* ═══════════════════════════════════════════════════
   Events
   ═══════════════════════════════════════════════════ */

async function loadEvents() {
  const el = document.getElementById('eventChips');
  try {
    const res = await ParentAPI.get('/api/carpool/events');
    _events = res.data || [];
    renderEventChips(_events);
    populateEventDropdown(_events);
  } catch {
    el.innerHTML = `<div class="empty-state-parent"><span class="material-symbols-outlined">error</span>${t('parent.carpool.events_error')}</div>`;
  }
}

function renderEventChips(events) {
  const el = document.getElementById('eventChips');
  if (!events.length) {
    el.innerHTML = `<div class="empty-state-parent"><span class="material-symbols-outlined">event_busy</span>${t('parent.carpool.no_events')}</div>`;
    return;
  }
  el.innerHTML = events.map(e => `
    <button class="event-chip ${_selectedEventId === e.id ? 'active' : ''}"
            onclick="selectEvent(${e.id})" data-eid="${e.id}">
      <span class="chip-date">${fmtDate(e.date)}</span>
      <span class="chip-title">${esc(e.title)}</span>
      <span class="chip-type schedule-type ${e.event_type}">${typeLabel(e.event_type)}</span>
    </button>
  `).join('');
}

function populateEventDropdown(events) {
  const sel = document.getElementById('rideEventId');
  sel.innerHTML = events.map(e =>
    `<option value="${e.id}">${fmtDate(e.date)} — ${esc(e.title)}</option>`
  ).join('');
}

function selectEvent(eventId) {
  _selectedEventId = eventId;
  document.querySelectorAll('.event-chip').forEach(c => c.classList.remove('active'));
  const chip = document.querySelector(`.event-chip[data-eid="${eventId}"]`);
  if (chip) chip.classList.add('active');
  loadRides(eventId);
}

/* ═══════════════════════════════════════════════════
   Rides
   ═══════════════════════════════════════════════════ */

async function loadRides(eventId) {
  const el = document.getElementById('ridesSection');
  el.innerHTML = `<div class="loading-state">${t('parent.carpool.loading_rides')}</div>`;
  try {
    const res = await ParentAPI.get(`/api/carpool/rides?event_id=${eventId}`);
    _currentRides = res.data || [];
    renderRides(_currentRides);
  } catch {
    el.innerHTML = `<div class="empty-state-parent">${t('parent.carpool.rides_error')}</div>`;
  }
}

function renderRides(rides) {
  const el = document.getElementById('ridesSection');
  if (!rides.length) {
    el.innerHTML = `
      <div class="empty-state-parent">
        <span class="material-symbols-outlined">no_transfer</span>
        ${t('parent.carpool.no_rides')}
        <br><small>${t('parent.carpool.be_first')}</small>
      </div>`;
    return;
  }
  el.innerHTML = rides.map(rideCard).join('');
}

function rideCard(r) {
  const passHtml = r.passengers.length
    ? `<div class="ride-passengers">
        <small>${t('parent.carpool.passengers')}</small>
        ${r.passengers.map(p => `<span class="passenger-chip">${esc(p.user_name)}${p.player_name ? ' (' + esc(p.player_name) + ')' : ''}</span>`).join('')}
       </div>` : '';

  let actions = '';
  if (r.is_mine) {
    actions = `
      <button class="btn btn-sm btn-secondary" onclick="editRide(${r.id})">${t('parent.carpool.edit')}</button>
      <button class="btn btn-sm btn-danger" onclick="cancelRide(${r.id})">${t('parent.carpool.cancel_ride')}</button>`;
  } else if (r.i_joined) {
    actions = `<button class="btn btn-sm btn-warning" onclick="leaveRide(${r.id})">${t('parent.carpool.leave_ride')}</button>`;
  } else if (r.is_full) {
    actions = `<span class="ride-full-label">${t('parent.carpool.full')}</span>`;
  } else {
    actions = `<button class="btn btn-sm btn-primary" onclick="openJoinModal(${r.id})">${t('parent.carpool.join')}</button>`;
  }

  return `
    <div class="ride-card ${r.is_full ? 'full' : ''}">
      <div class="ride-header">
        <div class="ride-driver">
          <span class="material-symbols-outlined">person</span>
          <strong>${esc(r.driver_name)}</strong>
          ${r.is_mine ? `<span class="ride-mine-badge">${t('parent.carpool.mine_badge')}</span>` : ''}
        </div>
        <span class="direction-badge ${r.direction}">${dirLabel(r.direction)}</span>
      </div>
      <div class="ride-details">
        <div class="ride-detail"><span class="material-symbols-outlined">location_on</span>${esc(r.neighborhood)}</div>
        ${r.departure_time ? `<div class="ride-detail"><span class="material-symbols-outlined">schedule</span>${r.departure_time}</div>` : ''}
        ${r.meeting_point ? `<div class="ride-detail"><span class="material-symbols-outlined">pin_drop</span>${esc(r.meeting_point)}</div>` : ''}
        <div class="ride-detail">
          <span class="material-symbols-outlined">airline_seat_recline_normal</span>
          <span class="${r.is_full ? 'seats-full' : ''}">${t('parent.carpool.seats_occupied', { occupied: r.occupied_seats, total: r.available_seats })}</span>
        </div>
        ${r.notes ? `<div class="ride-detail ride-notes"><span class="material-symbols-outlined">notes</span>${esc(r.notes)}</div>` : ''}
      </div>
      ${passHtml}
      <div class="ride-actions">${actions}</div>
    </div>`;
}

/* ═══════════════════════════════════════════════════
   Offer Ride
   ═══════════════════════════════════════════════════ */

function openOfferModal() {
  if (_selectedEventId) document.getElementById('rideEventId').value = _selectedEventId;
  document.getElementById('rideNeighborhood').value = '';
  document.getElementById('rideSeats').value = '2';
  document.getElementById('rideDepartureTime').value = '';
  document.getElementById('rideMeetingPoint').value = '';
  document.querySelector('input[name="rideDirection"][value="to_event"]').checked = true;
  document.getElementById('rideNotes').value = '';
  // Restore default footer
  document.getElementById('offerModalFooter').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal('offerRideModal')">${t('parent.carpool.cancel_btn')}</button>
    <button class="btn btn-primary" onclick="submitRide()">${t('parent.carpool.publish_ride')}</button>`;
  openModal('offerRideModal');
}

async function submitRide() {
  const body = gatherRideForm();
  if (!body) return;
  try {
    await ParentAPI.post('/api/carpool/rides', body);
    ParentToast.success(t('parent.carpool.ride_published'));
    closeModal('offerRideModal');
    if (_selectedEventId) loadRides(_selectedEventId);
  } catch { /* ParentAPI handles */ }
}

/* ═══════════════════════════════════════════════════
   Edit Ride
   ═══════════════════════════════════════════════════ */

function editRide(rideId) {
  const r = _currentRides.find(x => x.id === rideId);
  if (!r) return;
  document.getElementById('rideEventId').value = r.team_event_id;
  document.getElementById('rideNeighborhood').value = r.neighborhood || '';
  document.getElementById('rideSeats').value = r.available_seats;
  document.getElementById('rideDepartureTime').value = r.departure_time || '';
  document.getElementById('rideMeetingPoint').value = r.meeting_point || '';
  const dir = document.querySelector(`input[name="rideDirection"][value="${r.direction}"]`);
  if (dir) dir.checked = true;
  document.getElementById('rideNotes').value = r.notes || '';

  document.getElementById('offerModalFooter').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal('offerRideModal')">${t('parent.carpool.cancel_btn')}</button>
    <button class="btn btn-primary" onclick="submitEditRide(${rideId})">${t('parent.carpool.update_ride')}</button>`;
  openModal('offerRideModal');
}

async function submitEditRide(rideId) {
  const data = gatherRideForm();
  if (!data) return;
  delete data.event_id; // can't change event
  try {
    await ParentAPI.put(`/api/carpool/rides/${rideId}`, data);
    ParentToast.success(t('parent.carpool.ride_updated'));
    closeModal('offerRideModal');
    if (_selectedEventId) loadRides(_selectedEventId);
  } catch { /* handled */ }
}

function gatherRideForm() {
  const eventId = parseInt(document.getElementById('rideEventId').value);
  const neighborhood = document.getElementById('rideNeighborhood').value.trim();
  const seats = parseInt(document.getElementById('rideSeats').value);
  const depTime = document.getElementById('rideDepartureTime').value || null;
  const meetPoint = document.getElementById('rideMeetingPoint').value.trim() || null;
  const direction = document.querySelector('input[name="rideDirection"]:checked').value;
  const notes = document.getElementById('rideNotes').value.trim() || null;

  if (!neighborhood) { ParentToast.error(t('parent.carpool.neighborhood_required')); return null; }
  if (!seats || seats < 1) { ParentToast.error(t('parent.carpool.seats_required')); return null; }

  return { event_id: eventId, neighborhood, available_seats: seats, departure_time: depTime, meeting_point: meetPoint, direction, notes };
}

/* ═══════════════════════════════════════════════════
   Join / Leave / Cancel
   ═══════════════════════════════════════════════════ */

function openJoinModal(rideId) {
  const r = _currentRides.find(x => x.id === rideId);
  if (!r) return;
  document.getElementById('joinRideId').value = rideId;
  document.getElementById('joinRideInfo').innerHTML = `
    <p><strong>${t('parent.carpool.driver')}</strong> ${esc(r.driver_name)}</p>
    <p><strong>${t('parent.carpool.neighborhood')}</strong> ${esc(r.neighborhood)}</p>
    ${r.departure_time ? `<p><strong>${t('parent.carpool.time')}</strong> ${r.departure_time}</p>` : ''}
    ${r.meeting_point ? `<p><strong>${t('parent.carpool.meeting_point')}</strong> ${esc(r.meeting_point)}</p>` : ''}
    <p><strong>${t('parent.carpool.available_seats')}</strong> ${r.available_seats - r.occupied_seats}</p>`;
  document.getElementById('joinNotes').value = '';
  openModal('joinRideModal');
}

async function confirmJoin() {
  const rideId = parseInt(document.getElementById('joinRideId').value);
  const notes = document.getElementById('joinNotes').value.trim() || null;
  try {
    await ParentAPI.post(`/api/carpool/rides/${rideId}/join`, { notes });
    ParentToast.success(t('parent.carpool.joined'));
    closeModal('joinRideModal');
    if (_selectedEventId) loadRides(_selectedEventId);
  } catch { /* handled */ }
}

async function leaveRide(rideId) {
  if (!confirm(t('parent.carpool.confirm_leave'))) return;
  try {
    await ParentAPI.del(`/api/carpool/rides/${rideId}/leave`);
    ParentToast.success(t('parent.carpool.left_ride'));
    if (_selectedEventId) loadRides(_selectedEventId);
  } catch { /* handled */ }
}

async function cancelRide(rideId) {
  if (!confirm(t('parent.carpool.confirm_cancel'))) return;
  try {
    await ParentAPI.del(`/api/carpool/rides/${rideId}`);
    ParentToast.success(t('parent.carpool.ride_cancelled'));
    if (_selectedEventId) loadRides(_selectedEventId);
  } catch { /* handled */ }
}

/* ═══════════════════════════════════════════════════
   My Rides
   ═══════════════════════════════════════════════════ */

async function showMyRides() {
  _selectedEventId = null;
  document.querySelectorAll('.event-chip').forEach(c => c.classList.remove('active'));
  const el = document.getElementById('ridesSection');
  el.innerHTML = `<div class="loading-state">${t('parent.carpool.loading')}</div>`;
  try {
    const res = await ParentAPI.get('/api/carpool/my');
    const { offered, joined } = res.data;
    let html = `<h3 class="carpool-section-title">${t('parent.carpool.my_offered')}</h3>`;
    if (!offered.length) {
      html += `<div class="empty-state-parent"><span class="material-symbols-outlined">directions_car</span>${t('parent.carpool.no_offered')}</div>`;
    } else {
      html += offered.map(r => `
        <div class="ride-card my-ride">
          <div class="ride-header">
            <span class="ride-event-label">${esc(r.event_title || '')} — ${r.event_date || ''}</span>
            <span class="direction-badge ${r.direction}">${dirLabel(r.direction)}</span>
          </div>
          <div class="ride-details">
            <div class="ride-detail"><span class="material-symbols-outlined">location_on</span>${esc(r.neighborhood)}</div>
            <div class="ride-detail"><span class="material-symbols-outlined">airline_seat_recline_normal</span>${r.occupied_seats}/${r.available_seats} ${t('parent.carpool.seats')}</div>
            ${r.departure_time ? `<div class="ride-detail"><span class="material-symbols-outlined">schedule</span>${r.departure_time}</div>` : ''}
          </div>
          ${r.passengers.length ? `<div class="ride-passengers"><small>${t('parent.carpool.passengers')}</small> ${r.passengers.map(p => `<span class="passenger-chip">${esc(p.user_name)}</span>`).join('')}</div>` : ''}
        </div>`).join('');
    }

    html += `<h3 class="carpool-section-title" style="margin-top:24px;">${t('parent.carpool.my_joined')}</h3>`;
    if (!joined.length) {
      html += `<div class="empty-state-parent"><span class="material-symbols-outlined">hail</span>${t('parent.carpool.no_joined')}</div>`;
    } else {
      html += joined.map(j => {
        const r = j.ride;
        if (!r) return '';
        return `
          <div class="ride-card joined-ride">
            <div class="ride-header">
              <span class="ride-event-label">${esc(r.event_title || '')} — ${r.event_date || ''}</span>
              <div class="ride-driver"><span class="material-symbols-outlined">person</span>${esc(r.driver_name)}</div>
            </div>
            <div class="ride-details">
              <div class="ride-detail"><span class="material-symbols-outlined">location_on</span>${esc(r.neighborhood)}</div>
              ${r.departure_time ? `<div class="ride-detail"><span class="material-symbols-outlined">schedule</span>${r.departure_time}</div>` : ''}
              ${r.meeting_point ? `<div class="ride-detail"><span class="material-symbols-outlined">pin_drop</span>${esc(r.meeting_point)}</div>` : ''}
            </div>
            <div class="ride-actions">
              <button class="btn btn-sm btn-warning" onclick="leaveRide(${r.id})">${t('parent.carpool.leave_ride')}</button>
            </div>
          </div>`;
      }).join('');
    }
    el.innerHTML = html;
  } catch {
    el.innerHTML = `<div class="empty-state-parent">${t('parent.carpool.loading_error')}</div>`;
  }
}

/* ═══════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════ */

function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s + 'T00:00:00');
  const day = d.getDate();
  const mon = d.getMonth() + 1;
  const wd = d.toLocaleDateString('he-IL', { weekday: 'short' });
  return `${wd} ${day}/${mon}`;
}

function typeLabel(tp) {
  const map = {
    practice: t('parent.carpool.type.practice'),
    game: t('parent.carpool.type.game'),
    tournament: t('parent.carpool.type.tournament'),
    meeting: t('parent.carpool.type.meeting'),
    other: t('parent.carpool.type.other'),
  };
  return map[tp] || tp;
}

function dirLabel(d) {
  const map = {
    to_event: t('parent.carpool.dir.to_event'),
    from_event: t('parent.carpool.dir.from_event'),
    both: t('parent.carpool.dir.both'),
  };
  return map[d] || d;
}

/* ═══════════════════════════════════════════════════
   Standing Carpools
   ═══════════════════════════════════════════════════ */

async function loadMyTeams() {
  try {
    const res = await ParentAPI.get('/api/parent/team');
    // parent/team returns a single team; we need team_id for create modal
    if (res.data && res.data.id) {
      _myTeams = [res.data];
      populateTeamDropdown(_myTeams);
    }
  } catch {
    // No team — dropdown stays empty
  }
}

function populateTeamDropdown(teams) {
  const sel = document.getElementById('scTeamId');
  if (!sel) return;
  sel.innerHTML = teams.map(tm => `<option value="${tm.id}">${esc(tm.name)}</option>`).join('');
}

async function loadStandingCarpools() {
  const el = document.getElementById('standingCarpools');
  try {
    const res = await ParentAPI.get('/api/carpool/standing');
    _standingCarpools = res.data || [];
    renderStandingCarpools(_standingCarpools);
  } catch {
    el.innerHTML = `<div class="empty-state-parent">${t('parent.carpool.standing_error')}</div>`;
  }
}

function renderStandingCarpools(carpools) {
  const el = document.getElementById('standingCarpools');
  if (!carpools.length) {
    el.innerHTML = `
      <div class="empty-state-parent">
        <span class="material-symbols-outlined">group_off</span>
        ${t('parent.carpool.no_standing')}
      </div>`;
    return;
  }
  el.innerHTML = carpools.map(scCard).join('');
}

function scCard(c) {
  const membersHtml = c.members.map(m =>
    `<span class="sc-member-chip ${m.is_organizer ? 'organizer' : ''}">
      ${m.is_organizer ? '<span class="material-symbols-outlined" style="font-size:12px">star</span>' : ''}
      ${esc(m.user_name)}
    </span>`
  ).join('');

  // Build upcoming events list (from _events, filter by team_id)
  const teamEvents = _events.filter(e => e.team_id === c.team_id);
  const eventsHtml = teamEvents.length
    ? teamEvents.map(e => {
        const isSigned = c.my_event_signups.includes(e.id);
        // Count signups for this event
        const sigEntry = c.event_signups.find(s => s.event_id === e.id);
        const sigCount = sigEntry ? sigEntry.signups.length : 0;
        const sigNames = sigEntry ? sigEntry.signups.map(s => esc(s.user_name)).join(', ') : '';
        return `
          <div class="sc-event-row">
            <div class="sc-event-info">
              <span class="sc-event-date">${fmtDate(e.date)}</span>
              <span class="sc-event-title">${esc(e.title)}</span>
              ${sigCount > 0 ? `<span class="sc-event-signups" title="${sigNames}">${t('parent.carpool.signed_up_count', { count: sigCount })}</span>` : ''}
            </div>
            ${c.is_member ? (
              isSigned
                ? `<button class="btn btn-sm sc-signup-btn signed" onclick="cancelScSignup(${c.id},${e.id})">
                     <span class="material-symbols-outlined">check_circle</span> ${t('parent.carpool.assigned')}
                   </button>`
                : `<button class="btn btn-sm sc-signup-btn" onclick="scSignup(${c.id},${e.id})">
                     ${t('parent.carpool.assign_self')}
                   </button>`
            ) : ''}
          </div>`;
      }).join('')
    : `<div class="sc-no-events">${t('parent.carpool.no_upcoming_events')}</div>`;

  let actionBtns = '';
  if (c.is_organizer) {
    actionBtns = `
      <button class="btn btn-sm btn-secondary" onclick="openEditStandingModal(${c.id})">${t('parent.carpool.edit')}</button>
      <button class="btn btn-sm btn-danger" onclick="deleteStanding(${c.id})">${t('parent.carpool.delete_standing')}</button>`;
  } else if (c.is_member) {
    actionBtns = `<button class="btn btn-sm btn-warning" onclick="leaveStanding(${c.id})">${t('parent.carpool.leave_standing')}</button>`;
  } else if (!c.is_full) {
    actionBtns = `<button class="btn btn-sm btn-primary" onclick="joinStanding(${c.id})">${t('parent.carpool.join')}</button>`;
  } else {
    actionBtns = `<span class="ride-full-label">${t('parent.carpool.full')}</span>`;
  }

  return `
    <div class="sc-card ${c.is_member ? 'member' : ''}">
      <div class="sc-card-header">
        <div class="sc-card-title-row">
          <h3 class="sc-card-name">${esc(c.name)}</h3>
          ${c.is_organizer ? `<span class="sc-organizer-badge">${t('parent.carpool.organizer')}</span>` : c.is_member ? `<span class="sc-member-badge">${t('parent.carpool.member')}</span>` : ''}
        </div>
        <div class="sc-card-meta">
          <span><span class="material-symbols-outlined">location_on</span>${esc(c.neighborhood)}</span>
          <span><span class="material-symbols-outlined">group</span>${t('parent.carpool.members_count', { count: c.member_count, max: c.max_members })}</span>
          ${c.meeting_point ? `<span><span class="material-symbols-outlined">pin_drop</span>${esc(c.meeting_point)}</span>` : ''}
          <span class="sc-team-label">${esc(c.team_name || '')}</span>
        </div>
      </div>

      <div class="sc-members-row">${membersHtml}</div>

      ${c.is_member ? `
        <div class="sc-events-section">
          <div class="sc-events-title">${t('parent.carpool.upcoming_events')}</div>
          ${eventsHtml}
        </div>` : ''}

      ${c.notes ? `<div class="sc-notes">${esc(c.notes)}</div>` : ''}

      <div class="sc-card-footer">
        <span class="sc-organizer-label">${t('parent.carpool.organizer_label', { name: esc(c.organizer_name) })}</span>
        <div class="ride-actions">${actionBtns}</div>
      </div>
    </div>`;
}

/* ── Create ── */

function openCreateStandingModal() {
  document.getElementById('scName').value = '';
  document.getElementById('scNeighborhood').value = '';
  document.getElementById('scMaxMembers').value = '6';
  document.getElementById('scMeetingPoint').value = '';
  document.getElementById('scNotes').value = '';
  openModal('createStandingModal');
}

async function submitCreateStanding() {
  const teamId = parseInt(document.getElementById('scTeamId').value);
  const name = document.getElementById('scName').value.trim();
  const neighborhood = document.getElementById('scNeighborhood').value.trim();
  const maxMembers = parseInt(document.getElementById('scMaxMembers').value);
  const meetingPoint = document.getElementById('scMeetingPoint').value.trim() || null;
  const notes = document.getElementById('scNotes').value.trim() || null;

  if (!name) { ParentToast.error(t('parent.carpool.name_required')); return; }
  if (!neighborhood) { ParentToast.error(t('parent.carpool.neighborhood_required_standing')); return; }
  if (!teamId) { ParentToast.error(t('parent.carpool.team_required')); return; }

  try {
    await ParentAPI.post('/api/carpool/standing', { team_id: teamId, name, neighborhood, max_members: maxMembers, meeting_point: meetingPoint, notes });
    ParentToast.success(t('parent.carpool.standing_created'));
    closeModal('createStandingModal');
    loadStandingCarpools();
  } catch { /* handled */ }
}

/* ── Edit ── */

function openEditStandingModal(carpoolId) {
  const c = _standingCarpools.find(x => x.id === carpoolId);
  if (!c) return;
  document.getElementById('editScId').value = carpoolId;
  document.getElementById('editScName').value = c.name;
  document.getElementById('editScNeighborhood').value = c.neighborhood;
  document.getElementById('editScMaxMembers').value = c.max_members;
  document.getElementById('editScMeetingPoint').value = c.meeting_point || '';
  document.getElementById('editScNotes').value = c.notes || '';
  openModal('editStandingModal');
}

async function submitEditStanding() {
  const id = parseInt(document.getElementById('editScId').value);
  const data = {
    name: document.getElementById('editScName').value.trim(),
    neighborhood: document.getElementById('editScNeighborhood').value.trim(),
    max_members: parseInt(document.getElementById('editScMaxMembers').value),
    meeting_point: document.getElementById('editScMeetingPoint').value.trim() || null,
    notes: document.getElementById('editScNotes').value.trim() || null,
  };
  if (!data.name || !data.neighborhood) { ParentToast.error(t('parent.carpool.name_neighborhood_required')); return; }
  try {
    await ParentAPI.put(`/api/carpool/standing/${id}`, data);
    ParentToast.success(t('parent.carpool.standing_updated'));
    closeModal('editStandingModal');
    loadStandingCarpools();
  } catch { /* handled */ }
}

/* ── Delete ── */

async function deleteStanding(carpoolId) {
  if (!confirm(t('parent.carpool.confirm_delete_standing'))) return;
  try {
    await ParentAPI.del(`/api/carpool/standing/${carpoolId}`);
    ParentToast.success(t('parent.carpool.standing_deleted'));
    loadStandingCarpools();
  } catch { /* handled */ }
}

/* ── Join / Leave ── */

async function joinStanding(carpoolId) {
  try {
    await ParentAPI.post(`/api/carpool/standing/${carpoolId}/join`, {});
    ParentToast.success(t('parent.carpool.joined_standing'));
    loadStandingCarpools();
  } catch { /* handled */ }
}

async function leaveStanding(carpoolId) {
  if (!confirm(t('parent.carpool.confirm_leave_standing'))) return;
  try {
    await ParentAPI.del(`/api/carpool/standing/${carpoolId}/leave`);
    ParentToast.success(t('parent.carpool.left_standing'));
    loadStandingCarpools();
  } catch { /* handled */ }
}

/* ── Event Signup ── */

async function scSignup(carpoolId, eventId) {
  try {
    await ParentAPI.post(`/api/carpool/standing/${carpoolId}/signup`, { event_id: eventId });
    ParentToast.success(t('parent.carpool.signup_success'));
    loadStandingCarpools();
  } catch { /* handled */ }
}

async function cancelScSignup(carpoolId, eventId) {
  try {
    await ParentAPI.del(`/api/carpool/standing/${carpoolId}/signup/${eventId}`);
    ParentToast.info(t('parent.carpool.signup_cancelled'));
    loadStandingCarpools();
  } catch { /* handled */ }
}
