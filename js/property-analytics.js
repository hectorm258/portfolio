document.getElementById('propertySelect').addEventListener('change', (e) => {
  const processButton = document.getElementById('processButton');
  processButton.disabled = !e.target.value;
});

async function processProperty() {
  const propertySelect = document.getElementById('propertySelect');
  const property = propertySelect.value;

  if (!property) {
    alert('Please select a property');
    return;
  }

  const processButton = document.getElementById('processButton');
  processButton.disabled = true;
  processButton.innerHTML = '<span class="loading"></span> Processing...';

  try {
    const response = await fetch('/api/property-analytics/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_name: property })
    });

    if (!response.ok) throw new Error('Failed to process property');
    const report = await response.json();
    displayReport(report);
  } catch (error) {
    console.error(error);
    alert('Error processing property. Please try again.');
  } finally {
    processButton.disabled = false;
    processButton.innerHTML = 'Process & Generate Report';
  }
}

function fmt(n) {
  if (n === 0) return '$0.00';
  const abs = Math.abs(n);
  const formatted = '$' + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? '-' + formatted : formatted;
}

function buildMonthRow(label, monthly, total, opts = {}) {
  const { bold, negative, highlight, indent } = opts;

  // All label cells: explicit dark colors so they read on white bg
  const labelCell = indent
    ? `<td style="padding:6px 10px; font-size:0.82rem; color:#555; padding-left:1.5rem;">${label}</td>`
    : bold
      ? `<td style="padding:6px 10px; font-weight:700; font-size:0.83rem; color:#111;">${label}</td>`
      : `<td style="padding:6px 10px; font-size:0.82rem; color:#374151;">${label}</td>`;

  const bg = highlight ? 'background:#fef9c3;' : '';

  const cells = monthly.map(v => {
    const isZero = v === 0;
    // Zeros: lighter gray to signal "no activity", but still readable on white
    const color = isZero
      ? 'color:#aaa;'
      : (negative && v !== 0 ? 'color:#dc2626;' : 'color:#374151;');
    return `<td style="${bg}padding:6px 6px; text-align:right; font-size:0.82rem; white-space:nowrap; font-weight:${bold ? '700' : '400'}; ${bold ? 'color:#111;' : color}">${fmt(v)}</td>`;
  }).join('');

  const totalColor = negative && total !== 0 ? 'color:#dc2626;' : 'color:#111;';
  const totalCell = `<td style="${bg}padding:6px 8px; text-align:right; font-weight:700; font-size:0.82rem; white-space:nowrap; border-left:2px solid #e5e7eb; ${totalColor}">${fmt(total)}</td>`;

  return `<tr>${labelCell}${cells}${totalCell}</tr>`;
}

function displayReport(r) {
  const resultsDiv = document.getElementById('results');

  // Month headers: dark text on light gray thead
  const monthHeaders = r.months.map(m =>
    `<th style="padding:6px 6px; text-align:right; font-weight:600; font-size:0.75rem; color:#555; white-space:nowrap;">${m}</th>`
  ).join('');

  const expenseRows = r.expense_rows.map(row =>
    buildMonthRow(row.label, row.monthly, row.total, { indent: true })
  ).join('');

  const html = `
    <div style="margin-top:1.5rem;">
      <!-- Label row: on dark page bg → use light text -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
        <div style="font-size:0.65rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:#888;">Generated Report Preview</div>
        <div style="font-size:0.75rem; color:#666;">Matches actual PDF output</div>
      </div>

      <!-- PDF-style document: white surface, all text explicitly dark -->
      <div style="background:#fff; border:1px solid #d1d5db; border-radius:0.5rem; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.25);">

        <!-- Document header -->
        <div style="background:#1e3a5f; color:#fff; padding:1.25rem 1.5rem;">
          <div style="font-size:1.05rem; font-weight:700; letter-spacing:0.03em; margin-bottom:0.2rem;">RENTAL PROPERTY STATEMENT</div>
          <div style="font-size:0.78rem; opacity:0.8; margin-bottom:0.75rem;">NRT Rental Management Solutions</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.3rem; font-size:0.78rem; opacity:0.9;">
            <div><span style="opacity:0.65;">Tax Year:</span> ${r.tax_year}</div>
            <div><span style="opacity:0.65;">Property Type:</span> ${r.property_type}</div>
            <div style="grid-column:1/-1;"><span style="opacity:0.65;">Physical Address:</span> ${r.property}</div>
            <div style="grid-column:1/-1;"><span style="opacity:0.65;">Property Management Company:</span> ${r.manager}</div>
          </div>
        </div>

        <!-- Table -->
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; min-width:800px;">
            <thead>
              <tr style="background:#f3f4f6; border-bottom:2px solid #e5e7eb;">
                <th style="padding:8px 10px; text-align:left; font-weight:700; font-size:0.78rem; color:#111; white-space:nowrap; min-width:160px;">Category</th>
                ${monthHeaders}
                <th style="padding:8px 8px; text-align:right; font-weight:700; font-size:0.78rem; color:#111; white-space:nowrap; border-left:2px solid #e5e7eb;">Annual Total</th>
              </tr>
            </thead>
            <tbody>

              <!-- INCOME -->
              <tr style="background:#f0fdf4;">
                <td colspan="${r.months.length + 2}" style="padding:6px 10px; font-size:0.72rem; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; color:#15803d;">INCOME</td>
              </tr>
              ${buildMonthRow(r.income.label, r.income.monthly, r.income.total, { bold: false })}

              <!-- EXPENSES -->
              <tr style="background:#fef2f2;">
                <td colspan="${r.months.length + 2}" style="padding:6px 10px; font-size:0.72rem; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; color:#dc2626;">EXPENSES</td>
              </tr>
              ${expenseRows}

              <!-- Total Expenses -->
              ${buildMonthRow('TOTAL EXPENSES', r.total_expenses.monthly, r.total_expenses.total, { bold: true })}

              <tr style="height:4px; background:#f9fafb;"><td colspan="${r.months.length + 2}"></td></tr>

              <!-- Net Income -->
              ${buildMonthRow('Net Income', r.net_income.monthly, r.net_income.total, { bold: true, highlight: true })}

            </tbody>
          </table>
        </div>

        <!-- Document footer: light gray bg → dark text -->
        <div style="padding:0.75rem 1.5rem; background:#f9fafb; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div style="font-size:0.75rem; color:#555;">Generated: ${r.generated}</div>
          <div style="font-size:0.75rem; color:#15803d; font-weight:600;">✓ Ready for tax accountant submission</div>
        </div>
      </div>

      <!-- Hint: on dark page bg → muted light text -->
      <div style="margin-top:0.75rem; font-size:0.78rem; color:#666; text-align:center;">
        ↔ Scroll horizontally to see all months · This preview matches the actual PDF output
      </div>
    </div>
  `;

  resultsDiv.innerHTML = html;
}
