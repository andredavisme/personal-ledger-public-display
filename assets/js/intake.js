/**
 * intake.js — Intake Form Handler
 *
 * Handles the community submission form:
 * 1. Client-side validation of all required fields and CSV files
 * 2. CSV parsing — programmatic read of uploaded files, no server required
 * 3. Submission to Supabase ledger schema:
 *    - ledger.submissions          (core form data)
 *    - ledger.submission_financials (parsed financial CSV rows)
 *    - ledger.submission_budget     (parsed budget CSV rows)
 *    - ledger.submission_donations  (parsed donation CSV rows)
 * 4. Confirmation modal — shown after database receipt is verified
 *
 * KNOWN BEHAVIOUR:
 * - Donation CSV rows with an empty handle_or_address are skipped (not an error).
 *   The template includes placeholder rows for methods not actively used.
 * - This file must be loaded with type="module" in the HTML script tag.
 */

import supabase from './supabase.js';

const form  = document.getElementById('intake-form');
const modal = document.getElementById('submission-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');

// ─── Modal ───────────────────────────────────────────────────────────────────

function openModal() {
  modal.classList.add('is-open');
  modalCloseBtn.focus();
}

function closeModal() {
  modal.classList.remove('is-open');
}

modalCloseBtn?.addEventListener('click', closeModal);

// Close on backdrop click
modal?.addEventListener('click', e => {
  if (e.target === modal) closeModal();
});

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
});

// ─── CSV Parser ──────────────────────────────────────────────────────────────

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

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsText(file);
  });
}

// ─── CSV Validators ─────────────────────────────────────────────────────────

function validateFinancials(rows) {
  const errors = [];
  const hasIncome  = rows.some(r => r.section === 'income');
  const hasExpense = rows.some(r => r.section === 'expense');
  if (!hasIncome)  errors.push('Financial statements must include at least one income row.');
  if (!hasExpense) errors.push('Financial statements must include at least one expense row.');
  rows.forEach((r, i) => {
    if (!r.name)   errors.push(`Row ${i + 2}: missing name.`);
    if (!r.amount || isNaN(Number(r.amount))) errors.push(`Row ${i + 2}: amount must be a number.`);
  });
  return errors;
}

function validateBudget(rows) {
  const errors = [];
  const validStatuses = ['purchased', 'expected', 'desired', 'contingency'];
  const hasRequired = rows.some(r => ['purchased', 'expected', 'contingency'].includes(r.status));
  if (!hasRequired) errors.push('Budget must include at least one purchased, expected, or contingency row.');
  rows.forEach((r, i) => {
    if (!r.item) errors.push(`Row ${i + 2}: missing item name.`);
    if (!validStatuses.includes(r.status)) errors.push(`Row ${i + 2}: status must be purchased, expected, desired, or contingency.`);
  });
  return errors;
}

function validateDonations(rows) {
  const errors = [];
  const validMethods = ['paypal', 'stripe', 'postal', 'pos', 'manual', 'cryptocurrency'];
  // Filter to rows that have a valid method with a populated handle — template rows without
  // a handle are treated as placeholder-only and skipped, not an error.
  const activeRows = rows.filter(r => r.method && validMethods.includes(r.method.toLowerCase()) && r.handle_or_address?.trim());
  if (activeRows.length === 0) errors.push('At least one donation method with a handle or address is required.');
  rows.forEach((r, i) => {
    if (r.method && !validMethods.includes(r.method.toLowerCase())) {
      errors.push(`Row ${i + 2}: method "${r.method}" is not recognised. Use PayPal, Stripe, Postal, POS, Manual, or Cryptocurrency.`);
    }
  });
  return errors;
}

// ─── UI Helpers ─────────────────────────────────────────────────────────────────

function showError(fieldId, message) {
  clearError(fieldId);
  const field = document.getElementById(fieldId);
  const el = document.createElement('p');
  el.className = 'validation-error';
  el.textContent = message;
  el.id = `error-${fieldId}`;
  field?.parentElement?.appendChild(el);
}

function clearError(fieldId) {
  document.getElementById(`error-${fieldId}`)?.remove();
}

function clearAllErrors() {
  document.querySelectorAll('.validation-error, .validation-warning').forEach(el => el.remove());
}

function setSubmitting(isSubmitting) {
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = isSubmitting;
  btn.textContent = isSubmitting ? 'Submitting…' : 'Submit for Review';
}

// ─── Form Submit Handler ────────────────────────────────────────────────────────

form.addEventListener('submit', async event => {
  event.preventDefault();
  clearAllErrors();

  const data = new FormData(form);
  let valid = true;

  // Required text fields
  const required = ['full_name','email','community_name','location','mission','values','local_vision','donation_transparency'];
  required.forEach(field => {
    if (!data.get(field)?.trim()) {
      showError(field, 'This field is required.');
      valid = false;
    }
  });

  // Required file fields
  const financialsFile = data.get('financials_csv');
  const budgetFile     = data.get('budget_csv');
  const donationFile   = data.get('donation_csv');

  if (!financialsFile?.size) { showError('financials_csv', 'A financial statements CSV is required.'); valid = false; }
  if (!budgetFile?.size)     { showError('budget_csv',     'A budget CSV is required.'); valid = false; }
  if (!donationFile?.size)   { showError('donation_csv',   'A donation and payment CSV is required.'); valid = false; }

  if (!valid) return;

  setSubmitting(true);

  try {
    // Parse CSVs
    const [financialsText, budgetText, donationText] = await Promise.all([
      readFile(financialsFile),
      readFile(budgetFile),
      readFile(donationFile)
    ]);

    const financialRows = parseCSV(financialsText);
    const budgetRows    = parseCSV(budgetText);
    const donationRows  = parseCSV(donationText);

    // Validate CSVs
    const financialErrors = validateFinancials(financialRows);
    const budgetErrors    = validateBudget(budgetRows);
    const donationErrors  = validateDonations(donationRows);

    if (financialErrors.length) { financialErrors.forEach(e => showError('financials_csv', e)); setSubmitting(false); return; }
    if (budgetErrors.length)    { budgetErrors.forEach(e    => showError('budget_csv',     e)); setSubmitting(false); return; }
    if (donationErrors.length)  { donationErrors.forEach(e  => showError('donation_csv',   e)); setSubmitting(false); return; }

    // Insert core submission
    const { data: submission, error: submissionError } = await supabase
      .schema('ledger')
      .from('submissions')
      .insert({
        full_name:                data.get('full_name').trim(),
        email:                    data.get('email').trim(),
        community_name:           data.get('community_name').trim(),
        location:                 data.get('location').trim(),
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

    // Verify the submission exists in the database before showing confirmation
    const { data: verify, error: verifyError } = await supabase
      .schema('ledger')
      .from('submissions')
      .select('id, status')
      .eq('id', submissionId)
      .single();

    if (verifyError || !verify) throw new Error('Submission could not be verified. Please try again.');

    // Insert CSV rows in parallel
    const financialInserts = financialRows.map((r, i) => ({
      submission_id: submissionId,
      section:       r.section,
      name:          r.name,
      amount:        Number(r.amount),
      notes:         r.notes || null,
      sort_order:    i
    }));

    const budgetInserts = budgetRows.map((r, i) => ({
      submission_id:  submissionId,
      status:         r.status,
      item:           r.item,
      estimated_cost: r.estimated_cost ? Number(r.estimated_cost) : null,
      actual_cost:    r.actual_cost    ? Number(r.actual_cost)    : null,
      notes:          r.notes || null,
      sort_order:     i
    }));

    const validMethods = ['paypal', 'stripe', 'postal', 'pos', 'manual', 'cryptocurrency'];
    const methodMap = { paypal: 'PayPal', stripe: 'Stripe', postal: 'Postal', pos: 'POS', manual: 'Manual', cryptocurrency: 'Cryptocurrency' };
    // Only insert donation rows that have an active handle — skip template placeholders
    const donationInserts = donationRows
      .filter(r => r.method && validMethods.includes(r.method.toLowerCase()) && r.handle_or_address?.trim())
      .map((r, i) => ({
        submission_id:     submissionId,
        method:            methodMap[r.method.toLowerCase()] || r.method,
        handle_or_address: r.handle_or_address,
        notes:             r.notes || null,
        sort_order:        i
      }));

    const [{ error: fErr }, { error: bErr }, { error: dErr }] = await Promise.all([
      supabase.schema('ledger').from('submission_financials').insert(financialInserts),
      supabase.schema('ledger').from('submission_budget').insert(budgetInserts),
      donationInserts.length
        ? supabase.schema('ledger').from('submission_donations').insert(donationInserts)
        : Promise.resolve({ error: null })
    ]);

    if (fErr) throw fErr;
    if (bErr) throw bErr;
    if (dErr) throw dErr;

    // Reset form and show confirmation modal
    form.reset();
    openModal();

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
