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
    el.innerHTML = '<div class="empty-state-parent"><span class="material-symbols-outlined">error</span>שגיאה בטעינת אירועים</div>';
  }
}

function renderEventChips(events) {
  const el = document.getElementById('eventChips');
  if (!events.length) {
    el.innerHTML = '<div class="empty-state-parent"><span class="material-symbols-outlined">event_busy</span>אין אירועים קרובים</div>';
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
  el.innerHTML = '<div class="loading-state">טוען הסעות...</div>';
  try {
    const res = await ParentAPI.get(`/api/carpool/rides?event_id=${eventId}`);
    _currentRides = res.data || [];
    renderRides(_currentRides);
  } catch {
    el.innerHTML = '<div class="empty-state-parent">שגיאה בטעינת הסעות</div>';
  }
}

function renderRides(rides) {
  const el = document.getElementById('ridesSection');
  if (!rides.length) {
    el.innerHTML = `
      <div class="empty-state-parent">
        <span class="material-symbols-outlined">no_transfer</span>
        אין הסעות זמינות לאירוע הזה
        <br><small>היה הראשון להציע הסעה!</small>
      </div>`;
    return;
  }
  el.innerHTML = rides.map(rideCard).join('');
}

function rideCard(r) {
  const passHtml = r.passengers.length
    ? `<div class="ride-passengers">
        <small>נוסעים:</small>
        ${r.passengers.map(p => `<span class="passenger-chip">${esc(p.user_name)}${p.player_name ? ' (' + esc(p.player_name) + ')' : ''}</span>`).join('')}
       </div>` : '';

  let actions = '';
  if (r.is_mine) {
    actions = `
      <button class="btn btn-sm btn-secondary" onclick="editRide(${r.id})">ערוך</button>
      <button class="btn btn-sm btn-danger" onclick="cancelRide(${r.id})">בטל</button>`;
  } else if (r.i_joined) {
    actions = `<button class="btn btn-sm btn-warning" onclick="leaveRide(${r.id})">עזוב הסעה</button>`;
  } else if (r.is_full) {
    actions = `<span class="ride-full-label">מלא</span>`;
  } else {
    actions = `<button class="btn btn-sm btn-primary" onclick="openJoinModal(${r.id})">הצטרף</button>`;
  }

  return `
    <div class="ride-card ${r.is_full ? 'full' : ''}">
      <div class="ride-header">
        <div class="ride-driver">
          <span class="material-symbols-outlined">person</span>
          <strong>${esc(r.driver_name)}</strong>
          ${r.is_mine ? '<span class="ride-mine-badge">שלי</span>' : ''}
        </div>
        <span class="direction-badge ${r.direction}">${dirLabel(r.direction)}</span>
      </div>
      <div class="ride-details">
        <div class="ride-detail"><span class="material-symbols-outlined">location_on</span>${esc(r.neighborhood)}</div>
        ${r.departure_time ? `<div class="ride-detail"><span class="material-symbols-outlined">schedule</span>${r.departure_time}</div>` : ''}
        ${r.meeting_point ? `<div class="ride-detail"><span class="material-symbols-outlined">pin_drop</span>${esc(r.meeting_point)}</div>` : ''}
        <div class="ride-detail">
          <span class="material-symbols-outlined">airline_seat_recline_normal</span>
          <span class="${r.is_full ? 'seats-full' : ''}">${r.occupied_seats}/${r.available_seats} מקומות תפוסים</span>
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
    <button class="btn btn-secondary" onclick="closeModal('offerRideModal')">ביטול</button>
    <button class="btn btn-primary" onclick="submitRide()">פרסם הסעה</button>`;
  openModal('offerRideModal');
}

async function submitRide() {
  const body = gatherRideForm();
  if (!body) return;
  try {
    await ParentAPI.post('/api/carpool/rides', body);
    ParentToast.success('ההסעה פורסמה!');
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
    <button class="btn btn-secondary" onclick="closeModal('offerRideModal')">ביטול</button>
    <button class="btn btn-primary" onclick="submitEditRide(${rideId})">עדכן הסעה</button>`;
  openModal('offerRideModal');
}

async function submitEditRide(rideId) {
  const data = gatherRideForm();
  if (!data) return;
  delete data.event_id; // can't change event
  try {
    await ParentAPI.put(`/api/carpool/rides/${rideId}`, data);
    ParentToast.success('ההסעה עודכנה');
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

  if (!neighborhood) { ParentToast.error('יש להזין שכונה'); return null; }
  if (!seats || seats < 1) { ParentToast.error('יש להזין מספר מקומות'); return null; }

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
    <p><strong>נהג:</strong> ${esc(r.driver_name)}</p>
    <p><strong>שכונה:</strong> ${esc(r.neighborhood)}</p>
    ${r.departure_time ? `<p><strong>שעה:</strong> ${r.departure_time}</p>` : ''}
    ${r.meeting_point ? `<p><strong>נקודת מפגש:</strong> ${esc(r.meeting_point)}</p>` : ''}
    <p><strong>מקומות פנויים:</strong> ${r.available_seats - r.occupied_seats}</p>`;
  document.getElementById('joinNotes').value = '';
  openModal('joinRideModal');
}

async function confirmJoin() {
  const rideId = parseInt(document.getElementById('joinRideId').value);
  const notes = document.getElementById('joinNotes').value.trim() || null;
  try {
    await ParentAPI.post(`/api/carpool/rides/${rideId}/join`, { notes });
    ParentToast.success('הצטרפת להסעה!');
    closeModal('joinRideModal');
    if (_selectedEventId) loadRides(_selectedEventId);
  } catch { /* handled */ }
}

async function leaveRide(rideId) {
  if (!confirm('בטוח שברצונך לעזוב את ההסעה?')) return;
  try {
    await ParentAPI.del(`/api/carpool/rides/${rideId}/leave`);
    ParentToast.success('עזבת את ההסעה');
    if (_selectedEventId) loadRides(_selectedEventId);
  } catch { /* handled */ }
}

async function cancelRide(rideId) {
  if (!confirm('בטוח שברצונך לבטל את ההסעה?')) return;
  try {
    await ParentAPI.del(`/api/carpool/rides/${rideId}`);
    ParentToast.success('ההסעה בוטלה');
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
  el.innerHTML = '<div class="loading-state">טוען...</div>';
  try {
    const res = await ParentAPI.get('/api/carpool/my');
    const { offered, joined } = res.data;
    let html = '<h3 class="carpool-section-title">הסעות שהצעתי</h3>';
    if (!offered.length) {
      html += '<div class="empty-state-parent"><span class="material-symbols-outlined">directions_car</span>עוד לא הצעת הסעות</div>';
    } else {
      html += offered.map(r => `
        <div class="ride-card my-ride">
          <div class="ride-header">
            <span class="ride-event-label">${esc(r.event_title || '')} — ${r.event_date || ''}</span>
            <span class="direction-badge ${r.direction}">${dirLabel(r.direction)}</span>
          </div>
          <div class="ride-details">
            <div class="ride-detail"><span class="material-symbols-outlined">location_on</span>${esc(r.neighborhood)}</div>
            <div class="ride-detail"><span class="material-symbols-outlined">airline_seat_recline_normal</span>${r.occupied_seats}/${r.available_seats} מקומות</div>
            ${r.departure_time ? `<div class="ride-detail"><span class="material-symbols-outlined">schedule</span>${r.departure_time}</div>` : ''}
          </div>
          ${r.passengers.length ? `<div class="ride-passengers"><small>נוסעים:</small> ${r.passengers.map(p => `<span class="passenger-chip">${esc(p.user_name)}</span>`).join('')}</div>` : ''}
        </div>`).join('');
    }

    html += '<h3 class="carpool-section-title" style="margin-top:24px;">הסעות שהצטרפתי</h3>';
    if (!joined.length) {
      html += '<div class="empty-state-parent"><span class="material-symbols-outlined">hail</span>עוד לא הצטרפת להסעות</div>';
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
              <button class="btn btn-sm btn-warning" onclick="leaveRide(${r.id})">עזוב הסעה</button>
            </div>
          </div>`;
      }).join('');
    }
    el.innerHTML = html;
  } catch {
    el.innerHTML = '<div class="empty-state-parent">שגיאה בטעינה</div>';
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

function typeLabel(t) {
  return { practice: 'אימון', game: 'משחק', tournament: 'טורניר', meeting: 'פגישה', other: 'אחר' }[t] || t;
}

function dirLabel(d) {
  return { to_event: 'לאירוע', from_event: 'מהאירוע', both: 'הלוך וחזור' }[d] || d;
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
  sel.innerHTML = teams.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
}

async function loadStandingCarpools() {
  const el = document.getElementById('standingCarpools');
  try {
    const res = await ParentAPI.get('/api/carpool/standing');
    _standingCarpools = res.data || [];
    renderStandingCarpools(_standingCarpools);
  } catch {
    el.innerHTML = '<div class="empty-state-parent">שגיאה בטעינת הסעות קבועות</div>';
  }
}

function renderStandingCarpools(carpools) {
  const el = document.getElementById('standingCarpools');
  if (!carpools.length) {
    el.innerHTML = `
      <div class="empty-state-parent">
        <span class="material-symbols-outlined">group_off</span>
        אין הסעות קבועות עדיין — צור את הראשונה!
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
              ${sigCount > 0 ? `<span class="sc-event-signups" title="${sigNames}">${sigCount} נרשמו</span>` : ''}
            </div>
            ${c.is_member ? (
              isSigned
                ? `<button class="btn btn-sm sc-signup-btn signed" onclick="cancelScSignup(${c.id},${e.id})">
                     <span class="material-symbols-outlined">check_circle</span> שובץ
                   </button>`
                : `<button class="btn btn-sm sc-signup-btn" onclick="scSignup(${c.id},${e.id})">
                     שבץ עצמי
                   </button>`
            ) : ''}
          </div>`;
      }).join('')
    : '<div class="sc-no-events">אין אירועים קרובים</div>';

  let actionBtns = '';
  if (c.is_organizer) {
    actionBtns = `
      <button class="btn btn-sm btn-secondary" onclick="openEditStandingModal(${c.id})">ערוך</button>
      <button class="btn btn-sm btn-danger" onclick="deleteStanding(${c.id})">מחק</button>`;
  } else if (c.is_member) {
    actionBtns = `<button class="btn btn-sm btn-warning" onclick="leaveStanding(${c.id})">עזוב</button>`;
  } else if (!c.is_full) {
    actionBtns = `<button class="btn btn-sm btn-primary" onclick="joinStanding(${c.id})">הצטרף</button>`;
  } else {
    actionBtns = `<span class="ride-full-label">מלא</span>`;
  }

  return `
    <div class="sc-card ${c.is_member ? 'member' : ''}">
      <div class="sc-card-header">
        <div class="sc-card-title-row">
          <h3 class="sc-card-name">${esc(c.name)}</h3>
          ${c.is_organizer ? '<span class="sc-organizer-badge">מארגן</span>' : c.is_member ? '<span class="sc-member-badge">חבר</span>' : ''}
        </div>
        <div class="sc-card-meta">
          <span><span class="material-symbols-outlined">location_on</span>${esc(c.neighborhood)}</span>
          <span><span class="material-symbols-outlined">group</span>${c.member_count}/${c.max_members} חברים</span>
          ${c.meeting_point ? `<span><span class="material-symbols-outlined">pin_drop</span>${esc(c.meeting_point)}</span>` : ''}
          <span class="sc-team-label">${esc(c.team_name || '')}</span>
        </div>
      </div>

      <div class="sc-members-row">${membersHtml}</div>

      ${c.is_member ? `
        <div class="sc-events-section">
          <div class="sc-events-title">אירועים קרובים — שיבוץ:</div>
          ${eventsHtml}
        </div>` : ''}

      ${c.notes ? `<div class="sc-notes">${esc(c.notes)}</div>` : ''}

      <div class="sc-card-footer">
        <span class="sc-organizer-label">מארגן: ${esc(c.organizer_name)}</span>
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

  if (!name) { ParentToast.error('יש להזין שם'); return; }
  if (!neighborhood) { ParentToast.error('יש להזין שכונה'); return; }
  if (!teamId) { ParentToast.error('יש לבחור קבוצה'); return; }

  try {
    await ParentAPI.post('/api/carpool/standing', { team_id: teamId, name, neighborhood, max_members: maxMembers, meeting_point: meetingPoint, notes });
    ParentToast.success('הסעה קבועה נוצרה!');
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
  if (!data.name || !data.neighborhood) { ParentToast.error('יש למלא שם ושכונה'); return; }
  try {
    await ParentAPI.put(`/api/carpool/standing/${id}`, data);
    ParentToast.success('ההסעה עודכנה');
    closeModal('editStandingModal');
    loadStandingCarpools();
  } catch { /* handled */ }
}

/* ── Delete ── */

async function deleteStanding(carpoolId) {
  if (!confirm('בטוח שברצונך למחוק את ההסעה הקבועה? כל החברים יוסרו.')) return;
  try {
    await ParentAPI.del(`/api/carpool/standing/${carpoolId}`);
    ParentToast.success('ההסעה הקבועה נמחקה');
    loadStandingCarpools();
  } catch { /* handled */ }
}

/* ── Join / Leave ── */

async function joinStanding(carpoolId) {
  try {
    await ParentAPI.post(`/api/carpool/standing/${carpoolId}/join`, {});
    ParentToast.success('הצטרפת להסעה הקבועה!');
    loadStandingCarpools();
  } catch { /* handled */ }
}

async function leaveStanding(carpoolId) {
  if (!confirm('בטוח שברצונך לעזוב הסעה זו?')) return;
  try {
    await ParentAPI.del(`/api/carpool/standing/${carpoolId}/leave`);
    ParentToast.success('עזבת את ההסעה הקבועה');
    loadStandingCarpools();
  } catch { /* handled */ }
}

/* ── Event Signup ── */

async function scSignup(carpoolId, eventId) {
  try {
    await ParentAPI.post(`/api/carpool/standing/${carpoolId}/signup`, { event_id: eventId });
    ParentToast.success('שובצת לאירוע!');
    loadStandingCarpools();
  } catch { /* handled */ }
}

async function cancelScSignup(carpoolId, eventId) {
  try {
    await ParentAPI.del(`/api/carpool/standing/${carpoolId}/signup/${eventId}`);
    ParentToast.info('בוטל השיבוץ');
    loadStandingCarpools();
  } catch { /* handled */ }
}
