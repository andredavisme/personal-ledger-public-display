/**
 * auth.js — Authentication Abstraction Layer
 *
 * CURRENT PROVIDER: Netlify Identity
 * FUTURE PROVIDER: Supabase Auth
 *
 * This module abstracts all authentication calls behind a single interface
 * so that switching auth providers requires changes only in this file,
 * not throughout the application.
 *
 * MIGRATION GUIDE (Netlify Identity → Supabase Auth):
 * ---------------------------------------------------
 * 1. Replace initAuth() with Supabase client initialization
 *    (supabase.auth.onAuthStateChange)
 * 2. Replace login() with supabase.auth.signInWithPassword() or OAuth
 * 3. Replace logout() with supabase.auth.signOut()
 * 4. Replace getCurrentUser() with supabase.auth.getUser()
 * 5. Replace isAdmin() with a Supabase role check against
 *    ledger.user_roles or a custom claim in the JWT
 * 6. Remove the Netlify Identity widget script from admin.html
 * 7. Environment variable: replace NETLIFY_IDENTITY_URL with
 *    SUPABASE_URL + SUPABASE_ANON_KEY (stored in Netlify/host env vars)
 *
 * No other application files should need changes on migration.
 */

const Auth = (() => {

  // ─── Provider Detection ───────────────────────────────────────────────────
  // Swap this flag to 'supabase' when migrating.
  const PROVIDER = 'netlify'; // 'netlify' | 'supabase'

  // ─── State ────────────────────────────────────────────────────────────────
  let _currentUser = null;
  let _onChangeCallbacks = [];

  // ─── Internal: Netlify Identity ───────────────────────────────────────────
  function _initNetlify() {
    if (typeof netlifyIdentity === 'undefined') {
      console.warn('[Auth] Netlify Identity widget not loaded.');
      return;
    }
    netlifyIdentity.on('login', user => {
      _currentUser = user;
      _onChangeCallbacks.forEach(cb => cb(user));
      netlifyIdentity.close();
    });
    netlifyIdentity.on('logout', () => {
      _currentUser = null;
      _onChangeCallbacks.forEach(cb => cb(null));
    });
    netlifyIdentity.on('init', user => {
      _currentUser = user || null;
      _onChangeCallbacks.forEach(cb => cb(_currentUser));
    });
    netlifyIdentity.init();
  }

  // ─── Internal: Supabase Auth (stub — activate on migration) ───────────────
  // eslint-disable-next-line no-unused-vars
  function _initSupabase() {
    /**
     * MIGRATION STUB
     * Uncomment and complete when migrating to Supabase Auth.
     *
     * import { createClient } from '@supabase/supabase-js';
     * const supabase = createClient(
     *   process.env.SUPABASE_URL,
     *   process.env.SUPABASE_ANON_KEY
     * );
     * supabase.auth.onAuthStateChange((event, session) => {
     *   _currentUser = session?.user || null;
     *   _onChangeCallbacks.forEach(cb => cb(_currentUser));
     * });
     */
    console.info('[Auth] Supabase Auth stub — activate on migration.');
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  function initAuth() {
    if (PROVIDER === 'netlify') _initNetlify();
    if (PROVIDER === 'supabase') _initSupabase();
  }

  function login() {
    if (PROVIDER === 'netlify') {
      if (typeof netlifyIdentity !== 'undefined') netlifyIdentity.open('login');
    }
    // MIGRATION: replace with supabase.auth.signInWithPassword() or OAuth modal
  }

  function logout() {
    if (PROVIDER === 'netlify') {
      if (typeof netlifyIdentity !== 'undefined') netlifyIdentity.logout();
    }
    // MIGRATION: replace with supabase.auth.signOut()
  }

  function getCurrentUser() {
    return _currentUser;
    // MIGRATION: replace with await supabase.auth.getUser()
  }

  function isAdmin() {
    if (!_currentUser) return false;
    if (PROVIDER === 'netlify') {
      // Netlify Identity: admin role set via Identity dashboard
      return _currentUser?.app_metadata?.roles?.includes('admin') || false;
    }
    // MIGRATION: check Supabase custom claim or ledger.user_roles table
    // Example: return _currentUser?.user_metadata?.role === 'admin';
    return false;
  }

  function onChange(callback) {
    _onChangeCallbacks.push(callback);
  }

  return { initAuth, login, logout, getCurrentUser, isAdmin, onChange };

})();

export default Auth;
