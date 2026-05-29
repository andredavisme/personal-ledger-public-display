/**
 * wall.js — Recognition Wall
 *
 * Loads all visible recognition_wall entries joined to donations and submissions.
 * Groups entries by community (submission_id).
 * Orders communities by donation count ascending — least active surfaces first.
 * Within each community, entries are ordered by sort_order ASC (0 = top priority),
 * then created_at ASC.
 *
 * Celebration rules:
 *   - sort_order = 0 + featured = true → entry is an increased intention donor
 *   - Rendered with .wall-entry--celebrated class (gold/celebratory treatment)
 *   - Appears first within their community block
 */

import supabase from './supabase.js';

const loadingEl = document.getElementById('wall-loading');
const emptyEl   = document.getElementById('wall-empty');
const listEl    = document.getElementById('wall-list');

async function loadWall() {
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
    .eq('is_visible', true)
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

  // Sort communities: those with a celebrated donor (sort_order=0) surface first,
  // then by donor count ascending
  const communities = Array.from(communityMap.values()).sort((a, b) => {
    const aCelebrated = a.entries.some(e => e.sort_order === 0 && e.featured);
    const bCelebrated = b.entries.some(e => e.sort_order === 0 && e.featured);
    if (aCelebrated && !bCelebrated) return -1;
    if (!aCelebrated && bCelebrated) return 1;
    return a.entries.length - b.entries.length;
  });

  listEl.innerHTML = '';
  for (const community of communities) {
    listEl.appendChild(renderCommunityBlock(community));
  }
}

function renderCommunityBlock(community) {
  const block      = document.createElement('section');
  block.className  = 'wall-community';
  const donorCount = community.entries.length;
  const plural     = donorCount === 1 ? 'donor' : 'donors';
  const hasCelebrated = community.entries.some(e => e.sort_order === 0 && e.featured);

  block.innerHTML = [
    `<div class="wall-community__header${hasCelebrated ? ' wall-community__header--celebrated' : ''}">`,
    '  <div>',
    `    <h3 class="wall-community__name">${escHtml(community.community_name)}</h3>`,
    community.location
      ? `    <p class="wall-community__location">${escHtml(community.location)}</p>`
      : '',
    '  </div>',
    `  <span class="wall-community__count">${donorCount} ${plural}</span>`,
    '</div>',
    '<div class="wall-entries">',
    community.entries.map(renderEntry).join(''),
    '</div>',
  ].join('');

  return block;
}

function renderEntry(entry) {
  const isCelebrated = entry.sort_order === 0 && entry.featured;

  const amount = (entry.amount_visible && entry.donations?.amount != null)
    ? `<span class="wall-entry__amount">$${Number(entry.donations.amount).toFixed(2)}</span>`
    : '';

  const celebrationBadge = isCelebrated
    ? '<span class="wall-entry__celebrated-badge">🎉 Exceeded Intention</span>'
    : '';

  const message = entry.wall_message
    ? `<p class="wall-entry__message">&ldquo;${escHtml(entry.wall_message)}&rdquo;</p>`
    : '';

  const entryClass = isCelebrated
    ? 'wall-entry wall-entry--celebrated'
    : entry.featured
      ? 'wall-entry wall-entry--featured'
      : 'wall-entry';

  const date = new Date(entry.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return [
    `<div class="${entryClass}">`,
    '  <div class="wall-entry__header">',
    `    <span class="wall-entry__name">${escHtml(entry.display_name)}</span>`,
    amount,
    '  </div>',
    celebrationBadge,
    message,
    `  <span class="wall-entry__date">${date}</span>`,
    '</div>',
  ].join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

loadWall();
