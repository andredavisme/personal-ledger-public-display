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
 *   6. User clicks the link → lands back on portal.html with a token in the URL
 *   7. Supabase exchanges the token automatically → session established
 *   8. We verify the session email exists in public.submissions (approved)
 *   9. If verified → call onAuthenticated(user, submissionId) and show the portal
 *  10. If not found → sign out and show an access-denied message
 *
 * REDIRECT URL:
 *   Magic links must redirect to this page. Configure in Supabase Dashboard:
 *   Authentication → URL Configuration → Redirect URLs
 *   Add: https://personal-ledger-public-display.pages.dev/portal.html
 *   (and http://localhost:8080/portal.html for local dev)
 *
 * AUTH STATE:
 *   PortalAuth manages all UI state transitions so portal.js never needs
 *   to think about auth directly — it just waits for onAuthenticated().
 */

import supabase from './supabase.js';

const PortalAuth = (() => {

  // ─── Internal state ──────────────────────────────────────────────────────
  let _user = null;
  let _submissionId = null;
  let _onAuthenticatedCallback = null;
  let _container = null;

  // ─── Screen builders ─────────────────────────────────────────────────────

  /**
   * Renders the "Enter your email" screen.
   * Shown when there is no active session.
   */
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

  /**
   * Renders the "Check your email" confirmation screen.
   * Shown after a magic link has been sent.
   */
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

  /**
   * Renders the "Access denied" screen.
   * Shown when the authenticated email is not on an approved submission.
   */
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

  /**
   * Renders a loading/verifying screen while we check the session.
   */
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
    const email  = document.getElementById('portal-email')?.value?.trim().toLowerCase();
    const errorEl = document.getElementById('portal-auth-error');
    const btn    = document.getElementById('portal-auth-submit');

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

    const redirectTo = `${window.location.origin}/portal.html`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });

    if (error) {
      btn.textContent = 'Send Sign-In Link';
      btn.disabled = false;
      _showError(errorEl, error.message || 'Failed to send link. Please try again.');
      return;
    }

    _showCheckEmailScreen(email);
  }

  // ─── Session verification ────────────────────────────────────────────────

  /**
   * Called once we have a confirmed Supabase session.
   * Looks up the user's email in public.submissions (approved only).
   * If found → calls the onAuthenticated callback.
   * If not found → shows access denied.
   */
  async function _verifySubmissionAccess(user) {
    _showLoadingScreen('Verifying your access…');

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

    // Clear the auth UI — portal.js will render its own content
    _container.innerHTML = '';

    if (typeof _onAuthenticatedCallback === 'function') {
      _onAuthenticatedCallback(_user, _submissionId);
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * init(containerId, onAuthenticated)
   *
   * @param {string}   containerId      - ID of the DOM element to render auth UI into
   * @param {Function} onAuthenticated  - Called with (user, submissionId) once access is confirmed
   *
   * Call this from portal.js on DOMContentLoaded.
   */
  async function init(containerId, onAuthenticated) {
    _container = document.getElementById(containerId);
    _onAuthenticatedCallback = onAuthenticated;

    if (!_container) {
      console.error('[PortalAuth] Container not found:', containerId);
      return;
    }

    _showLoadingScreen('Loading…');

    // Listen for future auth state changes (e.g. token refresh, sign-out)
    supabase.auth.onAuthStateChange((event, session) => {
      // SIGNED_IN fires when the magic link token is exchanged
      if (event === 'SIGNED_IN' && session?.user && !_user) {
        _verifySubmissionAccess(session.user);
      }
      // SIGNED_OUT — return to request screen
      if (event === 'SIGNED_OUT') {
        _user = null;
        _submissionId = null;
        _showRequestScreen();
      }
    });

    // Check for an existing session on page load
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      // Already authenticated — verify access
      await _verifySubmissionAccess(session.user);
    } else {
      // No session — show the request screen
      _showRequestScreen();
    }
  }

  /**
   * signOut()
   * Exposed so portal.js can add a sign-out button.
   */
  async function signOut() {
    await supabase.auth.signOut();
    _user = null;
    _submissionId = null;
    _showRequestScreen('You have been signed out.');
  }

  /**
   * getUser() / getSubmissionId()
   * Accessors for portal.js if needed after authentication.
   */
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
