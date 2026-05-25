/**
 * admin.js — Administration Page
 *
 * AUTH: Gated via auth.js (Netlify Identity). The entire admin UI is hidden
 * until Auth.isAdmin() returns true. See auth.js for migration guide.
 *
 * CSV PREVIEW: Submission records include parsed CSV data stored as structured
 * arrays. The renderCSVTable() function renders these programmatically as
 * HTML tables — no file access or download required by the administrator.
 *
 * NEXT STEP: Replace placeholder data arrays with Supabase API calls to:
 *   - ledger.submissions (pending submissions + parsed CSV data)
 *   - ledger.correction_reasons (managed checklist)
 *   - ledger.admin_actions (audit log)
 * Rejection email triggered via Supabase Edge Function.
 */

import Auth from './auth.js';

// ─── Auth Gate ───────────────────────────────────────────────────────────────
const authGate = document.getElementById('auth-gate');
const adminUI = document.getElementById('admin-ui');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

Auth.onChange(user => {
  if (Auth.isAdmin()) {
    authGate.style.display = 'none';
    adminUI.style.display = 'block';
  } else {
    authGate.style.display = 'flex';
    adminUI.style.display = 'none';
  }
});

loginBtn.addEventListener('click', () => Auth.login());
logoutBtn.addEventListener('click', () => Auth.logout());

Auth.initAuth();

// ─── Placeholder Data ─────────────────────────────────────────────────────────
// TODO: Replace with Supabase query: SELECT * FROM ledger.submissions WHERE status = 'pending'

const correctionReasons = [
  { id: crypto.randomUUID(), label: 'Missing contact information', description: 'A valid email or phone number is required so we can contact you if your submission needs updates.', active: true, sortOrder: 1 },
  { id: crypto.randomUUID(), label: 'Incomplete financial details', description: 'Financial statements must clearly show income and expenses so the community page can reflect your financial picture accurately.', active: true, sortOrder: 2 },
  { id: crypto.randomUUID(), label: 'Missing donation preference', description: 'At least one active donation method is required so supporters know how to contribute.', active: true, sortOrder: 3 },
  { id: crypto.randomUUID(), label: 'Unclear community objectives', description: 'Mission, values, and vision statements are required so the community understands your purpose and goals.', active: true, sortOrder: 4 }
];

const pendingSubmissions = [
  {
    id: 'sub_001',
    communityName: 'East Bayside Mutual Aid',
    submitter: 'Jordan Lee',
    email: 'jordan@example.com',
    location: 'Portland, Maine',
    status: 'pending',
    submittedAt: '2026-05-24 09:14',
    mission: 'Support neighbors with emergency supplies and mutual aid coordination.',
    values: 'Dignity, mutual support, transparency, accountability.',
    localVision: 'Build a reliable neighborhood support network.',
    universalVision: 'Share a model for community-led resilience in other places.',
    donationTransparency: 'All donations will be reported monthly on our community page.',
    applicationTransparency: 'Fund usage will be itemized quarterly.',
    // Parsed CSV data — stored as structured arrays after intake validation
    // TODO: In production these come from ledger.submission_financials,
    //       ledger.submission_budget, ledger.submission_donations
    financials: [
      { section: 'income', name: 'Local Arts Council Grant', amount: '1500.00', notes: 'Annual' },
      { section: 'income', name: 'Spring Fundraiser', amount: '320.00', notes: '' },
      { section: 'expense', name: 'Venue Rental', amount: '200.00', notes: 'Monthly' },
      { section: 'expense', name: 'Supplies', amount: '85.50', notes: '' }
    ],
    budget: [
      { status: 'purchased', item: 'Folding Tables x6', estimated_cost: '180.00', actual_cost: '175.00', notes: '' },
      { status: 'expected', item: 'Sound System Rental', estimated_cost: '250.00', actual_cost: '', notes: 'Q3 event' },
      { status: 'desired', item: 'Projector', estimated_cost: '400.00', actual_cost: '', notes: 'Nice to have' },
      { status: 'contingency', item: 'Unexpected Reserve', estimated_cost: '300.00', actual_cost: '', notes: '' }
    ],
    donations: [
      { method: 'PayPal', handle_or_address: 'eastbayside@example.com', notes: '' },
      { method: 'Postal', handle_or_address: '42 Bay St, Portland ME 04101', notes: 'Checks payable to East Bayside Mutual Aid' }
    ]
  },
  {
    id: 'sub_002',
    communityName: 'Creative Commons Garden Circle',
    submitter: 'Morgan Ellis',
    email: 'morgan@example.com',
    location: 'Westbrook, Maine',
    status: 'pending',
    submittedAt: '2026-05-24 14:32',
    mission: 'Create shared food-growing spaces and learning events.',
    values: 'Access, stewardship, education, reciprocity.',
    localVision: 'Expand neighborhood gardens and volunteer participation.',
    universalVision: '',
    donationTransparency: 'Donations reported on our website after each season.',
    applicationTransparency: '',
    financials: [
      { section: 'income', name: 'Member Dues', amount: '600.00', notes: 'Annual' },
      { section: 'expense', name: 'Seeds & Soil', amount: '210.00', notes: 'Spring order' }
    ],
    budget: [
      { status: 'purchased', item: 'Garden Tools Set', estimated_cost: '95.00', actual_cost: '88.00', notes: '' },
      { status: 'expected', item: 'Irrigation Line', estimated_cost: '150.00', actual_cost: '', notes: '' },
      { status: 'contingency', item: 'Unexpected Reserve', estimated_cost: '100.00', actual_cost: '', notes: '' }
    ],
    donations: [
      { method: 'Stripe', handle_or_address: 'https://donate.stripe.com/garden-circle', notes: '' }
    ]
  }
];

// ─── CSV Table Renderer ────────────────────────────────────────────────────────
function renderCSVTable(rows) {
  if (!rows || rows.length === 0) return '<p class="field-hint">No data provided.</p>';
  const headers = Object.keys(rows[0]);
  const headerRow = headers.map(h => `<th>${h.replace(/_/g, ' ')}</th>`).join('');
  const dataRows = rows.map(row =>
    `<tr>${headers.map(h => `<td>${row[h] || '<span class="empty">—</span>'}</td>`).join('')}</tr>`
  ).join('');
  return `
    <div class="csv-table-wrap">
      <table class="csv-table">
        <thead><tr>${headerRow}</tr></thead>
        <tbody>${dataRows}</tbody>
      </table>
    </div>`;
}

// ─── Submission Renderer ───────────────────────────────────────────────────────
const submissionsContainer = document.getElementById('pending-submissions');

function renderPendingSubmissions() {
  submissionsContainer.innerHTML = '';
  pendingSubmissions.forEach(s => {
    const card = document.createElement('article');
    card.className = 'submission-card';
    card.innerHTML = `
      <div class="submission-card__header">
        <div>
          <h4>${s.communityName}</h4>
          <p>${s.submitter} &middot; ${s.email} &middot; ${s.location} &middot; Submitted: ${s.submittedAt}</p>
        </div>
        <span class="badge badge--required">${s.status}</span>
      </div>

      <div class="submission-card__body">
        <p><strong>Mission:</strong> ${s.mission}</p>
        <p><strong>Values:</strong> ${s.values}</p>
        <p><strong>Local Vision:</strong> ${s.localVision}</p>
        <p><strong>Universal Vision:</strong> ${s.universalVision || '<em>Not provided</em>'}</p>
        <p><strong>Donation Transparency:</strong> ${s.donationTransparency}</p>
        <p><strong>Application Transparency:</strong> ${s.applicationTransparency || '<em>Not provided</em>'}</p>
      </div>

      <div class="submission-card__csvs">
        <details class="csv-section">
          <summary><strong>Financial Statements</strong> <span class="field-hint">(${s.financials.length} rows)</span></summary>
          ${renderCSVTable(s.financials)}
        </details>
        <details class="csv-section">
          <summary><strong>Budget</strong> <span class="field-hint">(${s.budget.length} rows)</span></summary>
          ${renderCSVTable(s.budget)}
        </details>
        <details class="csv-section">
          <summary><strong>Donation &amp; Payment Methods</strong> <span class="field-hint">(${s.donations.length} rows)</span></summary>
          ${renderCSVTable(s.donations)}
        </details>
      </div>

      <div class="submission-card__review">
        <div>
          <h5>Rejection Checklist</h5>
          <p class="field-hint">Select at least one correction reason before rejecting.</p>
          <div class="checkbox-group">${buildReasonCheckboxes(s.id)}</div>
        </div>
        <div class="field-group">
          <label for="notes-${s.id}">Additional Notes <span class="badge badge--optional">Optional</span></label>
          <textarea id="notes-${s.id}" rows="3" placeholder="Add any extra context to include in the rejection email."></textarea>
        </div>
        <div class="submission-card__buttons">
          <button type="button" class="btn btn--primary" data-approve="${s.id}">Approve</button>
          <button type="button" class="btn btn--danger" data-reject="${s.id}">Reject &amp; Notify</button>
        </div>
      </div>
    `;
    submissionsContainer.appendChild(card);
  });
}

// ─── Correction Reasons ───────────────────────────────────────────────────────
const reasonsManager = document.getElementById('reasons-manager');
const reasonForm = document.getElementById('reason-form');
const reasonLabelInput = document.getElementById('reason-label');
const reasonDescriptionInput = document.getElementById('reason-description');

function sortedReasons() {
  return [...correctionReasons].sort((a, b) => a.sortOrder - b.sortOrder);
}

function buildReasonCheckboxes(submissionId) {
  return sortedReasons().filter(r => r.active).map(r => `
    <label class="checkbox-row">
      <input type="checkbox" name="reason-${submissionId}" value="${r.id}" />
      <span><strong>${r.label}</strong><br /><small>${r.description}</small></span>
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
          <p class="reason-card__label">${r.label}</p>
          <p class="reason-card__description">${r.description}</p>
          <p class="reason-card__meta">Status: ${r.active ? 'Active' : 'Inactive'} &middot; Order: ${r.sortOrder}</p>
        </div>
        <div class="reason-card__actions">
          <button type="button" class="btn btn--small btn--secondary" data-action="toggle" data-id="${r.id}">${r.active ? 'Deactivate' : 'Activate'}</button>
          <button type="button" class="btn btn--small btn--secondary" data-action="up" data-id="${r.id}" ${index === 0 ? 'disabled' : ''}>Up</button>
          <button type="button" class="btn btn--small btn--secondary" data-action="down" data-id="${r.id}" ${index === correctionReasons.length - 1 ? 'disabled' : ''}>Down</button>
        </div>
      </div>`;
    reasonsManager.appendChild(card);
  });
}

reasonForm.addEventListener('submit', e => {
  e.preventDefault();
  const label = reasonLabelInput.value.trim();
  const description = reasonDescriptionInput.value.trim();
  if (!label || !description) return;
  correctionReasons.push({ id: crypto.randomUUID(), label, description, active: true, sortOrder: correctionReasons.length + 1 });
  reasonForm.reset();
  renderReasonsManager();
  renderPendingSubmissions();
});

reasonsManager.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const { id, action } = btn.dataset;
  const reason = correctionReasons.find(r => r.id === id);
  if (!reason) return;
  if (action === 'toggle') reason.active = !reason.active;
  const ordered = sortedReasons();
  const index = ordered.findIndex(r => r.id === id);
  if (action === 'up' && index > 0) { const o = ordered[index-1]; [reason.sortOrder, o.sortOrder] = [o.sortOrder, reason.sortOrder]; }
  if (action === 'down' && index < ordered.length - 1) { const o = ordered[index+1]; [reason.sortOrder, o.sortOrder] = [o.sortOrder, reason.sortOrder]; }
  renderReasonsManager();
  renderPendingSubmissions();
});

submissionsContainer.addEventListener('click', e => {
  const approveBtn = e.target.closest('[data-approve]');
  const rejectBtn = e.target.closest('[data-reject]');
  if (approveBtn) {
    // TODO: PATCH ledger.submissions SET status='approved' WHERE id=?
    // TODO: Trigger community page generation
    alert(`Prototype: submission ${approveBtn.dataset.approve} would be approved and published.`);
  }
  if (rejectBtn) {
    const id = rejectBtn.dataset.reject;
    const checked = Array.from(document.querySelectorAll(`input[name="reason-${id}"]:checked`));
    if (checked.length === 0) { alert('Select at least one correction reason before rejecting.'); return; }
    // TODO: PATCH ledger.submissions SET status='rejected', rejection_notes=? WHERE id=?
    // TODO: Invoke Supabase Edge Function: send-rejection-email with reason IDs + notes
    alert(`Prototype: submission ${id} would be rejected and a rejection email sent to the submitter.`);
  }
});

renderReasonsManager();
renderPendingSubmissions();
