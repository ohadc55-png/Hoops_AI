/**
 * HOOPS AI — Admin AI Insights
 * Financial + Professional agent interaction
 */

let financialChatHistory = [];
let professionalChatHistory = [];
let currentAgent = 'financial';
let _playersLoaded = false;
let _allPlayers = [];  // full player list with team/position/birth_date

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAPI.token) return;
  loadFinancialDashboard();
});

// ===== AGENT / SUB-TAB SWITCHING =====

function switchAgent(agent) {
  currentAgent = agent;
  document.querySelectorAll('.agent-tab').forEach(el => el.classList.remove('active'));
  document.querySelector(`.agent-tab[data-agent="${agent}"]`).classList.add('active');

  document.querySelectorAll('.agent-panel').forEach(p => p.style.display = 'none');
  document.getElementById(`panel-${agent}`).style.display = '';

  // Auto-load on first switch
  if (agent === 'financial') {
    const card = document.getElementById('finInsightCard');
    if (card.querySelector('.loading-state')) loadFinancialDashboard();
  } else {
    const card = document.getElementById('proInsightCard');
    if (card.querySelector('.loading-state')) loadProfessionalDashboard();
    if (!_playersLoaded) loadPlayersList();
  }
}

function switchSubTab(agent, subId) {
  const panel = document.getElementById(`panel-${agent}`);
  panel.querySelectorAll('.sub-tab').forEach(el => el.classList.remove('active'));
  panel.querySelector(`.sub-tab[data-sub="${subId}"]`).classList.add('active');
  panel.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(subId).classList.add('active');
}

// ===== MARKDOWN RENDERING =====

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/\n/g, '<br>');
}

// ===== FINANCIAL AGENT =====

async function loadFinancialDashboard() {
  const card = document.getElementById('finInsightCard');
  card.innerHTML = `<div class="loading-state">${t('admin.insights.fin.loading')}</div>`;
  try {
    const res = await AdminAPI.get('/api/insights/financial/dashboard');
    const d = res.data;
    const summaryHtml = d.data ? `
      <div class="insight-stats">
        <span class="insight-stat">${t('admin.insights.fin.total')} ₪${(d.data.total_charged || 0).toLocaleString()}</span>
        <span class="insight-stat paid">${t('admin.insights.fin.paid')} ₪${(d.data.total_paid || 0).toLocaleString()}</span>
        <span class="insight-stat pending">${t('admin.insights.fin.pending')} ₪${(d.data.total_pending || 0).toLocaleString()}</span>
        <span class="insight-stat overdue">${t('admin.insights.fin.overdue')} ₪${(d.data.total_overdue || 0).toLocaleString()}</span>
        <span class="insight-stat">${t('admin.insights.fin.collection')} ${d.data.collection_rate || 0}%</span>
      </div>
    ` : '';
    const badge = d.overdue_count > 0
      ? `<span class="insight-badge overdue">${t('admin.insights.fin.parents_overdue', { count: d.overdue_count })}</span>`
      : `<span class="insight-badge ok">${t('admin.insights.fin.no_overdue')}</span>`;
    card.innerHTML = `
      ${badge}
      ${summaryHtml}
      <div class="insight-text">${renderMarkdown(d.insights)}</div>
    `;
  } catch (e) {
    card.innerHTML = `<div class="error-state">${t('admin.insights.fin.load_error')}</div>`;
  }
}

async function generateFinancialReport() {
  const btn = document.getElementById('finGenerateBtn');
  const content = document.getElementById('finReportContent');
  btn.classList.add('loading');
  btn.disabled = true;
  content.innerHTML = `<div class="loading-state">${t('admin.insights.fin.report_loading')}</div>`;
  try {
    const res = await AdminAPI.post('/api/insights/financial/report');
    content.innerHTML = `<div class="report-markdown">${renderMarkdown(res.data.report)}</div>`;
    loadFinancialReportHistory();
    AdminToast.success(t('admin.insights.fin.report_success'));
  } catch (e) {
    content.innerHTML = `<div class="error-state">${t('admin.insights.fin.report_error')}</div>`;
    AdminToast.error(t('admin.insights.fin.report_gen_error'));
  }
  btn.classList.remove('loading');
  btn.disabled = false;
}

async function sendFinancialChat() {
  const input = document.getElementById('finChatInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';

  const container = document.getElementById('finChatMessages');
  container.innerHTML += `<div class="chat-bubble user">${esc(msg)}</div>`;
  container.innerHTML += `<div class="chat-bubble ai typing">${t('admin.insights.fin.computing')}</div>`;
  container.scrollTop = container.scrollHeight;

  financialChatHistory.push({ role: 'user', content: msg });

  try {
    const res = await AdminAPI.post('/api/insights/financial/chat', {
      message: msg,
      history: financialChatHistory.slice(0, -1),
    });
    // Remove typing indicator
    container.querySelector('.typing')?.remove();
    const reply = res.data.response;
    financialChatHistory.push({ role: 'assistant', content: reply });
    container.innerHTML += `<div class="chat-bubble ai">${renderMarkdown(reply)}</div>`;
  } catch (e) {
    container.querySelector('.typing')?.remove();
    container.innerHTML += `<div class="chat-bubble ai error">${t('admin.insights.fin.chat_error')}</div>`;
  }
  container.scrollTop = container.scrollHeight;
}

async function sendPaymentReminders() {
  const result = document.getElementById('reminderResult');
  result.textContent = t('admin.insights.fin.sending_reminders');
  try {
    const res = await AdminAPI.post('/api/insights/financial/send-reminders');
    const sent = res.data.sent || 0;
    result.textContent = sent > 0 ? t('admin.insights.fin.reminders_sent', { count: sent }) : t('admin.insights.fin.no_reminders_needed');
    if (sent > 0) AdminToast.success(t('admin.insights.fin.reminder_toast_sent', { count: sent }));
    else AdminToast.info(t('admin.insights.fin.reminder_toast_none'));
  } catch (e) {
    result.textContent = t('admin.insights.fin.reminder_error');
    AdminToast.error(t('admin.insights.fin.reminder_error'));
  }
}

async function loadFinancialReportHistory() {
  const container = document.getElementById('finReportHistory');
  try {
    const res = await AdminAPI.get('/api/insights/reports?agent_type=financial&limit=5');
    if (!res.data || res.data.length === 0) {
      container.innerHTML = `<div class="empty-state">${t('admin.insights.fin.no_saved_reports')}</div>`;
      return;
    }
    container.innerHTML = res.data.map(r => `
      <div class="report-item" onclick="loadSavedReport(${r.id}, 'finReportContent')">
        <span class="report-date">${new Date(r.created_at).toLocaleDateString('he-IL')}</span>
        <span class="report-type">${r.report_type === 'weekly_auto' ? t('admin.insights.report_type.auto') : t('admin.insights.report_type.manual')}</span>
        <span class="report-preview">${esc(r.preview)}</span>
      </div>
    `).join('');
  } catch { container.innerHTML = ''; }
}

// ===== PROFESSIONAL AGENT =====

async function loadProfessionalDashboard() {
  const card = document.getElementById('proInsightCard');
  card.innerHTML = `<div class="loading-state">${t('admin.insights.pro.loading')}</div>`;
  try {
    const res = await AdminAPI.get('/api/insights/professional/dashboard');
    const d = res.data;
    const badge = d.alert_count > 0
      ? `<span class="insight-badge warning">${t('admin.insights.pro.players_need_attention', { count: d.alert_count })}</span>`
      : `<span class="insight-badge ok">${t('admin.insights.pro.no_alerts')}</span>`;
    card.innerHTML = `
      ${badge}
      <div class="insight-text">${renderMarkdown(d.insights)}</div>
    `;
  } catch (e) {
    card.innerHTML = `<div class="error-state">${t('admin.insights.pro.load_error')}</div>`;
  }
}

async function generateProfessionalReport() {
  const btn = document.getElementById('proGenerateBtn');
  const content = document.getElementById('proReportContent');
  btn.classList.add('loading');
  btn.disabled = true;
  content.innerHTML = `<div class="loading-state">${t('admin.insights.pro.report_loading')}</div>`;
  try {
    const res = await AdminAPI.post('/api/insights/professional/report');
    content.innerHTML = `<div class="report-markdown">${renderMarkdown(res.data.report)}</div>`;
    loadProfessionalReportHistory();
    AdminToast.success(t('admin.insights.pro.report_success'));
  } catch (e) {
    content.innerHTML = `<div class="error-state">${t('admin.insights.pro.report_error')}</div>`;
    AdminToast.error(t('admin.insights.pro.report_gen_error'));
  }
  btn.classList.remove('loading');
  btn.disabled = false;
}

async function loadPlayersList() {
  try {
    const res = await AdminAPI.get('/api/insights/players');
    _allPlayers = res.data || [];
    _populateFilterOptions();
    applyPlayerFilters();
    _playersLoaded = true;
  } catch { /* ignore */ }
}

function _calcAge(birth_date) {
  if (!birth_date) return null;
  const today = new Date();
  const bday = new Date(birth_date);
  let age = today.getFullYear() - bday.getFullYear();
  const m = today.getMonth() - bday.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) age--;
  return age;
}

function _matchesAgeFilter(birth_date, filterVal) {
  if (!filterVal) return true;          // "כל הגילאים" → always match
  const age = _calcAge(birth_date);
  if (age === null) return true;        // no birth_date → show in all filters
  if (filterVal === 'u12')   return age <= 12;
  if (filterVal === '13-15') return age >= 13 && age <= 15;
  if (filterVal === '16-18') return age >= 16 && age <= 18;
  if (filterVal === '18+')   return age > 18;
  return true;
}

function _populateFilterOptions() {
  // Teams — dynamic from data
  const teams = [...new Set(_allPlayers.map(p => p.team_name).filter(Boolean))].sort();
  const teamSel = document.getElementById('filterTeam');
  teamSel.innerHTML = `<option value="">${t('admin.insights.players.all_teams')}</option>` +
    teams.map(tm => `<option value="${esc(tm)}">${esc(tm)}</option>`).join('');
  // Positions — hardcoded in HTML, no need to populate
}

function applyPlayerFilters() {
  const teamFilter = document.getElementById('filterTeam').value;
  const posFilter  = document.getElementById('filterPosition').value;
  const ageFilter  = document.getElementById('filterAge').value;

  const filtered = _allPlayers.filter(p => {
    if (teamFilter && p.team_name !== teamFilter) return false;
    if (posFilter  && p.position  !== posFilter)  return false;
    if (!_matchesAgeFilter(p.birth_date, ageFilter)) return false;
    return true;
  });

  document.getElementById('playerFilterCount').textContent =
    filtered.length > 0 ? t('admin.insights.players.count', { count: filtered.length }) : t('admin.insights.players.no_results');

  renderPlayerList(filtered);
}

function renderPlayerList(players) {
  const container = document.getElementById('playerListContainer');
  if (!players.length) {
    container.innerHTML = `<div class="empty-state-admin">${t('admin.insights.players.empty')}</div>`;
    return;
  }

  const posLabel = { PG: t('admin.insights.pos.PG'), SG: t('admin.insights.pos.SG'), SF: t('admin.insights.pos.SF'), PF: t('admin.insights.pos.PF'), C: t('admin.insights.pos.C') };

  const rows = players.map(p => {
    const age = _calcAge(p.birth_date);
    const ageStr = age !== null ? `${age}` : '—';
    const dobStr = p.birth_date
      ? new Date(p.birth_date + 'T00:00:00').toLocaleDateString('he-IL')
      : '—';
    const posStr = (posLabel[p.position] || p.position) || '—';

    return `<tr>
      <td><strong>${esc(p.name)}</strong>${p.jersey_number ? ` <span class="jersey-badge">#${p.jersey_number}</span>` : ''}</td>
      <td>${esc(p.team_name || '—')}</td>
      <td>${posStr}</td>
      <td>${dobStr}${age !== null ? ` <span class="age-chip">${ageStr}</span>` : ''}</td>
      <td>
        <button class="btn btn-secondary btn-xs" onclick="openPlayerAICard(${p.id})">
          <span class="material-symbols-outlined" style="font-size:14px;">psychology</span>
          ${t('admin.insights.players.ai_card')}
        </button>
        <button class="btn btn-secondary btn-xs" style="opacity:.5;cursor:not-allowed;" title="${t('admin.insights.players.coming_soon')}">
          <span class="material-symbols-outlined" style="font-size:14px;">description</span>
          ${t('admin.insights.players.coach_report')}
        </button>
      </td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <table class="player-list-table">
      <thead>
        <tr>
          <th>${t('admin.insights.players.th.name')}</th>
          <th>${t('admin.insights.players.th.team')}</th>
          <th>${t('admin.insights.players.th.position')}</th>
          <th>${t('admin.insights.players.th.dob')}</th>
          <th>${t('admin.insights.players.th.actions')}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function openPlayerAICard(playerId) {
  // scroll / show AI card
  document.getElementById('playerListContainer').style.display = 'none';
  document.getElementById('playerCardResult').style.display = '';
  _loadPlayerCardById(playerId);
}

function backToPlayerList() {
  document.getElementById('playerCardResult').style.display = 'none';
  document.getElementById('playerListContainer').style.display = '';
}

async function loadPlayerCard() { /* kept for back-compat, not used directly */ }

async function _loadPlayerCardById(playerId) {
  document.getElementById('playerCardInfo').innerHTML = `<div class="loading-state">${t('admin.insights.player_card.loading')}</div>`;
  document.getElementById('playerCardAnalysis').innerHTML = '';

  try {
    const res = await AdminAPI.get(`/api/insights/professional/player-card/${playerId}`);
    const d = res.data;
    const p = d.player_data || {};
    const playerMeta = _allPlayers.find(x => x.id === parseInt(playerId)) || {};
    const age = _calcAge(playerMeta.birth_date);

    document.getElementById('playerCardInfo').innerHTML = `
      <div class="player-profile">
        <strong style="font-size:18px;">${esc(p.name || '?')}</strong>
        ${p.position ? `<span class="player-pos">${esc(p.position)}</span>` : ''}
        ${p.jersey_number ? `<span class="player-jersey">#${p.jersey_number}</span>` : ''}
        ${playerMeta.team_name ? `<span class="player-team-badge">${esc(playerMeta.team_name)}</span>` : ''}
        ${age !== null ? `<span class="age-chip">${t('admin.insights.players.age')} ${age}</span>` : ''}
      </div>
    `;
    document.getElementById('playerCardAnalysis').innerHTML = `
      <div class="report-markdown">${renderMarkdown(d.ai_analysis)}</div>
    `;
  } catch (e) {
    document.getElementById('playerCardInfo').innerHTML = `<div class="error-state">${t('admin.insights.player_card.load_error')}</div>`;
  }
}

async function sendProfessionalChat() {
  const input = document.getElementById('proChatInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';

  const container = document.getElementById('proChatMessages');
  container.innerHTML += `<div class="chat-bubble user">${esc(msg)}</div>`;
  container.innerHTML += `<div class="chat-bubble ai typing">${t('admin.insights.pro.computing')}</div>`;
  container.scrollTop = container.scrollHeight;

  professionalChatHistory.push({ role: 'user', content: msg });

  try {
    const res = await AdminAPI.post('/api/insights/professional/chat', {
      message: msg,
      history: professionalChatHistory.slice(0, -1),
    });
    container.querySelector('.typing')?.remove();
    const reply = res.data.response;
    professionalChatHistory.push({ role: 'assistant', content: reply });
    container.innerHTML += `<div class="chat-bubble ai">${renderMarkdown(reply)}</div>`;
  } catch (e) {
    container.querySelector('.typing')?.remove();
    container.innerHTML += `<div class="chat-bubble ai error">${t('admin.insights.pro.chat_error')}</div>`;
  }
  container.scrollTop = container.scrollHeight;
}

async function loadProfessionalReportHistory() {
  const container = document.getElementById('proReportHistory');
  try {
    const res = await AdminAPI.get('/api/insights/reports?agent_type=professional&limit=5');
    if (!res.data || res.data.length === 0) {
      container.innerHTML = `<div class="empty-state">${t('admin.insights.pro.no_saved_reports')}</div>`;
      return;
    }
    container.innerHTML = res.data.map(r => `
      <div class="report-item" onclick="loadSavedReport(${r.id}, 'proReportContent')">
        <span class="report-date">${new Date(r.created_at).toLocaleDateString('he-IL')}</span>
        <span class="report-type">${r.report_type === 'weekly_auto' ? t('admin.insights.report_type.auto') : t('admin.insights.report_type.manual')}</span>
        <span class="report-preview">${esc(r.preview)}</span>
      </div>
    `).join('');
  } catch { container.innerHTML = ''; }
}

// ===== SHARED =====

async function loadSavedReport(reportId, targetId) {
  const content = document.getElementById(targetId);
  content.innerHTML = `<div class="loading-state">${t('admin.insights.saved_report.loading')}</div>`;
  try {
    const res = await AdminAPI.get(`/api/insights/reports/${reportId}`);
    content.innerHTML = `<div class="report-markdown">${renderMarkdown(res.data.content)}</div>`;
  } catch {
    content.innerHTML = `<div class="error-state">${t('admin.insights.saved_report.load_error')}</div>`;
  }
}
