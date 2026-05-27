/**
 * wall.js — Recognition Wall
 *
 * Loads all visible recognition_wall entries joined to donations and submissions.
 * Groups entries by community (submission_id).
 * Orders communities by donation count ascending — least active surfaces first.
 * Within each community, entries are ordered by sort_order ASC, then created_at ASC.
 *
 * Display rules (per donation-capture.md Phase 2 spec):
 *   - Only rows where is_visible = true are shown (RLS enforces this for anon reads)
 *   - donor amount shown only if amount_visible = true
 *   - wall_message shown if present
 *   - display_name shown always (defaults to 'Anonymous' server-side)
 */

import supabase from './supabase.js';

const loadingEl = document.getElementById('wall-loading');
const emptyEl   = document.getElementById('wall-empty');
const listEl    = document.getElementById('wall-list');

async function loadWall() {
  // Fetch all visible wall entries with the donation amount and submission community info.
  // RLS on recognition_wall already filters to is_visible = true for anon reads.
  const { data, error } = await supabase
    .from('recognition_wall')
    .select(`
      id,
      display_name,
      wall_message,
      amount_visible,
      featured,
      sort_order,
      created_at,
      submission_id,
      donations ( amount ),
      submissions ( community_name, location )
    `)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[wall] Failed to load recognition wall:', error);
    loadingEl.textContent = 'Unable to load the recognition wall. Please try again later.';
    return;
  }

  loadingEl.hidden = true;

  if (!data || data.length === 0) {
    emptyEl.hidden = false;
    return;
  }

  // Group entries by submission_id
  const communityMap = new Map();
  for (const entry of data) {
    const sid = entry.submission_id;
    if (!communityMap.has(sid)) {
      communityMap.set(sid, {
        community_name: entry.submissions?.community_name || 'Unknown Community',
        location:       entry.submissions?.location || '',
        entries:        [],
      });
    }
    communityMap.get(sid).entries.push(entry);
  }

  // Sort communities by donor count ascending (least active first)
  const communities = Array.from(communityMap.values())
    .sort((a, b) => a.entries.length - b.entries.length);

  // Render
  listEl.innerHTML = '';
  for (const community of communities) {
    listEl.appendChild(renderCommunityBlock(community));
  }
}

function renderCommunityBlock(community) {
  const block = document.createElement('section');
  block.className = 'wall-community';

  const donorCount = community.entries.length;
  const plural     = donorCount === 1 ? 'donor' : 'donors';

  block.innerHTML = [
    '<div class="wall-community__header">',
    '  <div>',
    '    <h3 class="wall-community__name">' + escHtml(community.community_name) + '</h3>',
    community.location
      ? '    <p class="wall-community__location">' + escHtml(community.location) + '</p>'
      : '',
    '  </div>',
    '  <span class="wall-community__count">' + donorCount + ' ' + plural + '</span>',
    '</div>',
    '<div class="wall-entries">',
    community.entries.map(renderEntry).join(''),
    '</div>',
  ].join('');

  return block;
}

function renderEntry(entry) {
  const amount = (entry.amount_visible && entry.donations?.amount != null)
    ? '<span class="wall-entry__amount">$' + Number(entry.donations.amount).toFixed(2) + '</span>'
    : '';

  const message = entry.wall_message
    ? '<p class="wall-entry__message">&ldquo;' + escHtml(entry.wall_message) + '&rdquo;</p>'
    : '';

  const featuredClass = entry.featured ? ' wall-entry--featured' : '';

  const date = new Date(entry.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return [
    '<div class="wall-entry' + featuredClass + '">',
    '  <div class="wall-entry__header">',
    '    <span class="wall-entry__name">' + escHtml(entry.display_name) + '</span>',
    amount,
    '  </div>',
    message,
    '  <span class="wall-entry__date">' + date + '</span>',
    '</div>',
  ].join('');
}

// Simple HTML escaper — prevents XSS from donor-supplied text
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

loadWall();
