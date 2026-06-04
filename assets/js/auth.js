/**
 * auth.js — Authentication Abstraction Layer
 *
 * CURRENT PROVIDER: Supabase Auth via AMD unified auth portal
 *
 * All authentication is handled by auth.andremauricedavis.com.
 * Unauthenticated users are redirected there with ?return=<current-url>.
 * On return, the shared Supabase session (default storageKey) is present.
 *
 * ROLE MODEL:
 *   is_admin (boolean) — controls admin panel access. Set independently.
 *   show_role (text)   — portal-facing role: 'viewer', 'community_rep', 'admin' (legacy).
 */

import supabase from './supabase.js';

const AUTH_PORTAL = 'https://auth.andremauricedavis.com/';

const Auth = (() => {

  let _currentUser = null;
  let _onChangeCallbacks = [];

  // ── Portal redirect ─────────────────────────────────────────────
  function _redirectToPortal() {
    const returnUrl = window.location.href;
    window.location.replace(AUTH_PORTAL + '?return=' + encodeURIComponent(returnUrl));
  }

  // ── Public API ──────────────────────────────────────────────

  function initAuth() {
    supabase.auth.onAuthStateChange((event, session) => {
      _currentUser = session?.user || null;
      _onChangeCallbacks.forEach(cb => cb(_currentUser));
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      _currentUser = session?.user || null;
      _onChangeCallbacks.forEach(cb => cb(_currentUser));
    });
  }

  /**
   * Trigger login — redirects to the AMD auth portal.
   * The portal will return the user to the current page after sign-in.
   */
  function login() {
    _redirectToPortal();
  }

  async function logout() {
    await supabase.auth.signOut();
    _currentUser = null;
    _onChangeCallbacks.forEach(cb => cb(null));
    window.location.replace(AUTH_PORTAL);
  }

  function getCurrentUser() {
    return _currentUser;
  }

  /**
   * Checks profiles.is_admin for the current user.
   * Returns Promise<boolean>.
   */
  async function isAdmin() {
    if (!_currentUser) return false;
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', _currentUser.id)
      .maybeSingle();
    if (error || !data) return false;
    return data.is_admin === true;
  }

  function onChange(callback) {
    _onChangeCallbacks.push(callback);
  }

  return { initAuth, login, logout, getCurrentUser, isAdmin, onChange };

})();

export default Auth;
