/**
 * HOOPS AI - Coach Schedule Page
 * Uses CalendarWidget for calendar display + event CRUD + schedule requests.
 */
let _facilities = [];
let _calWidget = null;
let _myTeams = [];

/* esc → shared-utils.js */
/* capitalize → shared-utils.js */

document.addEventListener('DOMContentLoaded', async () => {
  // Load facilities for event modal dropdown
  try {
    const r = await API.get('/api/facilities');
    _facilities = r.data || [];
  } catch (e) { _facilities = []; }

  // Create calendar widget
  _calWidget = new CalendarWidget('calendarContainer', {
    fetchEvents: async (year, month) => {
      const r = await API.get(`/api/events?year=${year}&month=${month}`);
      return (r.data || []).map(e => ({
        ...e,
        editable: e.source !== 'admin',
      }));
    },
    readOnly: false,
    showSourceBadge: true,
    showAddButton: true,
    onAddEvent: (dateStr) => openEventModal(null, dateStr),
    onEventClick: (ev) => openEventModal(ev),
  });
  window._calWidgets = window._calWidgets || {};
  window._calWidgets['calendarContainer'] = _calWidget;
  await _calWidget.init();

  // Load teams for request modal
  loadMyTeams();

  // Load my requests
  loadMyRequests();
});

// ===== TEAMS (for request modal) =====
async function loadMyTeams() {
  try {
    const r = await API.get('/api/my-teams');
    _myTeams = r.data || [];
  } catch (e) {
    _myTeams = [];
  }
  const sel = document.getElementById('reqTeam');
  if (sel) {
    sel.innerHTML = _myTeams.map(tm => `<option value="${tm.id}">${esc(tm.name)}</option>`).join('');
    if (_myTeams.length === 0) {
      sel.innerHTML = `<option value="">${t('schedule.request.no_teams')}</option>`;
    }
  }
}

// ===== EVENT MODAL (coach-owned events) =====
function openEventModal(data, prefillDate) {
  document.getElementById('eventId').value = data?.id || '';
  document.getElementById('evTitle').value = data?.title || '';
  document.getElementById('evDate').value = data?.date || prefillDate || '';
  document.getElementById('evTime').value = data?.time || '';
  document.getElementById('evTimeEnd').value = data?.end_time || '';
  document.getElementById('evType').value = data?.event_type || 'practice';
  document.getElementById('evLocation').value = data?.location || '';
  document.getElementById('evOpponent').value = data?.opponent || '';
  document.getElementById('evNotes').value = data?.notes || '';
  document.getElementById('evRepeat').value = '';
  document.getElementById('eventModalTitle').textContent = data ? t('schedule.modal.edit_event') : t('schedule.modal.add_event');
  document.getElementById('repeatGroup').style.display = data ? 'none' : '';

  // Populate facility dropdown
  const sel = document.getElementById('evFacility');
  sel.innerHTML = `<option value="">${t('schedule.event.none')}</option>` + _facilities.map(f =>
    `<option value="${f.id}" ${data?.facility_id === f.id ? 'selected' : ''}>${esc(f.name)}</option>`
  ).join('');

  openModal('eventModal');
}

async function saveEvent() {
  const id = document.getElementById('eventId').value;
  const body = {
    title: document.getElementById('evTitle').value,
    date: document.getElementById('evDate').value,
    time: document.getElementById('evTime').value || null,
    end_time: document.getElementById('evTimeEnd').value || null,
    event_type: document.getElementById('evType').value,
    location: document.getElementById('evLocation').value || null,
    opponent: document.getElementById('evOpponent').value || null,
    facility_id: document.getElementById('evFacility').value ? parseInt(document.getElementById('evFacility').value) : null,
    notes: document.getElementById('evNotes').value || null,
  };
  if (!body.title || !body.date) { Toast.error(t('schedule.event.title_date_required')); return; }
  try {
    if (id) {
      await API.put(`/api/events/${id}`, body);
      Toast.success(t('schedule.event.updated'));
    } else {
      const repeat = document.getElementById('evRepeat').value;
      if (repeat) body.repeat_weeks = parseInt(repeat);
      await API.post('/api/events', body);
      Toast.success(repeat ? t('schedule.event.created_recurring', { count: repeat }) : t('schedule.event.created'));
    }
    closeModal('eventModal');
    _calWidget.refresh();
  } catch (e) {}
}

async function deleteEvent(id) {
  if (!confirm(t('schedule.event.confirm_delete'))) return;
  try { await API.del(`/api/events/${id}`); Toast.success(t('schedule.event.deleted')); _calWidget.refresh(); } catch (e) {}
}

async function deleteEventSeries(group) {
  if (!confirm(t('schedule.event.confirm_series_delete'))) return;
  try { await API.del(`/api/events/series/${group}`); Toast.success(t('schedule.event.series_deleted')); _calWidget.refresh(); } catch (e) {}
}

// ===== SCHEDULE REQUEST MODAL =====
function openRequestModal(prefillDate) {
  document.getElementById('reqTitle').value = '';
  document.getElementById('reqDate').value = prefillDate || '';
  document.getElementById('reqTimeStart').value = '';
  document.getElementById('reqTimeEnd').value = '';
  document.getElementById('reqType').value = 'practice';
  document.getElementById('reqLocation').value = '';
  document.getElementById('reqOpponent').value = '';
  document.getElementById('reqNotes').value = '';
  openModal('requestModal');
}

async function submitRequest() {
  const teamId = document.getElementById('reqTeam').value;
  const body = {
    team_id: parseInt(teamId),
    title: document.getElementById('reqTitle').value,
    date: document.getElementById('reqDate').value,
    time_start: document.getElementById('reqTimeStart').value || null,
    time_end: document.getElementById('reqTimeEnd').value || null,
    event_type: document.getElementById('reqType').value,
    location: document.getElementById('reqLocation').value || null,
    opponent: document.getElementById('reqOpponent').value || null,
    notes: document.getElementById('reqNotes').value || null,
  };
  if (!body.title || !body.date) { Toast.error(t('schedule.request.title_date_required')); return; }
  if (body.time_start && body.time_end && body.time_end <= body.time_start) { Toast.error(t('schedule.request.time_end_before_start')); return; }
  if (!body.team_id) { Toast.error(t('schedule.request.no_team')); return; }

  try {
    await API.post('/api/schedule-requests', body);
    Toast.success(t('schedule.request.submitted'));
    closeModal('requestModal');
    loadMyRequests();
  } catch (e) {}
}

// ===== MY REQUESTS =====
async function loadMyRequests() {
  const el = document.getElementById('myRequestsSection');
  try {
    const r = await API.get('/api/schedule-requests/my');
    const requests = r.data || [];
    if (requests.length === 0) {
      el.innerHTML = '';
      return;
    }

    const statusColors = { pending: 'warning', approved: 'success', rejected: 'error' };
    const statusLabels = { pending: t('schedule.request_status.pending'), approved: t('schedule.request_status.approved'), rejected: t('schedule.request_status.rejected') };

    let html = `<div class="card" style="padding:var(--sp-4);">
      <h3 style="margin-bottom:var(--sp-3);display:flex;align-items:center;gap:var(--sp-2);">
        <span class="material-symbols-outlined">pending_actions</span> ${t('schedule.my_requests.title')}
      </h3>`;

    requests.forEach(req => {
      const status = statusColors[req.status] || 'neutral';
      html += `<div class="calendar-detail-event" style="margin-bottom:var(--sp-2);">
        <div class="event-dot type-${req.event_type}"></div>
        <div class="event-info">
          <div class="event-title">${esc(req.title)} <span class="badge badge-${status}">${statusLabels[req.status] || req.status}</span></div>
          <div class="event-meta">${capitalize(req.event_type)} &middot; ${req.date} ${req.time_start ? '&middot; ' + req.time_start : ''} ${req.opponent ? '&middot; vs ' + esc(req.opponent) : ''}</div>
          ${req.admin_response ? '<div class="event-meta" style="color:var(--text-secondary);">Admin: ' + esc(req.admin_response) + '</div>' : ''}
        </div>
      </div>`;
    });

    html += '</div>';
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = '';
  }
}
