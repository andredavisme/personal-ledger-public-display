/**
 * portal.js — Community Finance Portal
 *
 * Entry point for portal.html.
 *
 * RESPONSIBILITIES:
 *   1. Mount PortalAuth into #portal-root
 *   2. On auth: render the rep dashboard (header + sections)
 *   3. Three-tab form: Intended | Expense | Message
 *   4. File upload to Supabase Storage (community-docs bucket)
 *   5. Insert record into public.community_financials
 *   6. Load and display the rep's submission history
 *
 * TABLE COLUMNS (community_financials):
 *   id, submission_id, donation_id (nullable), type, status,
 *   amount (nullable), currency, description (nullable),
 *   notes (nullable), document_url (nullable),
 *   submitted_at, reviewed_at, reviewed_by, created_at,
 *   paid, paid_amount, paid_at
 *
 * TYPES:   intended | income | expense | message
 * STATUSES: pending | self_reported | verified | approved | rejected | returned
 */

import supabase    from './supabase.js';
import PortalAuth  from './portal-auth.js';

// ─── Tab config ─────────────────────────────────────────────────────────

const TABS = [
  { key: 'intended', label: '🎯 Log Intended'  },
  { key: 'expense',  label: '💸 Log Expense'   },
  { key: 'message',  label: '✏️ Add Message'  },
];

// ─── State ──────────────────────────────────────────────────────────────

let _activeTab      = 'intended';
let _submissionId   = null;
let _user           = null;
let _communityName  = '';
let _root           = null;

// ─── Bootstrap ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  _root = document.getElementById('portal-root');
  PortalAuth.init('portal-root', _onAuthenticated);
});

async function _onAuthenticated(user, submissionId) {
  _user         = user;
  _submissionId = submissionId;

  const { data } = await supabase
    .from('submissions')
    .select('community_name')
    .eq('id', submissionId)
    .maybeSingle();

  _communityName = data?.community_name || user.email;
  _renderPortal();
}

// ─── Portal shell ─────────────────────────────────────────────────────────

function _renderPortal() {
  _root.innerHTML = `
    <div class="portal">
      <div class="portal__header">
        <div>
          <h1 class="portal__heading">${esc(_communityName)}</h1>
          <p class="portal__subheading">Community Finance Portal &middot; ${esc(_user.email)}</p>
        </div>
        <button class="portal__signout" id="portal-signout">Sign Out</button>
      </div>

      <div class="portal__section" id="portal-form-section">
        <h2 class="portal__section-title">Submit a Financial Record</h2>
        <p class="portal__section-desc">
          Log intended donations, expenses (funds applied), or messages
          to keep the transparency page current. All submissions are reviewed by
          our admin team before they appear publicly.
        </p>
        <div class="portal__tabs" role="tablist" id="portal-tabs">
          ${TABS.map(t => `
            <button
              class="portal__tab${t.key === _activeTab ? ' portal__tab--active' : ''}"
              role="tab"
              data-tab="${t.key}"
              aria-selected="${t.key === _activeTab}"
            >${t.label}</button>
          `).join('')}
        </div>
        <div id="portal-form-area"></div>
      </div>

      <div class="portal__section">
        <h2 class="portal__section-title">Your Submissions</h2>
        <p class="portal__section-desc">All financial records you have submitted for admin review.</p>
        <div id="portal-history"></div>
      </div>
    </div>
  `;

  document.getElementById('portal-signout').addEventListener('click', () => PortalAuth.signOut());
  document.getElementById('portal-tabs').addEventListener('click', e => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    _setTab(btn.dataset.tab);
  });

  _renderForm(_activeTab);
  _loadHistory();
}

// ─── Tab switching ──────────────────────────────────────────────────────────

function _setTab(key) {
  _activeTab = key;
  document.querySelectorAll('[data-tab]').forEach(btn => {
    const active = btn.dataset.tab === key;
    btn.classList.toggle('portal__tab--active', active);
    btn.setAttribute('aria-selected', active);
  });
  _renderForm(key);
}

// ─── Form renderer ─────────────────────────────────────────────────────────

function _renderForm(tab) {
  const area = document.getElementById('portal-form-area');
  if (!area) return;
  if (tab === 'intended') area.innerHTML = _intendedFormHtml();
  if (tab === 'expense')  area.innerHTML = _expenseFormHtml();
  if (tab === 'message')  area.innerHTML = _messageFormHtml();
  area.querySelector('form')?.addEventListener('submit', e => {
    e.preventDefault();
    _handleSubmit(tab, e.target);
  });
}

/**
 * Intended form
 * "A donor has indicated they intend to give this amount."
 */
function _intendedFormHtml() {
  return `
    <form class="portal__form" id="portal-record-form" novalidate>
      <div class="portal__form-row">
        <div class="portal__field">
          <label for="pf-amount">Amount Intended (USD) <span style="color:#b91c1c">*</span></label>
          <input type="number" id="pf-amount" name="amount" min="0.01" step="0.01" placeholder="0.00" required />
        </div>
        <div class="portal__field">
          <label for="pf-description">Donor / Source Description</label>
          <input type="text" id="pf-description" name="description" maxlength="200"
            placeholder="e.g. PayPal donation from Jane Smith" />
        </div>
      </div>
      <div class="portal__field">
        <label for="pf-notes">Additional Notes</label>
        <textarea id="pf-notes" name="notes" maxlength="1000"
          placeholder="Any context you want the admin team to know"></textarea>
      </div>
      <div class="portal__field">
        <label for="pf-file">Supporting Document (optional)</label>
        <input type="file" id="pf-file" name="file" accept=".pdf,.jpg,.jpeg,.png,.webp" />
        <span class="portal__field-hint">PDF or image. Max 5 MB. Stored securely — visible to admins only.</span>
      </div>
      <div id="portal-form-feedback"></div>
      <button type="submit" class="portal__submit">Submit Intended</button>
    </form>
  `;
}

/**
 * Expense form
 * "We spent received funds on this."
 */
function _expenseFormHtml() {
  return `
    <form class="portal__form" id="portal-record-form" novalidate>
      <div class="portal__form-row">
        <div class="portal__field">
          <label for="pf-amount">Amount Spent (USD) <span style="color:#b91c1c">*</span></label>
          <input type="number" id="pf-amount" name="amount" min="0.01" step="0.01" placeholder="0.00" required />
        </div>
        <div class="portal__field">
          <label for="pf-description">What was purchased / paid for <span style="color:#b91c1c">*</span></label>
          <input type="text" id="pf-description" name="description" maxlength="200"
            placeholder="e.g. Community garden supplies" required />
        </div>
      </div>
      <div class="portal__field">
        <label for="pf-notes">Additional Notes</label>
        <textarea id="pf-notes" name="notes" maxlength="1000"
          placeholder="Vendor, date, how funds were applied, etc."></textarea>
      </div>
      <div class="portal__field">
        <label for="pf-file">Receipt / Invoice (optional)</label>
        <input type="file" id="pf-file" name="file" accept=".pdf,.jpg,.jpeg,.png,.webp" />
        <span class="portal__field-hint">PDF or image. Max 5 MB. Stored securely — visible to admins only.</span>
      </div>
      <div id="portal-form-feedback"></div>
      <button type="submit" class="portal__submit">Submit Expense</button>
    </form>
  `;
}

/**
 * Message form
 */
function _messageFormHtml() {
  return `
    <form class="portal__form" id="portal-record-form" novalidate>
      <div class="portal__field">
        <label for="pf-description">Message Title / Subject <span style="color:#b91c1c">*</span></label>
        <input type="text" id="pf-description" name="description" maxlength="200"
          placeholder="e.g. Update on Q2 spending" required />
      </div>
      <div class="portal__field">
        <label for="pf-notes">Message Body <span style="color:#b91c1c">*</span></label>
        <textarea id="pf-notes" name="notes" maxlength="2000"
          placeholder="Write your update here…" style="min-height:140px;" required></textarea>
      </div>
      <div id="portal-form-feedback"></div>
      <button type="submit" class="portal__submit">Submit Message</button>
    </form>
  `;
}

// ─── Form submission handler ─────────────────────────────────────────────────

async function _handleSubmit(tab, form) {
  const feedbackEl    = document.getElementById('portal-form-feedback');
  const submitBtn     = form.querySelector('button[type="submit"]');
  const originalLabel = submitBtn.textContent;

  _clearFeedback(feedbackEl);
  submitBtn.disabled    = true;
  submitBtn.textContent = 'Submitting…';

  try {
    const amount      = form.amount?.value      ? Number(form.amount.value)      : null;
    const description = form.description?.value ? form.description.value.trim() : null;
    const notes       = form.notes?.value       ? form.notes.value.trim()        : null;
    const file        = form.file?.files?.[0] || null;

    if ((tab === 'intended' || tab === 'expense') && (!amount || amount <= 0))
      throw new Error('Please enter a valid amount greater than 0.');
    if ((tab === 'expense' || tab === 'message') && !description)
      throw new Error('Description is required.');
    if (tab === 'message' && !notes)
      throw new Error('Message body is required.');
    if (file && file.size > 5 * 1024 * 1024)
      throw new Error('File must be 5 MB or smaller.');

    let documentUrl = null;
    if (file) {
      const ext         = file.name.split('.').pop().toLowerCase();
      const safeName    = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${_submissionId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('community-docs')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || `application/${ext}`,
        });
      if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);
      documentUrl = storagePath;
    }

    const { error: insertError } = await supabase
      .from('community_financials')
      .insert({
        submission_id: _submissionId,
        type:          tab,       // intended | expense | message
        status:        'pending',
        amount,
        currency:      'USD',
        description,
        notes,
        document_url:  documentUrl,
      });

    if (insertError) throw new Error(insertError.message);

    _setFeedback(feedbackEl, 'success',
      '✔ Submitted successfully. Our team will review and update the transparency page.');
    form.reset();
    _loadHistory();

  } catch (err) {
    console.error('[portal] submit error:', err);
    _setFeedback(feedbackEl, 'error', err.message || 'Submission failed. Please try again.');
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = originalLabel;
  }
}

// ─── History loader ─────────────────────────────────────────────────────────

async function _loadHistory() {
  const el = document.getElementById('portal-history');
  if (!el) return;
  el.innerHTML = `<p class="portal__history-empty">Loading…</p>`;

  const { data, error } = await supabase
    .from('community_financials')
    .select('id, type, status, amount, currency, description, submitted_at, paid, paid_amount')
    .eq('submission_id', _submissionId)
    .order('submitted_at', { ascending: false })
    .limit(50);

  if (error) {
    el.innerHTML = `<p class="portal__history-empty" style="color:#b91c1c;">Unable to load history.</p>`;
    return;
  }
  if (!data || data.length === 0) {
    el.innerHTML = `<p class="portal__history-empty">No submissions yet. Use the form above to log your first record.</p>`;
    return;
  }
  el.innerHTML = `<div class="portal__history">${data.map(_buildHistoryItem).join('')}</div>`;
}

const TYPE_LABEL = {
  intended:         'Intended',
  intended_lower:   'Lowered Intention',
  intended_higher:  'Increased Intention',
  income:           'Income',
  expense:          'Expense',
  message:          'Message',
};

function _buildHistoryItem(row) {
  const typeLabel = TYPE_LABEL[row.type] || row.type;
  const amountStr = row.amount != null
    ? `${row.currency || 'USD'} ${Number(row.amount).toFixed(2)}`
    : '—';
  const paidBadge = row.paid
    ? `<span class="portal__paid-badge">✓ Paid${row.paid_amount != null && row.paid_amount !== row.amount ? ` ($${Number(row.paid_amount).toFixed(2)})` : ''}</span>`
    : '';
  const date = row.submitted_at
    ? new Date(row.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return `
    <div class="portal__history-item">
      <div class="portal__history-item__meta">
        <span class="portal__history-item__type">${esc(typeLabel)}</span>
        <span class="portal__history-item__desc">${row.description ? esc(row.description) : date}</span>
      </div>
      <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
        ${row.amount != null ? `<span class="portal__history-item__amount">${esc(amountStr)}</span>` : ''}
        ${paidBadge}
        <span class="portal__status portal__status--${esc(row.status)}">${esc(row.status.replace('_', ' '))}</span>
      </div>
    </div>
  `;
}

// ─── Feedback helpers ────────────────────────────────────────────────────────

function _setFeedback(el, type, message) {
  if (!el) return;
  el.className  = type === 'success' ? 'portal__form-success' : 'portal__form-error';
  el.textContent = message;
  el.removeAttribute('hidden');
}

function _clearFeedback(el) {
  if (!el) return;
  el.textContent = '';
  el.setAttribute('hidden', '');
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
