/**
 * donate-instructions.js
 *
 * Dynamically builds the donation instruction page for postal and crypto methods.
 * URL params: ?submission_id=<uuid>&method=postal|crypto
 */

import supabase from './supabase.js';

const params       = new URLSearchParams(window.location.search);
const submissionId = params.get('submission_id');
const method       = (params.get('method') || '').toLowerCase();

const loadingEl    = document.getElementById('instructions-loading');
const contentEl    = document.getElementById('instructions-content');

if (!submissionId || !['postal', 'crypto'].includes(method)) {
  loadingEl.textContent = 'Invalid link. Please return to the community page.';
} else {
  loadInstructions();
}

async function loadInstructions() {
  const [{ data: submission, error: subErr }, { data: donationMethods, error: dmErr }] = await Promise.all([
    supabase.from('submissions').select('id, community_name, location').eq('id', submissionId).eq('status', 'approved').single(),
    supabase.from('submission_donations').select('*').eq('submission_id', submissionId).order('sort_order'),
  ]);

  if (subErr || !submission) {
    loadingEl.textContent = 'Community not found or not yet approved.';
    return;
  }

  const relevantMethods = (donationMethods || []).filter(row => {
    const vals = Object.values(row).map(v => String(v || '').toLowerCase()).join(' ');
    if (method === 'postal') return vals.includes('postal') || vals.includes('mail') || vals.includes('check');
    if (method === 'crypto') return vals.includes('crypto') || vals.includes('bitcoin') || vals.includes('ethereum') || vals.includes('btc') || vals.includes('eth');
    return false;
  });

  document.title = `${method === 'postal' ? 'Mail a Donation' : 'Send Crypto'} — ${submission.community_name}`;
  document.getElementById('instructions-heading').textContent =
    method === 'postal' ? `Mail a Donation to ${submission.community_name}` : `Send Crypto to ${submission.community_name}`;
  document.getElementById('instructions-subheading').textContent =
    method === 'postal'
      ? 'Send a check or money order using the mailing information below.'
      : 'Send cryptocurrency using the wallet address below.';

  const detailsEl = document.getElementById('instructions-details');
  const skip = ['id', 'submission_id', 'sort_order'];

  relevantMethods.forEach(row => {
    const card = document.createElement('div');
    card.className = 'instructions-method-card';
    Object.entries(row).filter(([k]) => !skip.includes(k) && row[k]).forEach(([k, v]) => {
      const p = document.createElement('p');
      p.innerHTML = `<span class="community-field__label">${k.replace(/_/g,' ')}</span> ${esc(String(v))}`;
      card.appendChild(p);
    });
    detailsEl.appendChild(card);
  });

  loadingEl.style.display = 'none';
  contentEl.hidden = false;

  // Wire up Consider It Done
  const considerBtn  = document.getElementById('consider-done-btn');
  const formWrap     = document.getElementById('consider-form-wrap');
  const considerForm = document.getElementById('consider-form');
  const confirmEl    = document.getElementById('consider-confirm');
  const errorEl      = document.getElementById('consider-error');

  considerBtn.addEventListener('click', () => {
    document.getElementById('consider-block').hidden = true;
    formWrap.hidden = false;
    considerForm.amount.focus();
  });

  considerForm.donor_name.addEventListener('input', () => {
    considerForm.display_on_wall.checked = Boolean(considerForm.donor_name.value.trim());
  });

  considerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = considerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    errorEl.hidden = true;

    const donorName    = considerForm.donor_name.value.trim();
    const donorEmail   = considerForm.donor_email.value.trim();
    const amount       = Number(considerForm.amount.value);
    const txRef        = considerForm.transaction_reference.value.trim();
    const wallMessage  = considerForm.wall_message.value.trim();
    const displayOnWall = considerForm.display_on_wall.checked;

    try {
      const { data, error } = await supabase.from('donations').insert({
        submission_id:         submissionId,
        donor_name:            donorName || null,
        donor_email:           donorEmail || null,
        amount,
        method:                method,
        transaction_reference: txRef || null,
        status:                'self_reported',
        donation_type:         'self_reported',
        weight:                0.750,
        display_on_wall:       displayOnWall,
        wall_message:          wallMessage || null,
      }).select('id').single();

      if (error) throw error;

      if (donorEmail && data?.id) {
        const { error: fnErr } = await supabase.functions.invoke('send-donation-receipt', { body: { donation_id: data.id } });
        if (fnErr) console.error('[instructions] receipt error:', fnErr);
      }

      considerForm.hidden = true;
      document.getElementById('consider-confirm-message').textContent = donorEmail
        ? `Your donation has been recorded. A receipt is on its way to ${donorEmail}.`
        : 'Your donation has been recorded. Thank you for your support.';
      confirmEl.hidden = false;

    } catch (err) {
      console.error('[instructions] consider-done error:', err);
      errorEl.textContent = err?.message || 'Unable to record donation. Please try again.';
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
    }
  });
}

function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
