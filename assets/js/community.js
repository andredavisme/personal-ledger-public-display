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
let activeMethod       = null;
let activePaymentData  = null;  // { type, handle, submissionId } — resolved to URL at confirm time
let communityLookup = new Map();

const SUPABASE_URL = 'https://hhyhulqngdkwsxhymmcd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_haKvwV0M7KMj4Qz69M6WGg_KmIfU-aI';

initIntentModal();

// ─── Load Data ────────────────────────────────────────────────────────────────────
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

// ─── Card Builder ─────────────────────────────────────────────────────────────────
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

    ${s.financials.length ? `<section class="community-card__section"><h4>Financial History</h4><p class="section-desc">Past income and expenses submitted by this community.</p>${buildTable(s.financials, ['name'])}</section>` : ''}
    ${s.budget.length ? `<section class="community-card__section"><h4>Budget Needs</h4><p class="section-desc">Items this community needs to purchase, expects to purchase, or is planning for.</p>${buildTable(s.budget, ['item'])}</section>` : ''}

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

// ─── Table Renderer ─────────────────────────────────────────────────────────────────
// allowedCols: optional array of column names to include. If omitted, all non-system cols are shown.
function buildTable(rows, allowedCols) {
  const skip    = ['id', 'submission_id', 'sort_order'];
  let headers   = Object.keys(rows[0]).filter(h => !skip.includes(h));
  if (allowedCols && allowedCols.length) {
    headers = headers.filter(h => allowedCols.includes(h));
  }
  const head = headers.map(h => `<th>${h.replace(/_/g, ' ')}</th>`).join('');
  const body = rows.map(row => `<tr>${headers.map(h => `<td>${esc(String(row[h] ?? ''))}</td>`).join('')}</tr>`).join('');
  return `<div class="csv-table-wrap"><table class="csv-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

// ─── Donation List Renderer ─────────────────────────────────────────────────────────────────
// Each card shows ONE button: "I Intend to Donate".
// Payment data is stored as JSON on the button and resolved to a URL at confirm time
// so the amount entered in the intent form can be pre-filled in the PayPal link.
function buildDonationList(submissionId, rows) {
  const cols = Object.keys(rows[0]).filter(h => !['id', 'submission_id', 'sort_order'].includes(h));

  if (cols.length > 4) return buildTable(rows);

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
    const pairs      = cols.map(c => ({ key: c, label: c.replace(/_/g, ' '), value: row[c] })).filter(p => p.value);
    const otherPairs = pairs.filter(p => !['link', 'url', 'handle_or_address'].some(k => p.key.toLowerCase().includes(k)));
    const methodLabel = getMethodLabel(row, pairs);

    // Resolve the handle/email field for PayPal/Stripe
    const handleVal = row['handle_or_address'] || row['handle'] || row['address'] || row['email'] || '';

    // Payment data stored as JSON — amount injected at confirm time
    let paymentData = null;
    if (type === 'paypal') {
      paymentData = JSON.stringify({ type: 'paypal', handle: handleVal });
    } else if (type === 'stripe' && !hasPaypal) {
      const linkPair = pairs.find(p => p.label.toLowerCase().includes('link') || p.label.toLowerCase().includes('url'));
      paymentData = JSON.stringify({ type: 'stripe', href: linkPair ? String(linkPair.value) : '' });
    } else if (type === 'postal') {
      paymentData = JSON.stringify({ type: 'postal', submissionId });
    } else if (type === 'crypto') {
      paymentData = JSON.stringify({ type: 'crypto', submissionId });
    } else {
      const linkPair = pairs.find(p => p.label.toLowerCase().includes('link') || p.label.toLowerCase().includes('url'));
      if (linkPair) paymentData = JSON.stringify({ type: 'other', href: String(linkPair.value) });
    }

    const encodedPayment = paymentData ? encodeURIComponent(paymentData) : '';

    return `
      <div class="donation-method-card">
        ${otherPairs.map(p => `<p><span class="community-field__label">${esc(p.label)}</span> ${esc(String(p.value))}</p>`).join('')}
        <div class="donation-method-card__actions">
          <button type="button" class="btn btn--intent btn--small js-intent"
            data-submission-id="${esc(submissionId)}"
            data-method="${esc(methodLabel)}"
            data-payment="${encodedPayment}">I Intend to Donate</button>
        </div>
      </div>`;
  }).join('')}</div>`;
}

// ─── Build payment button HTML at confirm time (so amount is available) ──────────────────
function buildPaymentButtonHtml(paymentData, amount) {
  if (!paymentData) return '';

  let data;
  try { data = JSON.parse(paymentData); } catch { return ''; }

  if (data.type === 'paypal' && data.handle) {
    const params = new URLSearchParams({ business: data.handle, currency_code: 'USD', no_recurring: '0' });
    if (amount && amount > 0) params.set('amount', amount.toFixed(2));
    return `<a href="https://www.paypal.com/donate?${params}" target="_blank" rel="noopener noreferrer" class="btn btn--paypal">Donate via PayPal</a>`;
  }

  if (data.type === 'stripe' && data.href) {
    return `<a href="${esc(data.href)}" target="_blank" rel="noopener noreferrer" class="btn btn--stripe">Donate via Stripe</a>`;
  }

  if (data.type === 'postal') {
    const params = new URLSearchParams({ submission_id: data.submissionId, method: 'postal' });
    return `<a href="donate-instructions.html?${params}" class="btn btn--instructions">How to Mail a Donation</a>`;
  }

  if (data.type === 'crypto') {
    const params = new URLSearchParams({ submission_id: data.submissionId, method: 'crypto' });
    return `<a href="donate-instructions.html?${params}" class="btn btn--instructions">How to Send Crypto</a>`;
  }

  if (data.type === 'other' && data.href) {
    return `<a href="${esc(data.href)}" target="_blank" rel="noopener noreferrer" class="btn btn--primary">Donate</a>`;
  }

  return '';
}

// ─── Intent Modal ─────────────────────────────────────────────────────────────────
function initIntentModal() {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div id="intent-modal" class="donation-modal" hidden>
      <div class="donation-modal__backdrop" data-close-intent-modal></div>
      <div class="donation-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="intent-modal-title">
        <button type="button" class="donation-modal__close" aria-label="Close" data-close-intent-modal>&times;</button>
        <div class="donation-modal__content">

          <!-- Step 1: Form -->
          <div id="intent-form-view">
            <h3 id="intent-modal-title">I Intend to Donate</h3>
            <p class="section-desc" id="intent-modal-community"></p>
            <p class="donation-note" style="margin-bottom:1rem;">Logging your intent does not complete a donation. It helps this community understand how much support is on the way. You can donate right after logging your intent.</p>
            <div id="intent-error" class="donation-message donation-message--error" hidden></div>
            <form id="intent-form" class="donation-form">
              <label>
                <span>Display Name (optional — shown on recognition wall)</span>
                <input type="text" name="donor_name" maxlength="120" />
              </label>
              <label>
                <span>Email (optional — for receipt and updates)</span>
                <input type="email" name="donor_email" maxlength="160" />
              </label>
              <label>
                <span>Intended Amount (USD) <span class="donation-form__hint">Suggested minimum: $15.00</span></span>
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
              <label class="donation-form__checkbox">
                <input type="checkbox" name="amount_visible_on_wall" />
                <span>Show my donation amount on the recognition wall</span>
              </label>
              <button type="submit" class="btn btn--primary">Log My Intent</button>
            </form>
          </div>

          <!-- Step 2: Confirmation + payment button -->
          <div id="intent-confirm-view" class="donation-confirm" hidden>
            <div class="donation-confirm__icon" aria-hidden="true">&#10003;</div>
            <h3 class="donation-confirm__title">Intent Logged!</h3>
            <p id="intent-confirm-message" class="donation-confirm__message"></p>
            <div id="intent-confirm-payment" class="donation-confirm__payment"></div>
            <p class="donation-confirm__closing">You can donate now or close this window and donate when you&rsquo;re ready.</p>
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
    btn.addEventListener('click', () => openIntentModal(
      btn.dataset.submissionId,
      btn.dataset.method,
      btn.dataset.payment
    ));
  });
}

function openIntentModal(submissionId, method, paymentEncoded) {
  activeSubmissionId = submissionId;
  activeMethod       = method || '';
  activePaymentData  = paymentEncoded ? decodeURIComponent(paymentEncoded) : null;

  const community = communityLookup.get(submissionId);
  const communityLabel = community ? community.community_name : 'this community';

  intentFormEl.reset();
  intentFormEl.display_on_wall.checked = false;
  intentFormEl.amount_visible_on_wall.checked = false;
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
  activeMethod       = null;
  activePaymentData  = null;
}

async function handleIntentSubmit(event) {
  event.preventDefault();
  if (!activeSubmissionId) return;

  const submitBtn = intentFormEl.querySelector('button[type="submit"]');
  const errorEl   = document.getElementById('intent-error');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging...';
  errorEl.hidden = true;

  const donorName           = intentFormEl.donor_name.value.trim();
  const donorEmail          = intentFormEl.donor_email.value.trim();
  const amount              = Number(intentFormEl.amount.value);
  const wallMessage         = intentFormEl.wall_message.value.trim();
  const displayOnWall       = intentFormEl.display_on_wall.checked;
  const amountVisibleOnWall = intentFormEl.amount_visible_on_wall.checked;

  try {
    const { data: inserted, error } = await supabase.from('donations').insert({
      submission_id:          activeSubmissionId,
      donor_name:             donorName || null,
      donor_email:            donorEmail || null,
      amount,
      method:                 activeMethod,
      status:                 'self_reported',
      donation_type:          'intent',
      weight:                 0.250,
      display_on_wall:        displayOnWall,
      amount_visible_on_wall: amountVisibleOnWall,
      wall_message:           wallMessage || null,
    }).select('id').single();

    if (error) throw error;

    // ── Call send-donation-receipt Edge Function ────────────────────────────────────────────
    // Non-blocking: receipt/wall insert failure does not prevent the
    // confirmation screen from showing. Errors are logged to console only.
    if (inserted?.id) {
      fetch(
        `${SUPABASE_URL}/functions/v1/send-donation-receipt`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ donation_id: inserted.id }),
        }
      ).then(async res => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.ok === false) {
          console.warn('[community] send-donation-receipt non-OK response:', json);
        }
      }).catch(err => {
        console.error('[community] send-donation-receipt fetch error:', err);
      });
    }
    // ─────────────────────────────────────────────────────────────────────────────

    // Build payment button now that we have the amount
    const paymentEl = document.getElementById('intent-confirm-payment');
    paymentEl.innerHTML = buildPaymentButtonHtml(activePaymentData, amount);

    document.getElementById('intent-confirm-message').textContent = donorEmail
      ? `Your intent has been logged. We'll keep you updated at ${donorEmail}.`
      : 'Your intent has been logged. Thank you for your support.';

    document.getElementById('intent-form-view').hidden = true;
    intentConfirmEl.hidden = false;

  } catch (err) {
    console.error('[community] intent submit error:', err);
    errorEl.textContent = err?.message || 'Unable to log intent right now. Please try again.';
    errorEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Log My Intent';
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────────────
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
