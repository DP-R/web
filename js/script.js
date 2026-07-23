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
  initClock();
  startTypewriter();
  
  // Initialize uploader
  if (typeof initUploader === 'function') {
    initUploader();
  }

  // Initialize DB search
  initDbSearch();
  
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

// Clock Widgets Loops
function initClock() {
  const hourHand = document.querySelector('#liveclock .hand.hour');
  const minHand = document.querySelector('#liveclock .hand.minute');
  const secHand = document.querySelector('#liveclock .hand.second');
  const digiClock = document.getElementById('digiclock');
  const digiCal = document.getElementById('digical');

  function updateTime() {
    const now = new Date();
    
    // Digital clock values
    let hrs = now.getHours();
    let mins = now.getMinutes();
    let secs = now.getSeconds();
    const dayName = now.toDateString();

    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12; // 0 hour should be 12
    
    const displayHrs = hrs < 10 ? '0' + hrs : hrs;
    const displayMins = mins < 10 ? '0' + mins : mins;
    const displaySecs = secs < 10 ? '0' + secs : secs;

    if (digiClock) {
      digiClock.innerHTML = `${displayHrs}:${displayMins}<div id="millisec">${displaySecs}</div>`;
    }
    if (digiCal) {
      digiCal.innerText = `${dayName}`;
    }

    // Analog clock values
    const hourDeg = (now.getHours() + now.getMinutes() / 60) / 12 * 360;
    const minDeg = now.getMinutes() / 60 * 360;
    const secDeg = (now.getSeconds() + now.getMilliseconds() / 1000) / 60 * 360;

    if (hourHand) hourHand.style.transform = `rotate(${hourDeg}deg)`;
    if (minHand) minHand.style.transform = `rotate(${minDeg}deg)`;
    if (secHand) secHand.style.transform = `rotate(${secDeg}deg)`;

    requestAnimationFrame(updateTime);
  }

  requestAnimationFrame(updateTime);
}

// Typewriter Intro text
let typeIndex = 0;
const typewriterText = "I'm Purnendra";
const typewriterSpeed = 150;

function startTypewriter() {
  const container = document.getElementById('demo');
  if (!container) return;
  container.innerHTML = '';
  typeIndex = 0;
  runTypewriter();
}

function runTypewriter() {
  const container = document.getElementById('demo');
  if (typeIndex < typewriterText.length) {
    container.innerHTML += typewriterText.charAt(typeIndex);
    typeIndex++;
    setTimeout(runTypewriter, typewriterSpeed);
  }
}

// Secret Easter Egg click loop
let clickCount = 0;
function triggerEasterEgg() {
  clickCount++;
  if (clickCount === 5) {
    window.open("https://docs.google.com/spreadsheets/d/1c1QwvQsgA6V_1HNO9VrLc6PD5knGzLkCogt2KvXNzt4/edit#gid=59662764", "_blank");
    clickCount = 0;
    window.showToast('Easter Egg Unlocked', 'Opening secret sheet...', 'success', 2000);
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