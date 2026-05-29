/**
 * admin-finance.js — Admin Finance Verification Panel
 *
 * Loads all community_financials rows newest first,
 * joined with submissions.community_name and submissions.email.
 *
 * Per-row actions:
 *   - Promote status: pending → self_reported → verified → approved
 *   - Mark Paid (intended + approved only): sets paid=true, paid_amount,
 *     auto-inserts intended_lower or intended_higher variance record,
 *     promotes wall entry to sort_order=0 + featured=true for intended_higher
 *   - View Doc: generate signed URL from community-docs storage and open
 *   - Return to Submitter: modal with notes → send-finance-return-email edge fn
 */

import supabase from './supabase.js';

const EDGE_BASE   = 'https://hhyhulqngdkwsxhymmcd.supabase.co/functions/v1';
const BUCKET      = 'community-docs';
const STATUS_NEXT = { pending: 'self_reported', self_reported: 'verified', verified: 'approved' };
const STATUS_LABEL = {
  pending:       'Pending',
  self_reported: 'Self-Reported',
  verified:      'Verified',
  approved:      'Approved',
  returned:      'Returned',
};
const PROMOTE_LABEL = {
  pending:       'Mark Self-Reported',
  self_reported: 'Mark Verified',
  verified:      'Approve',
};
const TYPE_LABEL = {
  intended:        'Intended',
  intended_lower:  'Lowered Intention',
  intended_higher: 'Increased Intention',
  income:          'Income',
  expense:         'Expense',
  message:         'Message',
};

let activeReturnId  = null;
let activeMarkPaidId = null;
let activeMarkPaidRow = null;
let delegationWired = false;

document.addEventListener('admin:ready', () => {
  wireDelegation();
  loadFinancePanel();
});

function wireDelegation() {
  if (delegationWired) return;
  delegationWired = true;

  document.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn || !btn.closest('#finance-panel')) return;
    const action = btn.dataset.action;
    const id     = btn.dataset.id;

    if (action === 'promote')              await handlePromote(btn, id, btn.dataset.next);
    else if (action === 'viewdoc')         await handleViewDoc(btn, btn.dataset.path);
    else if (action === 'return')          { activeReturnId = id; openReturnModal(btn.dataset.type, btn.dataset.desc, btn.dataset.date); }
    else if (action === 'finance-return-send')   { if (activeReturnId) await handleReturn(activeReturnId); }
    else if (action === 'finance-return-cancel') closeReturnModal();
    else if (action === 'markpaid')        openMarkPaidModal(id, btn.dataset.amount, btn.dataset.desc, btn.dataset.submission);
    else if (action === 'markpaid-send')   { if (activeMarkPaidId) await handleMarkPaid(); }
    else if (action === 'markpaid-cancel') closeMarkPaidModal();
  });
}

async function loadFinancePanel() {
  const container = document.getElementById('finance-panel-body');
  if (!container) return;
  container.innerHTML = '<p class="field-hint">Loading finance submissions&hellip;</p>';

  const { data, error } = await supabase
    .from('community_financials')
    .select('id, type, status, amount, currency, description, notes, document_url, submitted_at, submission_id, paid, paid_amount, paid_at, submissions(community_name, email)')
    .order('submitted_at', { ascending: false });

  if (error) {
    container.innerHTML = `<p class="field-hint" style="color:#b91c1c;">Failed to load: ${escHtml(error.message)}</p>`;
    return;
  }
  if (!data || data.length === 0) {
    container.innerHTML = '<p class="field-hint">No finance submissions yet.</p>';
    return;
  }

  container.innerHTML = `
    <div class="donations-table-wrap">
      <table class="donations-table">
        <thead>
          <tr>
            <th>Date</th><th>Community</th><th>Type</th><th>Description</th>
            <th>Amount</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>${data.map(buildRow).join('')}</tbody>
      </table>
    </div>

    <!-- Return modal -->
    <div id="finance-return-modal" class="finance-modal" hidden>
      <div class="finance-modal__box">
        <h4>Return to Submitter</h4>
        <p class="field-hint" id="finance-return-context"></p>
        <div class="field-group">
          <label for="finance-return-notes">Notes for submitter <span class="badge badge--required">Required</span></label>
          <textarea id="finance-return-notes" rows="4" placeholder="Explain what information is missing or needs correction…"></textarea>
        </div>
        <div style="display:flex;gap:0.75rem;margin-top:1rem;">
          <button type="button" data-action="finance-return-send" class="btn btn--primary" id="finance-return-send-btn">Send &amp; Return</button>
          <button type="button" data-action="finance-return-cancel" class="btn btn--secondary">Cancel</button>
        </div>
        <div id="finance-return-error" class="field-hint" style="color:#b91c1c;margin-top:0.5rem;"></div>
      </div>
    </div>

    <!-- Mark Paid modal -->
    <div id="markpaid-modal" class="finance-modal" hidden>
      <div class="finance-modal__box">
        <h4>Mark Intended as Paid</h4>
        <p class="field-hint" id="markpaid-context"></p>
        <div class="field-group">
          <label for="markpaid-amount">Actual Amount Received (USD) <span class="badge badge--required">Required</span></label>
          <input type="number" id="markpaid-amount" min="0.01" step="0.01" placeholder="0.00" />
          <p class="field-hint" id="markpaid-variance-hint" style="margin-top:0.4rem;"></p>
        </div>
        <div style="display:flex;gap:0.75rem;margin-top:1rem;">
          <button type="button" data-action="markpaid-send" class="btn btn--primary" id="markpaid-send-btn">Confirm Payment</button>
          <button type="button" data-action="markpaid-cancel" class="btn btn--secondary">Cancel</button>
        </div>
        <div id="markpaid-error" class="field-hint" style="color:#b91c1c;margin-top:0.5rem;"></div>
      </div>
    </div>`;

  // Live variance hint
  document.getElementById('markpaid-amount')?.addEventListener('input', updateVarianceHint);
}

function buildRow(row) {
  const sub         = row.submissions || {};
  const community   = sub.community_name || '—';
  const status      = row.status || 'pending';
  const statusLabel = STATUS_LABEL[status] || status;
  const typeLabel   = TYPE_LABEL[row.type] || row.type;
  const amountStr   = row.amount != null ? `$${Number(row.amount).toFixed(2)} ${row.currency || 'USD'}` : '—';
  const nextStatus  = STATUS_NEXT[status];
  const paidBadge   = row.paid ? `<span class="finance-paid-badge">✓ Paid${row.paid_amount != null ? ` ($${Number(row.paid_amount).toFixed(2)})` : ''}</span>` : '';

  const promoteBtn = nextStatus
    ? `<button type="button" class="btn btn--small btn--primary" data-action="promote" data-id="${escHtml(row.id)}" data-next="${nextStatus}">${PROMOTE_LABEL[status]}</button>`
    : '';
  const markPaidBtn = (row.type === 'intended' && status === 'approved' && !row.paid)
    ? `<button type="button" class="btn btn--small btn--success" data-action="markpaid" data-id="${escHtml(row.id)}" data-amount="${escHtml(String(row.amount || 0))}" data-desc="${escHtml(row.description || '')}" data-submission="${escHtml(row.submission_id)}">Mark Paid</button>`
    : '';
  const docBtn = row.document_url
    ? `<button type="button" class="btn btn--small btn--secondary" data-action="viewdoc" data-id="${escHtml(row.id)}" data-path="${escHtml(row.document_url)}">View Doc</button>`
    : '';
  const returnBtn = `<button type="button" class="btn btn--small btn--warning" data-action="return" data-id="${escHtml(row.id)}" data-type="${escHtml(row.type)}" data-desc="${escHtml(row.description)}" data-date="${escHtml(row.submitted_at)}">Return</button>`;

  return `
    <tr data-finance-id="${escHtml(row.id)}">
      <td>${formatDate(row.submitted_at)}</td>
      <td>${escHtml(community)}</td>
      <td><span class="badge badge--${escHtml(row.type)}">${escHtml(typeLabel)}</span></td>
      <td>${escHtml(row.description || '—')}</td>
      <td>${escHtml(amountStr)} ${paidBadge}</td>
      <td><span class="finance-status finance-status--${escHtml(status)}">${escHtml(statusLabel)}</span></td>
      <td style="display:flex;gap:0.5rem;flex-wrap:wrap;">${promoteBtn}${markPaidBtn}${docBtn}${returnBtn}</td>
    </tr>`;
}

// ─── Promote ─────────────────────────────────────────────────────────────────

async function handlePromote(btn, id, nextStatus) {
  btn.disabled    = true;
  btn.textContent = 'Saving…';
  const { error } = await supabase
    .from('community_financials')
    .update({ status: nextStatus })
    .eq('id', id);
  if (error) {
    showToast('Update failed: ' + error.message, 'error');
    btn.disabled    = false;
    btn.textContent = PROMOTE_LABEL[Object.keys(STATUS_NEXT).find(k => STATUS_NEXT[k] === nextStatus)];
    return;
  }
  showToast(`Status updated to ${STATUS_LABEL[nextStatus]}.`, 'success');
  loadFinancePanel();
}

// ─── Mark Paid modal ─────────────────────────────────────────────────────────

function openMarkPaidModal(id, intendedAmount, desc, submissionId) {
  activeMarkPaidId  = id;
  activeMarkPaidRow = { intendedAmount: Number(intendedAmount), desc, submissionId };
  const modal   = document.getElementById('markpaid-modal');
  const context = document.getElementById('markpaid-context');
  const input   = document.getElementById('markpaid-amount');
  const errEl   = document.getElementById('markpaid-error');
  const hint    = document.getElementById('markpaid-variance-hint');
  if (!modal) return;
  context.textContent = `Intended: $${Number(intendedAmount).toFixed(2)} — ${desc || 'No description'}`;
  input.value         = Number(intendedAmount).toFixed(2);
  errEl.textContent   = '';
  hint.textContent    = '';
  modal.hidden        = false;
  input.focus();
}

function updateVarianceHint() {
  const input    = document.getElementById('markpaid-amount');
  const hint     = document.getElementById('markpaid-variance-hint');
  if (!input || !hint || !activeMarkPaidRow) return;
  const paid     = Number(input.value);
  const intended = activeMarkPaidRow.intendedAmount;
  if (isNaN(paid) || paid <= 0) { hint.textContent = ''; return; }
  const diff = paid - intended;
  if (Math.abs(diff) < 0.01) {
    hint.textContent = '✓ Exact match — no variance record will be created.';
    hint.style.color = '#15803d';
  } else if (diff < 0) {
    hint.textContent = `↓ $${Math.abs(diff).toFixed(2)} under intended — a Lowered Intention record will be created.`;
    hint.style.color = '#92400e';
  } else {
    hint.textContent = `↑ $${diff.toFixed(2)} over intended — an Increased Intention record will be created and celebrated on the Recognition Wall!`;
    hint.style.color = '#15803d';
  }
}

function closeMarkPaidModal() {
  const modal = document.getElementById('markpaid-modal');
  if (modal) modal.hidden = true;
  activeMarkPaidId  = null;
  activeMarkPaidRow = null;
}

async function handleMarkPaid() {
  const input   = document.getElementById('markpaid-amount');
  const errEl   = document.getElementById('markpaid-error');
  const sendBtn = document.getElementById('markpaid-send-btn');
  errEl.textContent = '';

  const paidAmount = Number(input?.value);
  if (!paidAmount || paidAmount <= 0) {
    errEl.textContent = 'Please enter a valid amount.';
    return;
  }

  sendBtn.disabled    = true;
  sendBtn.textContent = 'Saving…';

  try {
    const { intendedAmount, submissionId } = activeMarkPaidRow;
    const diff = paidAmount - intendedAmount;

    // 1. Update original intended record as paid
    const { error: paidError } = await supabase
      .from('community_financials')
      .update({ paid: true, paid_amount: paidAmount, paid_at: new Date().toISOString() })
      .eq('id', activeMarkPaidId);
    if (paidError) throw new Error('Failed to mark paid: ' + paidError.message);

    // 2. Insert variance record if needed
    if (Math.abs(diff) >= 0.01) {
      const varianceType = diff < 0 ? 'intended_lower' : 'intended_higher';
      const varianceDesc = diff < 0
        ? `Shortfall from intended payment (paid $${paidAmount.toFixed(2)} of $${intendedAmount.toFixed(2)} intended)`
        : `Excess above intended payment (paid $${paidAmount.toFixed(2)} vs $${intendedAmount.toFixed(2)} intended)`;

      const { error: varError } = await supabase
        .from('community_financials')
        .insert({
          submission_id: submissionId,
          type:          varianceType,
          status:        'approved',
          amount:        Math.abs(diff),
          currency:      'USD',
          description:   varianceDesc,
        });
      if (varError) throw new Error('Failed to insert variance record: ' + varError.message);

      // 3. If increased intention, celebrate on recognition wall
      if (varianceType === 'intended_higher') {
        // Find recognition_wall entry linked to same submission and donor
        const { data: wallRows } = await supabase
          .from('recognition_wall')
          .select('id')
          .eq('submission_id', submissionId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (wallRows && wallRows.length > 0) {
          await supabase
            .from('recognition_wall')
            .update({ sort_order: 0, featured: true })
            .eq('id', wallRows[0].id);
        }
        showToast('🎉 Increased intention recorded and celebrated on the Recognition Wall!', 'success');
      } else {
        showToast('Lowered intention variance recorded.', 'success');
      }
    } else {
      showToast('Payment confirmed — exact match.', 'success');
    }

    closeMarkPaidModal();
    loadFinancePanel();

  } catch (err) {
    console.error('[admin-finance] markPaid error:', err);
    errEl.textContent   = err.message || 'An error occurred.';
    sendBtn.disabled    = false;
    sendBtn.textContent = 'Confirm Payment';
  }
}

// ─── View Doc ────────────────────────────────────────────────────────────────

async function handleViewDoc(btn, storagePath) {
  btn.disabled    = true;
  btn.textContent = 'Loading…';
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60);
  btn.disabled    = false;
  btn.textContent = 'View Doc';
  if (error || !data?.signedUrl) {
    showToast('Could not generate doc link: ' + (error?.message || 'No URL returned'), 'error');
    return;
  }
  window.open(data.signedUrl, '_blank');
}

// ─── Return modal ─────────────────────────────────────────────────────────────

function openReturnModal(type, desc, date) {
  const modal   = document.getElementById('finance-return-modal');
  const context = document.getElementById('finance-return-context');
  const notes   = document.getElementById('finance-return-notes');
  const errEl   = document.getElementById('finance-return-error');
  if (!modal) return;
  context.textContent = `Type: ${TYPE_LABEL[type] || type || '—'} · Description: ${desc || '—'} · Submitted: ${date ? new Date(date).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—'}`;
  notes.value       = '';
  errEl.textContent = '';
  modal.hidden      = false;
}

function closeReturnModal() {
  const modal = document.getElementById('finance-return-modal');
  if (modal) modal.hidden = true;
  activeReturnId = null;
}

async function handleReturn(financeId) {
  const notes   = document.getElementById('finance-return-notes')?.value?.trim();
  const errEl   = document.getElementById('finance-return-error');
  const sendBtn = document.getElementById('finance-return-send-btn');
  errEl.textContent = '';
  if (!notes) { errEl.textContent = 'Please enter notes for the submitter before sending.'; return; }

  sendBtn.disabled    = true;
  sendBtn.textContent = 'Sending…';

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? '';
    const res   = await fetch(`${EDGE_BASE}/send-finance-return-email`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({ finance_id: financeId, notes }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.ok) {
      closeReturnModal();
      showToast('Record returned to submitter and email sent.', 'success');
      loadFinancePanel();
    } else {
      errEl.textContent   = 'Failed: ' + (json.error || 'Unknown error');
      sendBtn.disabled    = false;
      sendBtn.textContent = 'Send & Return';
    }
  } catch (e) {
    errEl.textContent   = 'Failed: ' + String(e);
    sendBtn.disabled    = false;
    sendBtn.textContent = 'Send & Return';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function showToast(message, type = 'success') {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;';
    document.body.appendChild(c);
  }
  const t = document.createElement('div');
  t.className  = `notice notice--${type === 'error' ? 'warning' : 'success'} toast`;
  t.style.cssText = 'min-width:260px;max-width:420px;box-shadow:0 4px 20px rgba(0,0,0,.15);';
  t.textContent = message;
  c.appendChild(t);
  setTimeout(() => t.remove(), 5000);
}
