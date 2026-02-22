/**
 * HOOPS AI - Chat Page Logic
 */

const AGENT_COLORS = {
  assistant_coach: '#f48c25', team_manager: '#60A5FA', tactician: '#F87171',
  skills_coach: '#34D399', nutritionist: '#FBBF24', strength_coach: '#A78BFA',
  analyst: '#2DD4BF', youth_coach: '#FB923C',
};
const AGENT_ICONS = {
  assistant_coach: 'sports', team_manager: 'calendar_month', tactician: 'schema',
  skills_coach: 'fitness_center', nutritionist: 'restaurant', strength_coach: 'exercise',
  analyst: 'analytics', youth_coach: 'child_care',
};

let currentConversationId = null;
let isLoading = false;

document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('chatTextarea');
  const sendBtn = document.getElementById('sendBtn');
  const uploadBtn = document.getElementById('uploadBtn');
  const fileInput = document.getElementById('fileInput');
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
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileUpload);
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
    const res = await API.post('/api/chat/send', {
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
    addMessage('assistant', 'Sorry, something went wrong. Please try again.', null);
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
    const color = agentKey ? AGENT_COLORS[agentKey] : 'var(--primary)';
    const icon = agentKey ? AGENT_ICONS[agentKey] : 'auto_awesome';
    const name = agentMeta ? agentMeta.name : 'HOOPS AI';
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
  const AGENT_NAMES = {
    assistant_coach: 'Assistant Coach', team_manager: 'Team Manager', tactician: 'The Tactician',
    skills_coach: 'Skills Coach', nutritionist: 'Sports Nutritionist', strength_coach: 'Strength & Conditioning',
    analyst: 'The Analyst', youth_coach: 'Youth Coach',
  };
  const AGENT_DESCS = {
    assistant_coach: 'Team leadership, practice planning, and management strategies.',
    team_manager: 'Schedule, calendar, facilities, and logistics.',
    tactician: 'Game strategy, plays, X\'s & O\'s, and tactical analysis.',
    skills_coach: 'Training drills, technique, and skill development.',
    nutritionist: 'Nutrition plans, diet advice, and recovery meals.',
    strength_coach: 'Athletic performance, workouts, and conditioning.',
    analyst: 'Statistics, performance analytics, and data insights.',
    youth_coach: 'Child-friendly basketball development for ages 5-12.',
  };

  const color = AGENT_COLORS[agentKey];
  document.getElementById('agentName').textContent = AGENT_NAMES[agentKey] || agentKey;
  document.getElementById('agentDesc').textContent = AGENT_DESCS[agentKey] || '';
  const iconEl = document.querySelector('#agentInfoCard .agent-info-icon');
  iconEl.style.background = color + '20';
  iconEl.style.color = color;
  iconEl.querySelector('.material-symbols-outlined').textContent = AGENT_ICONS[agentKey] || 'auto_awesome';
}

async function loadConversations() {
  try {
    const res = await API.get('/api/chat/conversations');
    const list = document.getElementById('conversationList');
    if (!res?.data?.length) {
      list.innerHTML = '<div class="empty-state" style="padding:var(--sp-6);"><p class="text-xs text-muted">No conversations yet</p></div>';
      return;
    }
    list.innerHTML = res.data.slice(0, 20).map(c => `
      <div class="conversation-item ${c.id === currentConversationId ? 'active' : ''}" onclick="loadConversation(${c.id})">
        <div class="conversation-item-title truncate">${escapeHtml(c.title || 'New Chat')}</div>
        <div class="conversation-item-time">${timeAgo(c.created_at)}</div>
      </div>
    `).join('');
  } catch (e) { /* silent */ }
}

async function loadConversation(id) {
  currentConversationId = id;
  try {
    const res = await API.get(`/api/chat/conversations/${id}`);
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';
    res.data.messages.forEach(m => {
      addMessage(m.role, m.content, m.agent);
    });
    loadConversations();
  } catch (e) { Toast.error('Failed to load conversation'); }
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
        <div>New conversation started. How can I help you, Coach?</div>
      </div></div>
    </div>
  `;
  loadConversations();
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    Toast.info(`Uploading ${file.name}...`);
    const res = await API.upload('/api/files/upload', file);
    if (res.success) {
      Toast.success('File uploaded!');
      const textarea = document.getElementById('chatTextarea');
      textarea.value = `I uploaded a file: ${file.name}. Please analyze it.`;
      textarea.dispatchEvent(new Event('input'));
    }
  } catch (err) { Toast.error('Upload failed'); }
  e.target.value = '';
}

function formatMessage(text) {
  if (!text) return '';
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
