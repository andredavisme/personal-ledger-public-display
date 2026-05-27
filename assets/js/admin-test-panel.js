/**
 * admin-test-panel.js
 * Activated only when ?dev=true is in the URL.
 * Provides buttons to fire Edge Functions without creating a real submission.
 * Also provides a Test Data Manager to insert/delete a fixture submission.
 */

import Auth from './auth.js';
import supabase from './supabase.js';

const EDGE_BASE = 'https://hhyhulqngdkwsxhymmcd.supabase.co/functions/v1';
const TEST_UUID = '00000000-0000-0000-0000-000000000001';

const params = new URLSearchParams(window.location.search);
if (params.get('dev') === 'true') {
  Auth.onChange(user => {
    if (Auth.isAdmin()) {
      document.getElementById('dev-test-panel').style.display = 'block';
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSubmissionId() {
  return document.getElementById('test-submission-id')?.value.trim();
}

function showOutput(content, elId = 'test-panel-output') {
  const el = document.getElementById(elId);
  el.style.display = 'block';
  el.textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
}

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? '';
}

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

// ─── Delete all rows referencing TEST_UUID across all dependent tables ────────────
// Order matters: child tables before parent to avoid FK violations.
async function deleteAllTestRows() {
  const childTables = [
    'recognition_wall',
    'donations',
    'submission_financials',
    'submission_budget',
    'submission_donations',
  ];
  for (const table of childTables) {
    const { error } = await supabase.from(table).delete().eq('submission_id', TEST_UUID);
    if (error) console.warn(`[test-panel] delete from ${table}:`, error.message);
  }
  const { error } = await supabase.from('submissions').delete().eq('id', TEST_UUID);
  if (error) throw error;
}

// ─── Send Rejection Email ──────────────────────────────────────────────────────
document.getElementById('test-rejection-email-btn')?.addEventListener('click', async () => {
  const id = getSubmissionId();
  if (!id) { showOutput('⚠ Paste a submission UUID first.'); return; }

  showOutput('⏳ Calling send-rejection-email...');
  try {
    const token = await getToken();
    const res   = await fetch(`${EDGE_BASE}/send-rejection-email`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ submission_id: id }),
    });
    const data = await res.json();
    showOutput(`Status: ${res.status}\n\n${JSON.stringify(data, null, 2)}`);
  } catch (e) {
    showOutput(`❌ Error: ${e.message}`);
  }
});

// ─── Load Submission Info ──────────────────────────────────────────────────────
document.getElementById('test-load-submission-btn')?.addEventListener('click', async () => {
  const id = getSubmissionId();
  if (!id) { showOutput('⚠ Paste a submission UUID first.'); return; }

  showOutput('⏳ Fetching submission...');
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('id, email, full_name, community_name, status, rejection_reason_ids, rejection_notes, submitted_at, reviewed_at')
      .eq('id', id)
      .single();
    if (error) { showOutput(`❌ Supabase error:\n${JSON.stringify(error, null, 2)}`); return; }
    showOutput(data);
  } catch (e) {
    showOutput(`❌ Error: ${e.message}`);
  }
});

// ─── Insert Test Fixture ───────────────────────────────────────────────────────
// Uses upsert (onConflict: 'id') so the fixture can be re-inserted at any time
// without a prior delete, even if the record already exists with a different status.
document.getElementById('test-insert-fixture-btn')?.addEventListener('click', async () => {
  showOutput('⏳ Preparing test fixture...', 'fixture-output');
  try {
    const core          = JSON.parse(document.getElementById('fixture-core').value);
    const financialRows = parseCSV(document.getElementById('fixture-financials').value);
    const budgetRows    = parseCSV(document.getElementById('fixture-budget').value);
    const donationRows  = parseCSV(document.getElementById('fixture-donations').value);

    // Upsert core submission — overwrites existing record if UUID already exists
    const { error: coreErr } = await supabase
      .from('submissions')
      .upsert({ ...core, id: TEST_UUID, status: 'pending' }, { onConflict: 'id' });
    if (coreErr) throw coreErr;

    // Delete and re-insert CSV child rows to keep them fresh
    await Promise.all([
      supabase.from('submission_financials').delete().eq('submission_id', TEST_UUID),
      supabase.from('submission_budget').delete().eq('submission_id', TEST_UUID),
      supabase.from('submission_donations').delete().eq('submission_id', TEST_UUID),
    ]);

    const financialInserts = financialRows.map((r, i) => ({
      submission_id: TEST_UUID, section: r.section, name: r.name,
      amount: Number(r.amount), notes: r.notes || null, sort_order: i
    }));
    const budgetInserts = budgetRows.map((r, i) => ({
      submission_id: TEST_UUID, status: r.status, item: r.item,
      estimated_cost: r.estimated_cost ? Number(r.estimated_cost) : null,
      actual_cost:    r.actual_cost    ? Number(r.actual_cost)    : null,
      notes: r.notes || null, sort_order: i
    }));
    const methodMap = { paypal:'PayPal', stripe:'Stripe', postal:'Postal', pos:'POS', manual:'Manual', cryptocurrency:'Cryptocurrency' };
    const donationInserts = donationRows
      .filter(r => r.method && r.handle_or_address)
      .map((r, i) => ({
        submission_id: TEST_UUID,
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

    const idField = document.getElementById('test-submission-id');
    if (idField) idField.value = TEST_UUID;

    showOutput(`✅ Test submission inserted.\nUUID: ${TEST_UUID}\nThe Submission ID field above has been auto-filled.`, 'fixture-output');
  } catch (e) {
    showOutput(`❌ Error: ${e.message}\n\n${JSON.stringify(e, null, 2)}`, 'fixture-output');
  }
});

// ─── Delete Test Fixture ───────────────────────────────────────────────────────
// Deletes all dependent rows first (recognition_wall, donations, CSV tables)
// before removing the core submission to avoid foreign key violations.
document.getElementById('test-delete-fixture-btn')?.addEventListener('click', async () => {
  showOutput('⏳ Deleting test submission and all dependent rows...', 'fixture-output');
  try {
    await deleteAllTestRows();
    showOutput(`✅ Test submission ${TEST_UUID} and all dependent rows deleted.`, 'fixture-output');
  } catch (e) {
    showOutput(`❌ Error: ${e.message}`, 'fixture-output');
  }
});
