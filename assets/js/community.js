/**
 * community.js — Public Community Pages
 *
 * Loads all approved submissions and their child tables from Supabase
 * and renders them as public-facing community cards.
 *
 * No auth required — this page is fully public.
 */

import supabase from './supabase.js';

const listEl    = document.getElementById('community-list');
const loadingEl = document.getElementById('community-loading');
const emptyEl   = document.getElementById('community-empty');

let intentModalEl   = null;
let intentFormEl    = null;
let intentConfirmEl = null;
let activeSubmissionId = null;
let activeMethod = null;
let communityLookup = new Map();

initIntentModal();

// ─── Load Data ────────────────────────────────────────────────────────────────
async function loadCommunities() {
  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('id, community_name, location, mission, values, local_vision, universal_vision, donation_transparency, application_transparency, reviewed_at')
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: false });

  if (error) {
    console.error('[community] load error:', error);
    loadingEl.textContent = 'Unable to load communities. Please try again later.';
    return;
  }

  loadingEl.style.display = 'none';

  if (!submissions || submissions.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }

  await Promise.all(submissions.map(async s => {
    const [{ data: financials }, { data: budget }, { data: donations }] = await Promise.all([
      supabase.from('submission_financials').select('*').eq('submission_id', s.id).order('sort_order'),
      supabase.from('submission_budget').select('*').eq('submission_id', s.id).order('sort_order'),
      supabase.from('submission_donations').select('*').eq('submission_id', s.id).order('sort_order'),
    ]);
    s.financials = financials || [];
    s.budget     = budget     || [];
    s.donations  = donations  || [];
    communityLookup.set(s.id, s);
  }));

  submissions.forEach(s => listEl.appendChild(buildCard(s)));
  bindIntentButtons();
}

// ─── Card Builder ─────────────────────────────────────────────────────────────
function buildCard(s) {
  const article = document.createElement('article');
  article.className = 'community-card';
  article.id = `community-${s.id}`;

  article.innerHTML = `
    <div class="community-card__header">
      <div>
        <h3>${esc(s.community_name)}</h3>
        <p class="community-card__meta">${esc(s.location || '')}${s.location && s.reviewed_at ? ' &middot; ' : ''}${s.reviewed_at ? 'Verified ' + formatDate(s.reviewed_at) : ''}</p>
      </div>
    </div>

    <section class="community-card__section">
      <h4>Who We Are</h4>
      <div class="community-card__fields">
        <div class="community-field"><span class="community-field__label">Mission</span><p class="community-field__value">${esc(s.mission || '')}</p></div>
        <div class="community-field"><span class="community-field__label">Values</span><p class="community-field__value">${esc(s.values || '')}</p></div>
        <div class="community-field"><span class="community-field__label">Local Vision</span><p class="community-field__value">${esc(s.local_vision || '')}</p></div>
        ${s.universal_vision ? `<div class="community-field"><span class="community-field__label">Universal Vision</span><p class="community-field__value">${esc(s.universal_vision)}</p></div>` : ''}
      </div>
    </section>

    ${s.financials.length ? `<section class="community-card__section"><h4>Financial History</h4><p class="section-desc">Past income and expenses submitted by this community.</p>${buildTable(s.financials)}</section>` : ''}
    ${s.budget.length ? `<section class="community-card__section"><h4>Budget Needs</h4><p class="section-desc">Items this community needs to purchase, expects to purchase, or is planning for.</p>${buildTable(s.budget)}</section>` : ''}

    <section class="community-card__section">
      <h4>Transparency</h4>
      <div class="community-card__fields">
        <div class="community-field"><span class="community-field__label">How Donations Are Tracked</span><p class="community-field__value">${esc(s.donation_transparency || '')}</p></div>
        ${s.application_transparency ? `<div class="community-field"><span class="community-field__label">How Donations Are Applied</span><p class="community-field__value">${esc(s.application_transparency)}</p></div>` : ''}
      </div>
    </section>

    ${s.donations.length ? `<section class="community-card__section"><h4>How to Donate</h4><p class="section-desc">Accepted donation methods submitted by this community.</p>${buildDonationList(s.id, s.donations)}</section>` : ''}
  `;

  return article;
}

// ─── Table Renderer ───────────────────────────────────────────────────────────
function buildTable(rows) {
  const skip    = ['id', 'submission_id', 'sort_order'];
  const headers = Object.keys(rows[0]).filter(h => !skip.includes(h));
  const head    = headers.map(h => `<th>${h.replace(/_/g, ' ')}</th>`).join('');
  const body    = rows.map(row => `<tr>${headers.map(h => `<td>${esc(String(row[h] ?? ''))}</td>`).join('')}</tr>`).join('');
  return `<div class="csv-table-wrap"><table class="csv-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

// ─── Donation List Renderer ───────────────────────────────────────────────────
// Priority: PayPal > Stripe (if no PayPal) > Postal > Crypto
// Each card always shows "I Intend to Donate" button.
function buildDonationList(submissionId, rows) {
  const cols = Object.keys(rows[0]).filter(h => !['id', 'submission_id', 'sort_order'].includes(h));

  if (cols.length > 4) return buildTable(rows);

  // Detect method type from row data
  const classify = (row) => {
    const vals = Object.values(row).map(v => String(v || '').toLowerCase()).join(' ');
    if (vals.includes('paypal')) return 'paypal';
    if (vals.includes('stripe')) return 'stripe';
    if (vals.includes('postal') || vals.includes('mail') || vals.includes('check')) return 'postal';
    if (vals.includes('crypto') || vals.includes('bitcoin') || vals.includes('ethereum') || vals.includes('btc') || vals.includes('eth')) return 'crypto';
    return 'other';
  };

  const classified = rows.map(row => ({ row, type: classify(row) }));
  const hasPaypal  = classified.some(r => r.type === 'paypal');

  return `<div class="donation-methods">${classified.map(({ row, type }) => {
    const pairs     = cols.map(c => ({ key: c, label: c.replace(/_/g, ' '), value: row[c] })).filter(p => p.value);
    const linkPair  = pairs.find(p => p.label.toLowerCase().includes('link') || p.label.toLowerCase().includes('url'));
    const otherPairs = pairs.filter(p => p !== linkPair);
    const methodLabel = getMethodLabel(row, pairs);

    let actionButtons = '';

    if (type === 'paypal') {
      const href = linkPair ? esc(String(linkPair.value)) : '#';
      actionButtons = `<a href="${href}" target="_blank" rel="noopener noreferrer" class="btn btn--paypal btn--small">Donate via PayPal</a>`;
    } else if (type === 'stripe' && !hasPaypal) {
      const href = linkPair ? esc(String(linkPair.value)) : '#';
      actionButtons = `<a href="${href}" target="_blank" rel="noopener noreferrer" class="btn btn--stripe btn--small">Donate via Stripe</a>`;
    } else if (type === 'postal' || type === 'crypto') {
      const params = new URLSearchParams({ submission_id: submissionId, method: type });
      actionButtons = `<a href="donate-instructions.html?${params}" class="btn btn--instructions btn--small">How to ${type === 'postal' ? 'Mail a Donation' : 'Send Crypto'}</a>`;
    } else if (linkPair) {
      actionButtons = `<a href="${esc(String(linkPair.value))}" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--small">Donate</a>`;
    }

    return `
      <div class="donation-method-card">
        ${otherPairs.map(p => `<p><span class="community-field__label">${esc(p.label)}</span> ${esc(String(p.value))}</p>`).join('')}
        <div class="donation-method-card__actions">
          ${actionButtons}
          <button type="button" class="btn btn--intent btn--small js-intent" data-submission-id="${esc(submissionId)}" data-method="${esc(methodLabel)}">I Intend to Donate</button>
        </div>
        ${(type === 'paypal' || (type === 'stripe' && !hasPaypal)) ? `<p class="donation-note">Clicking the donate button takes you to the payment site. No donation is made until you complete the process there. You may also log your intent now and donate when you\'re ready.</p>` : ''}
      </div>`;
  }).join('')}</div>`;
}

// ─── Intent Modal ─────────────────────────────────────────────────────────────
function initIntentModal() {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div id="intent-modal" class="donation-modal" hidden>
      <div class="donation-modal__backdrop" data-close-intent-modal></div>
      <div class="donation-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="intent-modal-title">
        <button type="button" class="donation-modal__close" aria-label="Close" data-close-intent-modal>&times;</button>
        <div class="donation-modal__content">

          <div id="intent-form-view">
            <h3 id="intent-modal-title">I Intend to Donate</h3>
            <p class="section-desc" id="intent-modal-community"></p>
            <p class="donation-note" style="margin-bottom:1rem;">Logging your intent does not complete a donation. It helps this community understand how much support is on the way. Donate at your convenience using the payment button.</p>
            <div id="intent-error" class="donation-message donation-message--error" hidden></div>
            <form id="intent-form" class="donation-form">
              <label>
                <span>Display Name (optional — shown on leaderboard)</span>
                <input type="text" name="donor_name" maxlength="120" />
              </label>
              <label>
                <span>Email (optional — for future updates)</span>
                <input type="email" name="donor_email" maxlength="160" />
              </label>
              <label>
                <span>Intended Amount (USD)</span>
                <input type="number" name="amount" min="0.01" step="0.01" required />
              </label>
              <label>
                <span>Message to Community (optional)</span>
                <textarea name="wall_message" rows="3" maxlength="500"></textarea>
              </label>
              <label class="donation-form__checkbox">
                <input type="checkbox" name="display_on_wall" />
                <span>Show my name and message on the recognition wall</span>
              </label>
              <button type="submit" class="btn btn--primary">Log My Intent</button>
            </form>
          </div>

          <div id="intent-confirm-view" class="donation-confirm" hidden>
            <div class="donation-confirm__icon" aria-hidden="true">&#10003;</div>
            <h3 class="donation-confirm__title">Intent Logged!</h3>
            <p id="intent-confirm-message" class="donation-confirm__message"></p>
            <p class="donation-confirm__closing">This window will close automatically.</p>
          </div>

        </div>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper.firstElementChild);

  intentModalEl   = document.getElementById('intent-modal');
  intentFormEl    = document.getElementById('intent-form');
  intentConfirmEl = document.getElementById('intent-confirm-view');

  intentModalEl.addEventListener('click', e => {
    if (e.target.matches('[data-close-intent-modal]')) closeIntentModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && intentModalEl && !intentModalEl.hidden) closeIntentModal();
  });

  intentFormEl.addEventListener('submit', handleIntentSubmit);
  intentFormEl.donor_name.addEventListener('input', () => {
    intentFormEl.display_on_wall.checked = Boolean(intentFormEl.donor_name.value.trim());
  });
}

function bindIntentButtons() {
  document.querySelectorAll('.js-intent').forEach(btn => {
    btn.addEventListener('click', () => openIntentModal(btn.dataset.submissionId, btn.dataset.method));
  });
}

function openIntentModal(submissionId, method) {
  activeSubmissionId = submissionId;
  activeMethod = method || '';

  const community = communityLookup.get(submissionId);
  const communityLabel = community ? community.community_name : 'this community';

  intentFormEl.reset();
  intentFormEl.display_on_wall.checked = false;
  document.getElementById('intent-error').hidden = true;
  document.getElementById('intent-form-view').hidden = false;
  intentConfirmEl.hidden = true;
  document.getElementById('intent-modal-community').textContent = `Logging intent to donate to ${communityLabel}.`;

  intentModalEl.hidden = false;
  document.body.classList.add('modal-open');
  intentFormEl.amount.focus();
}

function closeIntentModal() {
  intentModalEl.hidden = true;
  document.body.classList.remove('modal-open');
  activeSubmissionId = null;
  activeMethod = null;
}

async function handleIntentSubmit(event) {
  event.preventDefault();
  if (!activeSubmissionId) return;

  const submitBtn = intentFormEl.querySelector('button[type="submit"]');
  const errorEl   = document.getElementById('intent-error');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging...';
  errorEl.hidden = true;

  const donorName    = intentFormEl.donor_name.value.trim();
  const donorEmail   = intentFormEl.donor_email.value.trim();
  const amount       = Number(intentFormEl.amount.value);
  const wallMessage  = intentFormEl.wall_message.value.trim();
  const displayOnWall = intentFormEl.display_on_wall.checked;

  try {
    const { error } = await supabase.from('donations').insert({
      submission_id:   activeSubmissionId,
      donor_name:      donorName || null,
      donor_email:     donorEmail || null,
      amount,
      method:          activeMethod,
      status:          'self_reported',
      donation_type:   'intent',
      weight:          0.250,
      display_on_wall: displayOnWall,
      wall_message:    wallMessage || null,
    });

    if (error) throw error;

    document.getElementById('intent-form-view').hidden = true;
    document.getElementById('intent-confirm-message').textContent = donorEmail
      ? `Your intent has been logged. We\'ll keep you updated at ${donorEmail}.`
      : 'Your intent has been logged. Thank you for your support.';
    intentConfirmEl.hidden = false;
    setTimeout(() => closeIntentModal(), 4000);

  } catch (err) {
    console.error('[community] intent submit error:', err);
    errorEl.textContent = err?.message || 'Unable to log intent right now. Please try again.';
    errorEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Log My Intent';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getMethodLabel(row, pairs) {
  const preferred = ['method', 'type', 'platform', 'provider', 'channel'];
  for (const key of preferred) {
    if (row[key]) return String(row[key]);
  }
  const firstNonLink = pairs.find(p => !(p.label.toLowerCase().includes('link') || p.label.toLowerCase().includes('url')));
  return firstNonLink ? String(firstNonLink.value) : 'Donation';
}

function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

loadCommunities();
