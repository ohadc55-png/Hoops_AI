/**
 * HOOPS AI - Coach Knowledge Base Page
 * Upload, list, filter, delete, retry documents
 * Uses API / Toast / openModal / closeModal from main.js
 */

let _allDocs = [];
let _categoryMap = {};

// ── Init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (!API.token) return;
  loadCategories();
  loadDocuments();
  loadStats();
  setupDropZone();
});

// ── Stats ─────────────────────────────────────────────────────────────────

async function loadStats() {
  try {
    const res = await API.get('/api/knowledge/stats');
    const d = res.data || res;
    document.getElementById('statMyDocs').textContent = d.my_documents ?? 0;
    document.getElementById('statChunks').textContent = d.total_chunks ?? 0;
  } catch {
    // stats are non-critical
  }
}

// ── Categories ────────────────────────────────────────────────────────────

async function loadCategories() {
  try {
    const res = await API.get('/api/knowledge/categories');
    const categories = res.data || res || {};
    _categoryMap = categories;

    // Filter dropdown (My Docs section)
    const filterSelect = document.getElementById('myFilterCategory');
    if (filterSelect && typeof categories === 'object') {
      const opts = Object.entries(categories)
        .map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`)
        .join('');
      filterSelect.innerHTML = `<option value="">${esc(t('knowledge.upload.all_categories'))}</option>` + opts;
    }

    // Upload modal dropdown
    const uploadSelect = document.getElementById('docCategory');
    if (uploadSelect && typeof categories === 'object') {
      const opts = Object.entries(categories)
        .map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`)
        .join('');
      uploadSelect.innerHTML = `<option value="">${esc(t('knowledge.upload.select_prompt'))}</option>` + opts;
    }
  } catch {
    // non-critical
  }
}

function _categoryLabel(key) {
  return _categoryMap[key] || key || '';
}

// ── Documents List ────────────────────────────────────────────────────────

async function loadDocuments() {
  const myGrid = document.getElementById('myDocsGrid');
  const sharedGrid = document.getElementById('sharedDocsGrid');

  if (myGrid) myGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><span class="material-symbols-outlined">hourglass_empty</span><h3>${esc(t('knowledge.loading'))}</h3></div>`;

  const category = document.getElementById('myFilterCategory')?.value || '';
  const status = document.getElementById('myFilterStatus')?.value || '';

  let url = '/api/knowledge';
  const params = [];
  if (category) params.push(`category=${encodeURIComponent(category)}`);
  if (status) params.push(`status=${encodeURIComponent(status)}`);
  if (params.length) url += '?' + params.join('&');

  try {
    const res = await API.get(url);
    _allDocs = res.data || res || [];

    // Split into my docs (scope=coach, uploaded by me) vs shared (scope=system or club)
    const myDocs = _allDocs.filter(d => d.scope === 'coach');
    const sharedDocs = _allDocs.filter(d => d.scope !== 'coach');

    renderMyDocs(myDocs);
    renderSharedDocs(sharedDocs);
  } catch {
    if (myGrid) myGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><span class="material-symbols-outlined">error</span><h3>${esc(t('knowledge.load_failed'))}</h3></div>`;
  }
}

function renderMyDocs(docs) {
  const grid = document.getElementById('myDocsGrid');
  const countEl = document.getElementById('myDocCount');
  if (!grid) return;

  if (countEl) countEl.textContent = docs.length === 1 ? t('knowledge.doc_count_singular') : t('knowledge.doc_count', { count: docs.length });

  if (!docs.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <span class="material-symbols-outlined">folder_open</span>
        <h3>${esc(t('knowledge.my_docs.empty.title'))}</h3>
        <p>${esc(t('knowledge.my_docs.empty.subtitle'))}</p>
      </div>`;
    return;
  }

  grid.innerHTML = docs.map(doc => renderDocCard(doc, true)).join('');
}

function renderSharedDocs(docs) {
  const grid = document.getElementById('sharedDocsGrid');
  const countEl = document.getElementById('sharedDocCount');
  if (!grid) return;

  if (countEl) countEl.textContent = docs.length === 1 ? t('knowledge.doc_count_singular') : t('knowledge.doc_count', { count: docs.length });

  if (!docs.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <span class="material-symbols-outlined">library_books</span>
        <h3>${esc(t('knowledge.shared_docs.empty.title'))}</h3>
        <p>${esc(t('knowledge.shared_docs.empty.subtitle'))}</p>
      </div>`;
    return;
  }

  grid.innerHTML = docs.map(doc => renderDocCard(doc, false)).join('');
}

// ── Document Card ─────────────────────────────────────────────────────────

function renderDocCard(doc, editable) {
  const statusBadge = _statusBadge(doc.status);
  const scopeBadge = _scopeBadge(doc.scope);
  const fileSize = _formatSize(doc.file_size);
  const dateStr = _formatDate(doc.created_at);
  const chunks = doc.chunk_count != null ? `${doc.chunk_count} ${t('knowledge.stat.chunks').toLowerCase()}` : '--';
  const fileIcon = _fileIcon(doc.file_type);
  const fileExt = (doc.file_type || '').toUpperCase();

  const actionBtns = [];
  if (editable && doc.status === 'error') actionBtns.push(`<button class="btn btn-secondary" style="font-size:var(--text-xs);padding:var(--sp-1) var(--sp-2);border-color:var(--warning);color:var(--warning);" onclick="event.stopPropagation();retryDocument(${doc.id})" title="${esc(t('knowledge.btn.retry'))}"><span class="material-symbols-outlined" style="font-size:16px;">refresh</span></button>`);
  if (editable) actionBtns.push(`<button class="btn btn-secondary" style="font-size:var(--text-xs);padding:var(--sp-1) var(--sp-2);" onclick="event.stopPropagation();deleteDocument(${doc.id})" title="${esc(t('knowledge.btn.delete'))}"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button>`);

  const errorMsg = doc.status === 'error' && doc.error_message
    ? `<div style="font-size:var(--text-xs);color:var(--error);margin-top:var(--sp-2);padding:var(--sp-2);background:rgba(239,68,68,0.06);border-radius:var(--r-sm);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(doc.error_message)}</div>`
    : '';

  return `
    <div class="card card-interactive" onclick="viewDocument(${doc.id})" style="position:relative;display:flex;flex-direction:column;gap:var(--sp-3);">
      <!-- Header: icon + title + actions -->
      <div style="display:flex;align-items:start;gap:var(--sp-3);">
        <div style="width:44px;height:44px;border-radius:var(--r-md);background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <span class="material-symbols-outlined" style="font-size:24px;color:var(--primary);">${fileIcon}</span>
        </div>
        <div style="flex:1;min-width:0;">
          <h3 style="font-size:var(--text-base);font-weight:700;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(doc.title || doc.original_name || t('knowledge.untitled'))}</h3>
          <div style="font-size:var(--text-xs);color:var(--text-muted);display:flex;align-items:center;gap:var(--sp-2);">
            <span>${fileExt}</span>
            <span style="opacity:0.4;">·</span>
            <span>${fileSize}</span>
            <span style="opacity:0.4;">·</span>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(doc.original_name || '')}</span>
          </div>
        </div>
        ${actionBtns.length ? `<div style="display:flex;gap:2px;flex-shrink:0;">${actionBtns.join('')}</div>` : ''}
      </div>
      <!-- Description -->
      ${doc.description ? `<p style="font-size:var(--text-sm);color:var(--text-secondary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:0;">${esc(doc.description)}</p>` : ''}
      ${errorMsg}
      <!-- Badges -->
      <div style="display:flex;align-items:center;gap:var(--sp-2);flex-wrap:wrap;">
        ${doc.category ? `<span class="badge badge-neutral" style="display:inline-flex;align-items:center;gap:4px;"><span class="material-symbols-outlined" style="font-size:13px;">category</span>${esc(_categoryLabel(doc.category))}</span>` : ''}
        ${scopeBadge}
        ${statusBadge}
      </div>
      <!-- Footer -->
      <div style="display:flex;align-items:center;justify-content:space-between;font-size:var(--text-xs);color:var(--text-muted);padding-top:var(--sp-2);border-top:1px solid var(--border-subtle, rgba(255,255,255,0.06));">
        <span style="display:flex;align-items:center;gap:4px;"><span class="material-symbols-outlined" style="font-size:14px;">data_object</span> ${chunks}</span>
        <span style="display:flex;align-items:center;gap:4px;"><span class="material-symbols-outlined" style="font-size:14px;">calendar_today</span> ${dateStr}</span>
      </div>
    </div>`;
}

// ── View Document Detail ──────────────────────────────────────────────────

function viewDocument(id) {
  const doc = _allDocs.find(d => d.id === id);
  if (!doc) return;

  document.getElementById('detailDocTitle').textContent = doc.title || doc.original_name || t('knowledge.untitled');

  const isEditable = doc.scope === 'coach';

  document.getElementById('docDetailBody').innerHTML = `
    <div class="flex gap-2" style="margin-bottom:var(--sp-4);flex-wrap:wrap;">
      ${doc.category ? `<span class="badge badge-neutral" style="display:inline-flex;align-items:center;gap:4px;"><span class="material-symbols-outlined" style="font-size:13px;">category</span>${esc(_categoryLabel(doc.category))}</span>` : ''}
      ${_scopeBadge(doc.scope)}
      ${_statusBadge(doc.status)}
      ${doc.language ? `<span class="badge badge-neutral">${doc.language === 'he' ? t('knowledge.lang.hebrew') : t('knowledge.lang.english')}</span>` : ''}
    </div>
    ${doc.description ? `<p style="margin-bottom:var(--sp-4);color:var(--text-secondary);font-size:var(--text-sm);">${esc(doc.description)}</p>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);font-size:var(--text-sm);">
      <div>
        <span style="color:var(--text-muted);">${esc(t('knowledge.detail.file'))}</span>
        <span style="color:var(--text-primary);margin-left:var(--sp-1);">${esc(doc.original_name)}</span>
      </div>
      <div>
        <span style="color:var(--text-muted);">${esc(t('knowledge.detail.size'))}</span>
        <span style="color:var(--text-primary);margin-left:var(--sp-1);">${_formatSize(doc.file_size)}</span>
      </div>
      <div>
        <span style="color:var(--text-muted);">${esc(t('knowledge.detail.chunks'))}</span>
        <span style="color:var(--text-primary);margin-left:var(--sp-1);">${doc.chunk_count ?? '--'}</span>
      </div>
      <div>
        <span style="color:var(--text-muted);">${esc(t('knowledge.detail.uploaded'))}</span>
        <span style="color:var(--text-primary);margin-left:var(--sp-1);">${_formatDate(doc.created_at)}</span>
      </div>
    </div>
    <!-- Text preview area -->
    <div id="docPreviewArea" style="margin-top:var(--sp-4);display:none;">
      <div style="font-weight:600;font-size:var(--text-sm);margin-bottom:var(--sp-2);display:flex;align-items:center;gap:var(--sp-2);">
        <span class="material-symbols-outlined" style="font-size:16px;">preview</span> ${esc(t('knowledge.detail.content_preview'))}
      </div>
      <div id="docPreviewContent" style="max-height:300px;overflow-y:auto;padding:var(--sp-3);background:rgba(0,0,0,0.2);border-radius:var(--r-md);font-size:var(--text-sm);color:var(--text-secondary);white-space:pre-wrap;word-break:break-word;line-height:1.6;border:1px solid rgba(255,255,255,0.06);"></div>
    </div>
    ${doc.status === 'error' && doc.error_message ? `
      <div style="margin-top:var(--sp-4);padding:var(--sp-3);background:rgba(239,68,68,0.08);border-radius:var(--r-md);border:1px solid rgba(239,68,68,0.2);">
        <div style="font-weight:600;color:var(--error);font-size:var(--text-sm);margin-bottom:var(--sp-1);display:flex;align-items:center;gap:var(--sp-1);">
          <span class="material-symbols-outlined" style="font-size:16px;">error</span> ${esc(t('knowledge.detail.processing_error'))}
        </div>
        <p style="font-size:var(--text-xs);color:var(--text-secondary);">${esc(doc.error_message)}</p>
      </div>` : ''}
  `;

  // Load preview for ready documents
  if (doc.status === 'ready') {
    loadDocPreview(doc.id);
  }

  const footerEl = document.getElementById('docDetailFooter');
  const downloadBtn = `<button class="btn btn-ghost" onclick="downloadDocument(${doc.id})" title="${esc(t('knowledge.btn.download'))}"><span class="material-symbols-outlined" style="font-size:18px;">download</span> ${esc(t('knowledge.btn.download'))}</button>`;
  if (isEditable) {
    footerEl.innerHTML = `
      ${downloadBtn}
      ${doc.status === 'error' ? `<button class="btn btn-secondary" onclick="retryDocument(${doc.id});closeModal('docDetailModal')"><span class="material-symbols-outlined" style="font-size:18px;">refresh</span> ${esc(t('knowledge.btn.retry'))}</button>` : ''}
      <button class="btn btn-secondary" onclick="deleteDocument(${doc.id})" style="color:var(--error);border-color:var(--error);"><span class="material-symbols-outlined" style="font-size:18px;">delete</span> ${esc(t('knowledge.btn.delete'))}</button>
      <button class="btn btn-primary" onclick="closeModal('docDetailModal')">${esc(t('knowledge.btn.close'))}</button>
    `;
  } else {
    footerEl.innerHTML = `${downloadBtn}<button class="btn btn-primary" onclick="closeModal('docDetailModal')">${esc(t('knowledge.btn.close'))}</button>`;
  }

  openModal('docDetailModal');
}

// ── Preview & Download ───────────────────────────────────────────────────

async function loadDocPreview(docId) {
  const area = document.getElementById('docPreviewArea');
  const content = document.getElementById('docPreviewContent');
  if (!area || !content) return;

  try {
    const token = localStorage.getItem('hoops_token');
    const res = await fetch(`/api/knowledge/${docId}/preview`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.data?.text) {
      content.textContent = data.data.text;
      area.style.display = 'block';
    }
  } catch {
    // preview is non-critical
  }
}

async function downloadDocument(docId) {
  try {
    const token = localStorage.getItem('hoops_token');
    const res = await fetch(`/api/knowledge/${docId}/download`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!res.ok) {
      Toast.error(t('knowledge.download.failed'));
      return;
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : 'document';

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    Toast.error(t('knowledge.download.failed'));
  }
}

// ── Upload ────────────────────────────────────────────────────────────────

function setupDropZone() {
  const zone = document.getElementById('dropZone');
  if (!zone) return;

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.style.borderColor = 'var(--primary)';
  });
  zone.addEventListener('dragleave', () => {
    zone.style.borderColor = 'var(--border)';
  });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.style.borderColor = 'var(--border)';
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      const input = document.getElementById('docFile');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      handleFileSelect(input);
    }
  });
}

function handleFileSelect(input) {
  const textEl = document.getElementById('dropZoneText');
  if (input.files.length) {
    const f = input.files[0];
    textEl.innerHTML = `<span style="color:var(--primary);font-weight:600;">${esc(f.name)}</span> <span style="color:var(--text-muted);">(${_formatSize(f.size)})</span>`;
    // Auto-fill title from filename if empty
    const titleInput = document.getElementById('docTitle');
    if (titleInput && !titleInput.value) {
      titleInput.value = f.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    }
  } else {
    textEl.textContent = t('knowledge.upload.select_or_drag');
  }
}

async function handleUpload(event) {
  event.preventDefault();

  const fileInput = document.getElementById('docFile');
  if (!fileInput?.files?.length) {
    Toast.error(t('knowledge.upload.select_file'));
    return false;
  }

  const title = document.getElementById('docTitle').value.trim();
  const category = document.getElementById('docCategory').value;
  const language = document.getElementById('docLanguage').value;
  const description = document.getElementById('docDescription').value.trim();

  if (!title) { Toast.error(t('knowledge.upload.enter_title')); return false; }
  if (!category) { Toast.error(t('knowledge.upload.select_category')); return false; }

  const btn = document.getElementById('uploadBtn');
  btn.disabled = true;
  btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">hourglass_empty</span> ${esc(t('knowledge.upload.uploading'))}`;

  try {
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('title', title);
    formData.append('category', category);
    formData.append('language', language);
    if (description) formData.append('description', description);

    const token = localStorage.getItem('hoops_token');
    const res = await fetch('/api/knowledge/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: formData,
    });

    const data = await res.json();

    if (res.status === 401) {
      API.clearAuth();
      window.location.href = '/login';
      return false;
    }

    if (!res.ok) {
      throw new Error(data.detail || t('knowledge.upload.failed'));
    }

    Toast.success(t('knowledge.upload.success'));
    closeModal('uploadDocModal');

    // Reset form
    document.getElementById('uploadDocForm').reset();
    document.getElementById('dropZoneText').textContent = t('knowledge.upload.select_or_drag');

    loadDocuments();
    loadStats();
  } catch (err) {
    Toast.error(err.message || t('knowledge.upload.failed'));
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">upload</span> ${esc(t('knowledge.btn.upload'))}`;
  }

  return false;
}

// ── Delete ────────────────────────────────────────────────────────────────

async function deleteDocument(id) {
  if (!confirm(t('knowledge.delete.confirm'))) return;
  try {
    await API.del(`/api/knowledge/${id}`);
    Toast.success(t('knowledge.deleted'));
    closeModal('docDetailModal');
    loadDocuments();
    loadStats();
  } catch {
    // toast already shown by API
  }
}

// ── Retry ─────────────────────────────────────────────────────────────────

async function retryDocument(id) {
  try {
    await API.post(`/api/knowledge/${id}/retry`, {});
    Toast.success(t('knowledge.retry.started'));
    loadDocuments();
    loadStats();
  } catch {
    // toast already shown by API
  }
}

// ── Badge Helpers ─────────────────────────────────────────────────────────

function _statusBadge(status) {
  const map = {
    ready:      { key: 'knowledge.status.ready',      cls: 'badge-success' },
    processing: { key: 'knowledge.status.processing', cls: 'badge-warning' },
    error:      { key: 'knowledge.status.error',      cls: 'badge-error' },
    pending:    { key: 'knowledge.status.pending',    cls: 'badge-neutral' },
  };
  const info = map[status];
  const label = info ? t(info.key) : (status || '--');
  const cls = info ? info.cls : 'badge-neutral';
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

function _scopeBadge(scope) {
  const map = {
    system: { key: 'knowledge.scope.system', color: '#60A5FA' },
    club:   { key: 'knowledge.scope.club',   color: '#A78BFA' },
    coach:  { key: 'knowledge.scope.coach',  color: 'var(--primary)' },
  };
  const info = map[scope];
  const label = info ? t(info.key) : (scope || '--');
  const color = info ? info.color : 'var(--text-muted)';
  return `<span class="badge" style="background:${color}20;color:${color};border:1px solid ${color}40;">${esc(label)}</span>`;
}

function _fileIcon(fileType) {
  const map = {
    pdf:  'picture_as_pdf',
    docx: 'article',
    txt:  'text_snippet',
  };
  return map[fileType] || 'description';
}

// ── Format Helpers ────────────────────────────────────────────────────────

function _formatSize(bytes) {
  if (bytes == null || isNaN(bytes)) return '--';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function _formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  const locale = I18N.getLang() === 'he' ? 'he-IL' : 'en-US';
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}
