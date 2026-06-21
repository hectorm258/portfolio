document.getElementById('buyerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const budgetMin = parseInt(document.getElementById('budgetMin').value);
  const budgetMax = parseInt(document.getElementById('budgetMax').value);

  const locations = Array.from(document.querySelectorAll('input[name="location"]:checked'))
    .map(el => el.value);

  const must_haves = Array.from(document.querySelectorAll('input[name="must_have"]:checked'))
    .map(el => el.value);

  const nice_to_haves = Array.from(document.querySelectorAll('input[name="nice_to_have"]:checked'))
    .map(el => el.value);

  const otherRequirements = document.getElementById('otherRequirements').value.trim();

  if (locations.length === 0) {
    alert('Please select at least one location');
    return;
  }

  if (must_haves.length === 0) {
    alert('Please select at least one must-have feature');
    return;
  }

  const rankButton = document.getElementById('rankButton');
  rankButton.disabled = true;
  rankButton.innerHTML = '<span class="loading"></span> Ranking homes…';

  try {
    const response = await fetch('/api/smart-home/rank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        budget_min: budgetMin,
        budget_max: budgetMax,
        locations,
        must_haves,
        nice_to_haves,
        other_requirements: otherRequirements,
      }),
    });

    if (!response.ok) throw new Error('Failed to rank homes');
    const results = await response.json();
    displayResults(results, budgetMin, budgetMax, locations, must_haves, nice_to_haves, otherRequirements);
  } catch (error) {
    console.error(error);
    alert('Error ranking homes. Please try again.');
  } finally {
    rankButton.disabled = false;
    rankButton.innerHTML = 'Rank Homes';
  }
});

// ─── helpers ──────────────────────────────────────────────────────────────────

function scoreColorClass(score) {
  if (score >= 80) return 'high';
  if (score >= 60) return 'mid';
  return 'low';
}

function buildFeatureChips(featuresStr, mustHaves, niceToHaves) {
  const allKeywords = [...mustHaves, ...niceToHaves];
  return featuresStr
    .split(',')
    .map(f => f.trim())
    .filter(Boolean)
    .map(f => {
      const isMatched = allKeywords.some(
        kw => f.toLowerCase().includes(kw.toLowerCase()) || kw.toLowerCase().includes(f.toLowerCase())
      );
      return `<span class="feature-chip ${isMatched ? 'matched' : 'neutral'}">${f}</span>`;
    })
    .join('');
}

function buildMatchSummary(home, budgetMin, budgetMax, locations, mustHaves) {
  const pills = [];

  // Budget
  if (home.price >= budgetMin && home.price <= budgetMax) {
    pills.push(`<span class="summary-pill hit">💰 In budget</span>`);
  } else if (home.breakdown.budget >= 8) {
    pills.push(`<span class="summary-pill ok">💰 Near budget</span>`);
  } else {
    pills.push(`<span class="summary-pill miss">💰 Over budget</span>`);
  }

  // Location
  const inLocation = locations.some(loc => home.address.includes(loc));
  if (inLocation) {
    const city = home.address.split(',')[1]?.trim() || 'Preferred area';
    pills.push(`<span class="summary-pill hit">📍 ${city}</span>`);
  } else {
    pills.push(`<span class="summary-pill miss">📍 Outside area</span>`);
  }

  // Must-haves
  const matched = mustHaves.filter(m =>
    home.features.toLowerCase().includes(m.toLowerCase())
  );
  if (matched.length === mustHaves.length) {
    pills.push(`<span class="summary-pill hit">✅ All must-haves</span>`);
  } else if (matched.length > 0) {
    pills.push(`<span class="summary-pill ok">⚠️ ${matched.length}/${mustHaves.length} must-haves</span>`);
  } else {
    pills.push(`<span class="summary-pill miss">❌ No must-haves</span>`);
  }

  // Days on market
  const freshness = home.daysOnMarket <= 7
    ? `<span class="summary-pill ok">🔥 ${home.daysOnMarket}d on market</span>`
    : `<span class="summary-pill dim">📅 ${home.daysOnMarket}d on market</span>`;
  pills.push(freshness);

  return pills.join('');
}

function buildBreakdownBars(breakdown) {
  const items = [
    { label: 'Must-haves',    value: breakdown.must_haves,   max: 25 },
    { label: 'Budget fit',    value: breakdown.budget,       max: 15 },
    { label: 'Location',      value: breakdown.location,     max: 15 },
    { label: 'Basics',        value: breakdown.basics,       max: 15 },
    { label: 'Nice-to-haves', value: breakdown.nice_to_haves, max: 15 },
  ];

  return items.map(({ label, value, max }) => {
    const pct = Math.round((value / max) * 100);
    const fill = pct >= 80 ? '#4ade80' : pct >= 40 ? '#e85020' : '#ef4444';
    return `
      <div class="score-bar-row">
        <div class="score-bar-label">${label}</div>
        <div class="score-bar-track">
          <div class="score-bar-fill" style="width:${pct}%; background:${fill};"></div>
        </div>
        <div class="score-bar-value">
          ${value}<span style="color:#444; font-weight:400;">/${max}</span>
        </div>
      </div>`;
  }).join('');
}

// ─── main render ──────────────────────────────────────────────────────────────

function displayResults(homes, budgetMin, budgetMax, locations, mustHaves, niceToHaves, otherRequirements) {
  const resultsDiv = document.getElementById('results');

  if (homes.length === 0) {
    resultsDiv.innerHTML = `
      <div style="color:#666; text-align:center; padding:2rem; background:#1c1c1c; border:1px solid #272727; border-radius:12px;">
        No homes match your criteria. Try adjusting your budget or features.
      </div>`;
    return;
  }

  let html = `<p class="micro-label" style="margin-bottom:1.25rem;">Top ${homes.length} Ranked Homes</p>`;

  if (otherRequirements) {
    html += `
      <div style="background:rgba(232,80,32,0.08); border-left:3px solid #e85020; border-radius:0 8px 8px 0; padding:0.9rem 1.2rem; margin-bottom:1.25rem;">
        <div style="font-size:0.68rem; font-weight:700; color:#e85020; text-transform:uppercase; letter-spacing:0.12em; margin-bottom:0.3rem;">Other Requirements</div>
        <div style="font-size:0.9rem; color:#e0e0e0;">"${otherRequirements}"</div>
      </div>`;
  }

  homes.forEach((home, index) => {
    const isTop   = index === 0;
    const rank    = isTop ? '🏆 Best Match' : `#${index + 1}`;
    const colCls  = scoreColorClass(home.score);

    html += `
      <div class="result-card ${isTop ? 'top-pick' : ''}">

        <!-- Rank + Address + Score -->
        <div class="result-header">
          <div style="flex:1; min-width:0;">
            <div class="result-rank-badge ${isTop ? 'top' : ''}">${rank}</div>
            <div class="result-address">${home.address}</div>
          </div>
          <div style="flex-shrink:0; text-align:right; margin-left:1rem;">
            <div class="result-score-circle ${colCls}">${home.score}</div>
            <div class="result-score-label">/ 100</div>
          </div>
        </div>

        <!-- Quick stats -->
        <div class="result-meta">
          $${home.price.toLocaleString()} &nbsp;·&nbsp;
          ${home.beds} bed &nbsp;·&nbsp;
          ${home.baths} bath &nbsp;·&nbsp;
          ${home.sqft.toLocaleString()} sqft
        </div>

        <!-- Match summary pills -->
        <div class="result-summary-row">
          ${buildMatchSummary(home, budgetMin, budgetMax, locations, mustHaves)}
        </div>

        <!-- Feature chips -->
        <div class="feature-chips">
          ${buildFeatureChips(home.features, mustHaves, niceToHaves)}
        </div>

        <!-- Collapsible scoring breakdown -->
        <details class="breakdown-toggle">
          <summary>
            <span class="toggle-arrow" style="font-size:0.75rem; color:#555;">▸</span>
            See scoring breakdown
          </summary>
          ${buildBreakdownBars(home.breakdown)}
        </details>

      </div>`;
  });

  resultsDiv.innerHTML = html;

  // Flip arrow on open/close
  document.querySelectorAll('.breakdown-toggle').forEach(el => {
    el.addEventListener('toggle', () => {
      const arrow = el.querySelector('.toggle-arrow');
      if (arrow) arrow.textContent = el.open ? '▾' : '▸';
    });
  });
}
