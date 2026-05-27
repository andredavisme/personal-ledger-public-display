/**
 * admin-donations.js — Admin Donations Panel
 *
 * Listens for admin:ready, loads all donations joined with community name,
 * renders a table with status, receipt_sent_at, and a Resend Receipt
 * retry button for null/failed rows.
 */

import supabase from './supabase.js';

const EDGE_BASE = 'https://hhyhulqngdkwsxhymmcd.supabase.co/functions/v1';

document.addEventListener('admin:ready', () => {
  loadDonations();
});

async function loadDonations() {
  const container = document.getElementById('donations-panel-body');
  if (!container) return;

  container.innerHTML = '<p class="field-hint">Loading donations&hellip;</p>';

  const { data, error } = await supabase
    .from('donations')
    .select('id, created_at, donor_name, donor_email, amount, method, status, receipt_sent_at, submission_id, submissions(community_name)')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<p class="field-hint" style="color:#b91c1c;">Failed to load donations: ${escHtml(error.message)}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p class="field-hint">No donations recorded yet.</p>';
    return;
  }

  const rows = data.map(d => {
    const communityName = d.submissions?.community_name || '—';
    const receiptCell   = buildReceiptCell(d);
    return `
      <tr data-donation-id="${escHtml(d.id)}">
        <td>${formatDate(d.created_at)}</td>
        <td>${escHtml(d.donor_name || 'Anonymous')}</td>
        <td>${escHtml(d.donor_email || '—')}</td>
        <td>${escHtml(communityName)}</td>
        <td>$${Number(d.amount).toFixed(2)}</td>
        <td>${escHtml(d.method || '—')}</td>
        <td><span class="donations-status donations-status--${escHtml(d.status || 'unknown')}">${escHtml(d.status || '—')}</span></td>
        <td>${receiptCell}</td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="donations-table-wrap">
      <table class="donations-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Donor</th>
            <th>Email</th>
            <th>Community</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
            <th>Receipt</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  // Wire retry buttons
  container.querySelectorAll('[data-retry-receipt]').forEach(btn => {
    btn.addEventListener('click', () => retryReceipt(btn.dataset.retryReceipt, btn));
  });
}

function buildReceiptCell(d) {
  if (d.receipt_sent_at) {
    return `<span class="receipt-sent">&#10003; ${formatDate(d.receipt_sent_at)}</span>`;
  }
  if (!d.donor_email) {
    return `<span class="receipt-none">No email</span>`;
  }
  return `<button type="button" class="btn btn--small btn--warning" data-retry-receipt="${escHtml(d.id)}">Resend</button>`;
}

async function retryReceipt(donationId, btn) {
  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? '';

    const res = await fetch(`${EDGE_BASE}/send-donation-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ donation_id: donationId }),
    });

    const json = await res.json().catch(() => ({}));

    if (res.ok && json.ok) {
      // Replace button with sent confirmation
      const row = btn.closest('tr');
      const cell = btn.closest('td');
      cell.innerHTML = `<span class="receipt-sent">&#10003; Just now</span>`;
      showToast('Receipt sent successfully.', 'success');
    } else {
      btn.disabled = false;
      btn.textContent = 'Resend';
      showToast('Receipt failed: ' + (json.error || 'Unknown error'), 'error');
    }
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Resend';
    showToast('Receipt failed: ' + String(e), 'error');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;bottom:var(--space-6);right:var(--space-6);z-index:9999;display:flex;flex-direction:column;gap:var(--space-2);';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `notice notice--${type === 'error' ? 'warning' : 'success'} toast`;
  toast.style.cssText = 'min-width:260px;max-width:380px;box-shadow:var(--shadow-lg);animation:fadeInUp 200ms ease;';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
