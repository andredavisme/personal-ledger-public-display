/**
 * nav.js — Shared navigation module
 *
 * - Marks the active nav link based on current page filename
 * - Shows #nav-admin-link only when the user is authenticated (Auth.isAdmin())
 * - Import this on every public page that has a site-header nav
 *
 * Usage in HTML:
 *   <script src="assets/js/nav.js" type="module"></script>
 *   (or import from another module)
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
  if (!adminLink) return;
  adminLink.style.display = user ? 'inline' : 'none';
}

export function initNav() {
  markActiveLink();
  Auth.initAuth();
  Auth.onChange(syncAdminLink);
  // Sync immediately in case session is already live
  syncAdminLink(Auth.getCurrentUser());
}

initNav();
