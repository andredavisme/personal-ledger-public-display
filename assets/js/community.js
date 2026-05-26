/**
 * community.js — Public Community Pages
 *
 * Loads all approved submissions and their child tables from Supabase
 * and renders them as public-facing community cards.
 *
 * No auth required — this page is fully public.
 * Email addresses are intentionally omitted from the public display.
 */

import supabase from './supabase.js';

const listEl    = document.getElementById('community-list');
const loadingEl = document.getElementById('community-loading');
const emptyEl   = document.getElementById('community-empty');

let donationModalEl = null;
let donationFormEl = null;
let donationMessageEl = null;
let activeSubmissionId = null;
let activeMethod = null;
let communityLookup = new Map();

initDonationModal();

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
  bindDonationButtons();
}

// ─── Card Builder ───────────────────────────────────────────────────────────
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
        <div class="community-field">
          <span class="community-field__label">Mission</span>
          <p class="community-field__value">${esc(s.mission || '')}</p>
        </div>
        <div class="community-field">
          <span class="community-field__label">Values</span>
          <p class="community-field__value">${esc(s.values || '')}</p>
        </div>
        <div class="community-field">
          <span class="community-field__label">Local Vision</span>
          <p class="community-field__value">${esc(s.local_vision || '')}</p>
        </div>
        ${s.universal_vision ? `
        <div class="community-field">
          <span class="community-field__label">Universal Vision</span>
          <p class="community-field__value">${esc(s.universal_vision)}</p>
        </div>` : ''}
      </div>
    </section>

    ${s.financials.length ? `
    <section class="community-card__section">
      <h4>Financial History</h4>
      <p class="section-desc">Past income and expenses submitted by this community.</p>
      ${buildTable(s.financials)}
    </section>` : ''}

    ${s.budget.length ? `
    <section class="community-card__section">
      <h4>Budget Needs</h4>
      <p class="section-desc">Items this community needs to purchase, expects to purchase, or is planning for.</p>
      ${buildTable(s.budget)}
    </section>` : ''}

    <section class="community-card__section">
      <h4>Transparency</h4>
      <div class="community-card__fields">
        <div class="community-field">
          <span class="community-field__label">How Donations Are Tracked</span>
          <p class="community-field__value">${esc(s.donation_transparency || '')}</p>
        </div>
        ${s.application_transparency ? `
        <div class="community-field">
          <span class="community-field__label">How Donations Are Applied</span>
          <p class="community-field__value">${esc(s.application_transparency)}</p>
        </div>` : ''}
      </div>
    </section>

    ${s.donations.length ? `
    <section class="community-card__section">
      <h4>How to Donate</h4>
      <p class="section-desc">Accepted donation methods submitted by this community.</p>
      ${buildDonationList(s.id, s.donations)}
    </section>` : ''}
  `;

  return article;
}

// ─── Table Renderer ───────────────────────────────────────────────────────────
function buildTable(rows) {
  const skip    = ['id', 'submission_id', 'sort_order'];
  const headers = Object.keys(rows[0]).filter(h => !skip.includes(h));
  const head    = headers.map(h => `<th>${h.replace(/_/g, ' ')}</th>`).join('');
  const body    = rows.map(row =>
    `<tr>${headers.map(h => `<td>${esc(String(row[h] ?? ''))}</td>`).join('')}</tr>`
  ).join('');
  return `
    <div class="csv-table-wrap">
      <table class="csv-table">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

// ─── Donation List Renderer ────────────────────────────────────────────────────
function buildDonationList(submissionId, rows) {
  const cols = Object.keys(rows[0]).filter(h => !['id', 'submission_id', 'sort_order'].includes(h));

  if (cols.length <= 4) {
    return `<div class="donation-methods">${rows.map(row => {
      const pairs = cols.map(c => ({ key: c, label: c.replace(/_/g, ' '), value: row[c] })).filter(p => p.value);
      const linkPair = pairs.find(p => p.label.toLowerCase().includes('link') || p.label.toLowerCase().includes('url'));
      const otherPairs = pairs.filter(p => p !== linkPair);
      const methodValue = getMethodValue(row, pairs);
      return `
        <div class="donation-method-card">
          ${otherPairs.map(p => `
            <p><span class="community-field__label">${esc(p.label)}</span> ${esc(String(p.value))}</p>
          `).join('')}
          <div class="donation-method-card__actions">
            ${linkPair ? `<a href="${esc(String(linkPair.value))}" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--small" style="margin-top:0.5rem;">Donate</a>` : ''}
            <button type="button" class="btn btn--secondary btn--small js-i-donated" data-submission-id="${esc(submissionId)}" data-method="${esc(methodValue)}">I Donated</button>
          </div>
        </div>`;
    }).join('')}</div>`;
  }

  return buildTable(rows);
}

// ─── Donation Modal ───────────────────────────────────────────────────────────
function initDonationModal() {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div id="donation-modal" class="donation-modal" hidden>
      <div class="donation-modal__backdrop" data-close-donation-modal></div>
      <div class="donation-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="donation-modal-title">
        <button type="button" class="donation-modal__close" aria-label="Close donation form" data-close-donation-modal>&times;</button>
        <div class="donation-modal__content">
          <h3 id="donation-modal-title">Report Your Donation</h3>
          <p class="section-desc" id="donation-modal-community"></p>
          <div id="donation-message" class="donation-message" hidden></div>
          <form id="donation-form" class="donation-form">
            <label>
              <span>Donor Name (optional)</span>
              <input type="text" name="donor_name" maxlength="120" />
            </label>
            <label>
              <span>Donor Email (optional, for receipt)</span>
              <input type="email" name="donor_email" maxlength="160" />
            </label>
            <label>
              <span>Amount (USD)</span>
              <input type="number" name="amount" min="0.01" step="0.01" required />
            </label>
            <label>
              <span>Method</span>
              <input type="text" name="method" required />
            </label>
            <label>
              <span>Transaction Reference (optional)</span>
              <input type="text" name="transaction_reference" maxlength="160" />
            </label>
            <label class="donation-form__checkbox">
              <input type="checkbox" name="display_on_wall" />
              <span>Display on recognition wall</span>
            </label>
            <label>
              <span>Message to Community (optional)</span>
              <textarea name="wall_message" rows="4" maxlength="500"></textarea>
            </label>
            <p class="donation-form__disclaimer">This is a self-reported record of your donation. It is not a tax receipt. Please retain your payment confirmation from your payment provider for tax purposes.</p>
            <button type="submit" class="btn btn--primary">Submit Donation</button>
          </form>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper.firstElementChild);

  donationModalEl = document.getElementById('donation-modal');
  donationFormEl = document.getElementById('donation-form');
  donationMessageEl = document.getElementById('donation-message');

  donationModalEl.addEventListener('click', (event) => {
    if (event.target.matches('[data-close-donation-modal]')) closeDonationModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && donationModalEl && !donationModalEl.hidden) closeDonationModal();
  });

  donationFormEl.addEventListener('submit', handleDonationSubmit);
  donationFormEl.donor_name.addEventListener('input', syncWallConsentDefault);
}

function bindDonationButtons() {
  document.querySelectorAll('.js-i-donated').forEach(btn => {
    btn.addEventListener('click', () => openDonationModal(btn.dataset.submissionId, btn.dataset.method));
  });
}

function openDonationModal(submissionId, method) {
  activeSubmissionId = submissionId;
  activeMethod = method || '';

  const community = communityLookup.get(submissionId);
  const communityLabel = community ? community.community_name : 'this community';

  donationFormEl.reset();
  donationFormEl.method.value = activeMethod;
  donationFormEl.display_on_wall.checked = Boolean(donationFormEl.donor_name.value.trim());
  donationMessageEl.hidden = true;
  donationMessageEl.textContent = '';
  donationMessageEl.className = 'donation-message';
  document.getElementById('donation-modal-community').textContent = `You are reporting a donation to ${communityLabel}.`;

  donationModalEl.hidden = false;
  document.body.classList.add('modal-open');
  donationFormEl.amount.focus();
}

function closeDonationModal() {
  donationModalEl.hidden = true;
  document.body.classList.remove('modal-open');
  activeSubmissionId = null;
  activeMethod = null;
}

function syncWallConsentDefault() {
  if (!donationFormEl) return;
  if (!donationFormEl.donor_name.value.trim()) {
    donationFormEl.display_on_wall.checked = false;
    return;
  }
  donationFormEl.display_on_wall.checked = true;
}

async function handleDonationSubmit(event) {
  event.preventDefault();

  if (!activeSubmissionId) return;

  const submitButton = donationFormEl.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Submitting...';

  const donorName = donationFormEl.donor_name.value.trim();
  const donorEmail = donationFormEl.donor_email.value.trim();
  const amount = Number(donationFormEl.amount.value);
  const method = donationFormEl.method.value.trim() || activeMethod;
  const transactionReference = donationFormEl.transaction_reference.value.trim();
  const displayOnWall = donationFormEl.display_on_wall.checked;
  const wallMessage = donationFormEl.wall_message.value.trim();

  try {
    const payload = {
      submission_id: activeSubmissionId,
      donor_name: donorName || null,
      donor_email: donorEmail || null,
      amount,
      method,
      transaction_reference: transactionReference || null,
      status: 'self_reported',
      display_on_wall: displayOnWall,
      wall_message: wallMessage || null,
    };

    const { data, error } = await supabase
      .from('donations')
      .insert(payload)
      .select('id')
      .single();

    if (error) throw error;

    if (donorEmail && data?.id) {
      const { error: fnError } = await supabase.functions.invoke('send-donation-receipt', {
        body: { donation_id: data.id },
      });
      if (fnError) {
        console.error('[community] receipt send error:', fnError);
      }
    }

    donationMessageEl.textContent = donorEmail
      ? 'Thank you. Your donation was recorded and your receipt email is on the way.'
      : 'Thank you. Your donation was recorded.';
    donationMessageEl.className = 'donation-message donation-message--success';
    donationMessageEl.hidden = false;

    setTimeout(() => closeDonationModal(), 1600);
  } catch (error) {
    console.error('[community] donation submit error:', error);
    donationMessageEl.textContent = error?.message || 'Unable to record donation right now. Please try again.';
    donationMessageEl.className = 'donation-message donation-message--error';
    donationMessageEl.hidden = false;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Submit Donation';
  }
}

function getMethodValue(row, pairs) {
  const preferred = ['method', 'type', 'platform', 'provider', 'channel'];
  for (const key of preferred) {
    if (row[key]) return String(row[key]);
  }
  const firstNonLink = pairs.find(p => !(p.label.toLowerCase().includes('link') || p.label.toLowerCase().includes('url')));
  return firstNonLink ? String(firstNonLink.value) : 'Donation';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

loadCommunities();
