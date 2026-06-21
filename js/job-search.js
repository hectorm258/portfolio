let companies = [];

// Load companies on page load
document.addEventListener('DOMContentLoaded', loadCompanies);

async function loadCompanies() {
  try {
    const response = await fetch('/api/job-search/companies');
    if (!response.ok) throw new Error('Failed to load companies');
    companies = await response.json();
    displayCompanies();
  } catch (error) {
    console.error(error);
    alert('Error loading companies');
  }
}

function displayCompanies() {
  const companyList = document.getElementById('companyList');
  
  const html = companies.map(company => `
    <div style="background: var(--gray-50); padding: 1.5rem; border-radius: 0.5rem; cursor: pointer; transition: all 0.3s ease;" 
         onmouseenter="this.style.background='var(--gray-100)'" 
         onmouseleave="this.style.background='var(--gray-50)'"
         onclick="selectCompany('${company.id}', '${company.name}')">
      <h4 style="margin-bottom: 0.5rem; color: var(--gray-900);">${company.name}</h4>
      <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 0.75rem;">${company.industry}</p>
      <span style="display: inline-block; background: var(--primary); color: white; padding: 0.3rem 0.75rem; border-radius: 0.3rem; font-size: 0.85rem; font-weight: 600;">
        ${company.status === 'actively_hiring' ? '🔥 Actively Hiring' : 'Monitor'}
      </span>
    </div>
  `).join('');
  
  companyList.innerHTML = html;
}

async function selectCompany(companyId, companyName) {
  document.getElementById('companyName').textContent = companyName;
  const rolesContainer = document.getElementById('rolesContainer');
  const rolesList = document.getElementById('rolesList');
  
  rolesContainer.style.display = 'block';
  rolesList.innerHTML = '<p style="text-align: center;"><span class="loading"></span> Loading roles...</p>';
  
  try {
    const response = await fetch(`/api/job-search/roles/${companyId}`, {
      method: 'POST'
    });
    
    if (!response.ok) throw new Error('Failed to load roles');
    const roles = await response.json();
    displayRoles(roles, companyName);
  } catch (error) {
    console.error(error);
    rolesList.innerHTML = '<p style="color: var(--error);">Error loading roles. Try again.</p>';
  }
}

function displayRoles(roles, companyName) {
  const rolesList = document.getElementById('rolesList');
  
  const html = roles.map((role, idx) => `
    <div style="background: var(--gray-50); padding: 1.5rem; border-radius: 0.5rem; border: 1px solid var(--gray-200);">
      <h4 style="margin-bottom: 0.5rem; color: var(--gray-900);">${role.title}</h4>
      <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 1rem;">
        Posted: ${role.posted_date}
      </p>
      <a href="${role.url}" target="_blank" style="display: inline-block; color: var(--primary); text-decoration: none; font-weight: 600; margin-bottom: 1rem;">
        View Details →
      </a>
      <br>
      <button type="button" class="form-button" style="width: 100%; padding: 0.75rem;" onclick="logApplicationQuick('${companyName}', '${role.title}')">
        Log Application
      </button>
    </div>
  `).join('');
  
  rolesList.innerHTML = html;
}

function logApplicationQuick(company, role) {
  document.getElementById('appCompany').value = company;
  document.getElementById('appRole').value = role;
  
  // Scroll to form
  document.getElementById('appCompany').scrollIntoView({ behavior: 'smooth' });
}

async function trackApplication() {
  const company = document.getElementById('appCompany').value.trim();
  const role = document.getElementById('appRole').value.trim();
  
  if (!company || !role) {
    alert('Please fill in company and role');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  
  try {
    const response = await fetch('/api/job-search/track-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company,
        role_title: role,
        date_applied: today
      })
    });

    if (!response.ok) throw new Error('Failed to track application');
    const result = await response.json();
    
    displayApplicationResult(result);
    
    // Clear form
    document.getElementById('appCompany').value = '';
    document.getElementById('appRole').value = '';
  } catch (error) {
    console.error(error);
    alert('Error tracking application');
  }
}

function displayApplicationResult(app) {
  const resultsDiv = document.getElementById('results');
  
  const followUpDate = new Date(app.follow_up_date);
  const daysUntilFollowUp = Math.ceil((followUpDate - new Date()) / (1000 * 60 * 60 * 24));
  
  let html = `
    <div class="results-section">
      <div class="alert alert-success">
        ✅ Application logged for <strong>${app.company}</strong> - <strong>${app.role_title}</strong>
      </div>
      
      <div style="background: var(--gray-50); padding: 1.5rem; border-radius: 0.5rem; border-left: 4px solid var(--primary);">
        <h4 style="margin-bottom: 1rem;">Application Details</h4>
        <table style="width: 100%; border: none;">
          <tr>
            <td style="border: none; padding: 0.5rem 0; color: var(--text-light);">Company</td>
            <td style="border: none; padding: 0.5rem 0; font-weight: 600;">${app.company}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 0.5rem 0; color: var(--text-light);">Role</td>
            <td style="border: none; padding: 0.5rem 0; font-weight: 600;">${app.role_title}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 0.5rem 0; color: var(--text-light);">Date Applied</td>
            <td style="border: none; padding: 0.5rem 0; font-weight: 600;">${app.date_applied}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 0.5rem 0; color: var(--text-light);">Status</td>
            <td style="border: none; padding: 0.5rem 0;"><span style="background: var(--primary); color: white; padding: 0.3rem 0.75rem; border-radius: 0.3rem; font-size: 0.85rem; font-weight: 600;">Applied</span></td>
          </tr>
          <tr>
            <td style="border: none; padding: 0.5rem 0; color: var(--text-light);">Follow-up Date</td>
            <td style="border: none; padding: 0.5rem 0; font-weight: 600;">${app.follow_up_date} (${daysUntilFollowUp} days)</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 1.5rem; padding: 1rem; background: var(--gray-50); border-radius: 0.5rem;">
        <p style="color: var(--text-light); font-size: 0.95rem;">
          <strong>💡 Pro tip:</strong> Set a calendar reminder for ${app.follow_up_date} to follow up with the hiring team if you haven't heard back.
        </p>
      </div>
    </div>
  `;

  resultsDiv.innerHTML = html;
  resultsDiv.scrollIntoView({ behavior: 'smooth' });
}
