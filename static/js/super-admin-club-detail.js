/**
 * HOOPS AI — Super Admin Club Detail (tabbed)
 */
let clubData = null;
let flagChanges = {};

document.addEventListener('DOMContentLoaded', () => {
  if (!requireSuperAdminAuth()) return;

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).style.display = '';
    });
  });

  loadClubDetail();

  document.getElementById('generateLinkBtn').addEventListener('click', generateLink);
  document.getElementById('saveFlags').addEventListener('click', saveFlags);
});


function getClubId() {
  const parts = window.location.pathname.split('/');
  return parts[parts.length - 1];
}


async function loadClubDetail() {
  const id = getClubId();
  try {
    const res = await SuperAdminAPI.get(`/api/super/clubs/${id}`);
    clubData = res.data;
    renderOverview();
    renderBilling();
    renderFeatureFlags();
    renderRegistrationLinks();
  } catch (err) {
    // handled by API wrapper
  }
}


function renderOverview() {
  const c = clubData.club;
  const s = clubData.stats;

  document.getElementById('clubTitle').textContent = c.name;
  document.getElementById('clubName').textContent = c.name;
  const badge = document.getElementById('clubStatus');
  badge.textContent = c.status;
  badge.className = 'status-badge ' + c.status;

  document.getElementById('detailTeams').textContent = s.teams;
  document.getElementById('detailCoaches').textContent = s.coaches;
  document.getElementById('detailPlayers').textContent = s.players;
  document.getElementById('detailParents').textContent = s.parents;

  // Club info
  document.getElementById('clubInfoContent').innerHTML = `
    <div class="info-grid">
      ${infoRow('Tier', c.tier_label || '—')}
      ${infoRow('Monthly Price', '₪' + (c.monthly_price || 0).toLocaleString())}
      ${infoRow('Max Players', c.max_players)}
      ${infoRow('Video Storage', c.storage_quota_video_gb + ' GB')}
      ${infoRow('Media Storage', c.storage_quota_media_gb + ' GB')}
      ${infoRow('Region', c.region_name || '—')}
      ${infoRow('Created', formatDate(c.created_at))}
      ${c.notes ? infoRow('Notes', c.notes) : ''}
    </div>
  `;

  // Admin info
  document.getElementById('adminInfoContent').innerHTML = c.admin_id ? `
    <div class="info-grid">
      ${infoRow('Name', c.admin_name || '—')}
      ${infoRow('Email', c.admin_email || '—')}
      ${infoRow('Billing Email', c.billing_email || '—')}
    </div>
  ` : '<div class="empty-state"><span class="material-symbols-outlined">person_off</span>No admin linked yet</div>';

  // Action buttons
  const actions = document.getElementById('actionButtons');
  const btns = [];
  if (c.status === 'active') {
    btns.push(`<button class="btn btn-sm" style="background:var(--warning-bg);color:var(--warning);" onclick="changeStatus('suspend')">
      <span class="material-symbols-outlined">pause_circle</span> Suspend</button>`);
  }
  if (c.status === 'suspended') {
    btns.push(`<button class="btn btn-sm" style="background:var(--success-bg);color:var(--success);" onclick="changeStatus('activate')">
      <span class="material-symbols-outlined">play_circle</span> Activate</button>`);
  }
  if (c.status !== 'terminated') {
    btns.push(`<button class="btn btn-sm" style="background:var(--error-bg);color:var(--error);" onclick="changeStatus('terminate')">
      <span class="material-symbols-outlined">cancel</span> Terminate</button>`);
  }
  actions.innerHTML = btns.join('');
}


function renderBilling() {
  const b = clubData.billing_config;
  const c = clubData.club;
  document.getElementById('billingContent').innerHTML = `
    <div class="info-grid">
      ${infoRow('Billing Day', 'Day ' + b.billing_day + ' of each month')}
      ${infoRow('Billing Email', b.billing_email || c.billing_email || '—')}
      ${infoRow('Recurring Active', b.is_recurring_active ? 'Yes' : 'No')}
      ${infoRow('Next Billing', b.next_billing_date || '—')}
      ${infoRow('Monthly Price', '₪' + (c.monthly_price || 0).toLocaleString())}
      ${infoRow('Tier', c.tier_label || 'Custom')}
    </div>
  `;

  // Load invoice history
  loadClubInvoices();
}


async function loadClubInvoices() {
  const id = getClubId();
  const el = document.getElementById('invoiceHistoryContent');
  const link = document.getElementById('billingPageLink');

  try {
    const res = await SuperAdminAPI.get(`/api/super/billing/invoices?club_id=${id}&limit=20`);
    const invoices = res.data;

    // Show "View All" link to billing page filtered by club
    if (link) {
      link.href = `/super-admin/billing`;
      link.style.display = '';
    }

    if (!invoices || !invoices.length) {
      el.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">receipt_long</span>No invoices yet</div>';
      return;
    }

    // Summary stats — only count tax_invoices (receipts are just confirmations)
    const taxInvoices = invoices.filter(i => i.invoice_type === 'tax_invoice');
    const paid = taxInvoices.filter(i => i.status === 'paid');
    const unpaid = taxInvoices.filter(i => ['draft','sent','overdue'].includes(i.status));
    const totalPaid = paid.reduce((s, i) => s + (i.total || 0), 0);
    const totalUnpaid = unpaid.reduce((s, i) => s + (i.total || 0), 0);

    const formatILS = n => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n);

    const statusColors = {
      draft: '#6b7280', sent: '#3b82f6', paid: '#22c55e', overdue: '#ef4444', cancelled: '#9ca3af'
    };
    const typeLabels = {
      tax_invoice: 'Tax Invoice', receipt: 'Receipt', credit_note: 'Credit Note',
      proforma: 'Proforma', quote: 'Quote'
    };

    el.innerHTML = `
      <div style="display:flex;gap:var(--sp-4);margin-bottom:var(--sp-4);flex-wrap:wrap;">
        <div style="padding:var(--sp-3) var(--sp-4);background:rgba(34,197,94,0.1);border-radius:var(--r-lg);flex:1;min-width:120px;">
          <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Paid</div>
          <div style="font-size:1.2rem;font-weight:700;color:#22c55e;">${formatILS(totalPaid)}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${paid.length} invoices</div>
        </div>
        <div style="padding:var(--sp-3) var(--sp-4);background:rgba(239,68,68,0.1);border-radius:var(--r-lg);flex:1;min-width:120px;">
          <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Unpaid</div>
          <div style="font-size:1.2rem;font-weight:700;color:#ef4444;">${formatILS(totalUnpaid)}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${unpaid.length} invoices</div>
        </div>
      </div>
      <table class="sa-table">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${invoices.map(inv => `
            <tr onclick="window.location.href='/super-admin/billing/${inv.id}'" style="cursor:pointer;">
              <td><strong>${esc(inv.invoice_number)}</strong></td>
              <td>${typeLabels[inv.invoice_type] || inv.invoice_type}</td>
              <td style="font-weight:600;">${formatILS(inv.total)}</td>
              <td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.75rem;color:#fff;text-transform:uppercase;background:${statusColors[inv.status] || '#6b7280'};">${inv.status}</span></td>
              <td>${inv.issue_date || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    el.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">error</span>Failed to load invoices</div>';
  }
}


function renderFeatureFlags() {
  const flags = clubData.feature_flags;
  flagChanges = {};

  const labels = {
    ai_chat_coach_full: 'Coach AI Chat (Full)',
    ai_chat_player: 'Player AI Chat',
    play_creator: 'Play Creator',
    drill_generator: 'Drill Generator',
    practice_planner: 'Practice Planner',
    reports_evaluations: 'Reports & Evaluations',
    video_room: 'Video Room',
    knowledge_base: 'Knowledge Base',
    billing_payments: 'Billing & Payments',
    messaging: 'Messaging',
    carpool: 'Carpool',
    media_gallery: 'Media Gallery',
    ai_insights: 'AI Insights',
    schedule_management: 'Schedule Management',
  };

  const container = document.getElementById('featureFlagsContent');
  container.innerHTML = Object.entries(flags).map(([key, enabled]) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-3) 0;border-bottom:1px solid var(--border);">
      <div>
        <div style="font-weight:500;">${labels[key] || key}</div>
        <div class="text-sm text-muted">${key}</div>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" data-key="${key}" ${enabled ? 'checked' : ''} onchange="onFlagChange('${key}', this.checked)">
        <span class="toggle-slider"></span>
      </label>
    </div>
  `).join('');

  // Add toggle switch styles if not present
  if (!document.getElementById('toggleStyles')) {
    const style = document.createElement('style');
    style.id = 'toggleStyles';
    style.textContent = `
      .toggle-switch { position:relative;display:inline-block;width:44px;height:24px; }
      .toggle-switch input { opacity:0;width:0;height:0; }
      .toggle-slider { position:absolute;cursor:pointer;inset:0;background:var(--bg-surface);border-radius:24px;transition:.2s; }
      .toggle-slider::before { content:"";position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s; }
      .toggle-switch input:checked + .toggle-slider { background:var(--primary); }
      .toggle-switch input:checked + .toggle-slider::before { transform:translateX(20px); }
    `;
    document.head.appendChild(style);
  }
}


function onFlagChange(key, enabled) {
  flagChanges[key] = enabled;
  document.getElementById('saveFlags').style.display = '';
}


async function saveFlags() {
  if (!Object.keys(flagChanges).length) return;
  const id = getClubId();
  try {
    await SuperAdminAPI.put(`/api/super/features/${id}/bulk`, { flags: flagChanges });
    SuperAdminToast.success('Feature flags updated');
    flagChanges = {};
    document.getElementById('saveFlags').style.display = 'none';
  } catch (err) {
    // handled
  }
}


function renderRegistrationLinks() {
  const links = clubData.registration_links;
  const el = document.getElementById('registrationLinksContent');

  if (!links || links.length === 0) {
    el.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">link_off</span>No active registration links</div>';
    return;
  }

  el.innerHTML = links.map(l => {
    const expired = new Date(l.expires_at) < new Date();
    const fullUrl = window.location.origin + l.url;
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-3) 0;border-bottom:1px solid var(--border);">
        <div style="flex:1;min-width:0;">
          <div style="font-family:monospace;font-size:var(--text-sm);overflow:hidden;text-overflow:ellipsis;">${esc(fullUrl)}</div>
          <div class="text-sm text-muted">Expires: ${formatDate(l.expires_at)} ${expired ? '(EXPIRED)' : ''}</div>
        </div>
        <div style="display:flex;gap:var(--sp-2);margin-left:var(--sp-3);">
          <button class="btn-icon" onclick="copyText('${fullUrl}', this)" title="Copy link">
            <span class="material-symbols-outlined">content_copy</span>
          </button>
          <button class="btn-icon" onclick="deactivateLink(${l.id})" title="Deactivate" style="color:var(--error);">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}


async function generateLink() {
  const id = getClubId();
  try {
    const res = await SuperAdminAPI.post(`/api/super/clubs/${id}/registration-link`);
    SuperAdminToast.success('Registration link generated');
    await loadClubDetail();
  } catch (err) {
    // handled
  }
}


async function deactivateLink(linkId) {
  if (!confirm('Deactivate this registration link?')) return;
  try {
    await SuperAdminAPI.del(`/api/super/clubs/registration-link/${linkId}`);
    SuperAdminToast.success('Link deactivated');
    await loadClubDetail();
  } catch (err) {
    // handled
  }
}


async function changeStatus(action) {
  const id = getClubId();
  const labels = { suspend: 'Suspend', activate: 'Activate', terminate: 'Terminate' };
  if (!confirm(`${labels[action]} this club?`)) return;
  try {
    await SuperAdminAPI.post(`/api/super/clubs/${id}/${action}`);
    SuperAdminToast.success(`Club ${action}d`);
    await loadClubDetail();
  } catch (err) {
    // handled
  }
}


function infoRow(label, value) {
  return `
    <div style="display:flex;justify-content:space-between;padding:var(--sp-2) 0;border-bottom:1px solid var(--border);">
      <span class="text-muted">${label}</span>
      <span style="font-weight:500;">${value ?? '—'}</span>
    </div>
  `;
}


function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
