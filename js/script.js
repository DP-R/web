/* ============================================================================
   Secure Access Workspace - Main Application Javascript
   ============================================================================ */

const SEARCH_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzKo4Gyc25d3Qgo_9mEq9ySTu4HdSInZDmVt8nGl6zKqEoguxDopE03vprhw2pB7gTi/exec";


// Register Progressive Web App Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('[PWA] Service Worker registered successfully', reg.scope))
      .catch(err => console.error('[PWA] Service Worker registration failed', err));
  });
}

// Global Toast System
window.showToast = function(title, message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
  } else if (type === 'danger') {
    iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
  } else if (type === 'warning') {
    iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
  } else {
    iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
  }

  toast.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.classList.add('active'), 50);

  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

// Authentication state handling
const AUTH_KEY = 'secure_portal_auth_timestamp';
let isAuthenticated = false;

function handleAuthInput(event) {
  if (event.key === 'Enter') {
    const input = document.getElementById('password-input').value;
    if (input === ' ') {
      unlockWorkspace();
    } else {
      const errMsg = document.getElementById('error-msg');
      errMsg.classList.add('visible');
      setTimeout(() => errMsg.classList.remove('visible'), 3000);
      document.getElementById('password-input').value = '';
    }
  }
}

function unlockWorkspace() {
  isAuthenticated = true;
  document.getElementById('auth-overlay').classList.add('hidden');
  document.getElementById('app-layout').classList.add('unlocked');
  
  // Initialize SPA utilities once unlocked
  initSPA();
  
  // Initialize uploader
  if (typeof initUploader === 'function') {
    initUploader();
  }

  // Initialize DB search
  initDbSearch();

  // Initialize Flight Schedule
  initFlightSchedule();
  
  window.showToast('Authorized', 'Workspace unlocked successfully.', 'success', 2500);
}

function lockWorkspace() {
  isAuthenticated = false;
  document.getElementById('auth-overlay').classList.remove('hidden');
  document.getElementById('app-layout').classList.remove('unlocked');
  document.getElementById('password-input').value = '';
  document.getElementById('password-input').focus();
}

// SPA Routing and view switching
function initSPA() {
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.tab-view');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.dataset.tab;
      
      navItems.forEach(nav => nav.classList.remove('active'));
      views.forEach(view => view.classList.remove('active'));

      item.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });

  // Handle direct navigation via URL search parameter (e.g. ?tab=upload)
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  if (tabParam) {
    const matchedItem = Array.from(navItems).find(n => n.dataset.tab === `${tabParam}View`);
    if (matchedItem) {
      matchedItem.click();
    }
  }

  // Dashboard embedded documents switcher
  const embedTabBtns = document.querySelectorAll('.embed-tab-btn');
  const embedPanes = document.querySelectorAll('.embed-pane');

  // Trigger loading on the active one initially (Excel)
  const activePane = document.querySelector('.embed-pane.active');
  if (activePane) {
    loadEmbedIframe(activePane.id);
  }

  embedTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPane = btn.dataset.embed;
      embedTabBtns.forEach(b => b.classList.remove('active'));
      embedPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(targetPane);
      if (pane) {
        pane.classList.add('active');
        loadEmbedIframe(targetPane);
      }
    });
  });
}

// On-demand iframe loader
function loadEmbedIframe(paneId) {
  const pane = document.getElementById(paneId);
  if (!pane) return;
  const iframe = pane.querySelector('iframe');
  if (iframe && !iframe.src && iframe.dataset.src) {
    iframe.src = iframe.dataset.src;
  }
}

// Integrated Workspace Viewer Controller
function openWorkspaceLink(url, title, type = 'document') {
  const viewer = document.getElementById('workspace-viewer');
  const iframe = document.getElementById('viewer-iframe');
  const viewerTitle = document.getElementById('viewer-title');
  const viewerSubtitle = document.getElementById('viewer-subtitle');
  const loader = document.getElementById('viewer-loader');
  
  viewerTitle.innerText = title;
  viewerSubtitle.innerText = type === 'sheet' ? 'Google Spreadsheets Viewer' : (type === 'drive' ? 'Google Drive Directory' : 'Document Viewer');
  
  loader.style.opacity = '1';
  loader.style.display = 'flex';
  
  iframe.src = '';
  
  iframe.onload = () => {
    loader.style.opacity = '0';
    setTimeout(() => loader.style.display = 'none', 300);
  };
  
  iframe.src = url;
  viewer.classList.add('active');
}

function closeWorkspaceViewer() {
  const viewer = document.getElementById('workspace-viewer');
  const iframe = document.getElementById('viewer-iframe');
  viewer.classList.remove('active');
  setTimeout(() => {
    iframe.src = '';
  }, 300);
}

function refreshWorkspaceViewer() {
  const iframe = document.getElementById('viewer-iframe');
  const loader = document.getElementById('viewer-loader');
  loader.style.display = 'flex';
  loader.style.opacity = '1';
  iframe.src = iframe.src;
}

function openViewerNative() {
  const iframe = document.getElementById('viewer-iframe');
  if (iframe.src) {
    window.open(iframe.src, '_blank');
  }
}



// Global page load initial focus
window.addEventListener('DOMContentLoaded', () => {
  const passInput = document.getElementById('password-input');
  if (passInput) passInput.focus();
});

// ============================================================================
// Database Search Integration
// ============================================================================
let dbFolderSelect, dbSearchInput, dbSearchBtn, dbSyncBtn, dbSearchStatus, dbSearchResults;

function initDbSearch() {
  dbFolderSelect = document.getElementById('dbFolderSelect');
  dbSearchInput = document.getElementById('dbSearchInput');
  dbSearchBtn = document.getElementById('dbSearchBtn');
  dbSyncBtn = document.getElementById('dbSyncBtn');
  dbSearchStatus = document.getElementById('dbSearchStatus');
  dbSearchResults = document.getElementById('dbSearchResults');

  if (!dbSearchInput) return;

  // Key event on input
  dbSearchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      executeDbSearch();
    }
  });

  // Load subfolders list on load
  fetchSubfolders();
}

async function fetchSubfolders() {
  if (!dbFolderSelect) return;
  dbFolderSelect.disabled = true;

  try {
    const res = await fetch(SEARCH_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getSubFolders' })
    });
    
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    
    const data = await res.json();
    if (data.success && data.folders) {
      dbFolderSelect.innerHTML = "";
      const defaultOption = document.createElement('option');
      defaultOption.value = "1WWHuy0bAdfNVrwMIIThRpZVAIBNpe0m8";
      defaultOption.text = "All Master Folders";
      dbFolderSelect.appendChild(defaultOption);

      data.folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.text = "📁 " + folder.name;
        dbFolderSelect.appendChild(option);
      });
    }
  } catch (err) {
    console.error('Failed to load subfolders:', err);
    if (dbFolderSelect.options[0]) {
      dbFolderSelect.options[0].text = "Error loading subfolders";
    }
  } finally {
    dbFolderSelect.disabled = false;
  }
}

async function executeDbSearch() {
  const query = dbSearchInput.value.trim();
  const folderId = dbFolderSelect.value;
  if (!query) return;

  dbSearchInput.blur();
  dbSearchStatus.innerHTML = "Scanning live sheets and database...";
  dbSearchStatus.className = "db-status loading";
  dbSearchResults.innerHTML = "";
  dbSearchBtn.disabled = true;
  dbSyncBtn.disabled = true;

  try {
    const res = await fetch(SEARCH_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'performSearch', query, folderId })
    });
    
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    
    const data = await res.json();
    dbSearchStatus.className = "db-status";
    
    if (data.success) {
      displayDbResults(data.results);
    } else {
      dbSearchStatus.innerHTML = `<span style='color:var(--color-danger);'>❌ Search Error: ${data.error || 'Server error'}</span>`;
    }
  } catch (err) {
    dbSearchStatus.className = "db-status";
    dbSearchStatus.innerHTML = `<span style='color:var(--color-danger);'>❌ Connection Error: ${err.message}</span>`;
  } finally {
    dbSearchBtn.disabled = false;
    dbSyncBtn.disabled = false;
  }
}

function displayDbResults(results) {
  if (!results || results.length === 0) {
    dbSearchStatus.innerHTML = "No matches found.";
    return;
  }

  dbSearchStatus.innerHTML = `Found ${results.length} match(es).`;

  let html = "";
  results.forEach(res => {
    const isLive = res.type.toLowerCase().includes('live');
    const typeClass = isLive ? "badge live" : "badge cached";
    const docIcon = isLive ? "📊" : "📄";
    const snippetClass = res.format === "grid" ? "" : "snippet-text";
    
    // Check file type to open correctly in workspace viewer
    const typeParam = res.mime === 'application/vnd.google-apps.spreadsheet' || res.format === 'grid' ? 'sheet' : 'document';
    
    // Construct click handler to open inside workspace viewer modal instead of new tab!
    const clickHandler = `onclick="openWorkspaceLink('${res.url}', '${res.name.replace(/'/g, "\\'")}', '${typeParam}')"`;

    html += `
      <div class="result-item">
        <div class="result-header">
          <a href="javascript:void(0)" ${clickHandler} class="result-title">${docIcon} ${res.name}</a>
          <div class="badges">
            <span class="badge score">🎯 ${res.score}%</span>
            <span class="badge loc">📍 ${res.location}</span>
            <span class="${typeClass}">${res.type}</span>
          </div>
        </div>
        <div class="${snippetClass}">
          ${res.snippet}
        </div>
      </div>`;
  });
  
  dbSearchResults.innerHTML = html;
}

async function syncDatabase() {
  const folderId = dbFolderSelect.value;
  dbSearchStatus.innerHTML = "Updating search database... This may take a minute.";
  dbSearchStatus.className = "db-status loading";
  dbSyncBtn.disabled = true;
  dbSearchBtn.disabled = true;

  try {
    const res = await fetch(SEARCH_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'manuallyCacheFolder', folderId })
    });
    
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    
    const data = await res.json();
    dbSearchStatus.className = "db-status";
    
    if (data.success) {
      dbSearchStatus.innerHTML = `<span style='color:var(--color-success);'>✅ Sync Completed</span>`;
      window.showToast('Database Synced', data.message || 'Updated index successfully.', 'success', 5000);
    } else {
      dbSearchStatus.innerHTML = `<span style='color:var(--color-danger);'>❌ Sync Error: ${data.error || 'Server error'}</span>`;
    }
  } catch (err) {
    dbSearchStatus.className = "db-status";
    dbSearchStatus.innerHTML = `<span style='color:var(--color-danger);'>❌ Sync Connection Error: ${err.message}</span>`;
  } finally {
    dbSyncBtn.disabled = false;
    dbSearchBtn.disabled = false;
  }
}

// ============================================================================
// Chennai International Flight Monitor Integration
// ============================================================================
const flightDataset = [
  { id: "F1", flightNo: "EK 542", airline: "Emirates", origin: "Dubai", code: "DXB", eta: "02:30", status: "Landed", risk: "high", weight: 840, obcs: 2, watchlist: "Aramex / Industrial Spare Parts" },
  { id: "F2", flightNo: "6E 1472", airline: "IndiGo", origin: "Dubai", code: "DXB", eta: "02:35", status: "Landed", risk: "high", weight: 350, obcs: 1, watchlist: "OBC / Auto Assemblies" },
  { id: "F3", flightNo: "6E 1002", airline: "IndiGo", origin: "Singapore", code: "SIN", eta: "06:15", status: "Landed", risk: "medium", weight: 420, obcs: 0, watchlist: "FedEx / Microprocessors" },
  { id: "F4", flightNo: "AK 11", airline: "AirAsia", origin: "Kuala Lumpur", code: "KUL", eta: "07:25", status: "Landed", risk: "medium", weight: 610, obcs: 1, watchlist: "DHL / Cosmetic Samples" },
  { id: "F5", flightNo: "EK 544", airline: "Emirates", origin: "Dubai", code: "DXB", eta: "08:05", status: "Landed", risk: "high", weight: 1250, obcs: 3, watchlist: "OBC / Gold Wire in motors" },
  { id: "F6", flightNo: "SQ 524", airline: "Singapore Airlines", origin: "Singapore", code: "SIN", eta: "09:20", status: "Landed", risk: "medium", weight: 980, obcs: 0, watchlist: "AEO / Tech Components" },
  { id: "F7", flightNo: "UL 121", airline: "SriLankan Airlines", origin: "Colombo", code: "CMB", eta: "10:15", status: "En Route", risk: "medium", weight: 280, obcs: 2, watchlist: "OBC / Textile samples, Gems" },
  { id: "F8", flightNo: "MH 182", airline: "Malaysia Airlines", origin: "Kuala Lumpur", code: "KUL", eta: "10:45", status: "En Route", risk: "medium", weight: 550, obcs: 1, watchlist: "TNT / Camera lenses" },
  { id: "F9", flightNo: "6E 1062", airline: "IndiGo", origin: "Bangkok", code: "BKK", eta: "11:00", status: "En Route", risk: "high", weight: 390, obcs: 0, watchlist: "UPS / Exotic Wildlife (reptiles)" },
  { id: "F10", flightNo: "6E 1026", airline: "IndiGo", origin: "Singapore", code: "SIN", eta: "12:45", status: "Scheduled", risk: "medium", weight: 310, obcs: 0, watchlist: "DHL / CPU Chips" },
  { id: "F11", flightNo: "LH 756", airline: "Lufthansa", origin: "Frankfurt", code: "FRA", eta: "13:30", status: "Scheduled", risk: "low", weight: 1450, obcs: 0, watchlist: "AEO / Heavy Machine Tools" },
  { id: "F12", flightNo: "6E 1174", airline: "IndiGo", origin: "Colombo", code: "CMB", eta: "15:40", status: "Scheduled", risk: "medium", weight: 190, obcs: 2, watchlist: "OBC / Gemstones" },
  { id: "F13", flightNo: "EK 546", airline: "Emirates", origin: "Dubai", code: "DXB", eta: "20:30", status: "Scheduled", risk: "high", weight: 1100, obcs: 2, watchlist: "OBC / Smart Devices, Watch Gears" },
  { id: "F14", flightNo: "SQ 528", airline: "Singapore Airlines", origin: "Singapore", code: "SIN", eta: "22:00", status: "Scheduled", risk: "medium", weight: 890, obcs: 1, watchlist: "OBC / CPU chips, currency" },
  { id: "F15", flightNo: "MH 180", airline: "Malaysia Airlines", origin: "Kuala Lumpur", code: "KUL", eta: "22:50", status: "Scheduled", risk: "medium", weight: 460, obcs: 1, watchlist: "DHL / Mobile Phone spares" },
  { id: "F16", flightNo: "TG 337", airline: "Thai Airways", origin: "Bangkok", code: "BKK", eta: "23:45", status: "Scheduled", risk: "high", weight: 620, obcs: 2, watchlist: "OBC / Fashion Goods, Turtles" }
];

const seizureDatabase = [
  { date: "2026-07-06 09:40", flight: "EK 544", origin: "Dubai (DXB)", commodity: "Gold concealed in motor", value: "84.5 Lakhs", mo: "1.4 kg gold wire wrapped around the copper coils of a commercial water pump, cleared as industrial sample under CBE-XII.", officer: "Insp. Ramachandran" },
  { date: "2026-07-05 23:55", flight: "TG 337", origin: "Bangkok (BKK)", commodity: "Exotic Wildlife (Air Cargo)", value: "24.0 Lakhs", mo: "140 live red-eared slider turtles and 4 marmosets packed in plastic containers concealed inside a cardboard box declared as 'Garment Samples'.", officer: "Insp. S. Kumar" },
  { date: "2026-07-05 11:15", flight: "UL 121", origin: "Colombo (CMB)", commodity: "Misdeclared Gems (OBC)", value: "32.2 Lakhs", mo: "Undeclared cut sapphire gemstones hidden inside the double-layered stitching of an OBC courier bag.", officer: "Insp. Anita Raj" },
  { date: "2026-07-04 03:10", flight: "EK 542", origin: "Dubai (DXB)", commodity: "Foreign Currency Notes", value: "54.8 Lakhs", mo: "USD 65,000 cash notes stacked inside thick rigid cardboard envelopes declared as 'Printed Documents' (CBE-XI).", officer: "Insp. Ramachandran" },
  { date: "2026-07-03 14:05", flight: "MH 182", origin: "Kuala Lumpur (KUL)", commodity: "CPU Chips in Document Envelope", value: "18.5 Lakhs", mo: "250 high-end Intel i9 CPU units declared as 'technical booklets' in document parcels.", officer: "Insp. Priya Nair" }
];

let flightRiskFilter, flightSearchInput, flightsTableBody, seizuresTableBody;

function initFlightSchedule() {
  flightRiskFilter = document.getElementById('flightRiskFilter');
  flightSearchInput = document.getElementById('flightSearchInput');
  flightsTableBody = document.getElementById('flightsTableBody');
  seizuresTableBody = document.getElementById('seizuresTableBody');

  if (!flightsTableBody) return;

  // Bind change and input listeners
  flightRiskFilter.addEventListener('change', renderFlightsTable);
  flightSearchInput.addEventListener('input', renderFlightsTable);

  // Initial draw
  renderFlightsTable();
  renderSeizuresTable();
}

function renderFlightsTable() {
  const filterVal = flightRiskFilter.value;
  const searchVal = flightSearchInput.value.toLowerCase().trim();
  
  let html = "";
  flightDataset.forEach(f => {
    const matchFilter = (filterVal === 'all' || f.risk === filterVal);
    const matchSearch = (f.flightNo.toLowerCase().includes(searchVal) || f.origin.toLowerCase().includes(searchVal));
    
    if (matchFilter && matchSearch) {
      // Risk badge styling
      let riskClass = "badge cached"; // Default fallback
      if (f.risk === 'high') riskClass = "badge-danger badge";
      else if (f.risk === 'medium') riskClass = "badge-warning badge";
      else if (f.risk === 'low') riskClass = "badge-success badge";

      html += `
        <tr>
          <td style="padding: 12px 8px; border-bottom: 1px solid var(--border-color);">
            <span class="flight-num" style="font-weight: 700; color: #fff; display: block;">${f.flightNo}</span>
            <span class="airline-name" style="font-size: 11px; color: var(--text-muted);">${f.airline}</span>
          </td>
          <td style="padding: 12px 8px; border-bottom: 1px solid var(--border-color);">
            <span class="origin-city" style="font-weight: 500; display: block;">${f.origin}</span>
            <span class="origin-code" style="font-size: 11px; color: var(--text-muted);">(${f.code})</span>
          </td>
          <td style="padding: 12px 8px; border-bottom: 1px solid var(--border-color); font-family: var(--font-mono);">${f.eta}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid var(--border-color);">${f.status}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid var(--border-color);"><span class="${riskClass}">${f.risk.toUpperCase()}</span></td>
          <td style="padding: 12px 8px; border-bottom: 1px solid var(--border-color); font-family: var(--font-mono);">${f.obcs}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid var(--border-color); font-size: 12px; color: var(--text-secondary);">${f.watchlist}</td>
        </tr>`;
    }
  });

  if (!html) {
    html = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">No flights matching search criteria.</td></tr>`;
  }
  
  flightsTableBody.innerHTML = html;
}

function renderSeizuresTable() {
  if (!seizuresTableBody) return;
  
  let html = "";
  seizureDatabase.forEach(s => {
    html += `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid var(--border-color); font-family: var(--font-mono); font-size: 12px;">${s.date}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid var(--border-color);">
          <span style="font-weight: 700; color: #fff; display: block;">${s.flight}</span>
          <span style="font-size: 11px; color: var(--text-muted);">${s.origin}</span>
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid var(--border-color); font-weight: 600; color: var(--color-primary);">${s.commodity}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid var(--border-color); font-family: var(--font-mono); font-weight: 600;">${s.value}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid var(--border-color); font-size: 12px; color: var(--text-secondary); line-height: 1.4;">${s.mo}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid var(--border-color); font-size: 12px;">${s.officer}</td>
      </tr>`;
  });
  
  seizuresTableBody.innerHTML = html;
}