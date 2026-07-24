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
// Chennai International Flight Schedule
// ============================================================================
const flightDataset = [
  { arrTime: "00:05", depTime: "01:20", source: "Bangkok (BKK)", dest: "Bangkok (BKK)", arrNo: "TG 337", depNo: "TG 338", airline: "Thai Airways", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320 / B777", route: "BKK ➔ MAA ➔ BKK", isCargo: false },
  { arrTime: "01:40", depTime: "11:25", source: "Singapore (SIN)", dest: "Singapore (SIN)", arrNo: "AI 347", depNo: "AI 346", airline: "Air India", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320neo / A321", route: "SIN ➔ MAA ➔ SIN", isCargo: false },
  { arrTime: "01:55", depTime: "02:55", source: "Kuwait (KWI)", dest: "Kuwait (KWI)", arrNo: "KU 343", depNo: "KU 344", airline: "Kuwait Airways", shift: "shift-a", periodic: true, days: [0,1,0,1,0,1,1], ac: "A320neo / A330", route: "KWI ➔ MAA ➔ KWI", isCargo: false },
  { arrTime: "02:30", depTime: "04:00", source: "Dubai (DXB)", dest: "Dubai (DXB)", arrNo: "EK 546", depNo: "EK 547", airline: "Emirates", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "B777-300ER", route: "DXB ➔ MAA ➔ DXB", isCargo: false },
  { arrTime: "02:30", depTime: "03:30", source: "Kuwait (KWI)", dest: "Kuwait (KWI)", arrNo: "J9 407", depNo: "J9 408", airline: "Jazeera Airways", shift: "shift-a", periodic: true, days: [1,0,1,0,1,0,0], ac: "A320", route: "KWI ➔ MAA ➔ KWI", isCargo: false },
  { arrTime: "03:05", depTime: "04:05", source: "Bahrain (BAH)", dest: "Bahrain (BAH)", arrNo: "GF 068", depNo: "GF 069", airline: "Gulf Air", shift: "shift-a", periodic: true, days: [1,0,1,0,1,1,1], ac: "A321neo", route: "BAH ➔ MAA ➔ BAH", isCargo: false },
  { arrTime: "03:15", depTime: "04:10", source: "Abu Dhabi (AUH)", dest: "Abu Dhabi (AUH)", arrNo: "EY 270", depNo: "EY 271", airline: "Etihad Airways", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320 / A321", route: "AUH ➔ MAA ➔ AUH", isCargo: false },
  { arrTime: "03:30", depTime: "04:15", source: "Sharjah (SHJ)", dest: "Sharjah (SHJ)", arrNo: "G9 471", depNo: "G9 472", airline: "Air Arabia", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320", route: "SHJ ➔ MAA ➔ SHJ", isCargo: false },
  { arrTime: "04:30", depTime: "06:00", source: "Doha (DOH)", dest: "Doha (DOH)", arrNo: "QR 8345", depNo: "QR 8346", airline: "Qatar Cargo", shift: "shift-a", periodic: true, days: [1,0,0,1,0,0,0], ac: "B777F", route: "DOH ➔ MAA ➔ DOH", isCargo: true },
  { arrTime: "05:00", depTime: "19:35", source: "Dubai (DXB)", dest: "Dubai (DXB)", arrNo: "6E 1478", depNo: "6E 1477", airline: "IndiGo", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A321", route: "DXB ➔ MAA ➔ DXB", isCargo: false },
  { arrTime: "05:35", depTime: "21:10", source: "Bangkok (BKK)", dest: "Bangkok (BKK)", arrNo: "6E 1052", depNo: "6E 1051", airline: "IndiGo", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320", route: "BKK ➔ MAA ➔ BKK", isCargo: false },
  { arrTime: "05:40", depTime: "20:15", source: "Abu Dhabi (AUH)", dest: "Abu Dhabi (AUH)", arrNo: "6E 1412", depNo: "6E 1411", airline: "IndiGo", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320", route: "AUH ➔ MAA ➔ AUH", isCargo: false },
  { arrTime: "05:45", depTime: "07:35", source: "London (LHR)", dest: "London (LHR)", arrNo: "BA 035", depNo: "BA 036", airline: "British Airways", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "B787-9 / B777", route: "LHR ➔ MAA ➔ LHR", isCargo: false },
  { arrTime: "06:45", depTime: "22:30", source: "Muscat (MCT)", dest: "Muscat (MCT)", arrNo: "6E 1206", depNo: "6E 1205", airline: "IndiGo", shift: "shift-a", periodic: true, days: [1,0,1,0,1,0,1], ac: "A320", route: "MCT ➔ MAA ➔ MCT", isCargo: false },
  { arrTime: "07:10", depTime: "08:10", source: "Muscat (MCT)", dest: "Muscat (MCT)", arrNo: "WY 231", depNo: "WY 232", airline: "Oman Air", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "B737", route: "MCT ➔ MAA ➔ MCT", isCargo: false },
  { arrTime: "07:15", depTime: "07:05", source: "Singapore (SIN)", dest: "Singapore (SIN)", arrNo: "6E 1004", depNo: "6E 1001", airline: "IndiGo", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A321", route: "SIN ➔ MAA ➔ SIN", isCargo: false },
  { arrTime: "07:15", depTime: "20:45", source: "Dammam (DMM)", dest: "Dammam (DMM)", arrNo: "6E 1602", depNo: "6E 1601", airline: "IndiGo", shift: "shift-a", periodic: true, days: [0,1,0,1,0,1,1], ac: "A320", route: "DMM ➔ MAA ➔ DMM", isCargo: false },
  { arrTime: "07:30", depTime: "08:05", source: "Kuala Lumpur (KUL)", dest: "Kuala Lumpur (KUL)", arrNo: "AK 12", depNo: "AK 13", airline: "AirAsia", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320", route: "KUL ➔ MAA ➔ KUL", isCargo: false },
  { arrTime: "07:50", depTime: "21:50", source: "Doha (DOH)", dest: "Doha (DOH)", arrNo: "6E 1702", depNo: "6E 1701", airline: "IndiGo", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320", route: "DOH ➔ MAA ➔ DOH", isCargo: false },
  { arrTime: "07:55", depTime: "08:45", source: "Kuala Lumpur (KUL)", dest: "Kuala Lumpur (KUL)", arrNo: "OD 225", depNo: "OD 226", airline: "Batik Air Malaysia", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "B737", route: "KUL ➔ MAA ➔ KUL", isCargo: false },
  { arrTime: "08:35", depTime: "09:30", source: "Abu Dhabi (AUH)", dest: "Abu Dhabi (AUH)", arrNo: "EY 268", depNo: "EY 269", airline: "Etihad Airways", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320 / A321", route: "AUH ➔ MAA ➔ AUH", isCargo: false },
  { arrTime: "08:45", depTime: "09:45", source: "Colombo (CMB)", dest: "Colombo (CMB)", arrNo: "UL 121", depNo: "UL 122", airline: "SriLankan Airlines", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320 / A330", route: "CMB ➔ MAA ➔ CMB", isCargo: false },
  { arrTime: "08:50", depTime: "10:20", source: "Riyadh (RUH)", dest: "Riyadh (RUH)", arrNo: "SV 768", depNo: "SV 769", airline: "Saudia", shift: "shift-b", periodic: true, days: [0,1,0,1,0,0,1], ac: "A330-300", route: "RUH ➔ MAA ➔ RUH", isCargo: false },
  { arrTime: "09:15", depTime: "10:45", source: "Dubai (DXB)", dest: "Dubai (DXB)", arrNo: "EK 542", depNo: "EK 543", airline: "Emirates", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "B777-300ER", route: "DXB ➔ MAA ➔ DXB", isCargo: false },
  { arrTime: "09:25", depTime: "10:55", source: "Doha (DOH)", dest: "Doha (DOH)", arrNo: "QR 528", depNo: "QR 529", airline: "Qatar Airways", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "B787 / A330", route: "DOH ➔ MAA ➔ DOH", isCargo: false },
  { arrTime: "10:05", depTime: "00:45", source: "Dubai (DXB)", dest: "Dubai (DXB)", arrNo: "IX 684", depNo: "IX 683", airline: "Air India Express", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "B737-800", route: "DXB ➔ MAA ➔ DXB", isCargo: false },
  { arrTime: "10:30", depTime: "11:35", source: "Kuala Lumpur (KUL)", dest: "Kuala Lumpur (KUL)", arrNo: "MH 182", depNo: "MH 183", airline: "Malaysia Airlines", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "B737-800", route: "KUL ➔ MAA ➔ KUL", isCargo: false },
  { arrTime: "10:45", depTime: "02:15", source: "Penang (PEN)", dest: "Penang (PEN)", arrNo: "6E 1046", depNo: "6E 1045", airline: "IndiGo", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320", route: "PEN ➔ MAA ➔ PEN", isCargo: false },
  { arrTime: "11:00", depTime: "12:15", source: "Singapore (SIN)", dest: "Singapore (SIN)", arrNo: "SQ 528", depNo: "SQ 529", airline: "Singapore Airlines", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "B787", route: "SIN ➔ MAA ➔ SIN", isCargo: false },
  { arrTime: "11:45", depTime: "13:15", source: "Shenzhen (SZX)", dest: "Shenzhen (SZX)", arrNo: "O3 6953", depNo: "O3 6954", airline: "SF Airlines", shift: "shift-b", periodic: true, days: [0,1,1,1,1,1,1], ac: "B767-300F", route: "SZX ➔ MAA ➔ SZX", isCargo: true },
  { arrTime: "12:40", depTime: "13:40", source: "Colombo (CMB)", dest: "Colombo (CMB)", arrNo: "8D 821", depNo: "8D 822", airline: "FitsAir", shift: "shift-b", periodic: true, days: [1,0,1,0,1,0,1], ac: "A320", route: "CMB ➔ MAA ➔ CMB", isCargo: false },
  { arrTime: "12:50", depTime: "13:50", source: "Dhaka (DAC)", dest: "Dhaka (DAC)", arrNo: "BS 201", depNo: "BS 202", airline: "US-Bangla Airlines", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "B737-800", route: "DAC ➔ MAA ➔ DAC", isCargo: false },
  { arrTime: "13:10", depTime: "15:10", source: "Frankfurt (FRA)", dest: "Frankfurt (FRA)", arrNo: "LH 8408", depNo: "LH 8409", airline: "Lufthansa Cargo", shift: "shift-b", periodic: true, days: [0,0,0,0,1,0,0], ac: "B777F", route: "FRA ➔ BOM ➔ MAA ➔ FRA", isCargo: true },
  { arrTime: "14:00", depTime: "10:35", source: "Jaffna (JAF)", dest: "Jaffna (JAF)", arrNo: "9I 102", depNo: "9I 101", airline: "Alliance Air", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "ATR-72", route: "JAF ➔ MAA ➔ JAF", isCargo: false },
  { arrTime: "14:15", depTime: "15:45", source: "Mauritius (MRU)", dest: "Mauritius (MRU)", arrNo: "MK 746", depNo: "MK 747", airline: "Air Mauritius", shift: "shift-b", periodic: true, days: [0,0,0,0,1,0,0], ac: "A330", route: "MRU ➔ MAA ➔ MRU", isCargo: false },
  { arrTime: "14:30", depTime: "15:30", source: "Dhaka (DAC)", dest: "Dhaka (DAC)", arrNo: "BG 363", depNo: "BG 364", airline: "Biman Bangladesh", shift: "shift-b", periodic: true, days: [1,0,0,1,0,1,0], ac: "B737", route: "DAC ➔ MAA ➔ DAC", isCargo: false },
  { arrTime: "14:45", depTime: "16:45", source: "Dubai (DXB)", dest: "Dubai (DXB)", arrNo: "EK 9226", depNo: "EK 9227", airline: "Emirates SkyCargo", shift: "shift-b", periodic: true, days: [0,0,0,1,0,0,0], ac: "B777F", route: "DXB ➔ MAA ➔ DXB", isCargo: true },
  { arrTime: "15:05", depTime: "16:10", source: "Colombo (CMB)", dest: "Colombo (CMB)", arrNo: "UL 123", depNo: "UL 124", airline: "SriLankan Airlines", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320 / A330", route: "CMB ➔ MAA ➔ CMB", isCargo: false },
  { arrTime: "15:15", depTime: "16:45", source: "Dubai (DXB)", dest: "Dubai (DXB)", arrNo: "EK 544", depNo: "EK 545", airline: "Emirates", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "B777-300ER", route: "DXB ➔ MAA ➔ DXB", isCargo: false },
  { arrTime: "15:45", depTime: "06:30", source: "Kuala Lumpur (KUL)", dest: "Kuala Lumpur (KUL)", arrNo: "6E 1816", depNo: "6E 1815", airline: "IndiGo", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320", route: "KUL ➔ MAA ➔ KUL", isCargo: false },
  { arrTime: "16:30", depTime: "18:30", source: "Frankfurt (FRA)", dest: "Frankfurt (FRA)", arrNo: "LH 8402", depNo: "LH 8403", airline: "Lufthansa Cargo", shift: "shift-c", periodic: true, days: [0,0,0,0,0,0,1], ac: "B777F", route: "FRA ➔ MAA ➔ HYD ➔ FRA", isCargo: true },
  { arrTime: "17:00", depTime: "21:25", source: "Singapore (SIN)", dest: "Singapore (SIN)", arrNo: "6E 1002", depNo: "6E 1003", airline: "IndiGo", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320 / A321", route: "SIN ➔ MAA ➔ SIN", isCargo: false },
  { arrTime: "17:25", depTime: "12:10", source: "Male (MLE)", dest: "Male (MLE)", arrNo: "6E 1128", depNo: "6E 1127", airline: "IndiGo", shift: "shift-c", periodic: true, days: [1,0,1,0,1,0,1], ac: "A320", route: "MLE ➔ MAA ➔ MLE", isCargo: false },
  { arrTime: "17:55", depTime: "20:30", source: "Tokyo Narita (NRT)", dest: "Tokyo Narita (NRT)", arrNo: "NH 825", depNo: "NH 826", airline: "ANA", shift: "shift-c", periodic: true, days: [0,0,1,0,1,0,1], ac: "B787-8", route: "NRT ➔ MAA ➔ NRT", isCargo: false },
  { arrTime: "18:40", depTime: "20:10", source: "Singapore (SIN)", dest: "Singapore (SIN)", arrNo: "SQ 7124", depNo: "SQ 7123", airline: "Singapore Cargo", shift: "shift-c", periodic: true, days: [0,0,1,0,0,1,0], ac: "B747-400F", route: "SIN ➔ MAA ➔ SIN", isCargo: true },
  { arrTime: "20:05", depTime: "21:10", source: "Colombo (CMB)", dest: "Colombo (CMB)", arrNo: "UL 125", depNo: "UL 126", airline: "SriLankan Airlines", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320 / A330", route: "CMB ➔ MAA ➔ CMB", isCargo: false },
  { arrTime: "20:15", depTime: "14:05", source: "Dhaka (DAC)", dest: "Dhaka (DAC)", arrNo: "6E 1113", depNo: "6E 1112", airline: "IndiGo", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320", route: "DAC ➔ MAA ➔ DAC", isCargo: false },
  { arrTime: "21:50", depTime: "22:50", source: "Bangkok (DMK)", dest: "Bangkok (DMK)", arrNo: "FD 153", depNo: "FD 154", airline: "Thai AirAsia", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320", route: "DMK ➔ MAA ➔ DMK", isCargo: false },
  { arrTime: "21:50", depTime: "22:25", source: "Kuala Lumpur (KUL)", dest: "Kuala Lumpur (KUL)", arrNo: "AK 10", depNo: "AK 11", airline: "AirAsia", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320", route: "KUL ➔ MAA ➔ KUL", isCargo: false },
  { arrTime: "22:00", depTime: "23:15", source: "Singapore (SIN)", dest: "Singapore (SIN)", arrNo: "SQ 528", depNo: "SQ 529", airline: "Singapore Airlines", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "A350 / B787", route: "SIN ➔ MAA ➔ SIN", isCargo: false },
  { arrTime: "22:15", depTime: "23:45", source: "Leipzig (LEJ)", dest: "Leipzig (LEJ)", arrNo: "3S 532", depNo: "3S 533", airline: "DHL / AeroLogic", shift: "shift-c", periodic: true, days: [0,0,1,0,1,0,0], ac: "B777F", route: "LEJ ➔ MAA ➔ LEJ", isCargo: true },
  { arrTime: "23:05", depTime: "00:35+1", source: "Hong Kong (HKG)", dest: "Hong Kong (HKG)", arrNo: "CX 2033", depNo: "CX 2034", airline: "Cathay Cargo", shift: "shift-c", periodic: true, days: [0,1,0,0,0,0,0], ac: "B747-8F", route: "HKG ➔ MAA ➔ HKG", isCargo: true },
  { arrTime: "23:25", depTime: "00:25+1", source: "Kuala Lumpur (KUL)", dest: "Kuala Lumpur (KUL)", arrNo: "MH 180", depNo: "MH 181", airline: "Malaysia Airlines", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "B737-800", route: "KUL ➔ MAA ➔ KUL", isCargo: false },
  { arrTime: "23:35", depTime: "00:35+1", source: "Singapore (SIN)", dest: "Singapore (SIN)", arrNo: "TR 578", depNo: "TR 579", airline: "Scoot", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "B787 / A321", route: "SIN ➔ MAA ➔ SIN", isCargo: false },
  { arrTime: "23:55", depTime: "01:50+1", source: "Frankfurt (FRA)", dest: "Frankfurt (FRA)", arrNo: "LH 758", depNo: "LH 759", airline: "Lufthansa", shift: "shift-c", periodic: true, days: [1,1,0,1,1,1,0], ac: "A340-300 / B787", route: "FRA ➔ MAA ➔ FRA", isCargo: false }
];

const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function initFlightSchedule() {
  const controlsPanel = document.getElementById('controls-panel');
  const toggleBtn = document.getElementById('controls-header-toggle');
  const toggleText = document.getElementById('toggle-text');
  
  if (!controlsPanel || !toggleBtn) return;
  
  if (window.innerWidth < 768) {
    controlsPanel.classList.add('collapsed');
    if (toggleText) toggleText.innerText = 'Expand';
  }

  toggleBtn.addEventListener('click', () => {
    controlsPanel.classList.toggle('collapsed');
    const isCollapsed = controlsPanel.classList.contains('collapsed');
    if (toggleText) toggleText.innerText = isCollapsed ? 'Expand' : 'Minimize';
  });

  const searchInput = document.getElementById('search-input');
  const typeFilter = document.getElementById('type-filter');
  const shiftFilter = document.getElementById('shift-filter');
  const freqFilter = document.getElementById('freq-filter');

  if (searchInput) searchInput.addEventListener('input', renderFlightSchedule);
  if (typeFilter) typeFilter.addEventListener('change', renderFlightSchedule);
  if (shiftFilter) shiftFilter.addEventListener('change', renderFlightSchedule);
  if (freqFilter) freqFilter.addEventListener('change', renderFlightSchedule);

  renderFlightSchedule();
}

function renderFlightSchedule() {
  const searchInput = document.getElementById('search-input');
  const typeFilter = document.getElementById('type-filter');
  const shiftFilter = document.getElementById('shift-filter');
  const freqFilter = document.getElementById('freq-filter');
  const badge = document.getElementById('filter-badge');

  if (!searchInput) return;

  const search = searchInput.value.toLowerCase().trim();
  const typeVal = typeFilter.value;
  const shiftVal = shiftFilter.value;
  const freqVal = freqFilter.value;

  // Update badge UI
  let parts = [];
  if (search) parts.push(`"${search}"`);
  if (typeVal !== 'all') parts.push(typeVal.toUpperCase());
  if (shiftVal !== 'all') parts.push(shiftVal.toUpperCase());
  if (freqVal !== 'all') parts.push(freqVal);
  if (badge) {
    badge.innerText = parts.length > 0 ? parts.join(' • ') : 'All Flights';
  }

  const desktopBody = document.getElementById('desktop-table-body');
  const mobileBody = document.getElementById('mobile-cards-body');

  if (!desktopBody || !mobileBody) return;

  desktopBody.innerHTML = '';
  mobileBody.innerHTML = '';

  let totalCount = 0;
  let paxCount = 0;
  let cargoCount = 0;

  flightDataset.forEach(row => {
    // Apply filters
    if (shiftVal !== 'all' && row.shift !== shiftVal) return;
    if (freqVal === 'daily' && row.periodic) return;
    if (freqVal === 'periodic' && !row.periodic) return;
    if (typeVal === 'passenger' && row.isCargo) return;
    if (typeVal === 'cargo' && !row.isCargo) return;

    if (search) {
      const matches = row.source.toLowerCase().includes(search) ||
                      row.dest.toLowerCase().includes(search) ||
                      row.arrNo.toLowerCase().includes(search) ||
                      row.depNo.toLowerCase().includes(search) ||
                      row.airline.toLowerCase().includes(search) ||
                      row.route.toLowerCase().includes(search);
      if (!matches) return;
    }

    totalCount++;
    if (row.isCargo) {
      cargoCount++;
    } else {
      paxCount++;
    }

    // Render Desktop Row
    const tr = document.createElement('tr');
    if (row.isCargo) tr.className = 'cargo-row';
    tr.innerHTML = `
      <td><span class="time-arr">${row.arrTime}</span></td>
      <td><span class="time-dep">${row.depTime}</span></td>
      <td><span class="source-tag">🛫 ${row.source}</span></td>
      <td><span class="dest-tag">🛬 ${row.dest}</span></td>
      <td>
        <div class="flight-pair-box">
          <span class="flight-no-arr">🛬 ${row.arrNo}</span>
          <span class="flight-no-dep">🛫 ${row.depNo}</span>
        </div>
      </td>
      <td><strong>${row.airline}</strong>${row.isCargo ? ' <span class="cargo-badge">📦 Cargo</span>' : ''}</td>
      <td>
        <div class="days-pill">
          ${row.days.map((active, idx) => `
            <div class="day-dot ${active ? 'active' : ''}">${dayLabels[idx]}</div>
          `).join('')}
        </div>
      </td>
      <td><span class="ac-badge">${row.ac}</span></td>
      <td><span class="stopover-cell">${row.route}</span></td>
    `;
    desktopBody.appendChild(tr);

    // Render Mobile Card
    const card = document.createElement('div');
    card.className = 'flight-card' + (row.isCargo ? ' cargo-card' : '');
    card.innerHTML = `
      <div class="card-top-row">
        <span class="airline-name">${row.airline}${row.isCargo ? ' <span class="cargo-badge">📦 Cargo</span>' : ''}</span>
        <span class="ac-badge">${row.ac}</span>
      </div>
      <div class="card-time-row">
        <div class="time-block">
          <span class="time-label">Arrival at MAA</span>
          <span class="time-val-arr">${row.arrTime} IST</span>
        </div>
        <div class="time-block">
          <span class="time-label">Departure from MAA</span>
          <span class="time-val-dep">${row.depTime} IST</span>
        </div>
      </div>
      <div class="card-route-row">
        <span class="route-pill-in">🛫 From: ${row.source}</span>
        <span class="route-pill-out">🛬 To: ${row.dest}</span>
      </div>
      <div class="flight-pairs-row">
        <span style="color: ${row.isCargo ? 'var(--accent-cargo, #f97316)' : 'var(--accent-green, #34d399)'};">🛬 Inbound: ${row.arrNo}</span>
        <span style="color: ${row.isCargo ? '#fca5a5' : '#a5b4fc'};">🛫 Outbound: ${row.depNo}</span>
      </div>
      <div class="stopover-box">
        <span>📍 Route Chain: ${row.route}</span>
      </div>
      <div class="days-pill">
        ${row.days.map((active, idx) => `
          <div class="day-dot ${active ? 'active' : ''}">${dayLabels[idx]}</div>
        `).join('')}
      </div>
    `;
    mobileBody.appendChild(card);
  });

  const totalRowsEl = document.getElementById('total-rows');
  const passengerCountEl = document.getElementById('passenger-count');
  const cargoCountEl = document.getElementById('cargo-count');

  if (totalRowsEl) totalRowsEl.innerText = totalCount;
  if (passengerCountEl) passengerCountEl.innerText = paxCount;
  if (cargoCountEl) cargoCountEl.innerText = cargoCount;
}