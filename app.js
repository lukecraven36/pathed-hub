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

  const confirmBtn = document.getElementById('modal-confirm');
  const originalLabel = confirmBtn.textContent;
  confirmBtn.onclick = async () => {
    if (confirmBtn.disabled) return;
    confirmBtn.disabled = true;
    confirmBtn.classList.add('btn-saving');
    confirmBtn.textContent = 'Saving…';
    try {
      const result = await Promise.resolve(onConfirm());
      if (result) {
        confirmBtn.textContent = 'Saved ✓';
        // Brief pause so the user actually sees the success state
        setTimeout(closeModal, 350);
      } else {
        // Validation failed — restore button so user can try again
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('btn-saving');
        confirmBtn.textContent = originalLabel;
      }
    } catch (err) {
      console.error('[Modal Save] Error:', err);
      confirmBtn.disabled = false;
      confirmBtn.classList.remove('btn-saving');
      confirmBtn.textContent = originalLabel;
    }
  };

  // If a SoW editor div is present, boot Quill on it
  if (document.getElementById('wf-sow-editor') && typeof window.initSowEditor === 'function') {
    setTimeout(window.initSowEditor, 50);
  }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  // Clean up wide modal class + Quill instance
  const modal = document.getElementById('modal');
  if (modal) modal.classList.remove('modal-wide');
  if (window._sowQuill) {
    window._sowQuill = null;
  }
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
    const work = { id: uid(), sowRef: nextSowRef(), ...data };
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

// Auto-incrementing SoW reference: SOW-YYYY-NNN
function nextSowRef() {
  const year = new Date().getFullYear();
  const existing = state.work
    .map(w => w.sowRef || '')
    .filter(r => r.startsWith(`SOW-${year}-`))
    .map(r => parseInt(r.slice(`SOW-${year}-`.length), 10))
    .filter(n => !isNaN(n));
  const next = (existing.length ? Math.max(...existing) : 0) + 1;
  return `SOW-${year}-${String(next).padStart(3, '0')}`;
}

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

  // Default SoW template if none yet — gives the user a structured starting point
  const defaultSow = `<h3>Background</h3><p>Describe the client context and what's driving this engagement.</p><h3>Scope of work</h3><p>What will be delivered. Be specific.</p><h3>Deliverables</h3><ul><li>Item one</li><li>Item two</li></ul><h3>Out of scope</h3><p>What this engagement does <em>not</em> cover.</p><h3>Timeline</h3><p>Key dates and milestones.</p><h3>Acceptance criteria</h3><p>What does &ldquo;done&rdquo; look like?</p>`;

  // Use existing SoW HTML if present, otherwise template
  const sowHtml = (w.sow && w.sow.trim()) ? w.sow : defaultSow;
  // Mark the modal as wide so the editor has room
  setTimeout(() => {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.add('modal-wide');
  }, 0);

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
        <label>Internal Notes</label>
        <input type="text" id="wf-notes" value="${w.notes || ''}" placeholder="For your eyes only (not in SoW)" />
      </div>
    </div>

    <div class="sow-section">
      <div class="sow-section-header">
        <div>
          <label class="sow-label">Statement of Work</label>
          <p class="sow-hint">Client-facing content. This will appear in the generated SoW PDF.</p>
        </div>
        ${w.id ? `<button type="button" class="btn-secondary btn-sm" onclick="generateSowPdf('${w.id}')">Generate SoW PDF</button>` : ''}
      </div>
      <div id="wf-sow-editor" class="sow-editor">${sowHtml}</div>
    </div>
  `;
}

// Initialise the Quill editor lazily after the modal renders.
// Quill is loaded from CDN in index.html. We attach it to #wf-sow-editor.
window.initSowEditor = function() {
  if (typeof Quill === 'undefined') return;
  const el = document.getElementById('wf-sow-editor');
  if (!el || el.classList.contains('ql-container')) return;

  // Move the existing HTML content into a "load" var, then clear and let Quill reinitialise
  const initialHtml = el.innerHTML;
  el.innerHTML = '';

  window._sowQuill = new Quill('#wf-sow-editor', {
    theme: 'snow',
    placeholder: 'Write the Statement of Work…',
    modules: {
      toolbar: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['clean'],
      ],
    },
  });

  // Populate Quill with the existing content
  if (initialHtml) {
    window._sowQuill.clipboard.dangerouslyPasteHTML(initialHtml);
  }
};

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
  // Read SoW HTML from Quill (or fall back to whatever's in the div)
  let sowHtml = '';
  if (window._sowQuill) {
    sowHtml = window._sowQuill.root.innerHTML;
  } else {
    const el = document.getElementById('wf-sow-editor');
    if (el) sowHtml = el.innerHTML;
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
    sow:           sowHtml,
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

      // SoW buttons available on every card
      const sowButtons = `
        <button class="btn-sm" onclick="generateSowPdf('${w.id}')" title="Generate SoW PDF">SoW PDF</button>
        <button class="btn-sm" onclick="emailSowToClient('${w.id}')" title="Email SoW to client">Email</button>`;

      return `
        <div class="pipeline-card">
          <div class="pipeline-card-client">${client ? client.companyName : 'Unknown'}</div>
          <div class="pipeline-card-desc">${w.workType}</div>
          <div class="pipeline-card-meta">
            <span>${formatDate(w.date)} · ${w.duration}</span>
            <span class="pipeline-card-value">£${parseFloat(w.confirmedRate).toLocaleString('en-GB')}</span>
          </div>
          <div class="pipeline-card-actions">${sowButtons}${extraBtn}</div>
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
  const ptEl = document.getElementById('biz-payment-terms');
  if (ptEl && s.paymentTermsDays) ptEl.value = s.paymentTermsDays;
  updateBadges();
}

document.getElementById('btn-save-settings').addEventListener('click', () => {
  state.settings = {
    ...state.settings,  // preserve OAuth tokens
    faClientId:     document.getElementById('fa-client-id').value.trim(),
    faClientSecret: document.getElementById('fa-client-secret').value.trim(),
    faEnv:          document.getElementById('fa-sandbox').value,
    msClientId:     document.getElementById('ms-client-id').value.trim(),
    msTenantId:     document.getElementById('ms-tenant-id').value.trim(),
    bizName:        document.getElementById('biz-name').value.trim(),
    bizEmail:       document.getElementById('biz-email').value.trim(),
    bizVat:         document.getElementById('biz-vat').value.trim(),
    bizRate:        document.getElementById('biz-rate').value.trim(),
    paymentTermsDays: parseInt(document.getElementById('biz-payment-terms')?.value || '30', 10) || 30,
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

// ─── SOW PDF GENERATION ───────────────────────
// Generates a Pathed-branded PDF Statement of Work using pdf-lib.
// Loaded from CDN in index.html as a global PDFLib.

async function generateSowPdf(workId) {
  const work = state.work.find(w => w.id === workId);
  if (!work) { toast('Work entry not found', 'error'); return; }
  const client = state.clients.find(c => c.id === work.clientId);
  if (!client) { toast('Client not found', 'error'); return; }

  if (typeof PDFLib === 'undefined') {
    toast('PDF library still loading — try again in a moment', 'error');
    return;
  }

  // Save the work first so the SoW content is current. If the form's open,
  // pull the live HTML; otherwise use what's saved.
  let sowHtml = work.sow || '';
  if (window._sowQuill && document.getElementById('wf-sow-editor')) {
    sowHtml = window._sowQuill.root.innerHTML;
    work.sow = sowHtml;
    save('work');
  }
  // Ensure a SoW reference exists (for backfilled work entries)
  if (!work.sowRef) {
    work.sowRef = nextSowRef();
    save('work');
  }

  try {
    await renderSowPdf(work, client, sowHtml);
    toast('SoW PDF downloaded', 'success');
  } catch (err) {
    console.error('[SoW PDF] Failed:', err);
    toast('Could not generate SoW PDF', 'error');
  }
}
window.generateSowPdf = generateSowPdf;

// Cache for embedded font bytes — fetch once per session
const _fontBytesCache = {};

async function loadFontBytes(url) {
  if (_fontBytesCache[url]) return _fontBytesCache[url];
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = await res.arrayBuffer();
    _fontBytesCache[url] = bytes;
    return bytes;
  } catch (err) {
    console.warn('[Fonts] Failed to load', url, err);
    return null;
  }
}

async function renderSowPdf(work, client, sowHtml) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const doc = await PDFDocument.create();
  doc.setTitle(`Statement of Work — ${client.companyName}`);
  doc.setAuthor(state.settings.bizName || 'Pathed Consulting');
  doc.setCreator('Pathed Hub');

  // Try to embed real Pathed brand fonts. Fall back to Helvetica if fonts
  // can't be loaded (offline, CDN blocked, etc) so the PDF still works.
  let bodyFont, bodyBoldFont, bodyItalicFont, displayFont;
  const fontkitAvailable = (typeof fontkit !== 'undefined');
  if (fontkitAvailable) {
    doc.registerFontkit(fontkit);
  }

  const fontUrls = {
    bodyRegular: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf',
    bodyBold:    'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-600-normal.ttf',
    bodyItalic:  'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-italic.ttf',
    display:     'https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk@latest/latin-600-normal.ttf',
  };

  if (fontkitAvailable) {
    const [b, bb, bi, d] = await Promise.all([
      loadFontBytes(fontUrls.bodyRegular),
      loadFontBytes(fontUrls.bodyBold),
      loadFontBytes(fontUrls.bodyItalic),
      loadFontBytes(fontUrls.display),
    ]);
    try {
      if (b)  bodyFont       = await doc.embedFont(b);
      if (bb) bodyBoldFont   = await doc.embedFont(bb);
      if (bi) bodyItalicFont = await doc.embedFont(bi);
      if (d)  displayFont    = await doc.embedFont(d);
    } catch (err) {
      console.warn('[Fonts] Embed failed, falling back to Helvetica:', err);
    }
  }

  // Helvetica fallback for any fonts that didn't load
  const helv     = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helvOb   = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Final font assignments — Inter for body, Space Grotesk for display
  const body    = bodyFont       || helv;
  const bodyB   = bodyBoldFont   || helvBold;
  const bodyI   = bodyItalicFont || helvOb;
  const display = displayFont    || helvBold;

  // If we got real TTF fonts, they support Unicode — no need to strip smart
  // quotes, em dashes, arrows, etc. Only sanitise on Helvetica fallback.
  const usingRealFonts = !!(bodyFont && bodyBoldFont && displayFont);
  const safeText = (txt) => usingRealFonts
    ? String(txt == null ? '' : txt)
    : sanitiseForPdf(String(txt == null ? '' : txt));

  // Pathed brand colours (converted from HSL to RGB)
  const C = {
    deep:    rgb(0.039, 0.039, 0.122),  // Surface Deep
    card:    rgb(0.086, 0.086, 0.169),  // Surface Card
    fore:    rgb(0.949, 0.949, 0.961),  // Brand Fore
    mute:    rgb(0.671, 0.671, 0.722),  // Brand Mute
    purple:  rgb(0.659, 0.333, 0.969),  // Primary
    cyan:    rgb(0.310, 0.765, 0.969),  // Brand Cyan
    teal:    rgb(0.204, 0.847, 0.690),  // Brand Teal
    border:  rgb(0.176, 0.141, 0.322),  // Border
    text:    rgb(0.12, 0.12, 0.16),     // Dark text for light pages
    textMute:rgb(0.40, 0.40, 0.45),
    bgLight: rgb(0.98, 0.98, 0.99),
    lineLight: rgb(0.88, 0.88, 0.92),
  };

  // A4 portrait
  const W = 595.28, H = 841.89;
  const MARGIN = 56;
  let page = doc.addPage([W, H]);

  // ── Cover band (top 140px) ────────────────────
  page.drawRectangle({ x: 0, y: H - 140, width: W, height: 140, color: C.deep });

  // Aurora-ish accents using overlapping ellipses
  page.drawEllipse({ x: 0,      y: H - 80,  xScale: 220, yScale: 110, color: C.purple, opacity: 0.22 });
  page.drawEllipse({ x: W * 0.6, y: H - 130, xScale: 180, yScale: 90,  color: C.cyan,   opacity: 0.14 });
  page.drawEllipse({ x: W,      y: H - 40,  xScale: 200, yScale: 80,  color: C.teal,   opacity: 0.18 });

  // Helper to draw text safely (sanitised only when falling back to Helvetica)
  const t = safeText;

  // Logo mark — two dots + wordmark (Space Grotesk)
  page.drawCircle({ x: MARGIN,        y: H - 56, size: 4, color: C.cyan });
  page.drawText(t('Pathed'), {
    x: MARGIN + 12, y: H - 62, size: 18, font: display, color: C.fore,
  });
  page.drawCircle({ x: MARGIN + 76, y: H - 50, size: 4, color: C.teal });
  page.drawText(t('C O N S U L T I N G'), {
    x: MARGIN + 12, y: H - 76, size: 6.5, font: body, color: C.mute,
    characterSpacing: 1.2,
  });

  // Document title
  page.drawText(t('STATEMENT OF WORK'), {
    x: MARGIN, y: H - 105, size: 10, font: bodyB, color: C.cyan,
    characterSpacing: 2.5,
  });
  page.drawText(t(client.companyName), {
    x: MARGIN, y: H - 128, size: 22, font: display, color: C.fore,
  });

  // Right side: ref + date
  const refText = work.sowRef || nextSowRef();
  const dateText = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  page.drawText(t('REFERENCE'), {
    x: W - MARGIN - 130, y: H - 50, size: 7, font: bodyB, color: C.mute, characterSpacing: 1.5,
  });
  page.drawText(t(refText), {
    x: W - MARGIN - 130, y: H - 65, size: 11, font: bodyB, color: C.fore,
  });
  page.drawText(t('ISSUED'), {
    x: W - MARGIN - 130, y: H - 90, size: 7, font: bodyB, color: C.mute, characterSpacing: 1.5,
  });
  page.drawText(t(dateText), {
    x: W - MARGIN - 130, y: H - 105, size: 11, font: body, color: C.fore,
  });

  // ── Body ──────────────────────────────────────
  let y = H - 180;
  const drawSectionHeader = (text) => {
    page.drawText(t(text.toUpperCase()), {
      x: MARGIN, y, size: 8.5, font: bodyB, color: C.purple, characterSpacing: 1.5,
    });
    y -= 8;
    page.drawLine({
      start: { x: MARGIN, y },
      end:   { x: W - MARGIN, y },
      thickness: 0.5, color: C.lineLight,
    });
    y -= 18;
  };

  // Parties block — two columns
  drawSectionHeader('Parties');
  const colW = (W - MARGIN * 2 - 24) / 2;
  const colX1 = MARGIN;
  const colX2 = MARGIN + colW + 24;

  const drawParty = (x, heading, lines) => {
    let yy = y;
    page.drawText(t(heading), { x, y: yy, size: 9, font: bodyB, color: C.textMute });
    yy -= 14;
    lines.forEach(line => {
      if (!line) return;
      page.drawText(t(line), { x, y: yy, size: 10, font: body, color: C.text });
      yy -= 13;
    });
    return yy;
  };

  const supplierLines = [
    state.settings.bizName || 'Pathed Consulting',
    state.settings.bizEmail || 'hello@pathedconsulting.co.uk',
    'pathedconsulting.co.uk',
  ];
  const clientLines = [
    client.companyName,
    `${client.contactFirstName || ''} ${client.contactLastName || ''}`.trim(),
    client.email || '',
    client.billingAddress || '',
  ].filter(Boolean);

  const y1 = drawParty(colX1, 'SUPPLIER', supplierLines);
  const y2 = drawParty(colX2, 'CLIENT',   clientLines);
  y = Math.min(y1, y2) - 18;

  // Engagement summary — four small stat-like fields
  drawSectionHeader('Engagement');
  const summaryItems = [
    { label: 'Work',     value: work.workType },
    { label: 'Date',     value: formatDate(work.date) },
    { label: 'Duration', value: work.duration },
    { label: 'Location', value: work.location || 'Remote' },
  ];
  const cellW = (W - MARGIN * 2 - 36) / 4;
  summaryItems.forEach((item, i) => {
    const cx = MARGIN + (cellW + 12) * i;
    page.drawText(t(item.label.toUpperCase()), {
      x: cx, y, size: 7, font: bodyB, color: C.textMute, characterSpacing: 1.2,
    });
    page.drawText(t(item.value || '-'), {
      x: cx, y: y - 14, size: 10.5, font: bodyB, color: C.text,
    });
  });
  y -= 38;

  // Scope of work — rendered from SoW HTML
  drawSectionHeader('Scope of Work');
  y = renderSowContent(page, doc, body, bodyB, bodyI, sowHtml, MARGIN, y, W - MARGIN * 2, C, safeText);
  y -= 10;

  // Commercials
  if (y < 200) { page = doc.addPage([W, H]); y = H - MARGIN; }
  drawSectionHeader('Commercials');
  const days = work.duration === 'Half Day' ? 0.5 : 1;
  const total = days * (work.confirmedRate || 0);
  const rows = [
    ['Day rate',         `£${(work.confirmedRate || 0).toLocaleString('en-GB')}`],
    ['Duration',         `${days} ${days === 1 ? 'day' : 'days'}`],
    ['Total',            `£${total.toLocaleString('en-GB')}`],
    ['Payment terms',    `${state.settings.paymentTermsDays || 30} days net`],
    ['Invoicing',        'Issued via FreeAgent on completion'],
  ];
  rows.forEach((row, i) => {
    const isTotal = row[0] === 'Total';
    page.drawText(t(row[0]), { x: MARGIN, y, size: 10, font: isTotal ? bodyB : body, color: C.text });
    const sanitisedVal = t(row[1]);
    const valW = bodyB.widthOfTextAtSize(sanitisedVal, 10.5);
    page.drawText(sanitisedVal, {
      x: W - MARGIN - valW, y, size: isTotal ? 11 : 10,
      font: bodyB, color: isTotal ? C.purple : C.text,
    });
    y -= 18;
    if (isTotal) {
      page.drawLine({
        start: { x: MARGIN, y: y + 6 },
        end:   { x: W - MARGIN, y: y + 6 },
        thickness: 0.5, color: C.lineLight,
      });
      y -= 4;
    }
  });
  y -= 10;

  // Approval
  if (y < 140) { page = doc.addPage([W, H]); y = H - MARGIN; }
  drawSectionHeader('Approval');
  const approvalLines = [
    'By return email to the address above, please confirm acceptance of this Statement of Work.',
    'Work will commence on the agreed start date once acceptance has been received.',
  ];
  approvalLines.forEach(line => {
    const wrapped = wrapText(t(line), body, 10.5, W - MARGIN * 2);
    wrapped.forEach(l => {
      page.drawText(l, { x: MARGIN, y, size: 10.5, font: body, color: C.text });
      y -= 15;
    });
    y -= 4;
  });

  // Footer on every page
  doc.getPages().forEach((p, i) => {
    p.drawLine({
      start: { x: MARGIN, y: 48 },
      end:   { x: W - MARGIN, y: 48 },
      thickness: 0.5, color: C.lineLight,
    });
    p.drawText(t(`${state.settings.bizName || 'Pathed Consulting'} - Bridging data engineering and enterprise revenue`), {
      x: MARGIN, y: 32, size: 8, font: body, color: C.textMute,
    });
    const pageNum = `${i + 1} / ${doc.getPageCount()}`;
    const pnW = body.widthOfTextAtSize(pageNum, 8);
    p.drawText(pageNum, { x: W - MARGIN - pnW, y: 32, size: 8, font: body, color: C.textMute });
  });

  // Download
  const bytes = await doc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeClient = client.companyName.replace(/[^a-z0-9]+/gi, '-');
  a.href = url;
  a.download = `${work.sowRef || 'SOW'}-${safeClient}.pdf`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);

  // Store the last-generated PDF blob and metadata so we can also offer
  // "Email to client" without re-rendering
  window._lastSowPdf = {
    blob, fileName: a.download, work, client,
  };
}

// Replace Unicode chars not in WinAnsi (which pdf-lib's standard fonts use)
function sanitiseForPdf(text) {
  if (!text) return '';
  return text
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")   // smart single quotes → '
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')   // smart double quotes → "
    .replace(/[\u2013\u2014]/g, '-')                // en/em dash → -
    .replace(/\u2026/g, '...')                      // ellipsis → ...
    .replace(/\u2022/g, '*')                        // bullet
    .replace(/[\u00A0]/g, ' ')                      // non-breaking space → space
    .replace(/\u2192/g, '->')                       // right arrow → ->
    .replace(/[^\x00-\xFF]/g, '');                  // strip remaining non-WinAnsi
}

// Word-wrap helper
function wrapText(text, font, size, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Render SoW HTML content. We do a lightweight HTML-to-PDF translation:
// h2/h3 → bold heading, p → paragraph, ul/ol → bulleted/numbered list,
// strong/em → inline weight/style. No tables or images.
function renderSowContent(page, doc, helv, helvBold, helvOb, html, x, startY, maxWidth, C, safeText) {
  let y = startY;
  const lineHeight = 14;
  const paraGap    = 8;
  const headingGap = 12;
  // Use the caller's safeText if provided (handles Helvetica fallback);
  // otherwise sanitise unconditionally (safe default).
  const clean = safeText || ((s) => sanitiseForPdf(String(s == null ? '' : s)));

  // Parse the HTML into a temporary DOM
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html || '';

  const newPageIfNeeded = (needed = lineHeight) => {
    if (y - needed < 80) {
      page = doc.addPage([page.getWidth(), page.getHeight()]);
      y = page.getHeight() - 56;
    }
  };

  const drawWrappedLine = (text, font, size, color, indent = 0) => {
    const cleaned = clean(text);
    const lines = wrapText(cleaned, font, size, maxWidth - indent);
    lines.forEach(line => {
      newPageIfNeeded(lineHeight);
      page.drawText(line, { x: x + indent, y, size, font, color });
      y -= lineHeight;
    });
  };

  // Extract plain text and basic structure from each block element
  const blocks = Array.from(wrapper.children);
  blocks.forEach(block => {
    const tag = block.tagName.toLowerCase();
    const text = (block.textContent || '').trim();
    if (!text && tag !== 'ul' && tag !== 'ol') return;

    if (tag === 'h2' || tag === 'h3') {
      newPageIfNeeded(lineHeight + headingGap);
      y -= 4;
      drawWrappedLine(text, helvBold, tag === 'h2' ? 12 : 11, C.text);
      y -= 4;
    } else if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(block.querySelectorAll('li'));
      items.forEach((li, i) => {
        newPageIfNeeded(lineHeight);
        if (tag === 'ol') {
          page.drawText(`${i + 1}.`, { x: x + 4, y, size: 10.5, font: helv, color: C.text });
        } else {
          // Draw a small filled circle as a bullet — avoids font encoding issues
          page.drawCircle({ x: x + 8, y: y + 3, size: 1.6, color: C.purple });
        }
        drawWrappedLine((li.textContent || '').trim(), helv, 10.5, C.text, 20);
        y -= 2;
      });
      y -= paraGap - 2;
    } else {
      // Treat as paragraph
      drawWrappedLine(text, helv, 10.5, C.text);
      y -= paraGap;
    }
  });

  return y;
}

// ─── EMAIL SOW TO CLIENT ──────────────────────
window.emailSowToClient = function(workId) {
  const work = state.work.find(w => w.id === workId);
  if (!work) { toast('Work entry not found', 'error'); return; }
  const client = state.clients.find(c => c.id === work.clientId);
  if (!client || !client.email) {
    toast('Client has no email address', 'error');
    return;
  }

  const supplier = state.settings.bizName || 'Pathed Consulting';
  const sender   = state.settings.bizEmail || '';
  const ref      = work.sowRef || 'SOW';
  const subject  = `Statement of Work — ${work.workType} (${ref})`;
  const greeting = client.contactFirstName ? `Hi ${client.contactFirstName},` : 'Hello,';
  const body = [
    greeting,
    '',
    `Please find attached the Statement of Work for the upcoming engagement: ${work.workType}.`,
    '',
    `Reference: ${ref}`,
    `Date: ${formatDate(work.date)}`,
    `Duration: ${work.duration}`,
    '',
    'Could you reply to confirm acceptance? Once received, I’ll schedule the work and send the invoice via FreeAgent on completion.',
    '',
    'Any questions, just let me know.',
    '',
    'Best,',
    sender ? `${supplier} · ${sender}` : supplier,
  ].join('\n');

  const mailto = `mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
  toast('Opening email — remember to attach the SoW PDF', 'info');
};

// ─── INIT ─────────────────────────────────────
renderDashboard();
updateBadges();
handleOAuthCallback();
