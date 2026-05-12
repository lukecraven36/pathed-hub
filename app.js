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

// ─── FREEAGENT OAUTH ──────────────────────────
// FreeAgent uses standard OAuth 2.0 with a client secret. The secret lives
// server-side in our Netlify Function; this client only knows the public ID.

const FA_REDIRECT_URI = window.location.origin + window.location.pathname;

function faApiBase() {
  return state.settings.faEnv === 'sandbox'
    ? 'https://api.sandbox.freeagent.com/v2'
    : 'https://api.freeagent.com/v2';
}

function faAuthBase() {
  return state.settings.faEnv === 'sandbox'
    ? 'https://api.sandbox.freeagent.com'
    : 'https://api.freeagent.com';
}

document.getElementById('btn-connect-fa').addEventListener('click', () => {
  const id  = document.getElementById('fa-client-id').value.trim();
  const env = document.getElementById('fa-sandbox').value;
  if (!id) { toast('Enter your FreeAgent OAuth Identifier first', 'error'); return; }

  // Persist so the callback can find them after redirect
  state.settings.faClientId = id;
  state.settings.faEnv      = env;
  save('settings');

  const base = env === 'sandbox'
    ? 'https://api.sandbox.freeagent.com'
    : 'https://api.freeagent.com';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     id,
    redirect_uri:  FA_REDIRECT_URI,
    state:         'fa_oauth',
  });
  const url = `${base}/v2/approve_app?${params}`;
  toast('Redirecting to FreeAgent to authorise…', 'info');
  setTimeout(() => { window.location.href = url; }, 600);
});

// ─── MICROSOFT 365 OAUTH (PKCE) ───────────────
// Generates a code verifier + challenge, redirects to Microsoft login,
// catches the auth code on return, exchanges it for an access token.

async function generatePkceChallenge() {
  // Generate a random 43–128 char verifier
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const verifier = base64UrlEncode(array);
  // Hash it with SHA-256 to make the challenge
  const encoded = new TextEncoder().encode(verifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const challenge = base64UrlEncode(new Uint8Array(hashBuffer));
  return { verifier, challenge };
}

function base64UrlEncode(bytes) {
  let str = '';
  bytes.forEach(b => str += String.fromCharCode(b));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const MS_REDIRECT_URI = window.location.origin + window.location.pathname;
const MS_SCOPES = 'Calendars.ReadWrite offline_access User.Read';

document.getElementById('btn-connect-ms').addEventListener('click', async () => {
  const clientId = document.getElementById('ms-client-id').value.trim();
  const tenantId = document.getElementById('ms-tenant-id').value.trim();
  if (!clientId || !tenantId) {
    toast('Enter your Azure Client ID and Tenant ID first', 'error');
    return;
  }

  // Persist IDs so we can find them after the redirect
  state.settings.msClientId = clientId;
  state.settings.msTenantId = tenantId;
  save('settings');

  const { verifier, challenge } = await generatePkceChallenge();
  // Stash the verifier — we'll need it when the redirect returns
  sessionStorage.setItem('ph_ms_verifier', verifier);

  const params = new URLSearchParams({
    client_id:             clientId,
    response_type:         'code',
    redirect_uri:          MS_REDIRECT_URI,
    response_mode:         'query',
    scope:                 MS_SCOPES,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    state:                 'ms_oauth',
  });

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`;
  toast('Redirecting to Microsoft to authorise…', 'info');
  setTimeout(() => { window.location.href = url; }, 600);
});

// ─── HANDLE OAUTH CALLBACK ────────────────────
// Runs on every page load. If the URL has ?code=... we just came back
// from Microsoft and need to exchange the code for an access token.
async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code   = params.get('code');
  const stateP = params.get('state');
  const error  = params.get('error');

  if (error) {
    const desc = params.get('error_description') || error;
    toast('Microsoft sign-in failed: ' + decodeURIComponent(desc), 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  if (!code) return;

  if (stateP === 'ms_oauth') {
    await exchangeMsAuthCode(code);
  } else if (stateP === 'fa_oauth') {
    await exchangeFaAuthCode(code);
  }

  // Clean the URL so a refresh doesn't re-trigger the exchange
  window.history.replaceState({}, document.title, window.location.pathname);
}

async function exchangeMsAuthCode(code) {
  const s = state.settings;
  const verifier = sessionStorage.getItem('ph_ms_verifier');
  if (!s.msClientId || !s.msTenantId || !verifier) {
    toast('Microsoft auth state lost. Try Connect Microsoft 365 again.', 'error');
    return;
  }

  const body = new URLSearchParams({
    client_id:     s.msClientId,
    grant_type:    'authorization_code',
    code:          code,
    redirect_uri:  MS_REDIRECT_URI,
    code_verifier: verifier,
    scope:         MS_SCOPES,
  });

  try {
    const res = await fetch(`https://login.microsoftonline.com/${s.msTenantId}/oauth2/v2.0/token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[MS Token] Error:', data);
      toast('Microsoft token exchange failed: ' + (data.error_description || data.error || 'unknown'), 'error');
      return;
    }
    state.settings.msAccessToken  = data.access_token;
    state.settings.msRefreshToken = data.refresh_token;
    state.settings.msTokenExpiry  = Date.now() + (data.expires_in * 1000);
    save('settings');
    sessionStorage.removeItem('ph_ms_verifier');
    updateBadges();
    toast('Microsoft 365 connected successfully', 'success');
  } catch (err) {
    console.error('[MS Token] Network error:', err);
    toast('Network error connecting Microsoft 365', 'error');
  }
}

// ─── FREEAGENT TOKEN EXCHANGE (via Netlify Function) ──────────
async function exchangeFaAuthCode(code) {
  const s = state.settings;
  if (!s.faClientId) {
    toast('FreeAgent client not configured', 'error');
    return;
  }

  try {
    const res = await fetch('/.netlify/functions/freeagent-token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type:   'authorization_code',
        code:         code,
        client_id:    s.faClientId,
        redirect_uri: FA_REDIRECT_URI,
        env:          s.faEnv,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[FA Token] Error:', data);
      toast('FreeAgent token exchange failed: ' + (data.error_description || data.error || 'check Netlify function'), 'error');
      return;
    }
    state.settings.faAccessToken  = data.access_token;
    state.settings.faRefreshToken = data.refresh_token;
    state.settings.faTokenExpiry  = Date.now() + (data.expires_in * 1000);
    save('settings');
    updateBadges();
    toast('FreeAgent connected successfully', 'success');
  } catch (err) {
    console.error('[FA Token] Network error:', err);
    toast('Network error connecting FreeAgent', 'error');
  }
}

async function getFaAccessToken() {
  const s = state.settings;
  if (!s.faAccessToken) return null;
  if (s.faTokenExpiry && s.faTokenExpiry - Date.now() > 120000) {
    return s.faAccessToken;
  }
  if (!s.faRefreshToken) return null;

  try {
    const res = await fetch('/.netlify/functions/freeagent-token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type:    'refresh_token',
        refresh_token: s.faRefreshToken,
        client_id:     s.faClientId,
        env:           s.faEnv,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.warn('[FA Refresh] Failed:', data);
      return null;
    }
    state.settings.faAccessToken  = data.access_token;
    state.settings.faRefreshToken = data.refresh_token || s.faRefreshToken;
    state.settings.faTokenExpiry  = Date.now() + (data.expires_in * 1000);
    save('settings');
    return data.access_token;
  } catch (err) {
    console.error('[FA Refresh] Network error:', err);
    return null;
  }
}

// Refresh the MS access token if it's near expiry
async function getMsAccessToken() {
  const s = state.settings;
  if (!s.msAccessToken) return null;
  if (s.msTokenExpiry && s.msTokenExpiry - Date.now() > 120000) {
    return s.msAccessToken;
  }
  if (!s.msRefreshToken) return null;

  const body = new URLSearchParams({
    client_id:     s.msClientId,
    grant_type:    'refresh_token',
    refresh_token: s.msRefreshToken,
    scope:         MS_SCOPES,
  });

  try {
    const res = await fetch(`https://login.microsoftonline.com/${s.msTenantId}/oauth2/v2.0/token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });
    const data = await res.json();
    if (!res.ok) {
      console.warn('[MS Refresh] Failed:', data);
      return null;
    }
    state.settings.msAccessToken  = data.access_token;
    state.settings.msRefreshToken = data.refresh_token || s.msRefreshToken;
    state.settings.msTokenExpiry  = Date.now() + (data.expires_in * 1000);
    save('settings');
    return data.access_token;
  } catch (err) {
    console.error('[MS Refresh] Network error:', err);
    return null;
  }
}

function updateBadges() {
  const s = state.settings;
  const faBadge = document.getElementById('fa-badge');
  const msBadge = document.getElementById('ms-badge');
  // FA is truly connected only when we have an access token
  faBadge.classList.toggle('connected', !!s.faAccessToken);
  // MS is truly connected only when we have an access token
  msBadge.classList.toggle('connected', !!s.msAccessToken);
}

// ─── FREEAGENT SYNC (REAL) ────────────────────
async function syncFreeAgentContact(client) {
  const token = await getFaAccessToken();
  if (!token) {
    console.info('[FreeAgent] Not connected — skipping contact sync');
    return;
  }

  // Use the split first/last name fields directly
  const firstName = client.contactFirstName || '';
  const lastName  = client.contactLastName || '';

  const body = {
    contact: {
      organisation_name: client.companyName,
      first_name:        firstName,
      last_name:         lastName,
      email:             client.email || '',
      phone_number:      client.phone || '',
      uses_contact_invoice_sequence: true,
    },
  };

  try {
    const res = await fetch(`${faApiBase()}/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[FA Contact] Failed:', err);
      toast('Could not create FreeAgent contact', 'error');
      return;
    }
    const data = await res.json();
    const faUrl = data.contact && data.contact.url;
    if (faUrl) {
      // Store the FA URL on the local client so we can link work/invoices to it
      const idx = state.clients.findIndex(c => c.id === client.id);
      if (idx >= 0) {
        state.clients[idx].faContactUrl = faUrl;
        save('clients');
      }
    }
    console.info('[FA] Contact created:', faUrl);
    toast('Added to FreeAgent contacts', 'success');
  } catch (err) {
    console.error('[FA Contact] Network error:', err);
    toast('Network error creating FreeAgent contact', 'error');
  }
}

async function syncFreeAgentTimeEntry(work) {
  const token = await getFaAccessToken();
  if (!token) return;

  const client = state.clients.find(c => c.id === work.clientId);
  if (!client || !client.faContactUrl) {
    console.info('[FA Timeslip] Client has no FreeAgent contact yet — skipping');
    return;
  }

  // FreeAgent timeslips require a project. We don't model projects in
  // Pathed Hub, so we skip auto-creating timeslips and instead let the
  // invoice carry the work. A future enhancement could create a default
  // project per client.
  console.info('[FA Timeslip] Skipping (no project model in Pathed Hub yet)');
}

async function syncFreeAgentInvoice(inv, client) {
  const token = await getFaAccessToken();
  if (!token) {
    console.info('[FreeAgent] Not connected — invoice not pushed');
    return;
  }
  if (!client.faContactUrl) {
    toast('Client not yet synced to FreeAgent — cannot create invoice', 'error');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const quantity = inv.duration === 'Half Day' ? 0.5 : 1;

  const body = {
    invoice: {
      contact:                 client.faContactUrl,
      dated_on:                today,
      payment_terms_in_days:   30,
      currency:                'GBP',
      invoice_items: [
        {
          description: `${inv.workType} (${inv.duration})`,
          quantity:    quantity,
          price:       parseFloat(inv.amount) / quantity,
          item_type:   'Days',
        },
      ],
    },
  };

  try {
    const res = await fetch(`${faApiBase()}/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[FA Invoice] Failed:', err);
      toast('Could not create FreeAgent invoice', 'error');
      return;
    }
    const data = await res.json();
    console.info('[FA] Invoice created:', data.invoice && data.invoice.url);
    toast('Draft invoice created in FreeAgent', 'success');
  } catch (err) {
    console.error('[FA Invoice] Network error:', err);
    toast('Network error creating FreeAgent invoice', 'error');
  }
}

// ─── OUTLOOK SYNC (REAL) ──────────────────────
async function syncOutlookCalendar(work) {
  const token = await getMsAccessToken();
  if (!token) {
    console.info('[Outlook] Not connected — skipping calendar sync');
    return;
  }

  const client = state.clients.find(c => c.id === work.clientId);
  const clientName = client ? client.companyName : 'Client';

  // Build start/end times. Default: 09:00 start.
  // Full Day = 8 hours, Half Day = 4 hours.
  const hours = work.duration === 'Half Day' ? 4 : 8;
  const startISO = `${work.date}T09:00:00`;
  const end = new Date(`${work.date}T09:00:00`);
  end.setHours(end.getHours() + hours);
  const endISO = end.toISOString().slice(0, 19);

  // Best guess at user timezone
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';

  const event = {
    subject: `${clientName} — ${work.workType}`,
    body: {
      contentType: 'HTML',
      content: `
        <p><strong>Client:</strong> ${clientName}</p>
        <p><strong>Work:</strong> ${work.workType}</p>
        <p><strong>Duration:</strong> ${work.duration}</p>
        <p><strong>Rate:</strong> £${work.confirmedRate}</p>
        ${work.notes ? `<p><strong>Notes:</strong> ${work.notes}</p>` : ''}
        <hr><p><em>Logged via Pathed Hub</em></p>
      `.trim(),
    },
    start:    { dateTime: startISO, timeZone: tz },
    end:      { dateTime: endISO,   timeZone: tz },
    location: { displayName: work.location || '' },
    showAs:   'busy',
  };

  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[Outlook] Event creation failed:', err);
      toast('Could not create Outlook event', 'error');
      return;
    }
    const created = await res.json();
    console.info('[Outlook] Event created:', created.id);
    toast('Added to your Outlook calendar', 'success');
  } catch (err) {
    console.error('[Outlook] Network error:', err);
    toast('Network error creating Outlook event', 'error');
  }
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
handleOAuthCallback();
