/**
 * admin-test-panel.js
 * Activated only when ?dev=true is in the URL.
 * Provides buttons to fire Edge Functions without creating a real submission.
 */

import Auth from './auth.js';
import supabase from './supabase.js';

const EDGE_BASE = 'https://hhyhulqngdkwsxhymmcd.supabase.co/functions/v1';

const params = new URLSearchParams(window.location.search);
if (params.get('dev') === 'true') {
  // Show the panel once auth resolves
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

function showOutput(content) {
  const el = document.getElementById('test-panel-output');
  el.style.display = 'block';
  el.textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
}

async function getToken() {
  const session = Auth.getSession ? Auth.getSession() : null;
  return session?.access_token ?? '';
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
