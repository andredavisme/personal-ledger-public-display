// Intake form — client-side validation and CSV pre-check

const form = document.getElementById('intake-form');

const CSV_RULES = {
  financials_csv: {
    required: ['section', 'name', 'amount'],
    validSections: ['income', 'expense'],
    sectionCol: 'section',
    label: 'Financial Statements'
  },
  budget_csv: {
    required: ['status', 'item', 'estimated_cost'],
    validSections: ['purchased', 'expected', 'desired', 'contingency'],
    sectionCol: 'status',
    label: 'Budget'
  },
  donation_csv: {
    required: ['method', 'handle_or_address'],
    validSections: ['paypal', 'stripe', 'postal', 'pos', 'manual', 'cryptocurrency'],
    sectionCol: 'method',
    label: 'Donation & Payment'
  }
};

function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']));
  });
  return { headers, rows };
}

function validateCSV(fileInput, rules) {
  return new Promise((resolve) => {
    const file = fileInput.files[0];
    if (!file) { resolve([`${rules.label}: No file selected.`]); return; }
    if (!file.name.endsWith('.csv')) { resolve([`${rules.label}: File must be a .csv`]); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const { headers, rows } = parseCSV(e.target.result);
      const errors = [];
      const warnings = [];
      // Check required headers
      rules.required.forEach(col => {
        if (!headers.includes(col)) errors.push(`${rules.label}: Missing required column "${col}"`);
      });
      if (rows.length === 0) errors.push(`${rules.label}: File must contain at least one data row.`);
      // Warn on unknown section values
      rows.forEach((row, i) => {
        const val = (row[rules.sectionCol] || '').toLowerCase();
        if (val && !rules.validSections.includes(val)) {
          warnings.push(`${rules.label} row ${i + 2}: Unknown value "${row[rules.sectionCol]}" in "${rules.sectionCol}" column.`);
        }
      });
      resolve({ errors, warnings });
    };
    reader.readAsText(file);
  });
}

function showErrors(container, errors, warnings) {
  container.innerHTML = '';
  errors.forEach(e => {
    const el = document.createElement('p');
    el.className = 'validation-error';
    el.textContent = '\u274C ' + e;
    container.appendChild(el);
  });
  warnings.forEach(w => {
    const el = document.createElement('p');
    el.className = 'validation-warning';
    el.textContent = '\u26A0\uFE0F ' + w;
    container.appendChild(el);
  });
}

// Inject validation containers after each file input
Object.keys(CSV_RULES).forEach(id => {
  const input = document.getElementById(id);
  if (!input) return;
  const container = document.createElement('div');
  container.id = id + '_feedback';
  container.className = 'csv-feedback';
  input.parentNode.insertBefore(container, input.nextSibling);
  input.addEventListener('change', async () => {
    const result = await validateCSV(input, CSV_RULES[id]);
    if (Array.isArray(result)) {
      showErrors(container, result, []);
    } else {
      showErrors(container, result.errors, result.warnings);
    }
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  let allErrors = [];

  // Required text fields
  ['full_name','email','community_name','location','mission','values','local_vision','donation_transparency'].forEach(id => {
    const el = document.getElementById(id);
    if (!el.value.trim()) allErrors.push(`"${el.previousElementSibling?.textContent?.replace(/Required|Recommended|Optional/g,'').trim() || id}" is required.`);
  });

  // CSV validation
  for (const [id, rules] of Object.entries(CSV_RULES)) {
    const input = document.getElementById(id);
    const result = await validateCSV(input, rules);
    const errs = Array.isArray(result) ? result : result.errors;
    allErrors = allErrors.concat(errs);
  }

  const summary = document.getElementById('form-error-summary');
  if (allErrors.length > 0) {
    summary.innerHTML = '<strong>Please fix the following before submitting:</strong><ul>' +
      allErrors.map(e => `<li>${e}</li>`).join('') + '</ul>';
    summary.style.display = 'block';
    summary.scrollIntoView({ behavior: 'smooth' });
  } else {
    summary.style.display = 'none';
    // TODO: POST to Supabase via API
    alert('Submission received! You will receive a confirmation email shortly.');
    form.reset();
  }
});

// Insert error summary before form actions
const actions = document.querySelector('.form-actions');
const summary = document.createElement('div');
summary.id = 'form-error-summary';
summary.className = 'notice notice--warning';
summary.style.display = 'none';
actions.parentNode.insertBefore(summary, actions);
