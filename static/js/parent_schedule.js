/**
 * HOOPS AI - Parent Schedule Page (read-only calendar)
 */
document.addEventListener('DOMContentLoaded', async () => {
  const cal = new CalendarWidget('calendarContainer', {
    fetchEvents: async (year, month) => {
      const r = await ParentAPI.get(`/api/parent/schedule?year=${year}&month=${month}`);
      return (r.data || []).map(e => ({ ...e, editable: false }));
    },
    readOnly: true,
    showSourceBadge: false,
    showAddButton: false,
  });
  window._calWidgets = window._calWidgets || {};
  window._calWidgets['calendarContainer'] = cal;
  await cal.init();
});
