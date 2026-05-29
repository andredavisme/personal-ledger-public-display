/**
 * portal-auth.js — Magic-Link Auth for Community Finance Portal
 *
 * WHO THIS IS FOR:
 *   Community representatives — people whose email address matches a record
 *   in public.submissions. Not admins. Not donors.
 *
 * HOW IT WORKS:
 *   1. Portal page loads → PortalAuth.init() called
 *   2. Supabase checks for an active session (from a previous magic link click)
 *   3. If no session → show the request-link screen
 *   4. User enters their submission email → we call signInWithOtp()
 *   5. Supabase emails a magic link to that address
 *   6. User clicks the link → lands on auth/confirm.html which exchanges the token
 *   7. auth/confirm.html redirects to /portal.html → session established
 *   8. We resolve the user's show_role from public.profiles
 *   9. If show_role = 'admin' → show admin notice (portal is not for admins)
 *  10. If show_role = 'community_rep' OR email matches an approved submission → show portal
 *  11. Otherwise → sign out and show access-denied
 *
 * ADMIN DETECTION:
 *   Previously used app_metadata.providers heuristic (unreliable — magic links
 *   also register an 'email' provider entry). Now resolved via profiles.show_role
 *   directly from the database — the authoritative source of role truth.
 */

import supabase from './supabase.js';

const PortalAuth = (() => {

  // ─── Internal state ──────────────────────────────────────────────────────
  let _user = null;
  let _submissionId = null;
  let _onAuthenticatedCallback = null;
  let _container = null;

  // ─── Role resolution ─────────────────────────────────────────────────────

  /**
   * Fetches the authenticated user's show_role from public.profiles.
   * Returns 'viewer' as the safe default if no profile row exists.
   */
  async function _getShowRole() {
    const { data, error } = await supabase
      .from('profiles')
      .select('show_role')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .maybeSingle();

    if (error || !data) return 'viewer';
    return data.show_role;
  }

  // ─── Screen builders ─────────────────────────────────────────────────────

  function _showRequestScreen(message = null) {
    _container.innerHTML = `
      <div class="portal-auth">
        <div class="portal-auth__card">
          <div class="portal-auth__logo">📋</div>
          <h1 class="portal-auth__title">Community Finance Portal</h1>
          <p class="portal-auth__subtitle">
            Enter the email address associated with your community's application.
            We'll send you a secure sign-in link.
          </p>
          ${message ? `<div class="portal-auth__notice portal-auth__notice--info">${message}</div>` : ''}
          <div class="portal-auth__field">
            <label for="portal-email" class="portal-auth__label">Email Address</label>
            <input
              id="portal-email"
              type="email"
              autocomplete="email"
              placeholder="your@email.com"
              class="portal-auth__input"
            />
          </div>
          <div id="portal-auth-error" class="portal-auth__error" hidden></div>
          <button id="portal-auth-submit" class="portal-auth__btn">
            Send Sign-In Link
          </button>
          <p class="portal-auth__hint">
            Only emails on approved community applications can sign in.
          </p>
        </div>
      </div>
    `;

    const input = document.getElementById('portal-email');
    const btn   = document.getElementById('portal-auth-submit');

    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter') _handleOtpRequest();
    });
    btn?.addEventListener('click', _handleOtpRequest);

    setTimeout(() => input?.focus(), 50);
  }

  function _showCheckEmailScreen(email) {
    _container.innerHTML = `
      <div class="portal-auth">
        <div class="portal-auth__card">
          <div class="portal-auth__logo">✉️</div>
          <h1 class="portal-auth__title">Check Your Email</h1>
          <p class="portal-auth__subtitle">
            A sign-in link has been sent to <strong>${_escHtml(email)}</strong>.
            Click the link in that email to access your portal.
          </p>
          <p class="portal-auth__hint">
            The link expires in 1 hour. Check your spam folder if it doesn't arrive within a minute.
          </p>
          <button id="portal-resend" class="portal-auth__btn portal-auth__btn--secondary">
            Send a New Link
          </button>
        </div>
      </div>
    `;

    document.getElementById('portal-resend')?.addEventListener('click', () => {
      _showRequestScreen();
    });
  }

  function _showAccessDeniedScreen(email) {
    _container.innerHTML = `
      <div class="portal-auth">
        <div class="portal-auth__card">
          <div class="portal-auth__logo">🚫</div>
          <h1 class="portal-auth__title">Access Not Found</h1>
          <p class="portal-auth__subtitle">
            <strong>${_escHtml(email)}</strong> is not associated with an approved community application.
          </p>
          <p class="portal-auth__hint">
            If your application is still under review, please wait for an approval notification.
            If you believe this is an error, contact us.
          </p>
          <button id="portal-try-again" class="portal-auth__btn portal-auth__btn--secondary">
            Try a Different Email
          </button>
        </div>
      </div>
    `;

    document.getElementById('portal-try-again')?.addEventListener('click', () => {
      supabase.auth.signOut().then(() => _showRequestScreen());
    });
  }

  function _showAdminNoticeScreen(email) {
    _container.innerHTML = `
      <div class="portal-auth">
        <div class="portal-auth__card">
          <div class="portal-auth__logo">🔐</div>
          <h1 class="portal-auth__title">Admin Session Active</h1>
          <p class="portal-auth__subtitle">
            You're signed in as <strong>${_escHtml(email)}</strong> — an administrator account.
            The Community Finance Portal is for community representatives only.
          </p>
          <p class="portal-auth__hint">
            To review community financial submissions, use the Admin panel.
          </p>
          <a href="admin.html" class="portal-auth__btn" style="display:inline-block;text-align:center;text-decoration:none;">Go to Admin Panel</a>
        </div>
      </div>
    `;
  }

  function _showLoadingScreen(label = 'Verifying…') {
    _container.innerHTML = `
      <div class="portal-auth">
        <div class="portal-auth__card portal-auth__card--loading">
          <div class="portal-auth__spinner"></div>
          <p class="portal-auth__loading-label">${label}</p>
        </div>
      </div>
    `;
  }

  // ─── OTP request handler ─────────────────────────────────────────────────

  async function _handleOtpRequest() {
    const email   = document.getElementById('portal-email')?.value?.trim().toLowerCase();
    const errorEl = document.getElementById('portal-auth-error');
    const btn     = document.getElementById('portal-auth-submit');

    if (!email) {
      _showError(errorEl, 'Please enter your email address.');
      return;
    }

    if (!_isValidEmail(email)) {
      _showError(errorEl, 'Please enter a valid email address.');
      return;
    }

    btn.textContent = 'Sending…';
    btn.disabled = true;
    if (errorEl) errorEl.hidden = true;

    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      btn.textContent = 'Send Sign-In Link';
      btn.disabled = false;
      _showError(errorEl, error.message || 'Failed to send link. Please try again.');
      return;
    }

    _showCheckEmailScreen(email);
  }

  // ─── Session verification ────────────────────────────────────────────────

  async function _verifySubmissionAccess(user) {
    _showLoadingScreen('Verifying your access…');

    // ── Role-based routing (authoritative — reads profiles.show_role) ──────
    const role = await _getShowRole();

    if (role === 'admin') {
      _showAdminNoticeScreen(user.email);
      return;
    }

    // ── Community rep: verify approved submission exists for this email ────
    const { data, error } = await supabase
      .from('submissions')
      .select('id')
      .eq('email', user.email)
      .eq('status', 'approved')
      .maybeSingle();

    if (error || !data) {
      await supabase.auth.signOut();
      _showAccessDeniedScreen(user.email);
      return;
    }

    _user         = user;
    _submissionId = data.id;

    _container.innerHTML = '';

    if (typeof _onAuthenticatedCallback === 'function') {
      _onAuthenticatedCallback(_user, _submissionId);
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  async function init(containerId, onAuthenticated) {
    _container = document.getElementById(containerId);
    _onAuthenticatedCallback = onAuthenticated;

    if (!_container) {
      console.error('[PortalAuth] Container not found:', containerId);
      return;
    }

    _showLoadingScreen('Loading…');

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !_user) {
        _verifySubmissionAccess(session.user);
      }
      if (event === 'SIGNED_OUT') {
        _user = null;
        _submissionId = null;
        _showRequestScreen();
      }
    });

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      await _verifySubmissionAccess(session.user);
    } else {
      _showRequestScreen();
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    _user = null;
    _submissionId = null;
    _showRequestScreen('You have been signed out.');
  }

  function getUser()         { return _user; }
  function getSubmissionId() { return _submissionId; }

  // ─── Utilities ────────────────────────────────────────────────────────────

  function _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _showError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  return { init, signOut, getUser, getSubmissionId };

})();

export default PortalAuth;
