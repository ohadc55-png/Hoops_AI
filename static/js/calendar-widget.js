/**
 * HOOPS AI - Shared Calendar Widget
 * Reusable monthly calendar grid for all portals.
 *
 * Usage:
 *   const cal = new CalendarWidget('containerId', {
 *     fetchEvents: async (year, month) => [...events],
 *     readOnly: false,
 *     onAddEvent: (dateStr) => {},
 *     onEventClick: (event) => {},
 *     showSourceBadge: true,
 *     showAddButton: true,
 *   });
 *   cal.init();
 */
class CalendarWidget {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.fetchEvents = options.fetchEvents || (async () => []);
    this.readOnly = options.readOnly ?? true;
    this.onAddEvent = options.onAddEvent || null;
    this.onEventClick = options.onEventClick || null;
    this.showSourceBadge = options.showSourceBadge ?? false;
    this.showAddButton = options.showAddButton ?? false;
    this.pillClass = options.pillClass || ((e) => `type-${e.event_type}`);

    const now = new Date();
    this.year = now.getFullYear();
    this.month = now.getMonth(); // 0-indexed
    this.events = [];
    this.selectedDate = null;
  }

  async init() {
    await this.loadMonth();
  }

  async loadMonth() {
    try {
      this.events = await this.fetchEvents(this.year, this.month + 1) || [];
    } catch (e) {
      this.events = [];
    }
    this.render();
  }

  async refresh() {
    await this.loadMonth();
  }

  navigatePrev() {
    this.month--;
    if (this.month < 0) { this.month = 11; this.year--; }
    this.selectedDate = null;
    this.loadMonth();
  }

  navigateNext() {
    this.month++;
    if (this.month > 11) { this.month = 0; this.year++; }
    this.selectedDate = null;
    this.loadMonth();
  }

  goToToday() {
    const now = new Date();
    this.year = now.getFullYear();
    this.month = now.getMonth();
    this.selectedDate = now.toISOString().split('T')[0];
    this.loadMonth();
  }

  selectDay(dateStr) {
    this.selectedDate = (this.selectedDate === dateStr) ? null : dateStr;
    this.render();
  }

  // --- Private helpers ---

  _esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  _capitalize(s) {
    return s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';
  }

  _tEventType(type) {
    if (!type) return '';
    const key = 'event.' + type;
    const translated = t(key);
    return translated !== key ? translated : this._capitalize(type);
  }

  _pad(n) { return String(n).padStart(2, '0'); }

  _dateStr(y, m, d) {
    return `${y}-${this._pad(m + 1)}-${this._pad(d)}`;
  }

  render() {
    const MONTHS = [t('cal.month.jan'),t('cal.month.feb'),t('cal.month.mar'),t('cal.month.apr'),t('cal.month.may'),t('cal.month.jun'),t('cal.month.jul'),t('cal.month.aug'),t('cal.month.sep'),t('cal.month.oct'),t('cal.month.nov'),t('cal.month.dec')];
    const DAYS = [t('cal.day.sun'),t('cal.day.mon'),t('cal.day.tue'),t('cal.day.wed'),t('cal.day.thu'),t('cal.day.fri'),t('cal.day.sat')];
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(this.year, this.month, 1);
    const lastDay = new Date(this.year, this.month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    // Build event map
    const evMap = {};
    this.events.forEach(e => {
      if (!evMap[e.date]) evMap[e.date] = [];
      evMap[e.date].push(e);
    });

    // Unique ID for this widget instance (avoid global conflicts)
    const wid = this.container.id;

    let html = `<div class="calendar">
      <div class="calendar-header">
        <div class="calendar-nav">
          <button onclick="window._calWidgets['${wid}'].navigatePrev()" title="Previous month"><span class="material-symbols-outlined" style="font-size:20px;">chevron_left</span></button>
          <button onclick="window._calWidgets['${wid}'].goToToday()" title="${t('cal.today')}" style="width:auto;padding:0 10px;font-size:var(--text-xs);">${t('cal.today')}</button>
          <button onclick="window._calWidgets['${wid}'].navigateNext()" title="Next month"><span class="material-symbols-outlined" style="font-size:20px;">chevron_right</span></button>
        </div>
        <h2>${MONTHS[this.month]} ${this.year}</h2>
        <div>`;

    if (this.showAddButton && this.onAddEvent) {
      html += `<button class="btn btn-primary btn-sm" onclick="window._calWidgets['${wid}'].onAddEvent()"><span class="material-symbols-outlined" style="font-size:18px;">add</span> ${t('cal.add_event')}</button>`;
    }

    html += `</div></div>`;

    // Weekday headers
    html += '<div class="calendar-weekdays">';
    DAYS.forEach(d => html += `<div class="calendar-weekday">${d}</div>`);
    html += '</div>';

    // Grid
    html += '<div class="calendar-grid">';

    // Previous month trailing days
    const prevLast = new Date(this.year, this.month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevLast - i;
      const pm = this.month === 0 ? 11 : this.month - 1;
      const py = this.month === 0 ? this.year - 1 : this.year;
      const ds = this._dateStr(py, pm, d);
      html += `<div class="calendar-day other-month" onclick="window._calWidgets['${wid}'].selectDay('${ds}')">
        <span class="calendar-day-num">${d}</span></div>`;
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = this._dateStr(this.year, this.month, d);
      const isToday = ds === today;
      const isSel = ds === this.selectedDate;
      const cls = ['calendar-day'];
      if (isToday) cls.push('today');
      if (isSel) cls.push('selected');

      const dayEvents = evMap[ds] || [];
      let pills = '';
      const maxPills = 3;
      dayEvents.slice(0, maxPills).forEach(e => {
        let pillLabel = this._esc(e.title);
        if (e.team_name && e.opponent) pillLabel = `${this._esc(e.team_name)} vs ${this._esc(e.opponent)}`;
        pills += `<span class="calendar-event-pill ${this.pillClass(e)}" onclick="event.stopPropagation(); window._calWidgets['${wid}']._handleEventClick(${e.id})">${pillLabel}</span>`;
      });
      if (dayEvents.length > maxPills) {
        pills += `<span class="calendar-event-more">+${dayEvents.length - maxPills} ${t('cal.more')}</span>`;
      }

      html += `<div class="${cls.join(' ')}" onclick="window._calWidgets['${wid}'].selectDay('${ds}')">
        <span class="calendar-day-num">${d}</span>${pills}</div>`;
    }

    // Next month leading days
    const totalCells = startDay + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nm = this.month === 11 ? 0 : this.month + 1;
      const ny = this.month === 11 ? this.year + 1 : this.year;
      const ds = this._dateStr(ny, nm, d);
      html += `<div class="calendar-day other-month" onclick="window._calWidgets['${wid}'].selectDay('${ds}')">
        <span class="calendar-day-num">${d}</span></div>`;
    }

    html += '</div>'; // grid end

    // Day detail panel
    if (this.selectedDate) {
      const selEvents = evMap[this.selectedDate] || [];
      const dateObj = new Date(this.selectedDate + 'T00:00:00');
      const dateLang = (typeof I18N !== 'undefined' && I18N.getLang() === 'he') ? 'he-IL' : 'en-US';
      const dateLabel = dateObj.toLocaleDateString(dateLang, { weekday: 'long', month: 'long', day: 'numeric' });

      html += `<div class="calendar-detail">
        <div class="calendar-detail-header">
          <h3>${dateLabel}</h3>`;

      if (this.showAddButton && this.onAddEvent) {
        html += `<button class="btn btn-primary btn-sm" onclick="window._calWidgets['${wid}'].onAddEvent('${this.selectedDate}')"><span class="material-symbols-outlined" style="font-size:18px;">add</span> ${t('cal.add_event')}</button>`;
      }

      html += '</div>';

      if (selEvents.length === 0) {
        html += `<div class="calendar-detail-empty">${t('cal.no_events_day')}</div>`;
      } else {
        selEvents.forEach(e => {
          const recurring = e.recurrence_group ? '<span class="recurring-badge"><span class="material-symbols-outlined">repeat</span>' + t('cal.series') + '</span>' : '';
          const isAdmin = e.source === 'admin';
          const adminBadge = (isAdmin && this.showSourceBadge) ? '<span class="admin-event-badge">' + t('cal.from_admin') + '</span>' : '';

          html += `<div class="calendar-detail-event${isAdmin ? ' admin-event' : ''}">
            <div class="event-dot ${this.pillClass(e)}"></div>
            <div class="event-info">
              <div class="event-title">${(e.team_name && e.opponent) ? this._esc(e.team_name) + ' vs ' + this._esc(e.opponent) : this._esc(e.title)} ${recurring} ${adminBadge}</div>
              <div class="event-meta">${e.team_name ? this._esc(e.team_name) + ' &middot; ' : ''}${e.location ? this._esc(e.location) + ' &middot; ' : ''}${this._tEventType(e.event_type)} ${e.time ? '&middot; ' + e.time : ''} ${e.time_end ? '- ' + e.time_end : ''} ${e.opponent ? '&middot; vs ' + this._esc(e.opponent) : ''}</div>
              ${e.notes ? '<div class="event-meta">' + this._esc(e.notes) + '</div>' : ''}
              ${e.is_away ? `<div class="transport-info"><span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;color:#F87171;">directions_bus</span> <strong style="color:#F87171;">${t('cal.away_game')}</strong>${e.departure_time ? ' &middot; ' + t('cal.departure') + ': <strong>' + this._esc(e.departure_time) + '</strong>' : ''}${e.venue_address ? '<div style="margin-top:2px;font-size:var(--text-xs);color:var(--text-secondary);">' + this._esc(e.venue_address) + '</div><div style="display:flex;gap:var(--sp-3);margin-top:4px;"><a href="https://waze.com/ul?q=' + encodeURIComponent(e.venue_address) + '&navigate=yes" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;font-size:var(--text-xs);color:#33ccff;text-decoration:none;font-weight:600;"><img src="https://www.waze.com/favicon.ico" width="14" height="14" style="border-radius:2px;" alt=""> ' + t('cal.navigate_waze') + '</a><a href="https://www.google.com/maps/search/' + encodeURIComponent(e.venue_address) + '" target="_blank" rel="noopener" style="font-size:var(--text-xs);color:var(--primary-light);text-decoration:none;">Google Maps &rarr;</a></div>' : ''}</div>` : ''}
            </div>`;

          if (!this.readOnly && this.onEventClick && e.editable !== false) {
            html += `<div class="event-actions">
              <button onclick="window._calWidgets['${wid}']._handleEventClick(${typeof e.id === 'string' ? "'" + e.id + "'" : e.id})" title="Edit"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
            </div>`;
          }

          html += '</div>';
        });
      }

      html += '</div>';
    }

    html += '</div>'; // calendar end
    this.container.innerHTML = html;
  }

  _handleEventClick(eventId) {
    const ev = this.events.find(e => e.id === eventId);
    if (ev && this.onEventClick) this.onEventClick(ev);
  }
}

// Global registry for onclick handlers (widgets register themselves here)
window._calWidgets = window._calWidgets || {};
