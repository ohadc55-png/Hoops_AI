/**
 * HOOPS AI — Admin Knowledge Base Page JS
 * Document management: upload, list, filter, delete, retry
 */

let _allDocs = [];
let _categoryMap = {};

// ── Init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAPI.token) return;
  loadCategories();
  loadDocuments();
  loadStats();
  setupDropZone();
});

// ── Stats ─────────────────────────────────────────────────────────────────

async function loadStats() {
  try {
    const res = await AdminAPI.get('/api/knowledge/stats');
    const d = res.data || res;
    document.getElementById('statDocuments').textContent = d.my_documents ?? 0;
    document.getElementById('statChunks').textContent = d.total_chunks ?? 0;
    // Calculate total size from loaded docs
    const totalSize = _allDocs.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
    document.getElementById('statTotalSize').textContent = formatFileSize(totalSize);
  } catch {
    // stats are non-critical
  }
}

// ── Categories ────────────────────────────────────────────────────────────

async function loadCategories() {
  try {
    const res = await AdminAPI.get('/api/knowledge/categories');
    const categories = res.data || res || {};
    _categoryMap = categories;

    const opts = Object.entries(categories)
      .map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`)
      .join('');

    const filterSelect = document.getElementById('filterCategory');
    if (filterSelect) {
      filterSelect.innerHTML = `<option value="">${t('admin.knowledge.all_categories')}</option>` + opts;
    }

    // Upload modal category dropdown
    const uploadSelect = document.getElementById('docCategory');
    if (uploadSelect) {
      uploadSelect.innerHTML = `<option value="">${t('admin.knowledge.select_category')}</option>` + opts;
    }
  } catch {
    // non-critical
  }
}

// ── Documents List ────────────────────────────────────────────────────────

async function loadDocuments() {
  const container = document.getElementById('documentsGrid');
  if (!container) return;

  container.innerHTML = `<div class="loading-state">${t('admin.knowledge.loading')}</div>`;

  const category = document.getElementById('filterCategory')?.value || '';
  const status = document.getElementById('filterStatus')?.value || '';

  let url = '/api/knowledge';
  const params = [];
  if (category) params.push(`category=${encodeURIComponent(category)}`);
  if (status) params.push(`status=${encodeURIComponent(status)}`);
  if (params.length) url += '?' + params.join('&');

  try {
    const res = await AdminAPI.get(url);
    _allDocs = res.data || res || [];

    // Client-side scope filter
    const scopeFilter = document.getElementById('filterScope')?.value || '';
    let docs = _allDocs;
    if (scopeFilter) {
      docs = docs.filter(d => d.scope === scopeFilter);
    }

    const countEl = document.getElementById('docCount');
    if (countEl) countEl.textContent = t('admin.knowledge.doc_count', { count: docs.length });

    if (!docs.length) {
      container.innerHTML = `
        <div style="text-align:center;padding:var(--sp-8);color:var(--text-muted);">
          <span class="material-symbols-outlined" style="font-size:48px;display:block;margin-bottom:var(--sp-3);">folder_open</span>
          <h3 style="font-size:var(--text-lg);margin-bottom:var(--sp-2);">${t('admin.knowledge.empty.no_docs')}</h3>
          <p style="font-size:var(--text-sm);">${t('admin.knowledge.empty.no_docs_desc')}</p>
        </div>`;
      return;
    }

    container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:var(--sp-4);">${docs.map(doc => renderDocumentCard(doc)).join('')}</div>`;

    // Update stats with total size
    const totalSize = _allDocs.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
    const sizeEl = document.getElementById('statTotalSize');
    if (sizeEl) sizeEl.textContent = formatFileSize(totalSize);
  } catch {
    container.innerHTML = `<div style="text-align:center;padding:var(--sp-8);color:var(--error);">${t('admin.knowledge.empty.load_error')}</div>`;
  }
}

function applyFilters() {
  loadDocuments();
}

function _categoryLabel(key) {
  return _categoryMap[key] || key || '';
}

function renderDocumentCard(doc) {
  const statusBadge = renderStatusBadge(doc.status);
  const scopeBadge = renderScopeBadge(doc.scope);
  const fileSize = formatFileSize(doc.file_size);
  const uploadDate = formatDate(doc.created_at);
  const chunks = doc.chunk_count != null ? `${doc.chunk_count} ${t('admin.knowledge.chunks_label')}` : '--';
  const fileIcon = _fileIcon(doc.file_type);
  const fileExt = (doc.file_type || '').toUpperCase();

  const isSystem = doc.scope === 'system';
  const isError = doc.status === 'error';

  const actionBtns = [];
  if (isError) actionBtns.push(`<button class="btn btn-ghost" style="padding:4px;" onclick="event.stopPropagation();retryDocument(${doc.id})" title="${t('admin.knowledge.retry_btn')}"><span class="material-symbols-outlined" style="font-size:18px;">refresh</span></button>`);
  if (!isSystem) actionBtns.push(`<button class="btn btn-ghost" style="padding:4px;" onclick="event.stopPropagation();deleteDocument(${doc.id})" title="${t('admin.knowledge.delete_btn')}"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>`);

  const errorMsg = isError && doc.error_message
    ? `<div style="font-size:var(--text-xs);color:var(--error);margin-top:var(--sp-2);padding:var(--sp-2);background:rgba(239,68,68,0.06);border-radius:var(--r-sm);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(doc.error_message)}</div>`
    : '';

  return `
    <div class="stat-card" style="cursor:pointer;padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);" onclick="viewDocument(${doc.id})">
      <!-- Header: file icon + title + actions -->
      <div style="display:flex;align-items:start;gap:var(--sp-3);">
        <div style="width:44px;height:44px;border-radius:var(--r-md);background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <span class="material-symbols-outlined" style="font-size:24px;color:var(--primary);">${fileIcon}</span>
        </div>
        <div style="flex:1;min-width:0;">
          <h3 style="font-size:var(--text-base);font-weight:700;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(doc.title || doc.original_name || t('admin.knowledge.untitled'))}</h3>
          <div style="font-size:var(--text-xs);color:var(--text-muted);display:flex;align-items:center;gap:var(--sp-2);">
            <span>${fileExt}</span>
            <span style="opacity:0.4;">·</span>
            <span>${fileSize}</span>
            <span style="opacity:0.4;">·</span>
            <span>${esc(doc.original_name || '')}</span>
          </div>
        </div>
        ${actionBtns.length ? `<div style="display:flex;gap:2px;flex-shrink:0;">${actionBtns.join('')}</div>` : ''}
      </div>
      <!-- Description -->
      ${doc.description ? `<p style="font-size:var(--text-sm);color:var(--text-secondary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:0;">${esc(doc.description)}</p>` : ''}
      ${errorMsg}
      <!-- Badges row -->
      <div style="display:flex;align-items:center;gap:var(--sp-2);flex-wrap:wrap;">
        ${doc.category ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:var(--r-full);background:rgba(255,255,255,0.06);font-size:var(--text-xs);color:var(--text-secondary);"><span class="material-symbols-outlined" style="font-size:13px;">category</span>${esc(_categoryLabel(doc.category))}</span>` : ''}
        ${scopeBadge}
        ${statusBadge}
      </div>
      <!-- Footer: chunks + date -->
      <div style="display:flex;align-items:center;justify-content:space-between;font-size:var(--text-xs);color:var(--text-muted);padding-top:var(--sp-2);border-top:1px solid rgba(255,255,255,0.06);">
        <span style="display:flex;align-items:center;gap:4px;"><span class="material-symbols-outlined" style="font-size:14px;">data_object</span> ${chunks}</span>
        <span style="display:flex;align-items:center;gap:4px;"><span class="material-symbols-outlined" style="font-size:14px;">calendar_today</span> ${uploadDate}</span>
      </div>
    </div>`;
}

// ── View Document Detail ──────────────────────────────────────────────────

function viewDocument(id) {
  const doc = _allDocs.find(d => d.id === id);
  if (!doc) return;

  document.getElementById('detailDocTitle').textContent = doc.title || doc.original_name || t('admin.knowledge.untitled');

  document.getElementById('docDetailBody').innerHTML = `
    <div style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-4);flex-wrap:wrap;">
      ${doc.category ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:var(--r-full);background:rgba(255,255,255,0.06);font-size:var(--text-xs);color:var(--text-secondary);"><span class="material-symbols-outlined" style="font-size:13px;">category</span>${esc(_categoryLabel(doc.category))}</span>` : ''}
      ${renderScopeBadge(doc.scope)}
      ${renderStatusBadge(doc.status)}
      ${doc.language ? `<span style="display:inline-block;padding:2px 8px;border-radius:var(--r-sm);background:rgba(255,255,255,0.06);font-size:var(--text-xs);color:var(--text-secondary);">${doc.language === 'he' ? t('admin.knowledge.detail.language_he') : t('admin.knowledge.detail.language_en')}</span>` : ''}
    </div>
    ${doc.description ? `<p style="margin-bottom:var(--sp-4);color:var(--text-secondary);font-size:var(--text-sm);">${esc(doc.description)}</p>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);font-size:var(--text-sm);">
      <div>
        <span style="color:var(--text-muted);">${t('admin.knowledge.detail.file')}</span>
        <span style="margin-left:var(--sp-1);">${esc(doc.original_name)}</span>
      </div>
      <div>
        <span style="color:var(--text-muted);">${t('admin.knowledge.detail.size')}</span>
        <span style="margin-left:var(--sp-1);">${formatFileSize(doc.file_size)}</span>
      </div>
      <div>
        <span style="color:var(--text-muted);">${t('admin.knowledge.detail.chunks')}</span>
        <span style="margin-left:var(--sp-1);">${doc.chunk_count ?? '--'}</span>
      </div>
      <div>
        <span style="color:var(--text-muted);">${t('admin.knowledge.detail.uploaded')}</span>
        <span style="margin-left:var(--sp-1);">${formatDate(doc.created_at)}</span>
      </div>
    </div>
    <!-- Text preview area -->
    <div id="docPreviewArea" style="margin-top:var(--sp-4);display:none;">
      <div style="font-weight:600;font-size:var(--text-sm);margin-bottom:var(--sp-2);display:flex;align-items:center;gap:var(--sp-2);">
        <span class="material-symbols-outlined" style="font-size:16px;">preview</span> ${t('admin.knowledge.detail.content_preview')}
      </div>
      <div id="docPreviewContent" style="max-height:300px;overflow-y:auto;padding:var(--sp-3);background:rgba(0,0,0,0.2);border-radius:var(--r-md);font-size:var(--text-sm);color:var(--text-secondary);white-space:pre-wrap;word-break:break-word;line-height:1.6;border:1px solid rgba(255,255,255,0.06);"></div>
    </div>
    ${doc.status === 'error' && doc.error_message ? `
      <div style="margin-top:var(--sp-4);padding:var(--sp-3);background:rgba(239,68,68,0.08);border-radius:var(--r-md);border:1px solid rgba(239,68,68,0.2);">
        <div style="font-weight:600;color:var(--error);font-size:var(--text-sm);margin-bottom:var(--sp-1);display:flex;align-items:center;gap:var(--sp-1);">
          <span class="material-symbols-outlined" style="font-size:16px;">error</span> ${t('admin.knowledge.detail.processing_error')}
        </div>
        <p style="font-size:var(--text-xs);color:var(--text-secondary);">${esc(doc.error_message)}</p>
      </div>` : ''}
  `;

  // Load preview for ready documents
  if (doc.status === 'ready') {
    loadDocPreview(doc.id);
  }

  // Update footer with action buttons
  const footer = document.querySelector('#docDetailModal .modal-footer');
  if (footer) {
    const isSystem = doc.scope === 'system';
    footer.innerHTML = `
      <button class="btn btn-ghost" onclick="downloadDocument(${doc.id})" title="${t('admin.knowledge.download_btn')}"><span class="material-symbols-outlined" style="font-size:18px;">download</span> ${t('admin.knowledge.download_btn')}</button>
      ${doc.status === 'error' && !isSystem ? `<button class="btn btn-ghost" onclick="retryDocument(${doc.id});closeModal('docDetailModal')"><span class="material-symbols-outlined" style="font-size:18px;">refresh</span> ${t('admin.knowledge.retry_btn')}</button>` : ''}
      ${!isSystem ? `<button class="btn btn-ghost" style="color:var(--error);" onclick="deleteDocument(${doc.id})"><span class="material-symbols-outlined" style="font-size:18px;">delete</span> ${t('admin.knowledge.delete_btn')}</button>` : ''}
      <button class="btn btn-primary" onclick="closeModal('docDetailModal')">${t('btn.close')}</button>
    `;
  }

  openModal('docDetailModal');
}

// ── Preview & Download ───────────────────────────────────────────────────

async function loadDocPreview(docId) {
  const area = document.getElementById('docPreviewArea');
  const content = document.getElementById('docPreviewContent');
  if (!area || !content) return;

  try {
    const token = localStorage.getItem('hoops_admin_token');
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
    const token = localStorage.getItem('hoops_admin_token');
    const res = await fetch(`/api/knowledge/${docId}/download`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!res.ok) {
      AdminToast.error(t('admin.knowledge.download_failed'));
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
    AdminToast.error(t('admin.knowledge.download_failed'));
  }
}

// ── Status Badge ──────────────────────────────────────────────────────────

function renderStatusBadge(status) {
  const map = {
    ready:      { label: t('admin.knowledge.status.ready'),      bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
    processing: { label: t('admin.knowledge.status.processing'), bg: 'rgba(251,191,36,0.12)', color: '#FBBF24' },
    error:      { label: t('admin.knowledge.status.error'),      bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
  };
  const info = map[status] || { label: status || '--', bg: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' };
  return `<span style="display:inline-block;padding:2px 8px;border-radius:var(--r-sm);background:${info.bg};color:${info.color};font-size:var(--text-xs);font-weight:600;">${esc(info.label)}</span>`;
}

// ── Scope Badge ───────────────────────────────────────────────────────────

function renderScopeBadge(scope) {
  const map = {
    system: { label: t('admin.knowledge.scope.system'), color: '#60A5FA' },
    club:   { label: t('admin.knowledge.scope.club'),   color: '#A78BFA' },
    coach:  { label: t('admin.knowledge.scope.coach'),  color: '#f48c25' },
  };
  const info = map[scope] || { label: scope || '--', color: 'var(--text-muted)' };
  return `<span style="display:inline-block;padding:2px 8px;border-radius:var(--r-sm);background:${info.color}20;color:${info.color};border:1px solid ${info.color}40;font-size:var(--text-xs);font-weight:600;">${esc(info.label)}</span>`;
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
    textEl.innerHTML = `<span style="color:var(--primary);font-weight:600;">${esc(f.name)}</span> <span style="color:var(--text-muted);">(${formatFileSize(f.size)})</span>`;
    // Auto-fill title from filename if empty
    const titleInput = document.getElementById('docTitle');
    if (titleInput && !titleInput.value) {
      titleInput.value = f.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    }
  } else {
    textEl.textContent = t('admin.knowledge.drop_zone_text');
  }
}

async function handleUploadDocument(event) {
  event.preventDefault();

  const fileInput = document.getElementById('docFile');
  if (!fileInput?.files?.length) {
    AdminToast.error(t('admin.knowledge.upload_error.no_file'));
    return false;
  }

  const title = document.getElementById('docTitle').value.trim();
  const category = document.getElementById('docCategory').value;
  const language = document.getElementById('docLanguage').value;
  const description = document.getElementById('docDescription').value.trim();

  if (!title) { AdminToast.error(t('admin.knowledge.upload_error.no_title')); return false; }
  if (!category) { AdminToast.error(t('admin.knowledge.upload_error.no_category')); return false; }

  const btn = document.getElementById('uploadBtn');
  btn.disabled = true;
  btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">hourglass_empty</span> ${t('admin.knowledge.uploading')}`;

  try {
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('title', title);
    formData.append('category', category);
    formData.append('language', language);
    if (description) formData.append('description', description);

    const token = localStorage.getItem('hoops_admin_token');
    const res = await fetch('/api/knowledge/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: formData,
    });

    const data = await res.json();

    if (res.status === 401) {
      AdminAPI.clearAuth();
      window.location.href = '/admin/login';
      return false;
    }

    if (!res.ok) {
      throw new Error(data.detail || 'Upload failed');
    }

    AdminToast.success(t('admin.knowledge.upload_success'));
    closeModal('uploadDocModal');

    // Reset form
    document.getElementById('uploadDocForm').reset();
    document.getElementById('dropZoneText').textContent = t('admin.knowledge.drop_zone_text');

    loadDocuments();
    loadStats();
  } catch (err) {
    AdminToast.error(err.message || 'Upload failed');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">upload</span> ${t('admin.knowledge.upload_btn')}`;
  }

  return false;
}

// ── Delete ────────────────────────────────────────────────────────────────

async function deleteDocument(id) {
  if (!confirm(t('admin.knowledge.delete_confirm'))) return;
  try {
    await AdminAPI.del(`/api/knowledge/${id}`);
    AdminToast.success(t('admin.knowledge.document_deleted'));
    closeModal('docDetailModal');
    loadDocuments();
    loadStats();
  } catch {
    // toast already shown by AdminAPI
  }
}

// ── Retry ─────────────────────────────────────────────────────────────────

async function retryDocument(id) {
  try {
    await AdminAPI.post(`/api/knowledge/${id}/retry`, {});
    AdminToast.success(t('admin.knowledge.reprocessing_started'));
    loadDocuments();
    loadStats();
  } catch {
    // toast already shown by AdminAPI
  }
}

// ── File Icon ─────────────────────────────────────────────────────────────

function _fileIcon(fileType) {
  const map = {
    pdf:  'picture_as_pdf',
    docx: 'article',
    txt:  'text_snippet',
  };
  return map[fileType] || 'description';
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatFileSize(bytes) {
  if (bytes == null || isNaN(bytes)) return '--';
  const lrm = '\u200E';
  if (bytes < 1024) return lrm + bytes + ' B';
  if (bytes < 1024 * 1024) return lrm + (bytes / 1024).toFixed(1) + ' KB';
  return lrm + (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/* formatDate → shared-utils.js */
