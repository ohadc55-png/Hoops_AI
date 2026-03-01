/**
 * HOOPS AI - Reports Core
 * Shared state, initialization, tab switching, and common helpers
 */

// ===== SHARED STATE =====
let _players = [], _events = [], _gameReports = [], _playerReports = [];
let _selectedStandouts = [];
let _pendingGames = [];
let _evaluations = [], _evalRequests = [];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  document.querySelectorAll('#reportTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#reportTabs .tab').forEach(tb => tb.classList.remove('active'));
      tab.classList.add('active');
      ['attendance','games','playerReports','evaluations'].forEach(tb => document.getElementById('tab-'+tb).classList.add('hidden'));
      document.getElementById('tab-'+tab.dataset.tab).classList.remove('hidden');
    });
  });

  // Load all data
  loadPlayers();
  loadPracticeEvents();
  loadAttendanceStats();
  loadGameReports();
  loadPendingGames();
  loadEvalRequests();
  updatePeriodLabel();

  // Auto-open game report from notification bell click
  const storedEvent = localStorage.getItem('hoops_open_game_report');
  if (storedEvent) {
    localStorage.removeItem('hoops_open_game_report');
    try {
      const event = JSON.parse(storedEvent);
      document.querySelector('[data-tab="games"]')?.click();
      setTimeout(() => {
        openGameReportModal({
          date: event.date,
          opponent: event.opponent || '',
          location: event.location || '',
          team_event_id: event.id,
        });
      }, 300);
    } catch(e) {}
  }

  // Close standout dropdown on outside click
  document.addEventListener('click', (e) => {
    const container = document.getElementById('grStandoutsContainer');
    if (container && !container.contains(e.target)) {
      document.getElementById('grStandoutsDropdown')?.classList.remove('open');
    }
  });
});

// ===== COMMON DATA LOADING =====
async function loadPlayers() {
  try { const r = await API.get('/api/players'); _players = r.data || []; } catch(e) {}
}

// ===== COMMON HELPERS =====
function populatePlayerDropdowns() {
  const sels = document.querySelectorAll('.player-select');
  sels.forEach(sel => {
    sel.innerHTML = `<option value="">${t('reports.player.select')}</option>`
      + _players.map(p => `<option value="${p.id}">#${p.jersey_number || '-'} ${esc(p.name)}</option>`).join('');
  });
}

function ratingColor(val) {
  if (val >= 8) return 'var(--success)';
  if (val >= 5) return 'var(--warning)';
  return 'var(--error)';
}

// After players load, populate dropdowns + add "All Players" to eval
const _origLoadPlayers = loadPlayers;
loadPlayers = async function() {
  await _origLoadPlayers();
  populatePlayerDropdowns();
  // Add "All Players" option to eval dropdown only
  const evalSel = document.getElementById('evalPlayerSelect');
  if (evalSel) {
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = t('reports.player.all_players');
    evalSel.insertBefore(allOpt, evalSel.options[1]);
  }
};
