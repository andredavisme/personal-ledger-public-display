/**
 * intake.js — Intake Form Handler
 *
 * Flow:
 * 1. Validate required text fields and CSV files
 * 2. Parse CSVs in-browser
 * 3. Insert public.submissions (core record)
 * 4. Verify the insert landed in the database
 * 5. Insert CSV child rows in parallel
 * 6. Show confirmation modal with the submitter_reference echoed back
 *
 * submitter_reference:
 *   A free-text identifier chosen by the submitter (e.g. DAVIS-2026-001).
 *   Required. Not unique-constrained — the admin is alerted via
 *   public.submissions_with_collision view when the same reference
 *   appears on more than one submission.
 *
 * NOTE: This file must be loaded with type="module".
 */

import supabase from './supabase.js';

const form           = document.getElementById('intake-form');
const modal          = document.getElementById('submission-modal');
const modalCloseBtn  = document.getElementById('modal-close-btn');
const modalRefDisplay = document.getElementById('modal-ref-display');

// ─── Modal ──────────────────────────────────────────────────────────────

function openModal(reference) {
  if (modalRefDisplay) modalRefDisplay.textContent = reference || '—';
  modal.classList.add('is-open');
  modalCloseBtn.focus();
}

function closeModal() {
  modal.classList.remove('is-open');
}

modalCloseBtn?.addEventListener('click', closeModal);
modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modal?.classList.contains('is-open')) closeModal();
});

// ─── CSV Parser ─────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map((line, index) => {
    const values = line.split(',').map(v => v.trim());
    const row = { sort_order: index };
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

/**
 * Reads a File as text, forcing UTF-8 decoding.
 * Falls back gracefully for files saved with a BOM (e.g. Excel CSV UTF-8 BOM)
 * by stripping the BOM if present.
 */
function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      let text = e.target.result;
      // Strip UTF-8 BOM (\uFEFF) if present — Excel adds this
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      resolve(text);
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    // Explicitly request UTF-8 — handles é, ñ, ü, etc.
    reader.readAsText(file, 'UTF-8');
  });
}

// ─── Validators ─────────────────────────────────────────────────────────────

function validateFinancials(rows) {
  const errors = [];
  if (!rows.some(r => r.section === 'income'))  errors.push('Financial statements must include at least one income row.');
  if (!rows.some(r => r.section === 'expense')) errors.push('Financial statements must include at least one expense row.');
  rows.forEach((r, i) => {
    if (!r.name)   errors.push(`Row ${i + 2}: missing name.`);
    if (!r.amount || isNaN(Number(r.amount))) errors.push(`Row ${i + 2}: amount must be a number.`);
  });
  return errors;
}

function validateBudget(rows) {
  const errors = [];
  const valid = ['purchased', 'expected', 'desired', 'contingency'];
  if (!rows.some(r => ['purchased', 'expected', 'contingency'].includes(r.status)))
    errors.push('Budget must include at least one purchased, expected, or contingency row.');
  rows.forEach((r, i) => {
    if (!r.item) errors.push(`Row ${i + 2}: missing item name.`);
    if (!valid.includes(r.status)) errors.push(`Row ${i + 2}: status must be purchased, expected, desired, or contingency.`);
  });
  return errors;
}

function validateDonations(rows) {
  const errors = [];
  const validMethods = ['paypal', 'stripe', 'postal', 'pos', 'manual', 'cryptocurrency'];
  const active = rows.filter(r => r.method && validMethods.includes(r.method.toLowerCase()) && r.handle_or_address?.trim());
  if (active.length === 0) errors.push('At least one donation method with a handle or address is required.');
  rows.forEach((r, i) => {
    if (r.method && !validMethods.includes(r.method.toLowerCase()))
      errors.push(`Row ${i + 2}: "${r.method}" is not a recognised method.`);
  });
  return errors;
}

// ─── UI ────────────────────────────────────────────────────────────────────

function showError(fieldId, message) {
  clearError(fieldId);
  const el = document.createElement('p');
  el.className = 'validation-error';
  el.textContent = message;
  el.id = `error-${fieldId}`;
  document.getElementById(fieldId)?.parentElement?.appendChild(el);
}

function clearError(fieldId) { document.getElementById(`error-${fieldId}`)?.remove(); }

function clearAllErrors() {
  document.querySelectorAll('.validation-error, .validation-warning').forEach(el => el.remove());
}

function setSubmitting(is) {
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = is;
  btn.textContent = is ? 'Submitting…' : 'Submit for Review';
}

// ─── Submit ─────────────────────────────────────────────────────────────────

form.addEventListener('submit', async event => {
  event.preventDefault();
  clearAllErrors();

  const data  = new FormData(form);
  let valid = true;

  const required = [
    'full_name', 'email', 'community_name', 'location',
    'submitter_reference',
    'mission', 'values', 'local_vision', 'donation_transparency'
  ];
  required.forEach(field => {
    if (!data.get(field)?.trim()) { showError(field, 'This field is required.'); valid = false; }
  });

  const financialsFile = data.get('financials_csv');
  const budgetFile     = data.get('budget_csv');
  const donationFile   = data.get('donation_csv');

  if (!financialsFile?.size) { showError('financials_csv', 'A financial statements CSV is required.'); valid = false; }
  if (!budgetFile?.size)     { showError('budget_csv',     'A budget CSV is required.'); valid = false; }
  if (!donationFile?.size)   { showError('donation_csv',   'A donation and payment CSV is required.'); valid = false; }

  if (!valid) return;

  setSubmitting(true);

  try {
    const [financialsText, budgetText, donationText] = await Promise.all([
      readFile(financialsFile), readFile(budgetFile), readFile(donationFile)
    ]);

    const financialRows = parseCSV(financialsText);
    const budgetRows    = parseCSV(budgetText);
    const donationRows  = parseCSV(donationText);

    const fErrs = validateFinancials(financialRows);
    const bErrs = validateBudget(budgetRows);
    const dErrs = validateDonations(donationRows);

    if (fErrs.length) { fErrs.forEach(e => showError('financials_csv', e)); setSubmitting(false); return; }
    if (bErrs.length) { bErrs.forEach(e => showError('budget_csv',     e)); setSubmitting(false); return; }
    if (dErrs.length) { dErrs.forEach(e => showError('donation_csv',   e)); setSubmitting(false); return; }

    const submitterRef = data.get('submitter_reference').trim();

    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .insert({
        full_name:                data.get('full_name').trim(),
        email:                    data.get('email').trim(),
        community_name:           data.get('community_name').trim(),
        location:                 data.get('location').trim(),
        submitter_reference:      submitterRef,
        mission:                  data.get('mission').trim(),
        values:                   data.get('values').trim(),
        local_vision:             data.get('local_vision').trim(),
        universal_vision:         data.get('universal_vision')?.trim() || null,
        donation_transparency:    data.get('donation_transparency').trim(),
        application_transparency: data.get('application_transparency')?.trim() || null
      })
      .select('id')
      .single();

    if (submissionError) throw submissionError;

    const submissionId = submission.id;

    // Verify record landed before declaring success
    const { data: verify, error: verifyError } = await supabase
      .from('submissions')
      .select('id, status')
      .eq('id', submissionId)
      .single();

    if (verifyError || !verify) throw new Error('Submission could not be verified. Please try again.');

    // Insert CSV child rows
    const financialInserts = financialRows.map((r, i) => ({
      submission_id: submissionId, section: r.section, name: r.name,
      amount: Number(r.amount), notes: r.notes || null, sort_order: i
    }));

    const budgetInserts = budgetRows.map((r, i) => ({
      submission_id: submissionId, status: r.status, item: r.item,
      estimated_cost: r.estimated_cost ? Number(r.estimated_cost) : null,
      actual_cost:    r.actual_cost    ? Number(r.actual_cost)    : null,
      notes: r.notes || null, sort_order: i
    }));

    const validMethods = ['paypal','stripe','postal','pos','manual','cryptocurrency'];
    const methodMap = { paypal:'PayPal', stripe:'Stripe', postal:'Postal', pos:'POS', manual:'Manual', cryptocurrency:'Cryptocurrency' };
    const donationInserts = donationRows
      .filter(r => r.method && validMethods.includes(r.method.toLowerCase()) && r.handle_or_address?.trim())
      .map((r, i) => ({
        submission_id: submissionId,
        method: methodMap[r.method.toLowerCase()] || r.method,
        handle_or_address: r.handle_or_address,
        notes: r.notes || null, sort_order: i
      }));

    const [{ error: fe }, { error: be }, { error: de }] = await Promise.all([
      supabase.from('submission_financials').insert(financialInserts),
      supabase.from('submission_budget').insert(budgetInserts),
      donationInserts.length
        ? supabase.from('submission_donations').insert(donationInserts)
        : Promise.resolve({ error: null })
    ]);

    if (fe) throw fe;
    if (be) throw be;
    if (de) throw de;

    form.reset();
    openModal(submitterRef);

  } catch (err) {
    console.error('[Intake] Submission error:', err);
    setSubmitting(false);
    const notice = document.createElement('div');
    notice.className = 'notice notice--warning';
    notice.innerHTML = `<strong>Submission failed.</strong> Please try again. If the problem persists, contact the administrator.<br><small>${err.message}</small>`;
    form.prepend(notice);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});
