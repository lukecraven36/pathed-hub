/* =============================================
   PATHED HUB · app.js
   ============================================= */

// ─── STATE ────────────────────────────────────
const state = {
  clients: JSON.parse(localStorage.getItem('ph_clients') || '[]'),
  work:    JSON.parse(localStorage.getItem('ph_work')    || '[]'),
  invoices:JSON.parse(localStorage.getItem('ph_invoices')|| '[]'),
  settings: JSON.parse(localStorage.getItem('ph_settings')|| '{}'),
};

function save(key) {
  localStorage.setItem('ph_' + key, JSON.stringify(state[key]));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── NAVIGATION ───────────────────────────────
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    renderView(view);
  });
});

function renderView(view) {
  if (view === 'dashboard')  renderDashboard();
  if (view === 'clients')    renderClients();
  if (view === 'work')       renderWork();
  if (view === 'pipeline')   renderPipeline();
  if (view === 'invoices')   renderInvoices();
  if (view === 'settings')   renderSettings();
}

// ─── TOAST ────────────────────────────────────
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
  };
  el.innerHTML = `<span style="font-weight:700;font-size:1rem;">${icons[type]}</span> ${msg}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ─── MODAL ────────────────────────────────────
function openModal(title, bodyHTML, onConfirm, confirmLabel = 'Save') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML + `
    <div class="modal-footer">
      <button class="btn-secondary" id="modal-cancel">Cancel</button>
      <button class="btn-primary" id="modal-confirm">${confirmLabel}</button>
    </div>`;
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-cancel').onclick = closeModal;
  document.getElementById('modal-close').onclick  = closeModal;
  document.getElementById('modal-confirm').onclick = () => {
    if (onConfirm()) closeModal();
  };
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ─── DASHBOARD ────────────────────────────────
function renderDashboard() {
  const pipelineValue = state.work
    .filter(w => w.status !== 'invoiced')
    .reduce((sum, w) => sum + (parseFloat(w.confirmedRate) || 0), 0);

  document.getElementById('stat-clients').textContent  = state.clients.length;
  document.getElementById('stat-days').textContent     = state.work.length;
  document.getElementById('stat-pipeline').textContent = '£' + pipelineValue.toLocaleString('en-GB');
  document.getElementById('stat-invoices').textContent = state.invoices.length;

  const recentWork = [...state.work]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const recentEl = document.getElementById('recent-work-list');
  if (recentWork.length === 0) {
    recentEl.innerHTML = '<div class="empty-state">No consultancy days logged yet.</div>';
  } else {
    recentEl.innerHTML = recentWork.map(w => {
      const client = state.clients.find(c => c.id === w.clientId);
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
          <div>
            <div style="font-weight:600;font-size:0.875rem;">${w.workType}</div>
            <div style="font-size:0.78rem;color:var(--mute);">${client ? client.companyName : 'Unknown'} · ${formatDate(w.date)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-family:'Space Grotesk',sans-serif;font-weight:600;color:var(--teal);">£${parseFloat(w.confirmedRate).toLocaleString('en-GB')}</span>
            <span class="status-pill status-${w.status}">${statusLabel(w.status)}</span>
          </div>
        </div>`;
    }).join('');
  }

  const upcoming = state.work
    .filter(w => new Date(w.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const upcomingEl = document.getElementById('upcoming-calendar-list');
  if (upcoming.length === 0) {
    upcomingEl.innerHTML = '<div class="empty-state">No upcoming work scheduled.</div>';
  } else {
    upcomingEl.innerHTML = upcoming.map(w => {
      const client = state.clients.find(c => c.id === w.clientId);
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;border-radius:8px;background:hsl(268 95% 68% / 0.12);border:1px solid hsl(268 95% 68% / 0.25);display:flex;flex-direction:column;align-items:center;justify-content:center;">
              <span style="font-size:0.55rem;color:var(--primary);font-weight:700;text-transform:uppercase;">${new Date(w.date + 'T12:00:00').toLocaleDateString('en-GB',{month:'short'})}</span>
              <span style="font-size:0.9rem;font-weight:700;font-family:'Space Grotesk',sans-serif;line-height:1;">${new Date(w.date + 'T12:00:00').getDate()}</span>
            </div>
            <div>
              <div style="font-weight:600;font-size:0.875rem;">${w.workType}</div>
              <div style="font-size:0.78rem;color:var(--mute);">${client ? client.companyName : 'Unknown'} · ${w.duration}</div>
            </div>
          </div>
        </div>`;
    }).join('');
  }
}

// ─── CLIENTS ──────────────────────────────────
function renderClients() {
  const listEl  = document.getElementById('clients-list');
  const emptyEl = document.getElementById('clients-empty');

  if (state.clients.length === 0) {
    listEl.innerHTML = '';
    listEl.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';
  listEl.style.display = 'grid';
  listEl.innerHTML = state.clients.map(c => `
    <div class="client-card">
      <div class="client-card-header">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="client-avatar">${initials(c.companyName)}</div>
          <div>
            <div class="client-name">${c.companyName}</div>
            <div class="client-contact">${c.contactFirstName} ${c.contactLastName}</div>
          </div>
        </div>
      </div>
      <div class="client-meta">
        <div class="client-meta-row">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <span>${c.email}</span>
        </div>
        <div class="client-meta-row">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.38 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.09a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <span>${c.phone || '—'}</span>
        </div>
        ${c.billingAddress ? `<div class="client-meta-row">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>${c.billingAddress}</span>
        </div>` : ''}
      </div>
      <div class="client-rate">£${parseFloat(c.agreedRate || 0).toLocaleString('en-GB')} / day</div>
      <div class="client-actions">
        <button class="btn-sm" onclick="editClient('${c.id}')">Edit</button>
        <button class="btn-danger" onclick="deleteClient('${c.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('btn-new-client').addEventListener('click', () => {
  openModal('New Client', clientForm(), () => {
    const data = readClientForm();
    if (!data) return false;
    const client = { id: uid(), ...data };
    state.clients.push(client);
    save('clients');
    renderClients();
    renderDashboard();
    syncFreeAgentContact(client);
    toast('Client saved and syncing to FreeAgent', 'success');
    return true;
  });
});

function editClient(id) {
  const c = state.clients.find(x => x.id === id);
  if (!c) return;
  openModal('Edit Client', clientForm(c), () => {
    const data = readClientForm();
    if (!data) return false;
    Object.assign(c, data);
    save('clients');
    renderClients();
    toast('Client updated', 'success');
    return true;
  });
}

function deleteClient(id) {
  if (!confirm('Delete this client? This cannot be undone.')) return;
  state.clients = state.clients.filter(c => c.id !== id);
  save('clients');
  renderClients();
  renderDashboard();
  toast('Client deleted', 'info');
}

function clientForm(c = {}) {
  return `
    <div class="form-row">
      <div class="form-group">
        <label>Company / Client Name *</label>
        <input type="text" id="f-company" value="${c.companyName || ''}" placeholder="Acme Ltd" />
      </div>
      <div class="form-group">
        <label>Agreed Daily Rate (£) *</label>
        <input type="number" id="f-rate" value="${c.agreedRate || ''}" placeholder="850" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Contact First Name *</label>
        <input type="text" id="f-first" value="${c.contactFirstName || ''}" placeholder="Jane" />
      </div>
      <div class="form-group">
        <label>Contact Last Name *</label>
        <input type="text" id="f-last" value="${c.contactLastName || ''}" placeholder="Smith" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Email Address *</label>
        <input type="email" id="f-email" value="${c.email || ''}" placeholder="jane@acme.com" />
      </div>
      <div class="form-group">
        <label>Phone Number</label>
        <input type="tel" id="f-phone" value="${c.phone || ''}" placeholder="+44 7700 000000" />
      </div>
    </div>
    <div class="form-group">
      <label>Billing Address</label>
      <input type="text" id="f-address" value="${c.billingAddress || ''}" placeholder="123 Business Park, London, EC1A 1BB" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>VAT Registered?</label>
        <select id="f-vat">
          <option value="no" ${c.vatRegistered === 'no' || !c.vatRegistered ? 'selected' : ''}>No</option>
          <option value="yes" ${c.vatRegistered === 'yes' ? 'selected' : ''}>Yes</option>
        </select>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <input type="text" id="f-notes" value="${c.notes || ''}" placeholder="Optional notes" />
      </div>
    </div>`;
}

function readClientForm() {
  const company = document.getElementById('f-company').value.trim();
  const rate    = document.getElementById('f-rate').value.trim();
  const first   = document.getElementById('f-first').value.trim();
  const last    = document.getElementById('f-last').value.trim();
  const email   = document.getElementById('f-email').value.trim();
  if (!company || !rate || !first || !last || !email) {
    toast('Please fill in all required fields', 'error');
    return null;
  }
  return {
    companyName:      company,
    agreedRate:       parseFloat(rate),
    contactFirstName: first,
    contactLastName:  last,
    email,
    phone:          document.getElementById('f-phone').value.trim(),
    billingAddress: document.getElementById('f-address').value.trim(),
    vatRegistered:  document.getElementById('f-vat').value,
    notes:          document.getElementById('f-notes').value.trim(),
  };
}

// ─── WORK ─────────────────────────────────────
function renderWork() {
  const tbody   = document.getElementById('work-tbody');
  const emptyEl = document.getElementById('work-empty');
  const tableEl = document.getElementById('work-table');

  if (state.work.length === 0) {
    tableEl.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';
  tableEl.style.display = 'table';

  const sorted = [...state.work].sort((a, b) => new Date(b.date) - new Date(a.date));
  tbody.innerHTML = sorted.map(w => {
    const client = state.clients.find(c => c.id === w.clientId);
    return `
      <tr>
        <td>${formatDate(w.date)}</td>
        <td><span style="color:var(--cyan);font-weight:600;">${client ? client.companyName : 'Unknown'}</span></td>
        <td>${w.workType}</td>
        <td>${w.duration}</td>
        <td style="font-family:'Space Grotesk',sans-serif;font-weight:600;">£${parseFloat(w.confirmedRate).toLocaleString('en-GB')}</td>
        <td><span class="status-pill status-${w.status}">${statusLabel(w.status)}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn-sm" onclick="editWork('${w.id}')">Edit</button>
            <button class="btn-danger" onclick="deleteWork('${w.id}')">Delete</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

document.getElementById('btn-new-work').addEventListener('click', () => {
  if (state.clients.length === 0) {
    toast('Add a client first before logging work', 'error');
    return;
  }
  openModal('Log Consultancy Work', workForm(), () => {
    const data = readWorkForm();
    if (!data) return false;
    const work = { id: uid(), ...data };
    state.work.push(work);
    save('work');
    renderWork();
    renderDashboard();
    syncOutlookCalendar(work);
    syncFreeAgentTimeEntry(work);
    toast('Work logged — creating calendar entry & syncing to FreeAgent', 'success');
    return true;
  });
});

function editWork(id) {
  const w = state.work.find(x => x.id === id);
  if (!w) return;
  openModal('Edit Consultancy Work', workForm(w), () => {
    const data = readWorkForm();
    if (!data) return false;
    Object.assign(w, data);
    save('work');
    renderWork();
    renderPipeline();
    toast('Work updated', 'success');
    return true;
  });
}

function deleteWork(id) {
  if (!confirm('Delete this work entry?')) return;
  state.work = state.work.filter(w => w.id !== id);
  save('work');
  renderWork();
  renderDashboard();
  renderPipeline();
  toast('Work entry deleted', 'info');
}

function workForm(w = {}) {
  const clientOptions = state.clients.map(c =>
    `<option value="${c.id}" ${w.clientId === c.id ? 'selected' : ''}>${c.companyName}</option>`
  ).join('');

  return `
    <div class="form-row">
      <div class="form-group">
        <label>Client *</label>
        <select id="wf-client" onchange="prefillRate()">
          <option value="">Select a client</option>
          ${clientOptions}
        </select>
      </div>
      <div class="form-group">
        <label>Date *</label>
        <input type="date" id="wf-date" value="${w.date || today()}" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Work Type / Description *</label>
        <input type="text" id="wf-type" value="${w.workType || ''}" placeholder="e.g. Qlik Dashboard Build, Pre-Sales Workshop" />
      </div>
      <div class="form-group">
        <label>Duration *</label>
        <select id="wf-duration">
          <option value="Full Day" ${w.duration === 'Full Day' ? 'selected' : ''}>Full Day</option>
          <option value="Half Day" ${w.duration === 'Half Day' ? 'selected' : ''}>Half Day</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Confirmed Rate (£) *</label>
        <input type="number" id="wf-rate" value="${w.confirmedRate || ''}" placeholder="850" />
      </div>
      <div class="form-group">
        <label>Location</label>
        <select id="wf-location">
          <option value="Remote"   ${w.location === 'Remote'   ? 'selected' : ''}>Remote</option>
          <option value="On-site"  ${w.location === 'On-site'  ? 'selected' : ''}>On-site</option>
          <option value="Hybrid"   ${w.location === 'Hybrid'   ? 'selected' : ''}>Hybrid</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Status</label>
        <select id="wf-status">
          <option value="planned"   ${w.status === 'planned'   || !w.status ? 'selected' : ''}>Planned</option>
          <option value="confirmed" ${w.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="ready"     ${w.status === 'ready'     ? 'selected' : ''}>Ready to Invoice</option>
          <option value="invoiced"  ${w.status === 'invoiced'  ? 'selected' : ''}>Invoiced</option>
        </select>
      </div>
      <div class="form-group">
        <label>Notes / Deliverables</label>
        <input type="text" id="wf-notes" value="${w.notes || ''}" placeholder="Optional" />
      </div>
    </div>`;
}

window.prefillRate = function() {
  const clientId = document.getElementById('wf-client').value;
  const client   = state.clients.find(c => c.id === clientId);
  if (client && !document.getElementById('wf-rate').value) {
    document.getElementById('wf-rate').value = client.agreedRate;
  }
};

function readWorkForm() {
  const clientId = document.getElementById('wf-client').value;
  const date     = document.getElementById('wf-date').value;
  const type     = document.getElementById('wf-type').value.trim();
  const rate     = document.getElementById('wf-rate').value.trim();
  if (!clientId || !date || !type || !rate) {
    toast('Please fill in all required fields', 'error');
    return null;
  }
  return {
    clientId,
    date,
    workType:      type,
    duration:      document.getElementById('wf-duration').value,
    confirmedRate: parseFloat(rate),
    location:      document.getElementById('wf-location').value,
    status:        document.getElementById('wf-status').value,
    notes:         document.getElementById('wf-notes').value.trim(),
  };
}

// ─── PIPELINE ─────────────────────────────────
function renderPipeline() {
  const cols = {
    planned:   document.getElementById('pipeline-planned'),
    confirmed: document.getElementById('pipeline-confirmed'),
    ready:     document.getElementById('pipeline-ready'),
  };

  Object.values(cols).forEach(c => c.innerHTML = '');

  ['planned','confirmed','ready'].forEach(status => {
    const items = state.work.filter(w => w.status === status);
    document.getElementById('count-' + status).textContent = items.length;

    if (items.length === 0) {
      cols[status].innerHTML = '<div class="empty-state" style="text-align:center;padding:24px;">No items</div>';
      return;
    }

    cols[status].innerHTML = items.map(w => {
      const client = state.clients.find(c => c.id === w.clientId);
      const extraBtn = status === 'ready'
        ? `<button class="btn-primary" style="font-size:0.75rem;padding:6px 14px;" onclick="createInvoice('${w.id}')">Create Invoice</button>`
        : status === 'confirmed'
        ? `<button class="btn-sm" onclick="moveWork('${w.id}','ready')">→ Ready to Invoice</button>`
        : `<button class="btn-sm" onclick="moveWork('${w.id}','confirmed')">→ Confirm</button>`;

      return `
        <div class="pipeline-card">
          <div class="pipeline-card-client">${client ? client.companyName : 'Unknown'}</div>
          <div class="pipeline-card-desc">${w.workType}</div>
          <div class="pipeline-card-meta">
            <span>${formatDate(w.date)} · ${w.duration}</span>
            <span class="pipeline-card-value">£${parseFloat(w.confirmedRate).toLocaleString('en-GB')}</span>
          </div>
          <div class="pipeline-card-actions">${extraBtn}</div>
        </div>`;
    }).join('');
  });
}

window.moveWork = function(id, status) {
  const w = state.work.find(x => x.id === id);
  if (!w) return;
  w.status = status;
  save('work');
  renderPipeline();
  renderWork();
  toast('Status updated to ' + statusLabel(status), 'success');
};

window.createInvoice = function(workId) {
  const w = state.work.find(x => x.id === workId);
  if (!w) return;
  const client = state.clients.find(c => c.id === w.clientId);
  const inv = {
    id:        uid(),
    ref:       'INV-' + String(state.invoices.length + 1).padStart(4, '0'),
    workId,
    clientId:  w.clientId,
    clientName: client ? client.companyName : 'Unknown',
    amount:    w.confirmedRate,
    date:      today(),
    status:    'draft',
    workType:  w.workType,
    workDate:  w.date,
  };
  state.invoices.push(inv);
  w.status = 'invoiced';
  save('invoices');
  save('work');
  renderPipeline();
  renderWork();
  renderInvoices();
  renderDashboard();
  syncFreeAgentInvoice(inv, client);
  toast('Invoice created and sending to FreeAgent', 'success');
};

// ─── INVOICES ─────────────────────────────────
function renderInvoices() {
  const listEl  = document.getElementById('invoices-list');
  const emptyEl = document.getElementById('invoices-empty');

  if (state.invoices.length === 0) {
    listEl.innerHTML = '';
    listEl.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';
  listEl.style.display = 'grid';

  listEl.innerHTML = state.invoices.map(inv => `
    <div class="invoice-card">
      <div class="invoice-card-header">
        <div>
          <div class="invoice-ref">${inv.ref}</div>
          <div class="invoice-client">${inv.clientName}</div>
        </div>
        <div class="invoice-amount">£${parseFloat(inv.amount).toLocaleString('en-GB')}</div>
      </div>
      <div class="invoice-meta">
        <span>${inv.workType}</span>
        <span>Work date: ${formatDate(inv.workDate)}</span>
        <span>Created: ${formatDate(inv.date)}</span>
        <span class="status-pill status-${inv.status === 'draft' ? 'planned' : 'confirmed'}">${inv.status === 'draft' ? 'Draft in FreeAgent' : 'Sent'}</span>
      </div>
    </div>
  `).join('');
}

// ─── SETTINGS ─────────────────────────────────
function renderSettings() {
  const s = state.settings;
  if (s.faClientId)     document.getElementById('fa-client-id').value     = s.faClientId;
  if (s.faClientSecret) document.getElementById('fa-client-secret').value = s.faClientSecret;
  if (s.faEnv)          document.getElementById('fa-sandbox').value        = s.faEnv;
  if (s.msClientId)     document.getElementById('ms-client-id').value     = s.msClientId;
  if (s.msTenantId)     document.getElementById('ms-tenant-id').value     = s.msTenantId;
  if (s.bizName)        document.getElementById('biz-name').value         = s.bizName;
  if (s.bizEmail)       document.getElementById('biz-email').value        = s.bizEmail;
  if (s.bizVat)         document.getElementById('biz-vat').value          = s.bizVat;
  if (s.bizRate)        document.getElementById('biz-rate').value         = s.bizRate;
  updateBadges();
}

document.getElementById('btn-save-settings').addEventListener('click', () => {
  state.settings = {
    faClientId:     document.getElementById('fa-client-id').value.trim(),
    faClientSecret: document.getElementById('fa-client-secret').value.trim(),
    faEnv:          document.getElementById('fa-sandbox').value,
    msClientId:     document.getElementById('ms-client-id').value.trim(),
    msTenantId:     document.getElementById('ms-tenant-id').value.trim(),
    bizName:        document.getElementById('biz-name').value.trim(),
    bizEmail:       document.getElementById('biz-email').value.trim(),
    bizVat:         document.getElementById('biz-vat').value.trim(),
    bizRate:        document.getElementById('biz-rate').value.trim(),
  };
  save('settings');
  updateBadges();
  toast('Settings saved', 'success');
});

document.getElementById('btn-connect-fa').addEventListener('click', () => {
  const id  = document.getElementById('fa-client-id').value.trim();
  const env = document.getElementById('fa-sandbox').value;
  if (!id) { toast('Enter your FreeAgent Client ID first', 'error'); return; }
  const base = env === 'sandbox'
    ? 'https://sandbox.freeagent.com'
    : 'https://app.freeagent.com';
  const redirect = encodeURIComponent(window.location.origin + window.location.pathname);
  const url = `${base}/oauth2/authorize?response_type=code&client_id=${id}&redirect_uri=${redirect}`;
  toast('Redirecting to FreeAgent to authorise…', 'info');
  setTimeout(() => window.open(url, '_blank'), 800);
});

document.getElementById('btn-connect-ms').addEventListener('click', () => {
  const clientId = document.getElementById('ms-client-id').value.trim();
  const tenantId = document.getElementById('ms-tenant-id').value.trim();
  if (!clientId || !tenantId) { toast('Enter your Azure Client ID and Tenant ID first', 'error'); return; }
  const redirect  = encodeURIComponent(window.location.origin + window.location.pathname);
  const scope     = encodeURIComponent('Calendars.ReadWrite offline_access');
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirect}&scope=${scope}`;
  toast('Redirecting to Microsoft to authorise…', 'info');
  setTimeout(() => window.open(url, '_blank'), 800);
});

function updateBadges() {
  const s = state.settings;
  const faBadge = document.getElementById('fa-badge');
  const msBadge = document.getElementById('ms-badge');
  faBadge.classList.toggle('connected', !!(s.faClientId && s.faClientSecret));
  msBadge.classList.toggle('connected', !!(s.msClientId && s.msTenantId));
}

// ─── FREEAGENT SYNC (STUB → REAL) ─────────────
async function syncFreeAgentContact(client) {
  const s = state.settings;
  if (!s.faClientId) {
    console.info('[FreeAgent] Not configured — skipping contact sync');
    return;
  }
  // When OAuth token is stored (post-authorisation flow), POST to FreeAgent contacts API:
  // POST https://api.freeagent.com/v2/contacts
  // Body: { contact: { organisation_name, first_name, last_name, email, phone_number, uses_contact_invoice_sequence: true } }
  console.info('[FreeAgent] Would sync contact:', client.companyName);
  // Full implementation requires token exchange — see SETUP.md
}

async function syncFreeAgentTimeEntry(work) {
  const s = state.settings;
  if (!s.faClientId) return;
  console.info('[FreeAgent] Would log time/project entry for:', work.workType);
}

async function syncFreeAgentInvoice(inv, client) {
  const s = state.settings;
  if (!s.faClientId) {
    console.info('[FreeAgent] Not configured — invoice not pushed');
    return;
  }
  // POST https://api.freeagent.com/v2/invoices
  // Body: { invoice: { contact, dated_on, payment_terms_in_days, invoice_items: [{ description, quantity, price, item_type: 'Days' }] } }
  console.info('[FreeAgent] Would create invoice for:', inv.ref, inv.clientName);
}

// ─── OUTLOOK SYNC (STUB → REAL) ───────────────
async function syncOutlookCalendar(work) {
  const s = state.settings;
  if (!s.msClientId) {
    console.info('[Outlook] Not configured — skipping calendar sync');
    return;
  }
  const client = state.clients.find(c => c.id === work.clientId);
  // POST https://graph.microsoft.com/v1.0/me/events
  // Body: { subject, start: { dateTime, timeZone }, end: { dateTime, timeZone }, body: { content } }
  console.info('[Outlook] Would create calendar event:', work.workType, 'for', client?.companyName);
}

// ─── HELPERS ──────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function statusLabel(s) {
  return { planned: 'Planned', confirmed: 'Confirmed', ready: 'Ready to Invoice', invoiced: 'Invoiced' }[s] || s;
}

// ─── INIT ─────────────────────────────────────
renderDashboard();
updateBadges();
