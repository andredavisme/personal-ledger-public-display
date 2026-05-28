/**
 * nav.js — Shared navigation module
 *
 * - Marks the active nav link based on current page filename
 * - Shows #nav-admin-link (full "Admin" text) only when authenticated
 * - Shows #nav-admin-gate (lock icon) only when NOT authenticated
 *   — always-visible entry point to admin.html for unauthenticated visitors
 * - Import this on every public page that has a site-header nav
 */

import Auth from './auth.js';

function markActiveLink() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-header nav a').forEach(a => {
    const href = a.getAttribute('href');
    a.classList.toggle('active', href === page);
  });
}

function syncAdminLink(user) {
  const adminLink = document.getElementById('nav-admin-link');
  const adminGate = document.getElementById('nav-admin-gate');
  if (adminLink) adminLink.style.display = user ? 'inline' : 'none';
  if (adminGate) adminGate.style.display = user ? 'none' : 'inline';
}

export function initNav() {
  markActiveLink();
  Auth.initAuth();
  Auth.onChange(syncAdminLink);
  // Sync immediately in case session is already live
  syncAdminLink(Auth.getCurrentUser());
}

initNav();
