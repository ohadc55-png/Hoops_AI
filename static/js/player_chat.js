/**
 * HOOPS AI - Player Chat Page Logic
 */

const PLAYER_AGENT_COLORS = {
  shooting_coach: '#F87171', dribbling_coach: '#60A5FA', passing_coach: '#A78BFA',
  fitness_coach: '#34D399', nutritionist: '#FBBF24',
};
const PLAYER_AGENT_ICONS = {
  shooting_coach: 'target', dribbling_coach: 'sports_basketball', passing_coach: 'swap_horiz',
  fitness_coach: 'exercise', nutritionist: 'restaurant',
};
const PLAYER_AGENT_NAMES = {
  shooting_coach: 'מאמן קליעה', dribbling_coach: 'מאמן כדרור',
  passing_coach: 'מאמן מסירה', fitness_coach: 'מאמן כושר', nutritionist: 'תזונאי',
};
const PLAYER_AGENT_DESCS = {
  shooting_coach: 'טכניקת קליעה, פורם, בחירת זריקה ופיתוח טווח.',
  dribbling_coach: 'שליטה בכדור, קרוסאובר, מהלכים ושבירת מגנים.',
  passing_coach: 'טכניקת מסירה, ראיית מגרש וקבלת החלטות.',
  fitness_coach: 'חיזוק, כושר, זריזות, מהירות ומניעת פציעות.',
  nutritionist: 'תזונה, דיאטה, שתייה, ותכנון ארוחות לספורטאים.',
};

let currentConversationId = null;
let isLoading = false;

document.addEventListener('DOMContentLoaded', () => {
  if (!PlayerAPI.token) return;

  const textarea = document.getElementById('chatTextarea');
  const sendBtn = document.getElementById('sendBtn');
  const newChatBtn = document.getElementById('newChatBtn');

  // Auto-resize textarea
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    sendBtn.disabled = !textarea.value.trim();
  });

  // Send on Enter (Shift+Enter for newline)
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (textarea.value.trim()) sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);
  newChatBtn.addEventListener('click', startNewChat);

  // Agent chips
  document.querySelectorAll('.agent-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const agent = chip.dataset.agent;
      const name = chip.textContent.trim();
      textarea.value = `@${name}: `;
      textarea.focus();
      updateAgentInfo(agent);
    });
  });

  loadConversations();
});

async function sendMessage() {
  const textarea = document.getElementById('chatTextarea');
  const content = textarea.value.trim();
  if (!content || isLoading) return;

  isLoading = true;
  textarea.value = '';
  textarea.style.height = 'auto';
  document.getElementById('sendBtn').disabled = true;

  // Add user message
  addMessage('user', content);

  // Show typing
  const typingEl = showTyping();

  try {
    const res = await PlayerAPI.post('/api/player-chat/send', {
      message: content,
      conversation_id: currentConversationId,
    });

    currentConversationId = res.data.conversation_id;
    removeTyping(typingEl);
    addMessage('assistant', res.data.response, res.data.agent, res.data.agent_meta);
    updateAgentInfo(res.data.agent);
    loadConversations();
  } catch (err) {
    removeTyping(typingEl);
    addMessage('assistant', 'סליחה, משהו השתבש. נסה שוב.', null);
  } finally {
    isLoading = false;
  }
}

function addMessage(role, content, agentKey, agentMeta) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `message message-${role}`;

  if (role === 'user') {
    div.innerHTML = `
      <div class="message-avatar"><span class="material-symbols-outlined">person</span></div>
      <div><div class="message-body">${escapeHtml(content)}</div></div>
    `;
  } else {
    const color = agentKey ? PLAYER_AGENT_COLORS[agentKey] : 'var(--primary)';
    const icon = agentKey ? PLAYER_AGENT_ICONS[agentKey] : 'auto_awesome';
    const name = agentMeta ? agentMeta.name : (agentKey ? PLAYER_AGENT_NAMES[agentKey] : 'HOOPS AI');
    div.innerHTML = `
      <div class="message-avatar" style="background:${color}20;color:${color};">
        <span class="material-symbols-outlined">${icon}</span>
      </div>
      <div>
        <div class="message-body">
          <div class="message-agent-badge" style="color:${color};">
            <span class="material-symbols-outlined" style="font-size:14px;">${icon}</span> ${name}
          </div>
          <div>${formatMessage(content)}</div>
        </div>
      </div>
    `;
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showTyping() {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'message message-assistant';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="message-avatar" style="background:var(--primary-ghost);color:var(--primary);">
      <span class="material-symbols-outlined">auto_awesome</span>
    </div>
    <div class="message-body">
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function removeTyping(el) {
  el?.remove();
}

function updateAgentInfo(agentKey) {
  if (!agentKey) return;
  const color = PLAYER_AGENT_COLORS[agentKey];
  document.getElementById('agentName').textContent = PLAYER_AGENT_NAMES[agentKey] || agentKey;
  document.getElementById('agentDesc').textContent = PLAYER_AGENT_DESCS[agentKey] || '';
  const iconEl = document.querySelector('#agentInfoCard .agent-info-icon');
  iconEl.style.background = color + '20';
  iconEl.style.color = color;
  iconEl.querySelector('.material-symbols-outlined').textContent = PLAYER_AGENT_ICONS[agentKey] || 'auto_awesome';
}

async function loadConversations() {
  try {
    const res = await PlayerAPI.get('/api/player-chat/conversations');
    const list = document.getElementById('conversationList');
    if (!res?.data?.length) {
      list.innerHTML = '<div class="empty-state" style="padding:var(--sp-6);"><p class="text-xs text-muted">אין שיחות עדיין</p></div>';
      return;
    }
    list.innerHTML = res.data.slice(0, 20).map(c => `
      <div class="conversation-item ${c.id === currentConversationId ? 'active' : ''}" onclick="loadConversation(${c.id})">
        <div class="conversation-item-title">${escapeHtml(c.title || 'שיחה חדשה')}</div>
        <div class="conversation-item-time">${timeAgo(c.created_at)}</div>
      </div>
    `).join('');
  } catch (e) { /* silent */ }
}

async function loadConversation(id) {
  currentConversationId = id;
  try {
    const res = await PlayerAPI.get(`/api/player-chat/conversations/${id}`);
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';
    res.data.messages.forEach(m => {
      addMessage(m.role, m.content, m.agent);
    });
    loadConversations();
  } catch (e) { PlayerToast.error('שגיאה בטעינת השיחה'); }
}

function startNewChat() {
  currentConversationId = null;
  document.getElementById('chatMessages').innerHTML = `
    <div class="message message-assistant">
      <div class="message-avatar" style="background:var(--primary-ghost);color:var(--primary);">
        <span class="material-symbols-outlined">sports_basketball</span>
      </div>
      <div><div class="message-body">
        <div class="message-agent-badge" style="color:var(--primary);">
          <span class="material-symbols-outlined" style="font-size:14px;">auto_awesome</span> HOOPS AI
        </div>
        <div>שיחה חדשה נפתחה. על מה תרצה לעבוד?</div>
      </div></div>
    </div>
  `;
  loadConversations();
}

function formatMessage(text) {
  if (!text) return '';
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = !dateStr.endsWith('Z') ? dateStr + 'Z' : dateStr;
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'עכשיו';
  if (mins < 60) return `לפני ${mins} דק׳`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שע׳`;
  const days = Math.floor(hours / 24);
  return `לפני ${days} ימים`;
}
