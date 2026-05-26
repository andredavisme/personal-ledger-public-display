/**
 * community.js — Public Community Pages
 *
 * Loads all approved submissions and their child tables from Supabase
 * and renders them as public-facing community cards.
 *
 * No auth required — this page is fully public.
 * Email addresses are intentionally omitted from the public display.
 */

import supabase from './supabase.js';

const listEl    = document.getElementById('community-list');
const loadingEl = document.getElementById('community-loading');
const emptyEl   = document.getElementById('community-empty');

// ─── Load Data ────────────────────────────────────────────────────────────────
async function loadCommunities() {
  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('id, community_name, location, mission, values, local_vision, universal_vision, donation_transparency, application_transparency, reviewed_at')
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: false });

  if (error) {
    console.error('[community] load error:', error);
    loadingEl.textContent = 'Unable to load communities. Please try again later.';
    return;
  }

  loadingEl.style.display = 'none';

  if (!submissions || submissions.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }

  // Load child tables for all submissions in parallel
  await Promise.all(submissions.map(async s => {
    const [{ data: financials }, { data: budget }, { data: donations }] = await Promise.all([
      supabase.from('submission_financials').select('*').eq('submission_id', s.id).order('sort_order'),
      supabase.from('submission_budget').select('*').eq('submission_id', s.id).order('sort_order'),
      supabase.from('submission_donations').select('*').eq('submission_id', s.id).order('sort_order'),
    ]);
    s.financials = financials || [];
    s.budget     = budget     || [];
    s.donations  = donations  || [];
  }));

  submissions.forEach(s => listEl.appendChild(buildCard(s)));
}

// ─── Card Builder ───────────────────────────────────────────────────────────
function buildCard(s) {
  const article = document.createElement('article');
  article.className = 'community-card';
  article.id = `community-${s.id}`;

  article.innerHTML = `
    <!-- Header -->
    <div class="community-card__header">
      <div>
        <h3>${esc(s.community_name)}</h3>
        <p class="community-card__meta">${esc(s.location || '')}${s.location && s.reviewed_at ? ' &middot; ' : ''}${s.reviewed_at ? 'Verified ' + formatDate(s.reviewed_at) : ''}</p>
      </div>
    </div>

    <!-- Identity -->
    <section class="community-card__section">
      <h4>Who We Are</h4>
      <div class="community-card__fields">
        <div class="community-field">
          <span class="community-field__label">Mission</span>
          <p class="community-field__value">${esc(s.mission || '')}</p>
        </div>
        <div class="community-field">
          <span class="community-field__label">Values</span>
          <p class="community-field__value">${esc(s.values || '')}</p>
        </div>
        <div class="community-field">
          <span class="community-field__label">Local Vision</span>
          <p class="community-field__value">${esc(s.local_vision || '')}</p>
        </div>
        ${s.universal_vision ? `
        <div class="community-field">
          <span class="community-field__label">Universal Vision</span>
          <p class="community-field__value">${esc(s.universal_vision)}</p>
        </div>` : ''}
      </div>
    </section>

    <!-- Financial Statements -->
    ${s.financials.length ? `
    <section class="community-card__section">
      <h4>Financial History</h4>
      <p class="section-desc">Past income and expenses submitted by this community.</p>
      ${buildTable(s.financials)}
    </section>` : ''}

    <!-- Budget -->
    ${s.budget.length ? `
    <section class="community-card__section">
      <h4>Budget Needs</h4>
      <p class="section-desc">Items this community needs to purchase, expects to purchase, or is planning for.</p>
      ${buildTable(s.budget)}
    </section>` : ''}

    <!-- Donation Transparency -->
    <section class="community-card__section">
      <h4>Transparency</h4>
      <div class="community-card__fields">
        <div class="community-field">
          <span class="community-field__label">How Donations Are Tracked</span>
          <p class="community-field__value">${esc(s.donation_transparency || '')}</p>
        </div>
        ${s.application_transparency ? `
        <div class="community-field">
          <span class="community-field__label">How Donations Are Applied</span>
          <p class="community-field__value">${esc(s.application_transparency)}</p>
        </div>` : ''}
      </div>
    </section>

    <!-- Donation Methods -->
    ${s.donations.length ? `
    <section class="community-card__section">
      <h4>How to Donate</h4>
      <p class="section-desc">Accepted donation methods submitted by this community.</p>
      ${buildDonationList(s.donations)}
    </section>` : ''}
  `;

  return article;
}

// ─── Table Renderer ───────────────────────────────────────────────────────────
function buildTable(rows) {
  const skip    = ['id', 'submission_id', 'sort_order'];
  const headers = Object.keys(rows[0]).filter(h => !skip.includes(h));
  const head    = headers.map(h => `<th>${h.replace(/_/g, ' ')}</th>`).join('');
  const body    = rows.map(row =>
    `<tr>${headers.map(h => `<td>${esc(String(row[h] ?? ''))}</td>`).join('')}</tr>`
  ).join('');
  return `
    <div class="csv-table-wrap">
      <table class="csv-table">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

// ─── Donation List Renderer ────────────────────────────────────────────────────
function buildDonationList(rows) {
  // If rows have a recognizable 'method' or 'type' column, render as cards
  // Otherwise fall back to table
  const cols    = Object.keys(rows[0]).filter(h => !['id', 'submission_id', 'sort_order'].includes(h));
  const hasLink = cols.some(c => c.toLowerCase().includes('link') || c.toLowerCase().includes('url'));

  if (cols.length <= 4) {
    // Render as donation method cards
    return `<div class="donation-methods">${rows.map(row => {
      const pairs = cols.map(c => ({ label: c.replace(/_/g, ' '), value: row[c] })).filter(p => p.value);
      const linkPair = pairs.find(p => p.label.toLowerCase().includes('link') || p.label.toLowerCase().includes('url'));
      const otherPairs = pairs.filter(p => p !== linkPair);
      return `
        <div class="donation-method-card">
          ${otherPairs.map(p => `
            <p><span class="community-field__label">${esc(p.label)}</span> ${esc(String(p.value))}</p>
          `).join('')}
          ${linkPair ? `<a href="${esc(String(linkPair.value))}" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--small" style="margin-top:0.5rem;">Donate</a>` : ''}
        </div>`;
    }).join('')}</div>`;
  }

  return buildTable(rows);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

loadCommunities();
