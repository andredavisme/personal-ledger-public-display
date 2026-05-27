/**
 * admin-digest.js — Community Digest Control Panel
 *
 * PURPOSE:
 *   This module powers the "Community Digest" section on the admin panel.
 *   It reads the last run timestamp from public.digest_log, calculates
 *   whether a new digest send is due based on the configured interval,
 *   and renders a countdown or an overdue "Run Now" button.
 *
 * WHY MANUAL?
 *   Sending digest emails to community contacts is a meaningful outbound action.
 *   There is intentionally no automatic cron job. A human administrator must
 *   review the panel and consciously trigger each send. This ensures:
 *     - No accidental duplicate sends
 *     - Admin awareness of all outbound email activity
 *     - The ability to delay or skip a send if circumstances warrant
 *
 * SCHEDULE:
 *   Every DIGEST_INTERVAL_DAYS days, starting DIGEST_START_DATE.
 *   To change the interval, update DIGEST_INTERVAL_DAYS below.
 *   The start date anchors the schedule — it does not need to change.
 *
 * HOW THE COUNTDOWN WORKS:
 *   1. Reads the most recent row from public.digest_log.
 *   2. If no row exists, the start date (DIGEST_START_DATE) is used as baseline.
 *   3. Calculates: next_due = last_run_at + DIGEST_INTERVAL_DAYS.
 *   4. If today >= next_due: shows red "Run Now" button (overdue).
 *   5. If today < next_due:  shows green countdown (N days until due).
 *
 * TO AUTOMATE IN THE FUTURE:
 *   Replace this manual panel with a Cloudflare Cron Trigger Worker or a
 *   GitHub Actions scheduled workflow that POSTs to the Edge Function URL
 *   with a valid service-role JWT on the desired schedule.
 *   Update triggered_by to 'cron' in the Edge Function's digest_log insert.
 */

import supabase from './supabase.js';

// ─── Schedule Configuration ─────────────────────────────────────────────────────────────

// How many days between digest sends.
// Change this value to adjust the send frequency.
// The Edge Function's default `since` window matches this value.
const DIGEST_INTERVAL_DAYS = 3;

// The date this schedule started (ISO format).
// Used as the baseline if no digest_log rows exist yet (first ever run).
// This does NOT need to change when the interval changes.
const DIGEST_START_DATE = '2026-05-27';

// Supabase Edge Function URL for the community digest.
// The function requires a valid JWT in the Authorization header.
const DIGEST_FUNCTION_URL =
  'https://hhyhulqngdkwsxhymmcd.supabase.co/functions/v1/send-community-digest';

// ─── DOM References ──────────────────────────────────────────────────────────────────
const loadingEl  = document.getElementById('digest-loading');
const contentEl  = document.getElementById('digest-status-content');
const lastRunEl  = document.getElementById('digest-last-run');
const nextDueEl  = document.getElementById('digest-next-due');
const runBtnEl   = document.getElementById('digest-run-btn');
const countdownEl = document.getElementById('digest-countdown');
const resultEl   = document.getElementById('digest-result');

// ─── Init ─────────────────────────────────────────────────────────────────────────
// Wait for the auth module to confirm the user is logged in before
// querying the DB. Uses a custom event fired by auth.js on session confirm.
document.addEventListener('admin:ready', initDigestPanel);

async function initDigestPanel() {
  // Read the most recent digest_log entry.
  // If the table is empty (no digest ever sent), lastRun will be null
  // and the start date is used as the baseline instead.
  const { data, error } = await supabase
    .from('digest_log')
    .select('run_at, communities_notified, communities_skipped')
    .order('run_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[admin-digest] Failed to load digest_log:', error);
    loadingEl.textContent = 'Unable to load digest status.';
    return;
  }

  // Determine the last run date.
  // If no row exists, treat DIGEST_START_DATE as the last run baseline
  // so the countdown starts from the project launch date.
  const lastRunAt = data?.run_at ? new Date(data.run_at) : new Date(DIGEST_START_DATE);
  const neverRun  = !data?.run_at;

  // Calculate when the next send is due.
  const nextDue = new Date(lastRunAt);
  nextDue.setDate(nextDue.getDate() + DIGEST_INTERVAL_DAYS);

  const now        = new Date();
  const msPerDay   = 1000 * 60 * 60 * 24;
  // daysUntilDue: negative means overdue, 0 means due today, positive means not yet due
  const daysUntilDue = Math.ceil((nextDue - now) / msPerDay);
  const isOverdue    = daysUntilDue <= 0;

  // ── Render status ──────────────────────────────────────────────────────

  lastRunEl.textContent = neverRun
    ? 'Last run: Never (schedule started ' + DIGEST_START_DATE + ')'
    : 'Last run: ' + lastRunAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      + (data?.communities_notified != null
        ? ' — ' + data.communities_notified + ' notified, ' + data.communities_skipped + ' skipped'
        : '');

  nextDueEl.textContent = 'Next due: ' + nextDue.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  if (isOverdue) {
    // Overdue: show a red "Run Now" button to signal action is needed.
    const daysLate = Math.abs(daysUntilDue);
    countdownEl.textContent = daysLate === 0
      ? 'Due today'
      : daysLate + ' day' + (daysLate === 1 ? '' : 's') + ' overdue';
    countdownEl.className = 'digest-countdown digest-countdown--overdue';

    runBtnEl.textContent = 'Run Now';
    runBtnEl.className   = 'btn btn--danger';
    runBtnEl.hidden      = false;
  } else {
    // Not yet due: show a green countdown, no run button.
    countdownEl.textContent = daysUntilDue + ' day' + (daysUntilDue === 1 ? '' : 's') + ' until next send';
    countdownEl.className   = 'digest-countdown digest-countdown--ok';

    // Still offer a "Send Early" option in case the admin wants to send ahead of schedule.
    runBtnEl.textContent = 'Send Early';
    runBtnEl.className   = 'btn btn--secondary btn--small';
    runBtnEl.hidden      = false;
  }

  // Reveal the status content block now that it is populated.
  loadingEl.hidden    = true;
  contentEl.hidden    = false;

  // Wire up the run button.
  runBtnEl.addEventListener('click', handleDigestRun);
}

// ─── Digest Run Handler ───────────────────────────────────────────────────────────
async function handleDigestRun() {
  // Disable the button immediately to prevent double-clicks.
  // A duplicate send would result in community contacts receiving two emails.
  runBtnEl.disabled    = true;
  runBtnEl.textContent = 'Sending…';
  resultEl.hidden      = true;
  resultEl.className   = 'donation-message';

  // Get the current user's session JWT.
  // The Edge Function requires a valid JWT in the Authorization header.
  // It does NOT accept anonymous requests — only authenticated admins can trigger it.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    showResult('error', 'Not authenticated. Please log in and try again.');
    runBtnEl.disabled    = false;
    runBtnEl.textContent = 'Run Now';
    return;
  }

  try {
    // POST to the Edge Function.
    // No `since` override — the function defaults to the last 3 days (DIGEST_INTERVAL_DAYS).
    // To send a custom window, pass: body: JSON.stringify({ since: '2026-05-01' })
    const res = await fetch(DIGEST_FUNCTION_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        // Authenticate as the logged-in admin. The Edge Function validates this JWT.
        'Authorization': 'Bearer ' + session.access_token,
      },
      body: JSON.stringify({}),
    });

    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.error || 'Unknown error from digest function');
    }

    // Success: show summary and reload the panel to reflect the new last-run date.
    const msg = [
      'Digest sent successfully.',
      json.sent + ' communit' + (json.sent === 1 ? 'y' : 'ies') + ' notified.',
      (json.skipped ?? 0) + ' skipped (no activity in window).',
    ].join(' ');

    showResult('success', msg);

    // Reload the panel status after a brief pause so the DB has time to write.
    // This refreshes the last-run timestamp and recalculates the countdown.
    setTimeout(() => {
      resultEl.hidden = true;
      initDigestPanel();
    }, 2500);

  } catch (err) {
    console.error('[admin-digest] Digest run failed:', err);
    showResult('error', 'Send failed: ' + (err?.message || String(err)));
    runBtnEl.disabled    = false;
    runBtnEl.textContent = 'Run Now';
  }
}

// ─── Result Display Helper ──────────────────────────────────────────────────────────
function showResult(type, message) {
  resultEl.textContent = message;
  resultEl.className   = 'donation-message donation-message--' + type;
  resultEl.hidden      = false;
}
