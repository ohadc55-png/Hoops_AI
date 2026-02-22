/**
 * HOOPS AI — Admin Schedule Page JS
 * Calendar, events CRUD, pending schedule requests
 * Team-based calendar colors + facility selection
 */

let _teams = [];
let _events = [];
let _facilities = [];
let _adminCalWidget = null;
let _teamColorMap = {};

const TEAM_COLORS = ['#22c55e','#ef4444','#3b82f6','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAPI.token) return;
  loadTeamsForSelect();
  loadFacilitiesForSelect();
  initAdminCalendar();
  loadSchedule();
  loadPendingRequests();
});

async function loadTeamsForSelect() {
  try {
    const res = await AdminAPI.get('/api/teams');
    _teams = res.data || [];
    const selectors = ['scheduleTeamSelect', 'eventTeamId'];
    selectors.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const firstOpt = id === 'scheduleTeamSelect' ? '<option value="">All Teams</option>' : '<option value="">Select team...</option>';
      sel.innerHTML = firstOpt + _teams.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
    });
    // Build team color map
    _teamColorMap = {};
    _teams.forEach((t, i) => { _teamColorMap[t.id] = i % TEAM_COLORS.length; });
    // Render color legend
    const legendEl = document.getElementById('teamColorLegend');
    if (legendEl && _teams.length > 1) {
      legendEl.innerHTML = _teams.map((t, i) =>
        `<span style="display:flex;align-items:center;gap:4px;font-size:var(--text-xs);color:var(--text-secondary);">` +
        `<span style="width:10px;height:10px;border-radius:50%;background:${TEAM_COLORS[i % TEAM_COLORS.length]};display:inline-block;flex-shrink:0;"></span>` +
        `${esc(t.name)}</span>`
      ).join('');
    }
    // Update calendar colors if already initialized
    if (_adminCalWidget) _adminCalWidget.refresh();
  } catch { /* ignore */ }
}

async function loadFacilitiesForSelect() {
  try {
    const res = await AdminAPI.get('/api/admin/facilities');
    _facilities = res.data || [];
    const sel = document.getElementById('eventFacilityId');
    if (sel) {
      sel.innerHTML = '<option value="">No facility</option>'
        + _facilities.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('')
        + '<option value="other">Other (custom)...</option>';
    }
  } catch { _facilities = []; }
}

function onFacilityChange() {
  const val = document.getElementById('eventFacilityId').value;
  document.getElementById('customLocationGroup').style.display = (val === 'other') ? 'block' : 'none';
  if (val !== 'other') {
    document.getElementById('eventLocation').value = '';
  }
}

function initAdminCalendar() {
  _adminCalWidget = new CalendarWidget('adminCalendarContainer', {
    fetchEvents: async (year, month) => {
      const selectedTeam = document.getElementById('scheduleTeamSelect')?.value;
      let url;
      if (selectedTeam) {
        url = `/api/schedule/events/team/${selectedTeam}?year=${year}&month=${month}`;
      } else {
        url = `/api/schedule/events?year=${year}&month=${month}`;
      }
      const res = await AdminAPI.get(url);
      return (res.data || []).map(e => ({
        id: e.id, title: e.title, date: e.date,
        time: e.time_start, time_end: e.time_end,
        event_type: e.event_type, opponent: e.opponent,
        location: e.location, notes: e.notes,
        recurrence_group: e.recurrence_group,
        source: 'admin', editable: true,
        team_id: e.team_id,
        facility_id: e.facility_id,
        is_away: e.is_away,
        departure_time: e.departure_time,
        venue_address: e.venue_address,
      }));
    },
    readOnly: false,
    showSourceBadge: false,
    showAddButton: true,
    onAddEvent: () => openCreateEventModal(),
    onEventClick: (ev) => editEvent(ev.id),
    pillClass: (e) => `team-color-${_teamColorMap[e.team_id] ?? 0}`,
  });
  window._calWidgets = window._calWidgets || {};
  window._calWidgets['adminCalendarContainer'] = _adminCalWidget;
  _adminCalWidget.init();
}


// ==================== EVENTS ====================

function onScheduleTeamChange() {
  if (_adminCalWidget) _adminCalWidget.refresh();
  loadSchedule();
}

async function loadSchedule() {
  const el = document.getElementById('scheduleContent');
  try {
    const res = await AdminAPI.get('/api/schedule/events');
    _events = res.data || [];
    renderEventsList();
  } catch {
    el.innerHTML = '<div class="empty-state-admin">Could not load schedule</div>';
  }
}

function renderEventsList() {
  const el = document.getElementById('scheduleContent');
  if (_events.length === 0) {
    el.innerHTML = '<div class="empty-state-admin"><span class="material-symbols-outlined">calendar_month</span><h3>No events</h3><p>Add events for your teams</p></div>';
    return;
  }
  el.innerHTML = _events.map(e => {
    const d = new Date(e.date + 'T00:00:00');
    const day = d.getDate();
    const month = MONTHS_FULL[d.getMonth()].substring(0, 3);
    const teamName = _teams.find(t => t.id === e.team_id)?.name || '';
    const locationDisplay = e.facility_id
      ? (_facilities.find(f => f.id === e.facility_id)?.name || e.location || '')
      : (e.location || '');
    return `<div class="event-item">
      <div class="event-date-col">
        <div class="event-date-day">${day}</div>
        <div class="event-date-month">${month}</div>
      </div>
      <div class="event-info">
        <div class="event-title">${esc(e.title)}</div>
        <div class="event-meta">
          ${e.time_start || ''}${e.time_end ? ' - ' + e.time_end : ''}
          ${locationDisplay ? ' · ' + esc(locationDisplay) : ''}
          ${teamName ? ' · ' + esc(teamName) : ''}
          ${e.opponent ? ' vs ' + esc(e.opponent) : ''}
        </div>
      </div>
      ${e.is_away ? '<a href="/admin/transport/' + e.id + '" class="badge" style="background:rgba(248,113,113,0.15);color:#F87171;font-size:10px;padding:2px 6px;border-radius:4px;margin-right:4px;text-decoration:none;display:inline-flex;align-items:center;gap:3px;" title="View transport details"><span class="material-symbols-outlined" style="font-size:12px;">directions_bus</span>Away</a>' : ''}
      <span class="schedule-type ${e.event_type}">${esc(e.event_type)}</span>
      <div class="event-actions">
        ${e.is_recurring ? '<span class="badge badge-neutral" style="font-size:10px;margin-right:4px;">Recurring</span>' : ''}
        <button class="btn btn-ghost btn-xs" onclick="editEvent(${e.id})" title="Edit"><span class="material-symbols-outlined">edit</span></button>
        <button class="btn btn-ghost btn-xs" onclick="deleteEvent(${e.id}, '${e.recurrence_group || ''}')" title="Delete"><span class="material-symbols-outlined">delete</span></button>
      </div>
    </div>`;
  }).join('');
}

function toggleOpponentField() {
  const type = document.getElementById('eventType').value;
  const isGame = (type === 'game' || type === 'tournament');
  document.getElementById('opponentGroup').style.display = isGame ? 'block' : 'none';
  document.getElementById('awayGameGroup').style.display = isGame ? 'block' : 'none';
  if (!isGame) {
    setHomeAway(false);
  }
}

function setHomeAway(isAway) {
  document.getElementById('eventIsAway').value = isAway ? '1' : '0';
  document.getElementById('btnHome').classList.toggle('active', !isAway);
  document.getElementById('btnAway').classList.toggle('active', isAway);
  document.getElementById('awayFieldsGroup').style.display = isAway ? 'block' : 'none';
  if (!isAway) {
    document.getElementById('eventDepartureTime').value = '';
    document.getElementById('eventVenueAddress').value = '';
  }
  // Show transport link when editing an existing away game
  const editId = document.getElementById('editEventId').value;
  const linkEl = document.getElementById('awayTransportLink');
  if (isAway && editId) {
    document.getElementById('awayTransportLinkHref').href = `/admin/transport/${editId}`;
    linkEl.style.display = 'block';
  } else {
    linkEl.style.display = 'none';
  }
}

function openCreateEventModal() {
  document.getElementById('editEventId').value = '';
  document.getElementById('eventModalTitle').textContent = 'Add Event';
  document.getElementById('eventTitle').value = '';
  document.getElementById('eventType').value = 'practice';
  document.getElementById('eventDate').value = '';
  document.getElementById('eventTimeStart').value = '';
  document.getElementById('eventTimeEnd').value = '';
  document.getElementById('eventFacilityId').value = '';
  document.getElementById('customLocationGroup').style.display = 'none';
  document.getElementById('eventLocation').value = '';
  document.getElementById('eventOpponent').value = '';
  document.getElementById('eventNotes').value = '';
  document.getElementById('eventRepeatWeeks').value = '1';
  document.getElementById('repeatGroup').style.display = 'block';
  setHomeAway(false);
  document.getElementById('eventDepartureTime').value = '';
  document.getElementById('eventVenueAddress').value = '';
  document.getElementById('awayGameGroup').style.display = 'none';
  document.getElementById('awayFieldsGroup').style.display = 'none';
  toggleOpponentField();
  const selectedTeam = document.getElementById('scheduleTeamSelect')?.value;
  if (selectedTeam) document.getElementById('eventTeamId').value = selectedTeam;
  openModal('createEventModal');
}

function editEvent(eventId) {
  const e = _events.find(ev => ev.id === eventId);
  if (!e) return;
  document.getElementById('editEventId').value = e.id;
  document.getElementById('eventModalTitle').textContent = 'Edit Event';
  document.getElementById('eventTeamId').value = e.team_id;
  document.getElementById('eventTitle').value = e.title;
  document.getElementById('eventType').value = e.event_type;
  document.getElementById('eventDate').value = e.date;
  document.getElementById('eventTimeStart').value = e.time_start || '';
  document.getElementById('eventTimeEnd').value = e.time_end || '';
  // Facility / location
  if (e.facility_id) {
    document.getElementById('eventFacilityId').value = e.facility_id;
    document.getElementById('customLocationGroup').style.display = 'none';
    document.getElementById('eventLocation').value = '';
  } else if (e.location) {
    document.getElementById('eventFacilityId').value = 'other';
    document.getElementById('customLocationGroup').style.display = 'block';
    document.getElementById('eventLocation').value = e.location || '';
  } else {
    document.getElementById('eventFacilityId').value = '';
    document.getElementById('customLocationGroup').style.display = 'none';
    document.getElementById('eventLocation').value = '';
  }
  document.getElementById('eventOpponent').value = e.opponent || '';
  document.getElementById('eventNotes').value = e.notes || '';
  document.getElementById('repeatGroup').style.display = 'none';
  document.getElementById('eventDepartureTime').value = e.departure_time || '';
  document.getElementById('eventVenueAddress').value = e.venue_address || '';
  toggleOpponentField();
  setHomeAway(e.is_away || false);
  openModal('createEventModal');
}

async function handleCreateEvent(e) {
  e.preventDefault();
  const editId = document.getElementById('editEventId').value;
  const facilityVal = document.getElementById('eventFacilityId').value;
  const facilityId = (facilityVal && facilityVal !== 'other') ? parseInt(facilityVal) : null;
  const customLocation = document.getElementById('eventLocation').value.trim() || null;

  // Determine location text: use facility name if selected, else custom text
  let location = customLocation;
  if (facilityId) {
    const fac = _facilities.find(f => f.id === facilityId);
    location = fac ? fac.name : null;
  }

  const body = {
    team_id: parseInt(document.getElementById('eventTeamId').value),
    title: document.getElementById('eventTitle').value.trim(),
    event_type: document.getElementById('eventType').value,
    date: document.getElementById('eventDate').value,
    time_start: document.getElementById('eventTimeStart').value || null,
    time_end: document.getElementById('eventTimeEnd').value || null,
    location: location,
    facility_id: facilityId,
    opponent: document.getElementById('eventOpponent').value.trim() || null,
    notes: document.getElementById('eventNotes').value.trim() || null,
    is_away: document.getElementById('eventIsAway').value === '1',
    departure_time: document.getElementById('eventDepartureTime').value || null,
    venue_address: document.getElementById('eventVenueAddress').value.trim() || null,
  };
  try {
    if (editId) {
      await AdminAPI.put(`/api/schedule/events/${editId}`, body);
      AdminToast.success('Event updated');
    } else {
      const weeks = parseInt(document.getElementById('eventRepeatWeeks').value) || 1;
      if (weeks > 1) body.repeat_weeks = weeks;
      await AdminAPI.post('/api/schedule/events', body);
      AdminToast.success(weeks > 1 ? `${weeks} events created` : 'Event created');
    }
    closeModal('createEventModal');
    if (_adminCalWidget) _adminCalWidget.refresh();
    loadSchedule();
  } catch { /* toast already shown */ }
  return false;
}

async function deleteEvent(eventId, recurrenceGroup) {
  if (recurrenceGroup) {
    const choice = confirm('Delete all events in this recurring series?\n\nOK = Delete series\nCancel = Delete only this one');
    if (choice) {
      try {
        await AdminAPI.del(`/api/schedule/events/series/${recurrenceGroup}`);
        AdminToast.success('Series deleted');
        loadSchedule();
      } catch { /* toast already shown */ }
      return;
    }
  }
  if (!confirm('Delete this event?')) return;
  try {
    await AdminAPI.del(`/api/schedule/events/${eventId}`);
    AdminToast.success('Event deleted');
    if (_adminCalWidget) _adminCalWidget.refresh();
    loadSchedule();
  } catch { /* toast already shown */ }
}


// ==================== PENDING REQUESTS ====================

async function loadPendingRequests() {
  const el = document.getElementById('requestsContent');
  const badge = document.getElementById('pendingCount');
  try {
    const res = await AdminAPI.get('/api/schedule-requests/pending');
    const requests = res.data || [];
    if (requests.length === 0) {
      el.innerHTML = '<div class="empty-state-admin"><span class="material-symbols-outlined">check_circle</span><h3>No pending requests</h3></div>';
      badge.style.display = 'none';
      return;
    }
    badge.textContent = requests.length;
    badge.style.display = 'inline-flex';

    el.innerHTML = requests.map(req => {
      const teamName = _teams.find(t => t.id === req.team_id)?.name || `Team #${req.team_id}`;
      return `<div class="event-item" style="border-left:3px solid var(--warning);">
        <div class="event-date-col">
          <div class="event-date-day">${new Date(req.date + 'T00:00:00').getDate()}</div>
          <div class="event-date-month">${MONTHS_FULL[new Date(req.date + 'T00:00:00').getMonth()].substring(0, 3)}</div>
        </div>
        <div class="event-info">
          <div class="event-title">${esc(req.title)} <span class="badge badge-warning">Pending</span></div>
          <div class="event-meta">
            From Coach #${req.coach_id} · ${esc(teamName)} · ${esc(req.event_type)}
            ${req.time_start ? ' · ' + req.time_start : ''}${req.time_end ? ' - ' + req.time_end : ''}
            ${req.location ? ' · ' + esc(req.location) : ''}
            ${req.opponent ? ' vs ' + esc(req.opponent) : ''}
          </div>
          ${req.notes ? '<div class="event-meta">' + esc(req.notes) + '</div>' : ''}
        </div>
        <div class="event-actions" style="gap:var(--sp-2);">
          <button class="btn btn-primary btn-xs" onclick="approveRequest(${req.id})">
            <span class="material-symbols-outlined" style="font-size:16px;">check</span> Approve
          </button>
          <button class="btn btn-ghost btn-xs" onclick="rejectRequest(${req.id})" style="color:var(--error);">
            <span class="material-symbols-outlined" style="font-size:16px;">close</span> Reject
          </button>
        </div>
      </div>`;
    }).join('');
  } catch {
    el.innerHTML = '<div class="empty-state-admin">Could not load requests</div>';
    badge.style.display = 'none';
  }
}

async function approveRequest(requestId) {
  if (!confirm('Approve this schedule request? It will be added to the team calendar.')) return;
  try {
    await AdminAPI.put(`/api/schedule-requests/${requestId}/approve`, {});
    AdminToast.success('Request approved — event created!');
    loadPendingRequests();
    if (_adminCalWidget) _adminCalWidget.refresh();
    loadSchedule();
  } catch { /* toast already shown */ }
}

async function rejectRequest(requestId) {
  const reason = prompt('Reason for rejection (optional):');
  if (reason === null) return;
  try {
    await AdminAPI.put(`/api/schedule-requests/${requestId}/reject`, { response: reason || null });
    AdminToast.success('Request rejected');
    loadPendingRequests();
  } catch { /* toast already shown */ }
}
