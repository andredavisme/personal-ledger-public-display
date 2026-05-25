/**
 * admin.js — Administration Page
 *
 * AUTH: Gated via auth.js (Netlify Identity). Invite-only instance — any
 * authenticated user is an authorized admin. See auth.js migration guide.
 *
 * DATA: Uses the shared supabase.js client (same as intake.js) to ensure
 * consistent schema routing. Queries ledger.submissions_with_collision,
 * ledger.correction_reasons, and child tables.
 */

import Auth from './auth.js';
import supabase from './supabase.js';

// ─── Auth Gate ────────────────────────────────────────────────────────────────
const authGate  = document.getElementById('auth-gate');
const adminUI   = document.getElementById('admin-ui');
const loginBtn  = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

Auth.onChange(user => {
  if (Auth.isAdmin()) {
    authGate.style.display = 'none';
    adminUI.style.display  = 'block';
    loadAll();
  } else {
    authGate.style.display = 'flex';
    adminUI.style.display  = 'none';
  }
});

loginBtn.addEventListener('click',  () => Auth.login());
logoutBtn.addEventListener('click', () => Auth.logout());
Auth.initAuth();

// ─── State ────────────────────────────────────────────────────────────────────
let correctionReasons = [];
let submissions       = [];

// ─── Load All Data ────────────────────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadReasons(), loadSubmissions()]);
  renderReasonsManager();
  renderPendingSubmissions();
}

// ─── Correction Reasons ──────────────────────────────────────────────────────
async function loadReasons() {
  const { data, error } = await supabase
    .schema('ledger')
    .from('correction_reasons')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) { console.error('[admin] loadReasons:', error); return; }
  correctionReasons = data || [];
}

async function saveReason(reason) {
  const { error } = await supabase
    .schema('ledger')
    .from('correction_reasons')
    .upsert(reason, { onConflict: 'id' });
  if (error) console.error('[admin] saveReason:', error);
}

async function addReason(label, description) {
  const maxOrder = correctionReasons.reduce((m, r) => Math.max(m, r.sort_order || 0), 0);
  const { data, error } = await supabase
    .schema('ledger')
    .from('correction_reasons')
    .insert({ label, description, active: true, sort_order: maxOrder + 1 })
    .select()
    .single();
  if (error) { console.error('[admin] addReason:', error); return; }
  correctionReasons.push(data);
}

// ─── Submissions ─────────────────────────────────────────────────────────────
async function loadSubmissions() {
  const { data, error } = await supabase
    .schema('ledger')
    .from('submissions_with_collision')
    .select('*')
    .in('status', ['pending'])
    .order('submitted_at', { ascending: true });
  if (error) { console.error('[admin] loadSubmissions:', error); return; }

  const rows = data || [];
  await Promise.all(rows.map(async s => {
    const [{ data: financials }, { data: budget }, { data: donations }] = await Promise.all([
      supabase.schema('ledger').from('submission_financials').select('*').eq('submission_id', s.id).order('sort_order'),
      supabase.schema('ledger').from('submission_budget').select('*').eq('submission_id', s.id).order('sort_order'),
      supabase.schema('ledger').from('submission_donations').select('*').eq('submission_id', s.id).order('sort_order'),
    ]);
    s.financials = financials || [];
    s.budget     = budget     || [];
    s.donations  = donations  || [];
  }));

  submissions = rows;
}

async function approveSubmission(id) {
  const { error } = await supabase
    .schema('ledger')
    .from('submissions')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { showToast('Approval failed: ' + error.message, 'error'); return; }
  showToast('Submission approved and queued for publication.', 'success');
  await loadSubmissions();
  renderPendingSubmissions();
}

async function rejectSubmission(id, reasonIds, notes) {
  const { error } = await supabase
    .schema('ledger')
    .from('submissions')
    .update({
      status: 'rejected',
      rejection_reason_ids: reasonIds,
      rejection_notes: notes || null,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', id);
  if (error) { showToast('Rejection failed: ' + error.message, 'error'); return; }
  showToast('Submission rejected. Notification queued.', 'success');
  await loadSubmissions();
  renderPendingSubmissions();
}

async function linkSubmissions(sourceId, targetRef) {
  const { error } = await supabase
    .schema('ledger')
    .from('submissions')
    .update({ linked_reference: targetRef })
    .eq('id', sourceId);
  if (error) { showToast('Link failed: ' + error.message, 'error'); return; }
  showToast('Submissions linked successfully.', 'success');
  await loadSubmissions();
  renderPendingSubmissions();
}

// ─── CSV Table Renderer ───────────────────────────────────────────────────────
function renderCSVTable(rows) {
  if (!rows || rows.length === 0) return '<p class="field-hint">No data provided.</p>';
  const headers = Object.keys(rows[0]).filter(h => !['id','submission_id','sort_order'].includes(h));
  const headerRow = headers.map(h => `<th>${h.replace(/_/g, ' ')}</th>`).join('');
  const dataRows  = rows.map(row =>
    `<tr>${headers.map(h => `<td>${row[h] ?? '<span class="empty">—</span>'}</td>`).join('')}</tr>`
  ).join('');
  return `
    <div class="csv-table-wrap">
      <table class="csv-table">
        <thead><tr>${headerRow}</tr></thead>
        <tbody>${dataRows}</tbody>
      </table>
    </div>`;
}

// ─── Collision Alert Banner ──────────────────────────────────────────────────
function buildCollisionBanner(s) {
  if (!s.reference_collision) return '';
  const siblings = submissions
    .filter(x => x.submitter_reference === s.submitter_reference && x.id !== s.id)
    .map(x => `<strong>${x.community_name || x.id}</strong>`)
    .join(', ');
  return `
    <div class="notice notice--warning collision-banner">
      <strong>⚠ Duplicate Reference Detected</strong>
      <p>Reference <code>${escHtml(s.submitter_reference)}</code> also appears on: ${siblings || 'another submission'}.
      Use the <em>Link Records</em> panel below to associate these submissions, or treat as separate.</p>
    </div>`;
}

// ─── Link Records Panel ──────────────────────────────────────────────────────
function buildLinkPanel(s) {
  const otherRefs = [...new Set(
    submissions
      .filter(x => x.id !== s.id)
      .map(x => x.submitter_reference)
      .filter(Boolean)
  )];
  const options = otherRefs.map(r =>
    `<option value="${escHtml(r)}">${escHtml(r)}</option>`
  ).join('');
  const currentLink = s.linked_reference
    ? `<p class="field-hint">Currently linked to: <code>${escHtml(s.linked_reference)}</code></p>`
    : '';
  return `
    <details class="link-records-panel">
      <summary><strong>Link Records</strong> <span class="field-hint">Admin discretion</span></summary>
      ${currentLink}
      <p class="field-hint">Associate this submission with another by choosing its reference ID. Logged for audit purposes only — does not merge or auto-approve either record.</p>
      <div class="link-records-controls">
        <select id="link-target-${s.id}" class="link-select">
          <option value="">— Select a reference to link —</option>
          ${options}
        </select>
        <button type="button" class="btn btn--small btn--secondary" data-link="${s.id}">Save Link</button>
      </div>
    </details>`;
}

// ─── Submission Renderer ──────────────────────────────────────────────────────
const submissionsContainer = document.getElementById('pending-submissions');

function renderPendingSubmissions() {
  submissionsContainer.innerHTML = '';

  if (submissions.length === 0) {
    submissionsContainer.innerHTML = `<div class="empty-state"><p>No pending submissions at this time.</p></div>`;
    return;
  }

  submissions.forEach(s => {
    const financials = s.financials || [];
    const budget     = s.budget     || [];
    const donations  = s.donations  || [];

    const card = document.createElement('article');
    card.className = 'submission-card' + (s.reference_collision ? ' submission-card--collision' : '');
    card.dataset.submissionId = s.id;

    card.innerHTML = `
      <div class="submission-card__header">
        <div>
          <h4>${escHtml(s.community_name || '—')}</h4>
          <p>
            ${escHtml(s.full_name || '—')} &middot;
            ${escHtml(s.email || '—')} &middot;
            ${escHtml(s.location || '—')} &middot;
            Submitted: ${formatDate(s.submitted_at)}
          </p>
          <p class="submission-ref">
            Reference ID: <code>${escHtml(s.submitter_reference || '—')}</code>
            ${s.reference_collision ? '<span class="badge badge--collision">⚠ Collision</span>' : ''}
          </p>
        </div>
        <span class="badge badge--required">${escHtml(s.status)}</span>
      </div>

      ${buildCollisionBanner(s)}

      <div class="submission-card__body">
        <p><strong>Mission:</strong> ${escHtml(s.mission || '')}</p>
        <p><strong>Values:</strong> ${escHtml(s.values || '')}</p>
        <p><strong>Local Vision:</strong> ${escHtml(s.local_vision || '')}</p>
        <p><strong>Universal Vision:</strong> ${s.universal_vision ? escHtml(s.universal_vision) : '<em>Not provided</em>'}</p>
        <p><strong>Donation Transparency:</strong> ${escHtml(s.donation_transparency || '')}</p>
        <p><strong>Application Transparency:</strong> ${s.application_transparency ? escHtml(s.application_transparency) : '<em>Not provided</em>'}</p>
      </div>

      <div class="submission-card__csvs">
        <details class="csv-section">
          <summary><strong>Financial Statements</strong> <span class="field-hint">(${financials.length} rows)</span></summary>
          ${renderCSVTable(financials)}
        </details>
        <details class="csv-section">
          <summary><strong>Budget</strong> <span class="field-hint">(${budget.length} rows)</span></summary>
          ${renderCSVTable(budget)}
        </details>
        <details class="csv-section">
          <summary><strong>Donation &amp; Payment Methods</strong> <span class="field-hint">(${donations.length} rows)</span></summary>
          ${renderCSVTable(donations)}
        </details>
      </div>

      ${buildLinkPanel(s)}

      <div class="submission-card__review">
        <div>
          <h5>Rejection Checklist</h5>
          <p class="field-hint">Select at least one correction reason before rejecting.</p>
          <div class="checkbox-group">${buildReasonCheckboxes(s.id)}</div>
        </div>
        <div class="field-group">
          <label for="notes-${s.id}">Additional Notes <span class="badge badge--optional">Optional</span></label>
          <textarea id="notes-${s.id}" rows="3" placeholder="Add any extra context to include in the rejection notification."></textarea>
        </div>
        <div class="submission-card__buttons">
          <button type="button" class="btn btn--primary"  data-approve="${s.id}">Approve</button>
          <button type="button" class="btn btn--danger"   data-reject="${s.id}">Reject &amp; Notify</button>
        </div>
      </div>
    `;
    submissionsContainer.appendChild(card);
  });
}

// ─── Correction Reasons UI ────────────────────────────────────────────────────
const reasonsManager         = document.getElementById('reasons-manager');
const reasonForm             = document.getElementById('reason-form');
const reasonLabelInput       = document.getElementById('reason-label');
const reasonDescriptionInput = document.getElementById('reason-description');

function sortedReasons() {
  return [...correctionReasons].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

function buildReasonCheckboxes(submissionId) {
  return sortedReasons().filter(r => r.active).map(r => `
    <label class="checkbox-row">
      <input type="checkbox" name="reason-${submissionId}" value="${r.id}" />
      <span><strong>${escHtml(r.label)}</strong><br /><small>${escHtml(r.description)}</small></span>
    </label>`).join('');
}

function renderReasonsManager() {
  reasonsManager.innerHTML = '';
  sortedReasons().forEach((r, index) => {
    const card = document.createElement('div');
    card.className = 'reason-card';
    card.innerHTML = `
      <div class="reason-card__content">
        <div>
          <p class="reason-card__label">${escHtml(r.label)}</p>
          <p class="reason-card__description">${escHtml(r.description)}</p>
          <p class="reason-card__meta">Status: ${r.active ? 'Active' : 'Inactive'} &middot; Order: ${r.sort_order}</p>
        </div>
        <div class="reason-card__actions">
          <button type="button" class="btn btn--small btn--secondary" data-action="toggle" data-id="${r.id}">${r.active ? 'Deactivate' : 'Activate'}</button>
          <button type="button" class="btn btn--small btn--secondary" data-action="up"     data-id="${r.id}" ${index === 0 ? 'disabled' : ''}>Up</button>
          <button type="button" class="btn btn--small btn--secondary" data-action="down"   data-id="${r.id}" ${index === correctionReasons.length - 1 ? 'disabled' : ''}>Down</button>
        </div>
      </div>`;
    reasonsManager.appendChild(card);
  });
}

reasonForm.addEventListener('submit', async e => {
  e.preventDefault();
  const label       = reasonLabelInput.value.trim();
  const description = reasonDescriptionInput.value.trim();
  if (!label || !description) return;
  await addReason(label, description);
  reasonForm.reset();
  renderReasonsManager();
  renderPendingSubmissions();
});

reasonsManager.addEventListener('click', async e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const { id, action } = btn.dataset;
  const reason = correctionReasons.find(r => r.id === id);
  if (!reason) return;

  if (action === 'toggle') {
    reason.active = !reason.active;
    await saveReason(reason);
  }
  const ordered = sortedReasons();
  const index   = ordered.findIndex(r => r.id === id);
  if (action === 'up' && index > 0) {
    const other = ordered[index - 1];
    [reason.sort_order, other.sort_order] = [other.sort_order, reason.sort_order];
    await Promise.all([saveReason(reason), saveReason(other)]);
  }
  if (action === 'down' && index < ordered.length - 1) {
    const other = ordered[index + 1];
    [reason.sort_order, other.sort_order] = [other.sort_order, reason.sort_order];
    await Promise.all([saveReason(reason), saveReason(other)]);
  }
  renderReasonsManager();
  renderPendingSubmissions();
});

// ─── Submissions Actions ──────────────────────────────────────────────────────
submissionsContainer.addEventListener('click', async e => {
  const approveBtn = e.target.closest('[data-approve]');
  if (approveBtn) {
    if (!confirm('Approve this submission and queue it for publication?')) return;
    await approveSubmission(approveBtn.dataset.approve);
    return;
  }

  const rejectBtn = e.target.closest('[data-reject]');
  if (rejectBtn) {
    const id      = rejectBtn.dataset.reject;
    const checked = Array.from(document.querySelectorAll(`input[name="reason-${id}"]:checked`));
    if (checked.length === 0) { showToast('Select at least one correction reason before rejecting.', 'error'); return; }
    const notes   = document.getElementById(`notes-${id}`)?.value.trim() || '';
    const ids     = checked.map(c => c.value);
    await rejectSubmission(id, ids, notes);
    return;
  }

  const linkBtn = e.target.closest('[data-link]');
  if (linkBtn) {
    const sourceId  = linkBtn.dataset.link;
    const selectEl  = document.getElementById(`link-target-${sourceId}`);
    const targetRef = selectEl?.value;
    if (!targetRef) { showToast('Select a reference to link to.', 'error'); return; }
    await linkSubmissions(sourceId, targetRef);
    return;
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;bottom:var(--space-6);right:var(--space-6);z-index:9999;display:flex;flex-direction:column;gap:var(--space-2);';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `notice notice--${type === 'error' ? 'warning' : 'success'} toast`;
  toast.style.cssText = 'min-width:260px;max-width:380px;box-shadow:var(--shadow-lg);animation:fadeInUp 200ms ease;';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
