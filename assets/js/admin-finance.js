/**
 * admin-finance.js — Admin Finance Verification Panel
 *
 * Listens for admin:ready, loads all community_financials rows newest first,
 * joined with submissions.community_name and submissions.email.
 *
 * Per-row actions:
 *   - Promote status: pending → self_reported → verified → approved
 *   - View Doc: generate signed URL from community-docs storage and open
 *   - Return to Submitter: modal with notes textarea → send-finance-return-email
 *     edge function → status set to 'returned' in DB
 */

import supabase from './supabase.js';

const EDGE_BASE   = 'https://hhyhulqngdkwsxhymmcd.supabase.co/functions/v1';
const BUCKET      = 'community-docs';
const STATUS_FLOW = ['pending', 'self_reported', 'verified', 'approved'];
const STATUS_NEXT = { pending: 'self_reported', self_reported: 'verified', verified: 'approved' };
const STATUS_LABEL = {
  pending:      'Pending',
  self_reported:'Self-Reported',
  verified:     'Verified',
  approved:     'Approved',
  returned:     'Returned',
};
const PROMOTE_LABEL = {
  pending:      'Mark Self-Reported',
  self_reported:'Mark Verified',
  verified:     'Approve',
};

document.addEventListener('admin:ready', () => loadFinancePanel());

async function loadFinancePanel() {
  const container = document.getElementById('finance-panel-body');
  if (!container) return;
  container.innerHTML = '<p class="field-hint">Loading finance submissions&hellip;</p>';

  const { data, error } = await supabase
    .from('community_financials')
    .select('id, type, status, amount, currency, description, notes, document_url, submitted_at, submission_id, submissions(community_name, email)')
    .order('submitted_at', { ascending: false });

  if (error) {
    container.innerHTML = `<p class="field-hint" style="color:#b91c1c;">Failed to load: ${escHtml(error.message)}</p>`;
    return;
  }
  if (!data || data.length === 0) {
    container.innerHTML = '<p class="field-hint">No finance submissions yet.</p>';
    return;
  }

  const rows = data.map(row => buildRow(row)).join('');
  container.innerHTML = `
    <div class="donations-table-wrap">
      <table class="donations-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Community</th>
            <th>Type</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div id="finance-return-modal" class="finance-modal" hidden>
      <div class="finance-modal__box">
        <h4>Return to Submitter</h4>
        <p class="field-hint" id="finance-return-context"></p>
        <div class="field-group">
          <label for="finance-return-notes">Notes for submitter <span class="badge badge--required">Required</span></label>
          <textarea id="finance-return-notes" rows="4" placeholder="Explain what information is missing or needs correction…"></textarea>
        </div>
        <div style="display:flex;gap:0.75rem;margin-top:1rem;">
          <button type="button" id="finance-return-send-btn" class="btn btn--primary">Send &amp; Return</button>
          <button type="button" id="finance-return-cancel-btn" class="btn btn--secondary">Cancel</button>
        </div>
        <div id="finance-return-error" class="field-hint" style="color:#b91c1c;margin-top:0.5rem;"></div>
      </div>
    </div>`;

  wireActions(container, data);
}

function buildRow(row) {
  const sub         = row.submissions || {};
  const community   = sub.community_name || '—';
  const status      = row.status || 'pending';
  const statusLabel = STATUS_LABEL[status] || status;
  const amountStr   = row.amount != null ? `$${Number(row.amount).toFixed(2)} ${row.currency || 'USD'}` : '—';
  const nextStatus  = STATUS_NEXT[status];
  const promoteBtn  = nextStatus
    ? `<button type="button" class="btn btn--small btn--primary" data-action="promote" data-id="${escHtml(row.id)}" data-next="${nextStatus}">${PROMOTE_LABEL[status]}</button>`
    : '';
  const docBtn = row.document_url
    ? `<button type="button" class="btn btn--small btn--secondary" data-action="viewdoc" data-id="${escHtml(row.id)}" data-path="${escHtml(row.document_url)}">View Doc</button>`
    : '';
  const returnBtn = `<button type="button" class="btn btn--small btn--warning" data-action="return" data-id="${escHtml(row.id)}" data-type="${escHtml(row.type)}" data-desc="${escHtml(row.description)}" data-date="${escHtml(row.submitted_at)}">Return</button>`;

  return `
    <tr data-finance-id="${escHtml(row.id)}">
      <td>${formatDate(row.submitted_at)}</td>
      <td>${escHtml(community)}</td>
      <td><span class="badge">${escHtml(row.type || '—')}</span></td>
      <td>${escHtml(row.description || '—')}</td>
      <td>${escHtml(amountStr)}</td>
      <td><span class="finance-status finance-status--${escHtml(status)}">${escHtml(statusLabel)}</span></td>
      <td style="display:flex;gap:0.5rem;flex-wrap:wrap;">${promoteBtn}${docBtn}${returnBtn}</td>
    </tr>`;
}

function wireActions(container, data) {
  let activeReturnId = null;

  container.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id     = btn.dataset.id;

    if (action === 'promote') {
      await handlePromote(btn, id, btn.dataset.next);
    } else if (action === 'viewdoc') {
      await handleViewDoc(btn, btn.dataset.path);
    } else if (action === 'return') {
      activeReturnId = id;
      openReturnModal(btn.dataset.type, btn.dataset.desc, btn.dataset.date);
    } else if (action === 'return-send') {
      await handleReturn(activeReturnId);
    } else if (action === 'return-cancel') {
      closeReturnModal();
    }
  });

  document.getElementById('finance-return-send-btn')?.addEventListener('click', async () => {
    if (activeReturnId) await handleReturn(activeReturnId);
  });
  document.getElementById('finance-return-cancel-btn')?.addEventListener('click', closeReturnModal);
}

async function handlePromote(btn, id, nextStatus) {
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const { error } = await supabase
    .from('community_financials')
    .update({ status: nextStatus })
    .eq('id', id);

  if (error) {
    showToast('Update failed: ' + error.message, 'error');
    btn.disabled = false;
    btn.textContent = PROMOTE_LABEL[STATUS_FLOW[STATUS_FLOW.indexOf(nextStatus) - 1]];
    return;
  }

  showToast(`Status updated to ${STATUS_LABEL[nextStatus]}.`, 'success');
  loadFinancePanel();
}

async function handleViewDoc(btn, storagePath) {
  btn.disabled = true;
  btn.textContent = 'Loading…';

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60);

  btn.disabled = false;
  btn.textContent = 'View Doc';

  if (error || !data?.signedUrl) {
    showToast('Could not generate doc link: ' + (error?.message || 'Unknown error'), 'error');
    return;
  }
  window.open(data.signedUrl, '_blank');
}

function openReturnModal(type, desc, date) {
  const modal   = document.getElementById('finance-return-modal');
  const context = document.getElementById('finance-return-context');
  const notes   = document.getElementById('finance-return-notes');
  const errEl   = document.getElementById('finance-return-error');
  if (!modal) return;
  context.textContent = `Type: ${type || '—'} · Description: ${desc || '—'} · Submitted: ${date ? new Date(date).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—'}`;
  notes.value = '';
  errEl.textContent = '';
  modal.hidden = false;
}

function closeReturnModal() {
  const modal = document.getElementById('finance-return-modal');
  if (modal) modal.hidden = true;
}

async function handleReturn(financeId) {
  const notes  = document.getElementById('finance-return-notes')?.value?.trim();
  const errEl  = document.getElementById('finance-return-error');
  const sendBtn = document.getElementById('finance-return-send-btn');

  errEl.textContent = '';
  if (!notes) {
    errEl.textContent = 'Please enter notes for the submitter before sending.';
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending…';

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? '';

    const res  = await fetch(`${EDGE_BASE}/send-finance-return-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ finance_id: financeId, notes }),
    });
    const json = await res.json().catch(() => ({}));

    if (res.ok && json.ok) {
      closeReturnModal();
      showToast('Record returned to submitter and email sent.', 'success');
      loadFinancePanel();
    } else {
      errEl.textContent = 'Failed: ' + (json.error || 'Unknown error');
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send & Return';
    }
  } catch (e) {
    errEl.textContent = 'Failed: ' + String(e);
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send & Return';
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
    c.style.cssText = 'position:fixed;bottom:var(--space-6);right:var(--space-6);z-index:9999;display:flex;flex-direction:column;gap:var(--space-2);';
    document.body.appendChild(c);
  }
  const t = document.createElement('div');
  t.className = `notice notice--${type === 'error' ? 'warning' : 'success'} toast`;
  t.style.cssText = 'min-width:260px;max-width:380px;box-shadow:var(--shadow-lg);';
  t.textContent = message;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}
