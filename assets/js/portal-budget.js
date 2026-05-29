/**
 * portal-budget.js — Budget Allocation Panel
 *
 * Loaded by portal.js after authentication.
 *
 * FLOW:
 *   1. Fetch submission_budget items for the rep's submission (ordered by sort_order)
 *   2. Fetch sum of approved/paid income from community_financials
 *   3. Render sliders grouped by status tier: expected → desired → contingency
 *   4. Live-update "Available to Allocate" pool as sliders move
 *   5. On Save: bulk-update submission_budget.actual_cost + insert audit rows to budget_allocations
 *   6. Toggle budget_amounts_visible on submissions via a checkbox
 */

import supabase from './supabase.js';

const TIER_ORDER  = ['expected', 'desired', 'contingency'];
const TIER_LABELS = { expected: '🔵 Expected', desired: '🟢 Desired', contingency: '🟡 Contingency' };
const TIER_CLASS  = { expected: 'budget-tier--expected', desired: 'budget-tier--desired', contingency: 'budget-tier--contingency' };

let _submissionId      = null;
let _userId            = null;
let _items             = [];      // submission_budget rows
let _totalReceived     = 0;       // sum of approved income paid
let _showAmounts       = false;   // submissions.budget_amounts_visible
let _sliderValues      = {};      // { [item.id]: number }
let _containerEl       = null;

// ─── Public API ──────────────────────────────────────────────────────────────

export async function init(containerEl, submissionId, userId) {
  _containerEl  = containerEl;
  _submissionId = submissionId;
  _userId       = userId;
  await _load();
  _render();
}

// ─── Data Loading ─────────────────────────────────────────────────────────────

async function _load() {
  const [budgetRes, incomeRes, submissionRes] = await Promise.all([
    supabase
      .from('submission_budget')
      .select('id, item, estimated_cost, actual_cost, status, notes, sort_order')
      .eq('submission_id', _submissionId)
      .order('sort_order'),
    supabase
      .from('community_financials')
      .select('paid_amount, amount')
      .eq('submission_id', _submissionId)
      .in('status', ['approved'])
      .eq('paid', true)
      .in('type', ['income', 'intended']),
    supabase
      .from('submissions')
      .select('budget_amounts_visible')
      .eq('id', _submissionId)
      .maybeSingle(),
  ]);

  _items = budgetRes.data || [];
  _showAmounts = submissionRes.data?.budget_amounts_visible ?? false;

  _totalReceived = (incomeRes.data || []).reduce((sum, row) => {
    return sum + Number(row.paid_amount ?? row.amount ?? 0);
  }, 0);

  // Initialise slider values from existing actual_cost
  _sliderValues = {};
  _items.forEach(item => {
    _sliderValues[item.id] = Number(item.actual_cost ?? 0);
  });
}

// ─── Render ───────────────────────────────────────────────────────────────────

function _render() {
  if (!_containerEl) return;

  if (_items.length === 0) {
    _containerEl.innerHTML = `
      <div class="budget-panel budget-panel--empty">
        <p>No budget items found. Add items to your community budget template to see them here.</p>
      </div>`;
    return;
  }

  _containerEl.innerHTML = `
    <div class="budget-panel">

      <div class="budget-panel__pool" id="budget-pool-banner">
        <div class="budget-pool__row">
          <span class="budget-pool__label">Total Received (Paid)</span>
          <span class="budget-pool__value" id="budget-total-received">$${_fmt(_totalReceived)}</span>
        </div>
        <div class="budget-pool__row">
          <span class="budget-pool__label">Currently Allocated</span>
          <span class="budget-pool__value" id="budget-allocated-total">$${_fmt(_currentAllocated())}</span>
        </div>
        <div class="budget-pool__row budget-pool__row--highlight">
          <span class="budget-pool__label">Available to Allocate</span>
          <span class="budget-pool__value" id="budget-available">$${_fmt(_available())}</span>
        </div>
      </div>

      <div class="budget-panel__tiers" id="budget-tiers">
        ${TIER_ORDER.map(tier => _tierHtml(tier)).join('')}
      </div>

      <div class="budget-panel__footer">
        <label class="budget-panel__visibility-toggle">
          <input type="checkbox" id="budget-amounts-visible" ${_showAmounts ? 'checked' : ''} />
          <span>Show dollar amounts publicly on community page</span>
        </label>
        <div id="budget-save-feedback"></div>
        <button class="budget-panel__save" id="budget-save-btn">Save Allocations</button>
      </div>

    </div>`;

  _bindSliders();
  _bindSave();
  _bindVisibilityToggle();
}

function _tierHtml(tier) {
  const items = _items.filter(i => i.status === tier);
  if (!items.length) return '';

  return `
    <div class="budget-tier ${TIER_CLASS[tier]}">
      <h4 class="budget-tier__heading">${TIER_LABELS[tier]}</h4>
      ${items.map(item => _sliderRowHtml(item)).join('')}
    </div>`;
}

function _sliderRowHtml(item) {
  const goal    = Number(item.estimated_cost ?? 0);
  const current = _sliderValues[item.id] ?? 0;
  const pct     = goal > 0 ? Math.round((current / goal) * 100) : 0;

  return `
    <div class="budget-slider-row" data-item-id="${item.id}">
      <div class="budget-slider-row__header">
        <span class="budget-slider-row__label">${esc(item.item)}</span>
        <span class="budget-slider-row__values">
          <span class="budget-slider-row__allocated" id="alloc-val-${item.id}">$${_fmt(current)}</span>
          <span class="budget-slider-row__sep">/</span>
          <span class="budget-slider-row__goal">$${_fmt(goal)} goal</span>
          <span class="budget-slider-row__pct" id="alloc-pct-${item.id}">(${pct}%)</span>
        </span>
      </div>
      ${item.notes ? `<p class="budget-slider-row__notes">${esc(item.notes)}</p>` : ''}
      <input
        type="range"
        class="budget-slider"
        id="slider-${item.id}"
        data-item-id="${item.id}"
        min="0"
        max="${goal}"
        step="1"
        value="${current}"
      />
      <div class="budget-slider-row__bar">
        <div class="budget-slider-row__fill" id="fill-${item.id}" style="width:${pct}%"></div>
      </div>
    </div>`;
}

// ─── Slider Interaction ───────────────────────────────────────────────────────

function _bindSliders() {
  document.querySelectorAll('.budget-slider').forEach(slider => {
    slider.addEventListener('input', _onSliderInput);
  });
}

function _onSliderInput(e) {
  const itemId   = e.target.dataset.itemId;
  const newValue = Number(e.target.value);
  const item     = _items.find(i => i.id === itemId);
  if (!item) return;

  const goal         = Number(item.estimated_cost ?? 0);
  const prevValue    = _sliderValues[itemId] ?? 0;
  const delta        = newValue - prevValue;
  const newAvailable = _available() - delta;

  // Prevent over-allocation: clamp slider back if pool would go negative
  if (newAvailable < 0) {
    const clamped = prevValue + (_available());
    e.target.value       = clamped;
    _sliderValues[itemId] = clamped;
    _updateSliderDisplay(itemId, clamped, goal);
  } else {
    _sliderValues[itemId] = newValue;
    _updateSliderDisplay(itemId, newValue, goal);
  }

  _updatePool();
}

function _updateSliderDisplay(itemId, value, goal) {
  const pct = goal > 0 ? Math.round((value / goal) * 100) : 0;
  const valEl  = document.getElementById(`alloc-val-${itemId}`);
  const pctEl  = document.getElementById(`alloc-pct-${itemId}`);
  const fillEl = document.getElementById(`fill-${itemId}`);
  if (valEl)  valEl.textContent  = `$${_fmt(value)}`;
  if (pctEl)  pctEl.textContent  = `(${pct}%)`;
  if (fillEl) fillEl.style.width = `${Math.min(pct, 100)}%`;
}

function _updatePool() {
  const availEl = document.getElementById('budget-available');
  const allocEl = document.getElementById('budget-allocated-total');
  if (availEl) availEl.textContent = `$${_fmt(_available())}`;
  if (allocEl) allocEl.textContent = `$${_fmt(_currentAllocated())}`;
}

// ─── Save ─────────────────────────────────────────────────────────────────────

function _bindSave() {
  document.getElementById('budget-save-btn')?.addEventListener('click', _save);
}

async function _save() {
  const btn        = document.getElementById('budget-save-btn');
  const feedbackEl = document.getElementById('budget-save-feedback');
  btn.disabled     = true;
  btn.textContent  = 'Saving…';
  _clearFeedback(feedbackEl);

  try {
    const now = new Date().toISOString();

    // Build audit rows and update arrays
    const auditRows = _items.map(item => ({
      submission_id:       _submissionId,
      budget_item_id:      item.id,
      allocated_amount:    _sliderValues[item.id] ?? 0,
      previously_allocated: Number(item.actual_cost ?? 0),
      saved_at:            now,
      saved_by_user_id:    _userId,
    }));

    // 1. Insert audit log rows
    const { error: auditErr } = await supabase
      .from('budget_allocations')
      .insert(auditRows);
    if (auditErr) throw auditErr;

    // 2. Update actual_cost on each submission_budget row
    await Promise.all(_items.map(item =>
      supabase
        .from('submission_budget')
        .update({ actual_cost: _sliderValues[item.id] ?? 0 })
        .eq('id', item.id)
    ));

    // 3. Refresh local item state so prev values are current for next save
    _items = _items.map(item => ({
      ...item,
      actual_cost: _sliderValues[item.id] ?? 0,
    }));

    _setFeedback(feedbackEl, 'success', '✔ Allocations saved.');
  } catch (err) {
    console.error('[portal-budget] save error:', err);
    _setFeedback(feedbackEl, 'error', err.message || 'Save failed. Please try again.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Save Allocations';
  }
}

// ─── Visibility Toggle ────────────────────────────────────────────────────────

function _bindVisibilityToggle() {
  document.getElementById('budget-amounts-visible')?.addEventListener('change', async e => {
    const checked = e.target.checked;
    const { error } = await supabase
      .from('submissions')
      .update({ budget_amounts_visible: checked })
      .eq('id', _submissionId);
    if (error) {
      console.error('[portal-budget] visibility toggle error:', error);
      e.target.checked = !checked; // revert
    } else {
      _showAmounts = checked;
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _currentAllocated() {
  return Object.values(_sliderValues).reduce((sum, v) => sum + (v ?? 0), 0);
}

function _available() {
  return Math.max(0, _totalReceived - _currentAllocated());
}

function _fmt(n) {
  return Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _setFeedback(el, type, msg) {
  if (!el) return;
  el.className   = type === 'success' ? 'portal__form-success' : 'portal__form-error';
  el.textContent = msg;
}

function _clearFeedback(el) {
  if (!el) return;
  el.className   = '';
  el.textContent = '';
}
