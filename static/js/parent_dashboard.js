/**
 * HOOPS AI — Parent Dashboard JS
 * Loads and renders dashboard data from /api/parent/* endpoints
 */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

document.addEventListener('DOMContentLoaded', () => {
  if (!ParentAPI.token) return;
  loadDashboard();
  loadFullSchedule();
  loadClubContacts();
});


async function loadDashboard() {
  try {
    const res = await ParentAPI.get('/api/parent/dashboard');
    const d = res.data;

    // Welcome card
    const name = d.parent_name || ParentAPI.user?.name || 'Parent';
    document.getElementById('welcomeName').textContent = `Welcome, ${esc(name)}!`;

    if (d.child_name && d.team_name) {
      document.getElementById('welcomeTeam').textContent =
        `Connected to ${esc(d.child_name)}'s team — ${esc(d.team_name)}`;
    } else if (d.team_name) {
      document.getElementById('welcomeTeam').textContent = esc(d.team_name);
    }

    // Next event
    if (d.schedule && d.schedule.length > 0) {
      const e = d.schedule[0];
      const dt = new Date(e.date + 'T00:00:00');
      document.getElementById('welcomeNext').textContent =
        `Next: ${e.title} — ${MONTHS[dt.getMonth()]} ${dt.getDate()}${e.time_start ? ' at ' + e.time_start : ''}`;
    }
  } catch { /* ignore */ }
}


async function loadFullSchedule() {
  const el = document.getElementById('scheduleContent');
  try {
    const res = await ParentAPI.get('/api/parent/schedule');
    const events = (res.data || []).slice(0, 10);
    if (events.length === 0) {
      el.innerHTML = '<div class="empty-state-parent"><span class="material-symbols-outlined">calendar_month</span>No upcoming events</div>';
      return;
    }
    el.innerHTML = events.map(e => {
      const d = new Date(e.date + 'T00:00:00');
      const typeClass = e.event_type || 'other';
      return `<div class="schedule-item">
        <div class="schedule-date">
          <div class="schedule-date-day">${d.getDate()}</div>
          <div class="schedule-date-month">${MONTHS[d.getMonth()]}</div>
        </div>
        <div class="schedule-info">
          <div class="schedule-title">${esc(e.title)}</div>
          <div class="schedule-meta">
            ${e.time_start || ''}${e.time_end ? ' - ' + e.time_end : ''}
            ${e.location ? ' · ' + esc(e.location) : ''}
            ${e.opponent ? ' vs ' + esc(e.opponent) : ''}
          </div>
        </div>
        <span class="schedule-type ${typeClass}">${esc(e.event_type)}</span>
      </div>`;
    }).join('');
  } catch {
    el.innerHTML = '<div class="empty-state-parent">Could not load schedule</div>';
  }
}


/* === Club Management Contacts === */

async function loadClubContacts() {
  const container = document.getElementById('clubContactsList');
  if (!container) return;
  try {
    const res = await ParentAPI.get('/api/admin/roles/contacts');
    const contacts = res.data || [];
    if (contacts.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:24px;color:rgba(255,255,255,0.4);">No club contacts available</div>';
      return;
    }
    container.innerHTML = contacts.map(c => `
      <div class="club-contact-row">
        <div class="club-contact-role">${esc(c.role_name)}</div>
        <div class="club-contact-details">
          <span class="club-contact-name">${esc(c.name)}</span>
          ${c.phone ? `<span class="club-contact-item"><span class="material-symbols-outlined" style="font-size:14px;">phone</span> ${esc(c.phone)}</span>` : ''}
          ${c.email ? `<span class="club-contact-item"><span class="material-symbols-outlined" style="font-size:14px;">mail</span> ${esc(c.email)}</span>` : ''}
        </div>
      </div>
    `).join('');
  } catch {
    container.innerHTML = '<div style="text-align:center;padding:16px;color:rgba(255,255,255,0.4);">Could not load contacts</div>';
  }
}
