/**
 * admin-wall.js — Admin Recognition Wall Panel
 *
 * Listens for admin:ready, loads all recognition_wall rows joined with
 * community name and donation amount. Renders a table with inline toggles
 * for is_visible (suppress/restore) and featured (highlight on wall).
 *
 * Race condition guard: if admin:ready fires before this module registers
 * its listener (cached auth session), we fall back to loading directly
 * once the DOM is ready and the panel body is present.
 */

import supabase from './supabase.js';

let loaded = false;

document.addEventListener('admin:ready', () => {
  loaded = true;
  loadWallEntries();
});

// Fallback: if admin:ready already fired before this listener registered,
// retry once the event loop clears.
setTimeout(() => {
  if (!loaded) {
    const container = document.getElementById('wall-panel-body');
    if (container && container.innerHTML.trim() === '') {
      loadWallEntries();
    }
  }
}, 1500);

async function loadWallEntries() {
  const container = document.getElementById('wall-panel-body');
  if (!container) return;

  container.innerHTML = '<p class="field-hint">Loading recognition wall entries&hellip;</p>';

  const { data, error } = await supabase
    .from('recognition_wall')
    .select(`
      id,
      created_at,
      display_name,
      wall_message,
      amount_visible,
      is_visible,
      featured,
      submission_id,
      donation_id,
      submissions ( community_name ),
      donations ( amount )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<p class="field-hint" style="color:#b91c1c;">Failed to load wall entries: ${escHtml(error.message)}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p class="field-hint">No recognition wall entries yet.</p>';
    return;
  }

  const rows = data.map(entry => {
    const community = entry.submissions?.community_name || '—';
    const amount    = entry.amount_visible && entry.donations?.amount
      ? `$${Number(entry.donations.amount).toFixed(2)}`
      : '<span class="wall-amount-hidden">Hidden</span>';

    const visibleLabel = entry.is_visible ? 'Visible' : 'Suppressed';
    const visibleClass = entry.is_visible ? 'wall-badge--visible' : 'wall-badge--suppressed';
    const visibleBtn   = entry.is_visible
      ? `<button type="button" class="btn btn--small btn--warning" data-toggle-visible="${escHtml(entry.id)}" data-current="true">Suppress</button>`
      : `<button type="button" class="btn btn--small btn--secondary" data-toggle-visible="${escHtml(entry.id)}" data-current="false">Restore</button>`;

    const featuredLabel = entry.featured ? '★ Featured' : '—';
    const featuredClass = entry.featured ? 'wall-badge--featured' : '';
    const featuredBtn   = entry.featured
      ? `<button type="button" class="btn btn--small btn--secondary" data-toggle-featured="${escHtml(entry.id)}" data-current="true">Unfeature</button>`
      : `<button type="button" class="btn btn--small btn--secondary" data-toggle-featured="${escHtml(entry.id)}" data-current="false">Feature</button>`;

    return `
      <tr data-wall-id="${escHtml(entry.id)}">
        <td>${formatDate(entry.created_at)}</td>
        <td>${escHtml(entry.display_name)}</td>
        <td>${escHtml(community)}</td>
        <td>${amount}</td>
        <td>${escHtml(entry.wall_message || '—')}</td>
        <td><span class="wall-badge ${visibleClass}">${visibleLabel}</span></td>
        <td>${visibleBtn}</td>
        <td><span class="wall-badge ${featuredClass}">${featuredLabel}</span></td>
        <td>${featuredBtn}</td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="wall-table-wrap">
      <table class="wall-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Donor</th>
            <th>Community</th>
            <th>Amount</th>
            <th>Message</th>
            <th>Status</th>
            <th>Visibility</th>
            <th>Featured</th>
            <th>Feature Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  container.querySelectorAll('[data-toggle-visible]').forEach(btn => {
    btn.addEventListener('click', () => toggleVisible(btn.dataset.toggleVisible, btn.dataset.current === 'true', btn));
  });

  container.querySelectorAll('[data-toggle-featured]').forEach(btn => {
    btn.addEventListener('click', () => toggleFeatured(btn.dataset.toggleFeatured, btn.dataset.current === 'true', btn));
  });
}

async function toggleVisible(wallId, currentValue, btn) {
  btn.disabled = true;
  const newValue = !currentValue;

  const { error } = await supabase
    .from('recognition_wall')
    .update({ is_visible: newValue })
    .eq('id', wallId);

  if (error) {
    btn.disabled = false;
    showToast('Failed to update visibility: ' + error.message, 'error');
    return;
  }

  showToast(newValue ? 'Entry restored to wall.' : 'Entry suppressed from wall.', 'success');
  loadWallEntries();
}

async function toggleFeatured(wallId, currentValue, btn) {
  btn.disabled = true;
  const newValue = !currentValue;

  const { error } = await supabase
    .from('recognition_wall')
    .update({ featured: newValue })
    .eq('id', wallId);

  if (error) {
    btn.disabled = false;
    showToast('Failed to update featured status: ' + error.message, 'error');
    return;
  }

  showToast(newValue ? 'Donor marked as featured.' : 'Donor unfeatured.', 'success');
  loadWallEntries();
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
