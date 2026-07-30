/* ============================================================================
   Secure Access Workspace - Main Application Javascript
   ============================================================================ */

const SEARCH_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzU2WaguCdpzQAxsT9V1GU-isBN5MOiSjkJng_SFflfqSFagrMnGiXgFEd35roed7Ee/exec";


// Proactively unregister any active service workers to prevent stale PWA caching issues during updates
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister().then(() => {
        console.log('[PWA] Service Worker unregistered successfully to ensure fresh asset delivery.');
      });
    }
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

function submitAuth() {
  const inputEl = document.getElementById('password-input');
  if (!inputEl) return;
  const input = inputEl.value;
  // Accept single space ' ' or whitespace passcode
  if (input === ' ' || (input.length > 0 && input.trim() === '')) {
    unlockWorkspace();
  } else {
    const errMsg = document.getElementById('error-msg');
    if (errMsg) {
      errMsg.classList.add('visible');
      setTimeout(() => errMsg.classList.remove('visible'), 3000);
    }
    inputEl.value = '';
  }
}

function handleAuthInput(event) {
  if (event.key === 'Enter') {
    submitAuth();
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

  // Load recently modified files list in the background
  loadRecentFiles();
  
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
  if (type === 'drive') {
    window.open(url, '_blank');
    return;
  }
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
  { arrTime: "00:15", depTime: "01:50", source: "Frankfurt (FRA)", dest: "Frankfurt (FRA)", arrNo: "LH 758", depNo: "LH 759", airline: "Lufthansa", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A340-300 / B787", route: "FRA ➔ MAA ➔ FRA", isCargo: false },
  { arrTime: "00:20", depTime: "01:30", source: "Singapore (SIN)", dest: "Singapore (SIN)", arrNo: "IX 644", depNo: "IX 643", airline: "Air India Express", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "B737-800", route: "SIN ➔ MAA ➔ SIN", isCargo: false },
  { arrTime: "01:00", depTime: "03:00", source: "Frankfurt (FRA)", dest: "Frankfurt (FRA)", arrNo: "LH 8352", depNo: "LH 8353", airline: "Lufthansa Cargo", shift: "shift-a", periodic: true, days: [1,0,0,1,0,0,0], ac: "B777F", route: "FRA ➔ MAA ➔ FRA", isCargo: true },
  { arrTime: "01:25", depTime: "02:20", source: "Kuwait (KWI)", dest: "Kuwait (KWI)", arrNo: "J9 427", depNo: "J9 428", airline: "Jazeera Airways", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320neo", route: "KWI ➔ MAA ➔ KWI", isCargo: false },
  { arrTime: "02:20", depTime: "03:45", source: "Doha (DOH)", dest: "Doha (DOH)", arrNo: "QR 528", depNo: "QR 529", airline: "Qatar Airways", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A350-900 / B787", route: "DOH ➔ MAA ➔ DOH", isCargo: false },
  { arrTime: "02:40", depTime: "03:30", source: "Abu Dhabi (AUH)", dest: "Abu Dhabi (AUH)", arrNo: "3L 125", depNo: "3L 126", airline: "Air Arabia Abu Dhabi", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320", route: "AUH ➔ MAA ➔ AUH", isCargo: false },
  { arrTime: "02:45", depTime: "04:10", source: "Dubai (DXB)", dest: "Dubai (DXB)", arrNo: "EK 542", depNo: "EK 543", airline: "Emirates", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "B777-300ER", route: "DXB ➔ MAA ➔ DXB", isCargo: false },
  { arrTime: "03:00", depTime: "04:30", source: "Doha (DOH)", dest: "Doha (DOH)", arrNo: "6E 1704", depNo: "6E 1703", airline: "IndiGo", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320neo", route: "DOH ➔ MAA ➔ DOH", isCargo: false },
  { arrTime: "03:00", depTime: "04:20", source: "Abu Dhabi (AUH)", dest: "Abu Dhabi (AUH)", arrNo: "EY 270", depNo: "EY 271", airline: "Etihad Airways", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320 / A321", route: "AUH ➔ MAA ➔ AUH", isCargo: false },
  { arrTime: "03:20", depTime: "04:10", source: "Sharjah (SHJ)", dest: "Sharjah (SHJ)", arrNo: "G9 471", depNo: "G9 472", airline: "Air Arabia", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320", route: "SHJ ➔ MAA ➔ SHJ", isCargo: false },
  { arrTime: "03:30", depTime: "04:30", source: "Dubai (DXB)", dest: "Dubai (DXB)", arrNo: "FZ 447", depNo: "FZ 448", airline: "flydubai", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "B737 MAX 8", route: "DXB ➔ MAA ➔ DXB", isCargo: false },
  { arrTime: "03:30", depTime: "05:35", source: "London (LHR)", dest: "London (LHR)", arrNo: "BA 35", depNo: "BA 36", airline: "British Airways", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "B787-9", route: "LHR ➔ MAA ➔ LHR", isCargo: false },
  { arrTime: "04:50", depTime: "05:50", source: "Kuwait (KWI)", dest: "Kuwait (KWI)", arrNo: "KU 343", depNo: "KU 344", airline: "Kuwait Airways", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320neo / A330", route: "KWI ➔ MAA ➔ KWI", isCargo: false },
  { arrTime: "04:55", depTime: "05:55", source: "Bahrain (BAH)", dest: "Bahrain (BAH)", arrNo: "GF 68", depNo: "GF 69", airline: "Gulf Air", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320neo", route: "BAH ➔ MAA ➔ BAH", isCargo: false },
  { arrTime: "05:40", depTime: "07:00", source: "Kuwait (KWI)", dest: "Kuwait (KWI)", arrNo: "6E 1204", depNo: "6E 1203", airline: "IndiGo", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320neo", route: "KWI ➔ MAA ➔ KWI", isCargo: false },
  { arrTime: "06:00", depTime: "08:30", source: "Addis Ababa (ADD)", dest: "Addis Ababa (ADD)", arrNo: "ET 3644", depNo: "ET 3645", airline: "Ethiopian Cargo", shift: "shift-a", periodic: true, days: [0,1,0,0,1,0,0], ac: "B777F", route: "ADD ➔ MAA ➔ ADD", isCargo: true },
  { arrTime: "07:10", depTime: "08:20", source: "Muscat (MCT)", dest: "Muscat (MCT)", arrNo: "WY 251", depNo: "WY 252", airline: "Oman Air", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "B737 MAX 8", route: "MCT ➔ MAA ➔ MCT", isCargo: false },
  { arrTime: "07:15", depTime: "08:30", source: "Dubai (DXB)", dest: "Dubai (DXB)", arrNo: "6E 66", depNo: "6E 65", airline: "IndiGo", shift: "shift-a", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320neo", route: "DXB ➔ MAA ➔ DXB", isCargo: false },
  { arrTime: "08:00", depTime: "10:00", source: "Dubai (DWC)", dest: "Dubai (DWC)", arrNo: "EK 9254", depNo: "EK 9255", airline: "Emirates SkyCargo", shift: "shift-b", periodic: true, days: [1,0,1,0,1,0,1], ac: "B777F", route: "DWC ➔ MAA ➔ DWC", isCargo: true },
  { arrTime: "08:20", depTime: "09:50", source: "Dubai (DXB)", dest: "Dubai (DXB)", arrNo: "EK 544", depNo: "EK 545", airline: "Emirates", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "B777-300ER", route: "DXB ➔ MAA ➔ DXB", isCargo: false },
  { arrTime: "09:00", depTime: "10:00", source: "Colombo (CMB)", dest: "Colombo (CMB)", arrNo: "6E 1176", depNo: "6E 1175", airline: "IndiGo", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320 / A321neo", route: "CMB ➔ MAA ➔ CMB", isCargo: false },
  { arrTime: "09:10", depTime: "10:10", source: "Colombo (CMB)", dest: "Colombo (CMB)", arrNo: "UL 121", depNo: "UL 122", airline: "SriLankan Airlines", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320 / A330", route: "CMB ➔ MAA ➔ CMB", isCargo: false },
  { arrTime: "10:00", depTime: "12:00", source: "Istanbul (IST)", dest: "Istanbul (IST)", arrNo: "TK 6554", depNo: "TK 6555", airline: "Turkish Cargo", shift: "shift-b", periodic: true, days: [1,0,0,1,0,0,0], ac: "A330-200F / B777F", route: "IST ➔ MAA ➔ IST", isCargo: true },
  { arrTime: "11:00", depTime: "12:00", source: "Colombo (CMB)", dest: "Colombo (CMB)", arrNo: "8D 831", depNo: "8D 832", airline: "FitsAir", shift: "shift-b", periodic: true, days: [1,0,1,0,1,0,0], ac: "A320", route: "CMB ➔ MAA ➔ CMB", isCargo: false },
  { arrTime: "11:15", depTime: "12:15", source: "Yangon (RGN)", dest: "Yangon (RGN)", arrNo: "8M 631", depNo: "8M 632", airline: "Myanmar Airways Int'l", shift: "shift-b", periodic: true, days: [1,0,0,1,0,0,0], ac: "A320", route: "RGN ➔ MAA ➔ RGN", isCargo: false },
  { arrTime: "11:30", depTime: "12:40", source: "Singapore (SIN)", dest: "Singapore (SIN)", arrNo: "AI 347", depNo: "AI 346", airline: "Air India", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320neo", route: "SIN ➔ MAA ➔ SIN", isCargo: false },
  { arrTime: "11:50", depTime: "13:00", source: "Colombo (CMB)", dest: "Colombo (CMB)", arrNo: "6E 1406", depNo: "6E 1405", airline: "IndiGo", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320neo", route: "CMB ➔ MAA ➔ CMB", isCargo: false },
  { arrTime: "12:30", depTime: "14:30", source: "Doha (DOH)", dest: "Doha (DOH)", arrNo: "QR 8292", depNo: "QR 8293", airline: "Qatar Cargo", shift: "shift-b", periodic: true, days: [0,1,0,1,0,1,0], ac: "B777F", route: "DOH ➔ MAA ➔ DOH", isCargo: true },
  { arrTime: "13:00", depTime: "14:00", source: "Dhaka (DAC)", dest: "Dhaka (DAC)", arrNo: "BS 205", depNo: "BS 206", airline: "US-Bangla Airlines", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "B737-800", route: "DAC ➔ MAA ➔ DAC", isCargo: false },
  { arrTime: "14:00", depTime: "16:00", source: "Leipzig (LEJ)", dest: "Leipzig (LEJ)", arrNo: "3S 500", depNo: "3S 501", airline: "DHL / AeroLogic", shift: "shift-b", periodic: true, days: [1,1,1,1,1,0,0], ac: "B777F", route: "LEJ ➔ MAA ➔ LEJ", isCargo: true },
  { arrTime: "15:00", depTime: "16:15", source: "Singapore (SIN)", dest: "Singapore (SIN)", arrNo: "6E 52", depNo: "6E 51", airline: "IndiGo", shift: "shift-b", periodic: false, days: [1,1,1,1,1,1,1], ac: "A321neo", route: "SIN ➔ MAA ➔ SIN", isCargo: false },
  { arrTime: "15:30", depTime: "17:00", source: "Riyadh (RUH)", dest: "Jeddah (JED)", arrNo: "SV 766", depNo: "SV 767", airline: "Saudia", shift: "shift-b", periodic: true, days: [1,0,1,0,1,0,1], ac: "A330-300", route: "JED/RUH ➔ MAA ➔ JED/RUH", isCargo: false },
  { arrTime: "15:40", depTime: "16:45", source: "Dhaka (DAC)", dest: "Dhaka (DAC)", arrNo: "BG 365", depNo: "BG 366", airline: "Biman Bangladesh", shift: "shift-b", periodic: true, days: [1,0,1,0,1,0,0], ac: "B737-800", route: "DAC ➔ MAA ➔ DAC", isCargo: false },
  { arrTime: "16:30", depTime: "17:40", source: "Colombo (CMB)", dest: "Colombo (CMB)", arrNo: "AI 274", depNo: "AI 273", airline: "Air India", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320neo", route: "CMB ➔ MAA ➔ CMB", isCargo: false },
  { arrTime: "18:00", depTime: "20:30", source: "Singapore (SIN)", dest: "Singapore (SIN)", arrNo: "SQ 7364", depNo: "SQ 7365", airline: "Singapore Cargo", shift: "shift-c", periodic: true, days: [1,0,0,1,0,0,0], ac: "B747-400F", route: "SIN ➔ MAA ➔ SIN", isCargo: true },
  { arrTime: "18:20", depTime: "19:35", source: "Dubai (DXB)", dest: "Dubai (DXB)", arrNo: "SG 22", depNo: "SG 21", airline: "SpiceJet", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "B737-800", route: "DXB ➔ MAA ➔ DXB", isCargo: false },
  { arrTime: "18:30", depTime: "19:40", source: "Bangkok (BKK)", dest: "Bangkok (BKK)", arrNo: "6E 1306", depNo: "6E 1305", airline: "IndiGo", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320neo", route: "BKK ➔ MAA ➔ BKK", isCargo: false },
  { arrTime: "19:50", depTime: "21:05", source: "Abu Dhabi (AUH)", dest: "Abu Dhabi (AUH)", arrNo: "EY 268", depNo: "EY 269", airline: "Etihad Airways", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320 / A321", route: "AUH ➔ MAA ➔ AUH", isCargo: false },
  { arrTime: "20:30", depTime: "21:45", source: "Dubai (DXB)", dest: "Dubai (DXB)", arrNo: "AI 272", depNo: "AI 271", airline: "Air India", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320neo", route: "DXB ➔ MAA ➔ DXB", isCargo: false },
  { arrTime: "21:00", depTime: "23:00", source: "Hong Kong (HKG)", dest: "Hong Kong (HKG)", arrNo: "CX 3192", depNo: "CX 3193", airline: "Cathay Cargo", shift: "shift-c", periodic: true, days: [1,0,1,0,1,0,0], ac: "B747-8F", route: "HKG ➔ MAA ➔ HKG", isCargo: true },
  { arrTime: "21:55", depTime: "23:05", source: "Kuala Lumpur (KUL)", dest: "Kuala Lumpur (KUL)", arrNo: "OD 221", depNo: "OD 222", airline: "Batik Air Malaysia", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "B737 MAX 8", route: "KUL ➔ MAA ➔ KUL", isCargo: false },
  { arrTime: "22:00", depTime: "23:30", source: "Kuala Lumpur (KUL)", dest: "Kuala Lumpur (KUL)", arrNo: "AK 11", depNo: "AK 10", airline: "AirAsia", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320", route: "KUL ➔ MAA ➔ KUL", isCargo: false },
  { arrTime: "22:00", depTime: "23:55", source: "Shenzhen (SZX)", dest: "Shenzhen (SZX)", arrNo: "O3 7191", depNo: "O3 7192", airline: "SF Airlines", shift: "shift-c", periodic: true, days: [0,1,0,1,0,1,0], ac: "B767-300F", route: "SZX ➔ MAA ➔ SZX", isCargo: true },
  { arrTime: "22:15", depTime: "23:15", source: "Singapore (SIN)", dest: "Singapore (SIN)", arrNo: "SQ 528", depNo: "SQ 529", airline: "Singapore Airlines", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "A350-900", route: "SIN ➔ MAA ➔ SIN", isCargo: false },
  { arrTime: "22:45", depTime: "23:55", source: "Kuala Lumpur (KUL)", dest: "Kuala Lumpur (KUL)", arrNo: "6E 1002", depNo: "6E 1001", airline: "IndiGo", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320neo", route: "KUL ➔ MAA ➔ KUL", isCargo: false },
  { arrTime: "22:45", depTime: "23:45", source: "Bangkok (DMK)", dest: "Bangkok (DMK)", arrNo: "FD 153", depNo: "FD 154", airline: "Thai AirAsia", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320", route: "DMK ➔ MAA ➔ DMK", isCargo: false },
  { arrTime: "23:00", depTime: "01:30+1", source: "Tokyo (NRT)", dest: "Tokyo (NRT)", arrNo: "NH 825", depNo: "NH 826", airline: "ANA", shift: "shift-c", periodic: true, days: [0,0,1,0,1,0,1], ac: "B787-9", route: "NRT ➔ MAA ➔ NRT", isCargo: false },
  { arrTime: "23:10", depTime: "00:20+1", source: "Kuala Lumpur (KUL)", dest: "Kuala Lumpur (KUL)", arrNo: "MH 180", depNo: "MH 181", airline: "Malaysia Airlines", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "B737-800", route: "KUL ➔ MAA ➔ KUL", isCargo: false },
  { arrTime: "23:30", depTime: "01:10+1", source: "Hong Kong (HKG)", dest: "Hong Kong (HKG)", arrNo: "CX 631", depNo: "CX 632", airline: "Cathay Pacific", shift: "shift-c", periodic: true, days: [1,0,1,0,1,0,1], ac: "A330-300", route: "HKG ➔ MAA ➔ HKG", isCargo: false },
  { arrTime: "23:55", depTime: "01:20+1", source: "Singapore (SIN)", dest: "Singapore (SIN)", arrNo: "TR 578", depNo: "TR 579", airline: "Scoot", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "A320 / B787", route: "SIN ➔ MAA ➔ SIN", isCargo: false },
  { arrTime: "23:55", depTime: "01:10+1", source: "Bangkok (BKK)", dest: "Bangkok (BKK)", arrNo: "TG 337", depNo: "TG 338", airline: "Thai Airways", shift: "shift-c", periodic: false, days: [1,1,1,1,1,1,1], ac: "B787-8 / A350", route: "BKK ➔ MAA ➔ BKK", isCargo: false }
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
        <span class="route-pill-in">🗺️ Route: ${row.route}</span>
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

// Bulk download all recently modified files from Google Drive
let cachedRecentFiles = [];

// Load the 5 most recently modified files from Google Drive
async function loadRecentFiles() {
  const container = document.getElementById('recentFilesContainer');
  const loader = document.getElementById('recentFilesLoader');
  const bulkBtn = document.getElementById('bulkDownloadBtn');
  
  if (bulkBtn) bulkBtn.disabled = true;

  try {
    const res = await fetch(SEARCH_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getRecentFiles', limit: 5 })
    });

    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.error || 'Server error');
    
    cachedRecentFiles = data.files || [];
    
    if (loader) loader.style.display = 'none';
    renderRecentFiles(cachedRecentFiles);
    
    if (bulkBtn && cachedRecentFiles.length > 0) {
      bulkBtn.disabled = false;
    }
  } catch (err) {
    console.error('Failed to load recent files:', err);
    if (container) {
      container.innerHTML = `
        <div style="color: var(--color-danger); font-size: 13px; padding: 12px 0;">
          ❌ Error loading recent files: ${err.message}
        </div>
      `;
    }
  }
}

// Render files & subfolders list in the UI
function renderRecentFiles(items) {
  const container = document.getElementById('recentFilesContainer');
  if (!container) return;
  
  if (items.length === 0) {
    container.innerHTML = `
      <div style="color: var(--text-muted); font-size: 13px; padding: 12px 0;">
        No recently modified folders or files found in the last hour.
      </div>
    `;
    return;
  }
  
  container.innerHTML = items.map(item => {
    const timeStr = formatRelativeTime(item.lastUpdated);

    if (item.isFolder) {
      const openFolderAction = `window.open('${item.driveUrl}', '_blank')`;
      const downloadFolderAction = `downloadFolderFiles('${item.id}')`;
      
      return `
        <div class="recent-file-item recent-folder-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(245, 158, 11, 0.04); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: var(--border-radius-sm); transition: all 0.2s ease;">
          <div style="display: flex; align-items: center; gap: 12px; overflow: hidden; cursor: pointer; flex-grow: 1;" onclick="${openFolderAction}" title="Open folder in Google Drive">
            <svg style="color: #f59e0b; width: 20px; height: 20px; flex-shrink: 0;" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 21a3 3 0 003-3v-9a3 3 0 00-3-3h-5.379a1.5 1.5 0 01-1.06-.44l-1.122-1.12A3 3 0 009.879 3H4.5a3 3 0 00-3 3v12a3 3 0 003 3h15z"/></svg>
            <div style="display: flex; flex-direction: column; overflow: hidden; text-align: left;">
              <span style="font-size: 13.5px; font-weight: 600; color: #fbbf24; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">📁 ${item.name} <span style="font-size: 11px; font-weight: normal; color: var(--text-muted);">(Folder • ${item.fileCount} file${item.fileCount === 1 ? '' : 's'})</span></span>
              <span style="font-size: 11px; color: var(--text-muted);">Modified ${timeStr} • Click to open in Drive</span>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 8px;">
            <button onclick="${openFolderAction}" class="text-btn" style="color: #fbbf24; padding: 5px 10px; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 4px; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.25); border-radius: 4px; cursor: pointer;" title="Open folder in Google Drive">
              ↗ Open
            </button>
            <button onclick="${downloadFolderAction}" class="btn btn-primary" style="padding: 5px 10px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 4px;" title="Download all files in this folder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 13px; height: 13px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download Folder
            </button>
          </div>
        </div>
      `;
    }

    let iconSvg = '';
    const mime = (item.mime || '').toLowerCase();
    // Select icon based on file type
    if (mime.includes('spreadsheet') || mime.includes('excel')) {
      iconSvg = `<svg style="color: #107c41; width: 16px; height: 16px; display: inline-block; vertical-align: middle;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 01-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`;
    } else if (mime.includes('document') || mime.includes('word') || mime.includes('text')) {
      iconSvg = `<svg style="color: #2b579a; width: 16px; height: 16px; display: inline-block; vertical-align: middle;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`;
    } else if (mime.includes('pdf')) {
      iconSvg = `<svg style="color: #ff3333; width: 16px; height: 16px; display: inline-block; vertical-align: middle;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>`;
    } else if (mime.includes('image')) {
      iconSvg = `<svg style="color: #3b82f6; width: 16px; height: 16px; display: inline-block; vertical-align: middle;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`;
    } else {
      iconSvg = `<svg style="color: var(--text-muted); width: 16px; height: 16px; display: inline-block; vertical-align: middle;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>`;
    }
    
    const downloadAction = item.isGoogleType ? `window.open('${item.downloadUrl}', '_blank')` : `triggerIndividualDownload('${item.downloadUrl}', '${item.name.replace(/'/g, "\\'")}')`;
    
    return `
      <div class="recent-file-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); transition: all 0.2s ease;">
        <div style="display: flex; align-items: center; gap: 12px; overflow: hidden; cursor: pointer; flex-grow: 1;" onclick="${downloadAction}">
          ${iconSvg}
          <div style="display: flex; flex-direction: column; overflow: hidden; text-align: left;">
            <span style="font-size: 13px; font-weight: 500; color: #fff; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${item.name}</span>
            <span style="font-size: 11px; color: var(--text-muted);">${timeStr}</span>
          </div>
        </div>
        
        <button onclick="${downloadAction}" class="text-btn" style="color: var(--color-primary); padding: 6px; display: flex; align-items: center; justify-content: center; border-radius: var(--border-radius-sm); transition: all 0.2s ease; cursor: pointer; background: transparent; border: none;" title="Download File">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 15px; height: 15px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </button>
      </div>
    `;
  }).join('');
}

// Clean & Fast Single Zip Downloader for Folders
async function downloadFolderFiles(folderId) {
  const folder = cachedRecentFiles.find(item => item.id === folderId);
  const folderName = folder ? folder.name : 'Folder';
  
  window.showToast('Zipping Folder', `📦 Packaging "${folderName}" into ${folderName}.zip...`, 'info', 4000);
  
  try {
    const res = await fetch(SEARCH_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'zipFolder', folderId: folderId })
    });
    
    const data = await res.json();
    if (data.success && (data.base64Data || data.zipUrl)) {
      window.showToast('Download Complete', `💾 Downloaded ${data.filename}!`, 'success', 3000);
      const a = document.createElement('a');
      a.href = data.base64Data || data.zipUrl;
      a.download = data.filename || `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    } else {
      throw new Error(data.error || 'Failed to generate zip file');
    }
  } catch (err) {
    console.error('Folder zip error:', err);
    window.showToast('Zip Error', `❌ Could not download zip for ${folderName}: ${err.message}`, 'danger', 4000);
  }
}

// Relative time calculator
function formatRelativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Download individual file
function triggerIndividualDownload(url, filename) {
  window.showToast('Downloading File', `💾 Starting download for ${filename}`, 'info', 2000);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Bulk Downloader for All Recent Uploads
async function downloadRecentFiles() {
  if (cachedRecentFiles.length === 0) return;

  window.showToast('Downloading Recent', `📥 Processing ${cachedRecentFiles.length} item(s)...`, 'info', 3000);

  for (let i = 0; i < cachedRecentFiles.length; i++) {
    const item = cachedRecentFiles[i];
    if (item.isFolder) {
      await downloadFolderFiles(item.id);
    } else {
      triggerIndividualDownload(item.downloadUrl, item.name);
    }
  }
}