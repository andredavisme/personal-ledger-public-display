/**
 * admin-audit-log.js
 *
 * Renders the Admin Audit Log panel in admin.html.
 * Listens for the `admin:ready` event dispatched by admin.js after auth is confirmed.
 * Queries public.admin_actions_log (a view joining admin_actions + submissions + correction_reasons).
 * Renders a scrollable table: Date/Time, Action, Admin, Community, Reasons, Notes.
 */

import { supabase } from './supabase.js';

const PANEL_BODY = 'audit-log-panel-body';

function actionBadge(action) {
  const map = {
    approved:  { cls: 'audit-action--approved',  label: 'Approved' },
    rejected:  { cls: 'audit-action--rejected',   label: 'Rejected' },
    resubmitted: { cls: 'audit-action--resubmitted', label: 'Resubmitted' },
  };
  const { cls, label } = map[action] ?? { cls: '', label: action };
  return `<span class="audit-action ${cls}">${label}</span>`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

async function loadAuditLog() {
  const container = document.getElementById(PANEL_BODY);
  if (!container) return;

  container.innerHTML = '<p class="section-desc">Loading audit log&hellip;</p>';

  const { data, error } = await supabase
    .from('admin_actions_log')
    .select('*')
    .order('acted_at', { ascending: false })
    .limit(200);

  if (error) {
    container.innerHTML = `<p class="section-desc" style="color:#b91c1c;">Error loading audit log: ${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p class="section-desc">No admin actions recorded yet.</p>';
    return;
  }

  const rows = data.map(row => {
    const reasons = Array.isArray(row.rejection_reasons) && row.rejection_reasons.length
      ? row.rejection_reasons.map(r => `<span class="audit-reason">${r}</span>`).join(' ')
      : '<span class="receipt-none">—</span>';

    return [
      '<tr>',
      `<td>${formatDate(row.acted_at)}</td>`,
      `<td>${actionBadge(row.action)}</td>`,
      `<td>${row.admin_email ?? '—'}</td>`,
      `<td>${row.community_name ?? '<span class="receipt-none">—</span>'}</td>`,
      `<td>${reasons}</td>`,
      `<td>${row.notes ? `<span class="audit-notes">${row.notes}</span>` : '<span class="receipt-none">—</span>'}</td>`,
      '</tr>',
    ].join('');
  }).join('');

  container.innerHTML = [
    '<div class="audit-table-wrap">',
    '<table class="audit-table">',
    '<thead><tr>',
    '<th>Date / Time</th>',
    '<th>Action</th>',
    '<th>Admin</th>',
    '<th>Community</th>',
    '<th>Correction Reasons</th>',
    '<th>Notes</th>',
    '</tr></thead>',
    '<tbody>',
    rows,
    '</tbody>',
    '</table>',
    '</div>',
  ].join('');
}

document.addEventListener('admin:ready', loadAuditLog);
