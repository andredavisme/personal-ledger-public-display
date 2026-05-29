/**
 * transparency.js — Public Financial Transparency Page
 *
 * - No auth required (anon key, public data only)
 * - Loads community_financials joined to submissions.community_name
 * - Aggregation rules:
 *     income:           status = approved only
 *     expense:          status = approved only
 *     intended:         status = approved only; paid flag shown
 *     intended_lower:   status = approved only (auto-created by admin)
 *     intended_higher:  status = approved only (celebrated)
 *     returned records: excluded from ALL aggregation and display
 * - Community filter: multi-select chips, max 3
 * - Type filter: All | Income | Expense | Intended
 * - Four Chart.js visualizations
 * - Community messages log (separate, always visible)
 * - Community record cards below messages
 */

import supabase from './supabase.js';

// ─── State ──────────────────────────────────────────────────────────────────
let ALL_ROWS        = [];
let ALL_COMMUNITIES = [];
let selectedCommunities = new Set();
let selectedType = 'all';
let charts = {};

const COMMUNITY_COLORS = [
  { border: '#3b82f6', bg: 'rgba(59,130,246,0.75)',  pending: 'rgba(59,130,246,0.25)'  },
  { border: '#10b981', bg: 'rgba(16,185,129,0.75)',  pending: 'rgba(16,185,129,0.25)'  },
  { border: '#f59e0b', bg: 'rgba(245,158,11,0.75)',  pending: 'rgba(245,158,11,0.25)'  },
];

const STATUS_ORDER  = ['pending', 'returned', 'self_reported', 'verified', 'approved'];
const STATUS_COLORS = {
  pending:       { bg: 'rgba(203,213,225,0.85)', border: '#94a3b8' },
  returned:      { bg: 'rgba(254,202,202,0.85)', border: '#f87171' },
  self_reported: { bg: 'rgba(253,230,138,0.85)', border: '#fbbf24' },
  verified:      { bg: 'rgba(167,243,208,0.85)', border: '#34d399' },
  approved:      { bg: 'rgba(74,222,128,0.85)',  border: '#16a34a' },
};
const STATUS_LABEL = {
  pending:       'Pending',
  returned:      'Returned',
  self_reported: 'Self-Reported',
  verified:      'Verified',
  approved:      'Approved',
};

const TYPE_LABEL = {
  income:          'Income',
  expense:         'Expense',
  intended:        'Intended',
  intended_lower:  'Lowered Intention',
  intended_higher: 'Increased Intention',
  message:         'Message',
};

// Financial types shown in charts and record cards (no messages)
const FINANCIAL_TYPES = ['income', 'expense', 'intended', 'intended_lower', 'intended_higher'];

// Types shown when "Intended" filter is active
const INTENDED_FAMILY = ['intended', 'intended_lower', 'intended_higher'];

// ─── Init ──────────────────────────────────────────────────────────────────
async function init() {
  const { data, error } = await supabase
    .from('community_financials')
    .select('id, type, status, amount, currency, description, submitted_at, submission_id, paid, paid_amount, paid_at, submissions(community_name)')
    .neq('status', 'returned')   // returned records excluded entirely
    .order('submitted_at', { ascending: false });

  if (error || !data) {
    document.getElementById('records-loading').textContent = 'Failed to load records.';
    return;
  }

  ALL_ROWS = data.map(r => ({
    ...r,
    community: r.submissions?.community_name || 'Unknown Community',
  }));

  ALL_COMMUNITIES = [...new Set(ALL_ROWS.map(r => r.community))].sort();

  buildCommunityFilter();
  wireTypeFilter();

  if (ALL_COMMUNITIES.length > 0) {
    selectedCommunities.add(ALL_COMMUNITIES[0]);
    refreshChips();
  }

  render();
}

// ─── Community filter chips ─────────────────────────────────────────────────
function buildCommunityFilter() {
  const wrap = document.getElementById('community-filter');
  wrap.innerHTML = ALL_COMMUNITIES.map(name => {
    const idx = ALL_COMMUNITIES.indexOf(name);
    return `<button class="tp-chip" data-community="${escHtml(name)}" style="--chip-color:${COMMUNITY_COLORS[idx % 3].border}">${escHtml(name)}</button>`;
  }).join('');

  wrap.addEventListener('click', e => {
    const chip = e.target.closest('.tp-chip');
    if (!chip) return;
    const name = chip.dataset.community;
    if (selectedCommunities.has(name)) selectedCommunities.delete(name);
    else {
      if (selectedCommunities.size >= 3) return;
      selectedCommunities.add(name);
    }
    refreshChips();
    render();
  });
}

function refreshChips() {
  document.querySelectorAll('.tp-chip').forEach(chip => {
    const active = selectedCommunities.has(chip.dataset.community);
    chip.classList.toggle('tp-chip--active', active);
    const idx = [...selectedCommunities].indexOf(chip.dataset.community);
    chip.style.setProperty('--chip-index', idx >= 0 ? idx : '');
  });
}

// ─── Type filter ─────────────────────────────────────────────────────────────
function wireTypeFilter() {
  document.getElementById('type-filter').addEventListener('click', e => {
    const btn = e.target.closest('.tp-type-btn');
    if (!btn) return;
    selectedType = btn.dataset.type;
    document.querySelectorAll('.tp-type-btn').forEach(b =>
      b.classList.toggle('tp-type-btn--active', b === btn));
    render();
  });
}

// ─── Filtered data helpers ────────────────────────────────────────────────────
function filteredFinancialRows() {
  return ALL_ROWS.filter(r => {
    if (r.type === 'message') return false;
    const communityMatch = selectedCommunities.size === 0 || selectedCommunities.has(r.community);
    let typeMatch;
    if (selectedType === 'all')      typeMatch = true;
    else if (selectedType === 'intended') typeMatch = INTENDED_FAMILY.includes(r.type);
    else                             typeMatch = r.type === selectedType;
    return communityMatch && typeMatch;
  });
}

function filteredMessageRows() {
  return ALL_ROWS.filter(r => {
    if (r.type !== 'message') return false;
    return selectedCommunities.size === 0 || selectedCommunities.has(r.community);
  });
}

function activeCommunities() {
  return selectedCommunities.size > 0
    ? [...selectedCommunities]
    : ALL_COMMUNITIES.slice(0, 1);
}

// ─── Main render ──────────────────────────────────────────────────────────────
function render() {
  renderCharts();
  renderMessages();
  renderCards();
}

// ─── Charts ───────────────────────────────────────────────────────────────────
function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

function renderCharts() {
  renderIncomeExpenseChart();
  renderPipelineChart();
  renderTimelineChart();
  renderTypeBreakdownChart();
}

// Chart 1: Income vs Expenses vs Intended (approved only)
function renderIncomeExpenseChart() {
  destroyChart('incomeExpense');
  const communities = activeCommunities();
  const rows = filteredFinancialRows().filter(r => r.status === 'approved');

  const chartTypes = ['income', 'expense', 'intended'];
  const datasets = chartTypes.map((type, i) => ({
    label: TYPE_LABEL[type],
    data: communities.map(c =>
      rows.filter(r => r.community === c && r.type === type)
          .reduce((s, r) => s + (Number(r.amount) || 0), 0)
    ),
    backgroundColor: COMMUNITY_COLORS[i].bg,
    borderColor:     COMMUNITY_COLORS[i].border,
    borderWidth: 2,
  }));

  charts['incomeExpense'] = new Chart(
    document.getElementById('chart-income-expense'),
    {
      type: 'bar',
      data: { labels: communities, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString() } },
        },
      },
    }
  );
}

// Chart 2: Pipeline donut (financial records, no returned)
function renderPipelineChart() {
  destroyChart('pipeline');
  const rows   = filteredFinancialRows();
  const counts = STATUS_ORDER.filter(s => s !== 'returned').map(s => rows.filter(r => r.status === s).length);
  const labels = STATUS_ORDER.filter(s => s !== 'returned');
  const hasData = counts.some(c => c > 0);

  charts['pipeline'] = new Chart(
    document.getElementById('chart-pipeline'),
    {
      type: 'doughnut',
      data: {
        labels: labels.map(s => STATUS_LABEL[s]),
        datasets: [{
          data: hasData ? counts : [1],
          backgroundColor: hasData ? labels.map(s => STATUS_COLORS[s].bg) : ['#e2e8f0'],
          borderColor:     hasData ? labels.map(s => STATUS_COLORS[s].border) : ['#cbd5e1'],
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${hasData ? ctx.raw : 0} record${ctx.raw !== 1 ? 's' : ''}` } },
        },
      },
    }
  );
}

// Chart 3: Submission timeline
function renderTimelineChart() {
  destroyChart('timeline');
  const rows        = filteredFinancialRows();
  const communities = activeCommunities();
  const monthSet    = new Set(rows.map(r => r.submitted_at?.slice(0, 7)).filter(Boolean));
  const months      = [...monthSet].sort();
  if (months.length === 0) months.push(new Date().toISOString().slice(0, 7));

  const datasets = communities.flatMap((c, i) => {
    const color = COMMUNITY_COLORS[i % 3];
    return [
      {
        label: c + ' (Approved)',
        data: months.map(m => rows.filter(r => r.community === c && r.submitted_at?.startsWith(m) && r.status === 'approved').length),
        borderColor: color.border, backgroundColor: color.bg, fill: true, tension: 0.3, pointRadius: 4,
      },
      {
        label: c + ' (Pending)',
        data: months.map(m => rows.filter(r => r.community === c && r.submitted_at?.startsWith(m) && ['pending','self_reported','verified'].includes(r.status)).length),
        borderColor: color.border, backgroundColor: color.pending, fill: true, tension: 0.3, pointRadius: 4, borderDash: [5, 5],
      },
    ];
  });

  charts['timeline'] = new Chart(
    document.getElementById('chart-timeline'),
    {
      type: 'line',
      data: {
        labels: months.map(m => { const [y, mo] = m.split('-'); return new Date(y, mo - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' }); }),
        datasets,
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      },
    }
  );
}

// Chart 4: Type breakdown donut
function renderTypeBreakdownChart() {
  destroyChart('types');
  const rows        = filteredFinancialRows();
  const chartTypes  = [...FINANCIAL_TYPES, 'other'];
  const counts      = chartTypes.map(t => rows.filter(r => (t === 'other' ? !FINANCIAL_TYPES.includes(r.type) : r.type === t)).length);
  const activeTypes  = chartTypes.filter((_, i) => counts[i] > 0);
  const activeCounts = counts.filter(c => c > 0);
  const hasData      = activeCounts.length > 0;
  const palette      = ['#3b82f6','#10b981','#f59e0b','#a78bfa','#f472b6','#94a3b8'];

  charts['types'] = new Chart(
    document.getElementById('chart-types'),
    {
      type: 'doughnut',
      data: {
        labels: hasData ? activeTypes.map(t => TYPE_LABEL[t] || capitalize(t)) : ['No data'],
        datasets: [{
          data: hasData ? activeCounts : [1],
          backgroundColor: hasData ? activeTypes.map((_, i) => palette[i % palette.length] + 'cc') : ['#e2e8f0'],
          borderColor:     hasData ? activeTypes.map((_, i) => palette[i % palette.length]) : ['#cbd5e1'],
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${hasData ? ctx.raw : 0} record${ctx.raw !== 1 ? 's' : ''}` } },
        },
      },
    }
  );
}

// ─── Community Messages log ───────────────────────────────────────────────────
function renderMessages() {
  const container  = document.getElementById('messages-container');
  const communities = activeCommunities();
  const msgRows    = filteredMessageRows();

  const sections = communities.map((community, ci) => {
    const msgs  = msgRows.filter(r => r.community === community)
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    if (msgs.length === 0) return '';
    const color = COMMUNITY_COLORS[ci % 3].border;
    const items = msgs.map(r => `
      <li class="tp-msg-item">
        <span class="tp-msg-date">${formatDate(r.submitted_at)}</span>
        <span class="tp-msg-note">${escHtml(r.description || '—')}</span>
      </li>`).join('');
    return `
      <div class="tp-messages__block" style="--community-color:${color}">
        <h3 class="tp-messages__title">${escHtml(community)} — Community Messages</h3>
        <ul class="tp-msg-list">${items}</ul>
      </div>`;
  }).join('');

  container.innerHTML = sections ||
    '<p class="tp-empty">No messages for the selected communities.</p>';
}

// ─── Record cards ─────────────────────────────────────────────────────────────
function renderCards() {
  const container  = document.getElementById('records-container');
  const rows       = filteredFinancialRows();
  const communities = activeCommunities();

  if (rows.length === 0) {
    container.innerHTML = '<p class="tp-empty">No records match the current filters.</p>';
    return;
  }

  container.innerHTML = communities.map((community, ci) => {
    const communityRows = rows.filter(r => r.community === community);
    if (communityRows.length === 0) return '';
    const color = COMMUNITY_COLORS[ci % 3].border;

    const approvedIncome   = communityRows.filter(r => r.type === 'income'   && r.status === 'approved').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const approvedExpense  = communityRows.filter(r => r.type === 'expense'  && r.status === 'approved').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const approvedIntended = communityRows.filter(r => INTENDED_FAMILY.includes(r.type) && r.status === 'approved').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const pendingCount     = communityRows.filter(r => ['pending','self_reported','verified'].includes(r.status)).length;

    const tableRows = communityRows.map(r => {
      const isPending  = ['pending','self_reported','verified'].includes(r.status);
      const typeLabel  = TYPE_LABEL[r.type] || capitalize(r.type || '');
      const isCelebrated = r.type === 'intended_higher';

      // Paid badge for intended records
      const paidBadge = (r.type === 'intended' && r.paid)
        ? `<span class="tp-paid-badge">✓ Paid${r.paid_amount != null && Math.abs(Number(r.paid_amount) - Number(r.amount)) >= 0.01 ? ` ($${Number(r.paid_amount).toFixed(2)})` : ''}</span>`
        : '';

      const amountStr = r.amount != null
        ? r.status === 'approved'
          ? `$${Number(r.amount).toFixed(2)}`
          : `<span class="tp-amount-pending" title="Pending verification">~$${Number(r.amount).toFixed(2)}</span>`
        : '—';

      return `
        <tr class="${isPending ? 'tp-row--pending' : ''}${isCelebrated ? ' tp-row--celebrated' : ''}">
          <td>${formatDate(r.submitted_at)}</td>
          <td><span class="tp-badge tp-badge--${escHtml(r.type)}">${escHtml(typeLabel)}</span></td>
          <td>${escHtml(r.description || '—')}</td>
          <td>${amountStr} ${paidBadge}</td>
          <td><span class="tp-status tp-status--${escHtml(r.status)}">${STATUS_LABEL[r.status] || r.status}</span></td>
        </tr>`;
    }).join('');

    return `
      <div class="tp-community-block" style="--community-color:${color}">
        <div class="tp-community-block__header">
          <h3>${escHtml(community)}</h3>
          <div class="tp-community-totals">
            <span class="tp-total tp-total--income">Confirmed Income: <strong>$${approvedIncome.toFixed(2)}</strong></span>
            <span class="tp-total tp-total--expense">Confirmed Expenses: <strong>$${approvedExpense.toFixed(2)}</strong></span>
            <span class="tp-total tp-total--intended">Intended: <strong>$${approvedIntended.toFixed(2)}</strong></span>
            ${pendingCount > 0 ? `<span class="tp-total tp-total--pending">${pendingCount} pending review</span>` : ''}
          </div>
        </div>
        <div class="tp-table-wrap">
          <table class="tp-table">
            <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>`;
  }).join('');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { dateStyle: 'medium' });
}
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

init();
