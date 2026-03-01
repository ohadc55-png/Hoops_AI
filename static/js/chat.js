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
let _msgCounter = 0;
const _msgContents = {};
let _pendingFileContext = null;  // extracted file data waiting for next send
let _pendingForceAgent = null;   // forced agent for next send (e.g. "analyst")

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

  // Capture and clear pending file context
  const fileContext = _pendingFileContext;
  const forceAgent = _pendingForceAgent;
  _pendingFileContext = null;
  _pendingForceAgent = null;

  try {
    const res = await API.post('/api/chat/send', {
      message: content,
      conversation_id: currentConversationId,
      file_context: fileContext || undefined,
      force_agent: forceAgent || undefined,
    });

    currentConversationId = res.data.conversation_id;
    removeTyping(typingEl);
    addMessage('assistant', res.data.response, res.data.agent, res.data.agent_meta);
    updateAgentInfo(res.data.agent);
    loadConversations();
  } catch (err) {
    removeTyping(typingEl);
    addMessage('assistant', t('chat.error.generic'), null);
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
    const name = agentMeta ? agentMeta.name : t('chat.default_name');
    const msgId = ++_msgCounter;
    _msgContents[msgId] = content;
    div.innerHTML = `
      <div class="message-avatar" style="background:${color}20;color:${color};">
        <span class="material-symbols-outlined">${icon}</span>
      </div>
      <div style="flex:1;min-width:0;">
        <div class="message-body">
          <div class="message-agent-badge" style="color:${color};">
            <span class="material-symbols-outlined" style="font-size:14px;">${icon}</span> ${name}
          </div>
          <div>${formatMessage(content)}</div>
        </div>
        <div class="message-actions">
          <button class="msg-save-btn" onclick="openSavePractice(${msgId})">
            <span class="material-symbols-outlined" style="font-size:14px;">event_note</span>
            ${t('chat.save_practice.btn')}
          </button>
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
    assistant_coach: t('chat.agent.assistant_coach'), team_manager: t('chat.agent.team_manager'), tactician: t('chat.agent.tactician'),
    skills_coach: t('chat.agent.skills_coach'), nutritionist: t('chat.agent.nutritionist'), strength_coach: t('chat.agent.strength_coach'),
    analyst: t('chat.agent.analyst'), youth_coach: t('chat.agent.youth_coach'),
  };
  const AGENT_DESCS = {
    assistant_coach: t('chat.agent_desc.assistant_coach'),
    team_manager: t('chat.agent_desc.team_manager'),
    tactician: t('chat.agent_desc.tactician'),
    skills_coach: t('chat.agent_desc.skills_coach'),
    nutritionist: t('chat.agent_desc.nutritionist'),
    strength_coach: t('chat.agent_desc.strength_coach'),
    analyst: t('chat.agent_desc.analyst'),
    youth_coach: t('chat.agent_desc.youth_coach'),
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
      list.innerHTML = `<div class="empty-state" style="padding:var(--sp-6);"><p class="text-xs text-muted">${t('chat.conversation.empty')}</p></div>`;
      return;
    }
    list.innerHTML = res.data.slice(0, 20).map(c => `
      <div class="conversation-item ${c.id === currentConversationId ? 'active' : ''}" onclick="loadConversation(${c.id})">
        <div class="conversation-item-title truncate">${escapeHtml(c.title || t('chat.conversation.new'))}</div>
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
  } catch (e) { Toast.error(t('chat.conversation.load_error')); }
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
          <span class="material-symbols-outlined" style="font-size:14px;">auto_awesome</span> ${t('chat.default_name')}
        </div>
        <div>${t('chat.new_conversation')}</div>
      </div></div>
    </div>
  `;
  loadConversations();
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    Toast.info(t('chat.upload.uploading', { name: file.name }));
    const res = await API.upload('/api/files/upload', file);
    if (res.success) {
      const analysis = res.data?.analysis;
      const textarea = document.getElementById('chatTextarea');
      _pendingForceAgent = 'analyst';

      if (analysis?.extracted_text) {
        // Image with vision extraction
        _pendingFileContext = `קובץ תמונה: ${file.name}\n\n${analysis.extracted_text}`;
        textarea.value = `העליתי קובץ סטטיסטיקה: ${file.name}. נתח את הנתונים וחלץ ממצאים שיכולים לשפר את הקבוצה.`;
      } else if (analysis?.columns) {
        // CSV / Excel
        const preview = JSON.stringify(analysis.preview || [], null, 2);
        _pendingFileContext = `קובץ נתונים: ${file.name}\nעמודות: ${analysis.columns.join(', ')}\nמספר שורות: ${analysis.rows}\nנתונים:\n${preview}`;
        textarea.value = `העליתי קובץ סטטיסטיקה: ${file.name} (${analysis.rows} שורות, עמודות: ${analysis.columns.join(', ')}). נתח את הנתונים וחלץ ממצאים שיכולים לשפר את הקבוצה.`;
      } else {
        // Unknown file type
        _pendingForceAgent = null;
        textarea.value = t('chat.upload.analyze', { name: file.name });
      }

      textarea.dispatchEvent(new Event('input'));
      Toast.success(t('chat.upload.success'));
    }
  } catch (err) { Toast.error(t('chat.upload.failed')); }
  e.target.value = '';
}

function formatMessage(text) {
  if (!text) return '';
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

/* escapeHtml → shared-utils.js */

let _saveMsgId = null;

function openSavePractice(msgId) {
  _saveMsgId = msgId;
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('practiceDate').value = today;
  document.getElementById('practiceDuration').value = 90;
  // Auto-extract title from first bold/heading line of the message
  const raw = _msgContents[msgId] || '';
  const titleMatch = raw.match(/\*\*(.+?)\*\*/) || raw.match(/^#+\s*(.+)/m) || raw.match(/^(.+)/);
  const autoTitle = titleMatch ? titleMatch[1].slice(0, 60) : t('chat.save_practice.btn');
  document.getElementById('practiceTitle').value = autoTitle;
  openModal('savePracticeModal');
}

async function confirmSavePractice() {
  const title = document.getElementById('practiceTitle').value.trim();
  const date = document.getElementById('practiceDate').value;
  const duration = parseInt(document.getElementById('practiceDuration').value) || 90;
  if (!title || !date) return;

  const saveBtn = document.getElementById('savePracticeBtn');
  const saveBtnLabel = saveBtn.querySelector('span[data-i18n]');
  saveBtn.disabled = true;
  if (saveBtnLabel) saveBtnLabel.textContent = t('chat.save_practice.saving');

  try {
    const notes = _msgContents[_saveMsgId] || '';
    await API.post('/api/practice', { title, date, notes, total_duration: duration, focus: '' });
    closeModal('savePracticeModal');
    Toast.success(
      t('chat.save_practice.success') +
      ' — <a href="/practice" style="color:var(--primary);text-decoration:underline;">' +
      t('chat.save_practice.go_to_planner') + '</a>'
    );
  } catch (e) {
    Toast.error(t('chat.save_practice.error'));
  } finally {
    saveBtn.disabled = false;
    if (saveBtnLabel) saveBtnLabel.textContent = t('chat.save_practice.modal_title');
  }
}
