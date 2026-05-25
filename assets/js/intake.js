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
 *
 * MIGRATION NOTE:
 * This file uses the Supabase client from supabase.js.
 * No changes needed here on auth provider migration.
 * If the ledger schema changes, update the INSERT calls below.
 */

import supabase from './supabase.js';

const form = document.getElementById('intake-form');

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
  if (rows.length === 0) errors.push('At least one donation method is required.');
  rows.forEach((r, i) => {
    if (!validMethods.includes(r.method?.toLowerCase())) errors.push(`Row ${i + 2}: method must be one of PayPal, Stripe, Postal, POS, Manual, Cryptocurrency.`);
    if (!r.handle_or_address) errors.push(`Row ${i + 2}: handle or address is required.`);
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

function showSuccess() {
  form.innerHTML = `
    <div class="notice notice--tip" style="margin-top:2rem;text-align:center;padding:2.5rem;">
      <h3 style="margin-bottom:0.75rem;">Submission received ✔</h3>
      <p>Thank you. Your submission is under review. You will be contacted at the email address you provided if any corrections are needed.</p>
    </div>`;
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

    const donationInserts = donationRows.map((r, i) => {
      const methodMap = { paypal: 'PayPal', stripe: 'Stripe', postal: 'Postal', pos: 'POS', manual: 'Manual', cryptocurrency: 'Cryptocurrency' };
      return {
        submission_id:     submissionId,
        method:            methodMap[r.method?.toLowerCase()] || r.method,
        handle_or_address: r.handle_or_address,
        notes:             r.notes || null,
        sort_order:        i
      };
    });

    const [{ error: fErr }, { error: bErr }, { error: dErr }] = await Promise.all([
      supabase.schema('ledger').from('submission_financials').insert(financialInserts),
      supabase.schema('ledger').from('submission_budget').insert(budgetInserts),
      supabase.schema('ledger').from('submission_donations').insert(donationInserts)
    ]);

    if (fErr) throw fErr;
    if (bErr) throw bErr;
    if (dErr) throw dErr;

    showSuccess();

  } catch (err) {
    console.error('[Intake] Submission error:', err);
    setSubmitting(false);
    const notice = document.createElement('div');
    notice.className = 'notice notice--warning';
    notice.innerHTML = `<strong>Submission failed.</strong> Please try again. If the problem persists, contact the administrator.<br><small>${err.message}</small>`;
    form.prepend(notice);
  }
});
