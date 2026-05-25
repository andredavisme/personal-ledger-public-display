/**
 * admin.js — Administration Page
 *
 * AUTH: Currently uses Netlify Identity via the Auth abstraction layer (auth.js).
 * MIGRATION: Swap auth provider in auth.js only — this file does not need changes.
 *
 * DATA: Currently uses in-browser placeholder data for UI prototyping.
 * NEXT STEP: Replace placeholder arrays with Supabase API calls to:
 *   - ledger.submissions (pending submissions)
 *   - ledger.correction_reasons (managed checklist)
 *   - ledger.admin_actions (audit log)
 * Email on rejection will be triggered via a Supabase Edge Function.
 */

const correctionReasons = [
  {
    id: crypto.randomUUID(),
    label: 'Missing contact information',
    description: 'A valid email or phone number is required so we can contact you if your submission needs updates.',
    active: true,
    sortOrder: 1
  },
  {
    id: crypto.randomUUID(),
    label: 'Incomplete financial details',
    description: 'Financial statements must clearly show income and expenses so the community page can reflect your financial picture accurately.',
    active: true,
    sortOrder: 2
  },
  {
    id: crypto.randomUUID(),
    label: 'Missing donation preference',
    description: 'At least one active donation method is required so supporters know how to contribute.',
    active: true,
    sortOrder: 3
  },
  {
    id: crypto.randomUUID(),
    label: 'Unclear community objectives',
    description: 'Mission, values, and vision statements are required so the community understands your purpose and goals.',
    active: true,
    sortOrder: 4
  }
];

const pendingSubmissions = [
  {
    id: 'sub_001',
    communityName: 'East Bayside Mutual Aid',
    submitter: 'Jordan Lee',
    email: 'jordan@example.com',
    location: 'Portland, Maine',
    status: 'pending',
    mission: 'Support neighbors with emergency supplies and mutual aid coordination.',
    values: 'Dignity, mutual support, transparency, accountability.',
    localVision: 'Build a reliable neighborhood support network.',
    universalVision: 'Share a model for community-led resilience in other places.'
  },
  {
    id: 'sub_002',
    communityName: 'Creative Commons Garden Circle',
    submitter: 'Morgan Ellis',
    email: 'morgan@example.com',
    location: 'Westbrook, Maine',
    status: 'pending',
    mission: 'Create shared food-growing spaces and learning events.',
    values: 'Access, stewardship, education, reciprocity.',
    localVision: 'Expand neighborhood gardens and volunteer participation.',
    universalVision: ''
  }
];

const submissionsContainer = document.getElementById('pending-submissions');
const reasonsManager = document.getElementById('reasons-manager');
const reasonForm = document.getElementById('reason-form');
const reasonLabelInput = document.getElementById('reason-label');
const reasonDescriptionInput = document.getElementById('reason-description');

function sortedReasons() {
  return [...correctionReasons].sort((a, b) => a.sortOrder - b.sortOrder);
}

function renderReasonsManager() {
  reasonsManager.innerHTML = '';
  sortedReasons().forEach((reason, index) => {
    const card = document.createElement('div');
    card.className = 'reason-card';
    card.innerHTML = `
      <div class="reason-card__content">
        <div>
          <p class="reason-card__label">${reason.label}</p>
          <p class="reason-card__description">${reason.description}</p>
          <p class="reason-card__meta">Status: ${reason.active ? 'Active' : 'Inactive'} &middot; Order: ${reason.sortOrder}</p>
        </div>
        <div class="reason-card__actions">
          <button type="button" class="btn btn--small btn--secondary" data-action="toggle" data-id="${reason.id}">${reason.active ? 'Deactivate' : 'Activate'}</button>
          <button type="button" class="btn btn--small btn--secondary" data-action="up" data-id="${reason.id}" ${index === 0 ? 'disabled' : ''}>Up</button>
          <button type="button" class="btn btn--small btn--secondary" data-action="down" data-id="${reason.id}" ${index === correctionReasons.length - 1 ? 'disabled' : ''}>Down</button>
        </div>
      </div>
    `;
    reasonsManager.appendChild(card);
  });
}

function buildReasonCheckboxes(submissionId) {
  return sortedReasons()
    .filter(reason => reason.active)
    .map(reason => `
      <label class="checkbox-row">
        <input type="checkbox" name="reason-${submissionId}" value="${reason.id}" />
        <span><strong>${reason.label}</strong><br /><small>${reason.description}</small></span>
      </label>
    `).join('');
}

function renderPendingSubmissions() {
  submissionsContainer.innerHTML = '';
  pendingSubmissions.forEach(submission => {
    const card = document.createElement('article');
    card.className = 'submission-card';
    card.innerHTML = `
      <div class="submission-card__header">
        <div>
          <h4>${submission.communityName}</h4>
          <p>${submission.submitter} &middot; ${submission.email} &middot; ${submission.location}</p>
        </div>
        <span class="badge badge--required">${submission.status}</span>
      </div>
      <div class="submission-card__body">
        <p><strong>Mission:</strong> ${submission.mission}</p>
        <p><strong>Values:</strong> ${submission.values}</p>
        <p><strong>Local Vision:</strong> ${submission.localVision}</p>
        <p><strong>Universal Vision:</strong> ${submission.universalVision || '<em>Not provided</em>'}</p>
      </div>
      <div class="submission-card__review">
        <div>
          <h5>Rejection Checklist</h5>
          <p class="field-hint">Select at least one correction reason before rejecting.</p>
          <div class="checkbox-group">${buildReasonCheckboxes(submission.id)}</div>
        </div>
        <div class="field-group">
          <label for="notes-${submission.id}">Additional Notes <span class="badge badge--optional">Optional</span></label>
          <textarea id="notes-${submission.id}" rows="4" placeholder="Add any extra context to include in the rejection email."></textarea>
        </div>
        <div class="submission-card__buttons">
          <button type="button" class="btn btn--primary" data-approve="${submission.id}">Approve</button>
          <button type="button" class="btn btn--danger" data-reject="${submission.id}">Reject</button>
        </div>
      </div>
    `;
    submissionsContainer.appendChild(card);
  });
}

reasonForm.addEventListener('submit', event => {
  event.preventDefault();
  const label = reasonLabelInput.value.trim();
  const description = reasonDescriptionInput.value.trim();
  if (!label || !description) return;
  correctionReasons.push({
    id: crypto.randomUUID(),
    label,
    description,
    active: true,
    sortOrder: correctionReasons.length + 1
  });
  reasonForm.reset();
  renderReasonsManager();
  renderPendingSubmissions();
});

reasonsManager.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const id = button.dataset.id;
  const action = button.dataset.action;
  const reason = correctionReasons.find(item => item.id === id);
  if (!reason) return;
  if (action === 'toggle') reason.active = !reason.active;
  const ordered = sortedReasons();
  const index = ordered.findIndex(item => item.id === id);
  if (action === 'up' && index > 0) {
    const other = ordered[index - 1];
    [reason.sortOrder, other.sortOrder] = [other.sortOrder, reason.sortOrder];
  }
  if (action === 'down' && index < ordered.length - 1) {
    const other = ordered[index + 1];
    [reason.sortOrder, other.sortOrder] = [other.sortOrder, reason.sortOrder];
  }
  renderReasonsManager();
  renderPendingSubmissions();
});

submissionsContainer.addEventListener('click', event => {
  const approveButton = event.target.closest('[data-approve]');
  const rejectButton = event.target.closest('[data-reject]');
  if (approveButton) {
    const id = approveButton.dataset.approve;
    // TODO: POST to ledger.submissions (status → approved) via Supabase API
    // TODO: Trigger community page render
    alert(`Prototype: submission ${id} would be approved and published.`);
  }
  if (rejectButton) {
    const id = rejectButton.dataset.reject;
    const checked = Array.from(document.querySelectorAll(`input[name="reason-${id}"]:checked`));
    if (checked.length === 0) {
      alert('Select at least one correction reason before rejecting.');
      return;
    }
    // TODO: POST to ledger.submissions (status → rejected) via Supabase API
    // TODO: Trigger rejection email Edge Function with selected reason IDs + notes
    alert(`Prototype: submission ${id} would be rejected and a rejection email would be sent.`);
  }
});

renderReasonsManager();
renderPendingSubmissions();
