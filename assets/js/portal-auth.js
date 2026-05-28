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
 *  10. If not found but user is an ADMIN (password login) → show admin notice
 *  11. If not found and not admin → sign out and show access-denied
 *
 * ADMIN DETECTION:
 *   Admin sessions use signInWithPassword (provider = 'email', no 'magiclink').
 *   Rep sessions use signInWithOtp (provider includes 'magiclink').
 *   We check user.app_metadata.providers to distinguish the two.
 *
 * REDIRECT URL:
 *   Magic links must redirect to this page. Configure in Supabase Dashboard:
 *   Authentication → URL Configuration → Redirect URLs
 *   Add: https://personal-ledger-public-display.pages.dev/portal.html
 *   (and http://localhost:8080/portal.html for local dev)
 */

import supabase from './supabase.js';

const PortalAuth = (() => {

  // ─── Internal state ──────────────────────────────────────────────────────
  let _user = null;
  let _submissionId = null;
  let _onAuthenticatedCallback = null;
  let _container = null;

  // ─── Admin detection ─────────────────────────────────────────────────────

  /**
   * Returns true if the session belongs to an admin (password login).
   * Admin accounts use signInWithPassword → provider is 'email' only.
   * Community rep magic links → provider includes 'magiclink'.
   */
  function _isAdminUser(user) {
    const providers = user?.app_metadata?.providers || [];
    return providers.includes('email') && !providers.includes('magiclink');
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

  /**
   * Shown when an admin navigates to portal.html while logged in.
   * Gives them a clear explanation and a link back to admin.
   */
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

  async function _verifySubmissionAccess(user) {
    _showLoadingScreen('Verifying your access…');

    // ── Admin bypass ──────────────────────────────────────────────────────
    // If the session belongs to an admin (password login), don't run the
    // submission lookup — just show the admin notice and stop here.
    // This prevents the "Access Not Found" flash when an admin visits portal.html.
    if (_isAdminUser(user)) {
      _showAdminNoticeScreen(user.email);
      return;
    }

    // ── Community rep check ───────────────────────────────────────────────
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
