/**
 * auth.js — Authentication Abstraction Layer
 *
 * CURRENT PROVIDER: Supabase Auth
 *
 * Migrated from Netlify Identity on May 25, 2026.
 * Reason: Netlify Identity only works when hosted on Netlify.
 * After migrating to Cloudflare Pages, the login modal became
 * non-functional (overlay appeared but widget never loaded).
 *
 * This module abstracts all authentication calls behind a single interface
 * so that switching auth providers in the future requires changes only
 * in this file, not throughout the application.
 */

import supabase from './supabase.js';

const Auth = (() => {

  // ─── State ──────────────────────────────────────────────────────────────────
  let _currentUser = null;
  let _onChangeCallbacks = [];

  // ─── Login Modal ──────────────────────────────────────────────────────────
  // Supabase Auth does not ship a pre-built login widget the way
  // Netlify Identity did. We build a minimal email/password modal
  // here so the admin page has a self-contained login experience.

  function _buildModal() {
    if (document.getElementById('auth-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9999',
      'display:flex', 'align-items:center', 'justify-content:center',
      'background:rgba(0,0,0,0.55)', 'backdrop-filter:blur(2px)'
    ].join(';');

    modal.innerHTML = `
      <div style="background:#fff;border-radius:12px;padding:2rem;width:100%;max-width:380px;box-shadow:0 8px 32px rgba(0,0,0,0.18);">
        <h3 style="margin:0 0 0.25rem;font-size:1.25rem;">Admin Sign In</h3>
        <p style="margin:0 0 1.5rem;color:#64748b;font-size:0.9rem;">Community Ledger — Administration access only.</p>
        <div style="margin-bottom:1rem;">
          <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.35rem;text-transform:uppercase;letter-spacing:0.05em;">Email</label>
          <input id="auth-email" type="email" autocomplete="email" style="width:100%;padding:0.6rem 0.75rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.95rem;box-sizing:border-box;" />
        </div>
        <div style="margin-bottom:1.5rem;">
          <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.35rem;text-transform:uppercase;letter-spacing:0.05em;">Password</label>
          <input id="auth-password" type="password" autocomplete="current-password" style="width:100%;padding:0.6rem 0.75rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.95rem;box-sizing:border-box;" />
        </div>
        <div id="auth-error" style="display:none;color:#dc2626;font-size:0.85rem;margin-bottom:1rem;"></div>
        <button id="auth-submit" style="width:100%;padding:0.7rem;background:#1e40af;color:#fff;border:none;border-radius:6px;font-size:0.95rem;font-weight:600;cursor:pointer;">Sign In</button>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', e => {
      if (e.target === modal) _closeModal();
    });

    // Submit on Enter
    modal.addEventListener('keydown', e => {
      if (e.key === 'Enter') _submitLogin();
    });

    document.getElementById('auth-submit').addEventListener('click', _submitLogin);
  }

  function _closeModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.remove();
  }

  async function _submitLogin() {
    const email    = document.getElementById('auth-email')?.value?.trim();
    const password = document.getElementById('auth-password')?.value;
    const errorEl  = document.getElementById('auth-error');
    const submitBtn = document.getElementById('auth-submit');

    if (!email || !password) {
      errorEl.textContent = 'Email and password are required.';
      errorEl.style.display = 'block';
      return;
    }

    submitBtn.textContent = 'Signing in…';
    submitBtn.disabled = true;
    errorEl.style.display = 'none';

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      errorEl.textContent = error.message || 'Sign in failed. Check your email and password.';
      errorEl.style.display = 'block';
      submitBtn.textContent = 'Sign In';
      submitBtn.disabled = false;
      return;
    }

    _currentUser = data.user;
    _onChangeCallbacks.forEach(cb => cb(_currentUser));
    _closeModal();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  function initAuth() {
    // Listen for session changes (page load, token refresh, sign out)
    supabase.auth.onAuthStateChange((event, session) => {
      _currentUser = session?.user || null;
      _onChangeCallbacks.forEach(cb => cb(_currentUser));
    });

    // Check for an existing session immediately on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      _currentUser = session?.user || null;
      _onChangeCallbacks.forEach(cb => cb(_currentUser));
    });
  }

  function login() {
    _buildModal();
    // Focus email field after modal renders
    setTimeout(() => document.getElementById('auth-email')?.focus(), 50);
  }

  async function logout() {
    await supabase.auth.signOut();
    _currentUser = null;
    _onChangeCallbacks.forEach(cb => cb(null));
  }

  function getCurrentUser() {
    return _currentUser;
  }

  function isAdmin() {
    // Any authenticated Supabase user is an admin.
    // Access is controlled at the Supabase Auth level (invite-only or
    // restricted sign-up). Role-based granularity can be added later
    // via public.user_roles or JWT custom claims if needed.
    return !!_currentUser;
  }

  function onChange(callback) {
    _onChangeCallbacks.push(callback);
  }

  return { initAuth, login, logout, getCurrentUser, isAdmin, onChange };

})();

export default Auth;
