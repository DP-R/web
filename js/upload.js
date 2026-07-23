// ============================================================================
// Aether Drop - Client Upload JavaScript
// ============================================================================
// CONFIGURATION:
// If hosting this uploader on an external static website (like this repository),
// you MUST deploy your Google Apps Script project as a Web App:
// 1. In your Apps Script editor, click Deploy > New deployment.
// 2. Select type: "Web app".
// 3. Set Execute as: "Me" and Who has access: "Anyone".
// 4. Copy the Web App URL and paste it into the constant below:
// ============================================================================
const WEB_APP_URL = ""; 

// Configuration limits
const MAX_FILE_SIZE_MB = 35; 
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Active files queue state
let selectedFiles = [];
let isUploading = false;
let activeUploadsCount = 0;

// Elements caching
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const fileListContainer = document.getElementById('fileList');
const uploadBtn = document.getElementById('uploadBtn');
const folderNameInput = document.getElementById('folderName');
const clearFolderBtn = document.getElementById('clearFolderBtn');
const queueSearch = document.getElementById('queueSearch');
const queueSort = document.getElementById('queueSort');
const filterTabs = document.getElementById('filterTabs');
const clearQueueBtn = document.getElementById('clearQueueBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderFileList();
  updateClearFolderBtnVisibility();
  
  // Show setup guidance toast if hosted externally and URL not set
  if ((typeof google === 'undefined' || !google.script) && !WEB_APP_URL) {
    setTimeout(() => {
      showToast(
        'Setup Required', 
        'Please configure your Google Apps Script Web App URL at the top of \'js/upload.js\' to enable file uploads.', 
        'warning', 
        8000
      );
    }, 1000);
  }
});

// Theme Toggle Logic
function initTheme() {
  const body = document.body;
  const themeToggle = document.getElementById('themeToggle');
  const sunIcon = themeToggle.querySelector('.sun-icon');
  const moonIcon = themeToggle.querySelector('.moon-icon');
  const savedTheme = localStorage.getItem('theme') || 'dark';

  if (savedTheme === 'light') {
    body.classList.remove('theme-dark');
    body.classList.add('theme-light');
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
  } else {
    body.classList.remove('theme-dark');
    body.classList.add('theme-dark');
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
  }
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const body = document.body;
  const themeToggle = document.getElementById('themeToggle');
  const sunIcon = themeToggle.querySelector('.sun-icon');
  const moonIcon = themeToggle.querySelector('.moon-icon');

  if (body.classList.contains('theme-dark')) {
    body.classList.remove('theme-dark');
    body.classList.add('theme-light');
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
    localStorage.setItem('theme', 'light');
    showToast('Light Theme', 'Switched to light mode.', 'info', 1800);
  } else {
    body.classList.remove('theme-light');
    body.classList.add('theme-dark');
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
    localStorage.setItem('theme', 'dark');
    showToast('Dark Theme', 'Switched to dark mode.', 'info', 1800);
  }
});

// Dropzone click - Open file browser (only if uploader not busy and not clicking button inside)
dropZone.addEventListener('click', (e) => {
  if (isUploading) return;
  if (!e.target.closest('.btn')) {
    fileInput.click();
  }
});

// Folder Name input custom clear action
folderNameInput.addEventListener('input', updateClearFolderBtnVisibility);
clearFolderBtn.addEventListener('click', () => {
  if (isUploading) return;
  folderNameInput.value = '';
  updateClearFolderBtnVisibility();
  folderNameInput.focus();
});

function updateClearFolderBtnVisibility() {
  clearFolderBtn.style.display = folderNameInput.value ? 'block' : 'none';
}

// File Inputs Event Listeners
fileInput.addEventListener('change', (e) => {
  handleFiles(Array.from(e.target.files));
  e.target.value = ''; // Reset input
});

folderInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    if (file.webkitRelativePath) {
      file.filepath = file.webkitRelativePath;
    }
  });
  handleFiles(files);
  e.target.value = ''; // Reset input
});

// Drag and Drop counter pattern to prevent overlay flashing
let dragCounter = 0;
window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  if (isUploading) return;
  dragCounter++;
  if (dragCounter === 1) {
    document.getElementById('pageDragOverlay').classList.add('active');
  }
});

window.addEventListener('dragleave', (e) => {
  e.preventDefault();
  if (isUploading) return;
  dragCounter--;
  if (dragCounter === 0) {
    document.getElementById('pageDragOverlay').classList.remove('active');
  }
});

window.addEventListener('dragover', (e) => {
  e.preventDefault();
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  if (isUploading) return;
  dragCounter = 0;
  document.getElementById('pageDragOverlay').classList.remove('active');
  
  if (e.dataTransfer.items) {
    handleDropEntries(e.dataTransfer.items);
  } else {
    handleFiles(Array.from(e.dataTransfer.files));
  }
});

// High-performance directory tree uploader traverser
async function handleDropEntries(items) {
  const promises = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].kind === 'file') {
      const entry = items[i].webkitGetAsEntry();
      if (entry) {
        promises.push(traverseEntry(entry, ""));
      }
    }
  }
  const results = await Promise.all(promises);
  const flatFiles = results.flat();
  if (flatFiles.length > 0) {
    handleFiles(flatFiles);
  }
}

function traverseEntry(entry, path) {
  return new Promise((resolve) => {
    if (entry.isFile) {
      entry.file((file) => {
        file.filepath = path + file.name;
        resolve([file]);
      }, () => resolve([]));
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      readAllEntries(dirReader).then(async (entries) => {
        const promises = entries.map(e => traverseEntry(e, path + entry.name + "/"));
        const results = await Promise.all(promises);
        resolve(results.flat());
      });
    } else {
      resolve([]);
    }
  });
}

function readAllEntries(dirReader) {
  return new Promise((resolve) => {
    const allEntries = [];
    function read() {
      dirReader.readEntries((entries) => {
        if (entries.length === 0) {
          resolve(allEntries);
        } else {
          allEntries.push(...entries);
          read();
        }
      }, () => resolve(allEntries));
    }
    read();
  });
}

// Handle addition of files to the queue
function handleFiles(files) {
  if (isUploading) {
    showToast('Busy', 'Please wait until the current upload process is completed.', 'warning');
    return;
  }

  let addedCount = 0;
  let sizeRejectedCount = 0;

  files.forEach(file => {
    // Validate File Size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      showToast('Size Exceeded', `'${file.name}' is larger than ${MAX_FILE_SIZE_MB}MB.`, 'danger', 5000);
      sizeRejectedCount++;
      return;
    }

    // Extract details
    const nameParts = file.name.split('.');
    const ext = nameParts.length > 1 ? nameParts.pop().toLowerCase() : 'file';

    // Create ObjectURL for Image previews
    let thumbnailUrl = null;
    if (file.type.startsWith('image/')) {
      thumbnailUrl = URL.createObjectURL(file);
    }

    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    selectedFiles.push({
      id: fileId,
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      extension: ext,
      filepath: file.filepath || file.name,
      status: 'pending',
      progress: 0,
      driveUrl: '',
      driveId: '',
      thumbnailUrl: thumbnailUrl,
      errorMessage: '',
      addedTime: Date.now()
    });
    addedCount++;
  });

  if (addedCount > 0) {
    renderFileList();
    showToast('Queue Updated', `Added ${addedCount} file(s) to the queue.`, 'success', 3000);
  }
}

// Remove individual file card
function removeFile(id) {
  if (isUploading) return;
  const index = selectedFiles.findIndex(f => f.id === id);
  if (index !== -1) {
    const fObj = selectedFiles[index];
    if (fObj.thumbnailUrl) {
      URL.revokeObjectURL(fObj.thumbnailUrl); // Free up browser memory leaks
    }
    selectedFiles.splice(index, 1);
    renderFileList();
  }
}

// Retry individual upload file
function retryFile(id) {
  if (isUploading) return;
  const fObj = selectedFiles.find(f => f.id === id);
  if (fObj && fObj.status === 'error') {
    fObj.status = 'pending';
    fObj.progress = 0;
    fObj.errorMessage = '';
    renderFileList();
    processAndUpload();
  }
}

// Clear entire queue
clearQueueBtn.addEventListener('click', () => {
  if (isUploading) return;
  clearQueue();
});

function clearQueue() {
  selectedFiles.forEach(fObj => {
    if (fObj.thumbnailUrl) {
      URL.revokeObjectURL(fObj.thumbnailUrl);
    }
  });
  selectedFiles = [];
  renderFileList();
  showToast('Queue Cleared', 'All files removed from the queue.', 'info', 2000);
}

// Search input change
queueSearch.addEventListener('input', () => renderFileList());

// Sort selector change
queueSort.addEventListener('change', () => renderFileList());

// Filters Tab Clicks
filterTabs.addEventListener('click', (e) => {
  if (e.target.classList.contains('tab-btn')) {
    filterTabs.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    renderFileList();
  }
});

// Render Queue File list with sorting, searching, and filters
function renderFileList() {
  const activeFilterBtn = filterTabs.querySelector('.tab-btn.active');
  const filterType = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';
  
  // 1. Filter
  let processed = filterFiles(selectedFiles, filterType);
  
  // 2. Search
  const query = queueSearch.value.trim();
  processed = searchFiles(processed, query);
  
  // 3. Sort
  const sortBy = queueSort.value;
  processed = sortFiles(processed, sortBy);

  const queueCount = document.getElementById('queueCount');
  queueCount.innerText = selectedFiles.length;

  if (selectedFiles.length === 0) {
    fileListContainer.className = 'file-list empty';
    fileListContainer.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25-2.25M12 13.875V9.75M3.75 7.5h16.5M9 5.625h6M9 5.625a1.875 1.875 0 113.75 0h-3.75z" />
        </svg>
        <p>No files in queue. Drag & drop files or folders above to get started.</p>
      </div>
    `;
    updateOverallProgress();
    return;
  }

  fileListContainer.className = 'file-list';

  if (processed.length === 0) {
    fileListContainer.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p>No files match your filter or search criteria.</p>
      </div>
    `;
  } else {
    fileListContainer.innerHTML = processed.map(fObj => createFileCardHtml(fObj)).join('');
  }

  updateOverallProgress();
}

// Filter Helper
function filterFiles(files, filterType) {
  if (filterType === 'all') return files;
  
  return files.filter(f => {
    const ext = f.extension.toLowerCase();
    const mime = f.type.toLowerCase();
    
    switch (filterType) {
      case 'image':
        return mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
      case 'document':
        return mime.startsWith('text/') || ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv'].includes(ext);
      case 'media':
        return mime.startsWith('video/') || mime.startsWith('audio/') || ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'mp3', 'wav', 'ogg', 'm4a'].includes(ext);
      case 'archive':
        return mime.includes('zip') || mime.includes('compressed') || ['zip', 'rar', 'tar', 'gz', '7z', 'html', 'css', 'js', 'ts', 'py', 'json', 'xml'].includes(ext);
      default:
        return true;
    }
  });
}

// Search Helper
function searchFiles(files, query) {
  if (!query) return files;
  const q = query.toLowerCase();
  return files.filter(f => f.name.toLowerCase().includes(q) || f.filepath.toLowerCase().includes(q));
}

// Sort Helper
function sortFiles(files, criteria) {
  const sorted = [...files];
  switch (criteria) {
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case 'size-desc':
      return sorted.sort((a, b) => b.size - a.size);
    case 'size-asc':
      return sorted.sort((a, b) => a.size - b.size);
    case 'added-asc':
    default:
      return sorted.sort((a, b) => a.addedTime - b.addedTime);
  }
}

// Create single file card HTML
function createFileCardHtml(fObj) {
  const isImg = fObj.file.type.startsWith('image/');
  const styleAttr = (isImg && fObj.thumbnailUrl) ? `style="background-image: url('${fObj.thumbnailUrl}')"` : '';
  const thumbClass = isImg ? 'file-thumbnail preview-clickable' : 'file-thumbnail';
  const clickHandler = isImg ? `onclick="openLightbox('${fObj.id}')"` : '';
  
  const iconContent = isImg ? '' : getFileIconSvg(fObj.extension, fObj.type);
  
  let filepathBreadcrumbs = '';
  if (fObj.filepath && fObj.filepath !== fObj.name) {
    const parts = fObj.filepath.split('/');
    const folders = parts.slice(0, -1);
    if (folders.length > 0) {
      filepathBreadcrumbs = `
        <div class="breadcrumb-path" title="${folders.join('/')}">
          ${folders.join(' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg> ')}
        </div>
      `;
    }
  }

  let statusBadge = '';
  let actionsHtml = '';
  let progressStyle = 'none';

  if (fObj.status === 'pending') {
    statusBadge = `<span class="badge badge-warning">Pending</span>`;
    actionsHtml = `
      <button class="item-btn btn-remove" onclick="removeFile('${fObj.id}')" title="Remove file">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    `;
  } else if (fObj.status === 'uploading') {
    statusBadge = `<span class="badge badge-warning"><span class="spinner-small"></span> Uploading</span>`;
    progressStyle = 'block';
    actionsHtml = ''; // disable remove button during active upload
  } else if (fObj.status === 'success') {
    statusBadge = `<span class="badge badge-success">Success</span>`;
    actionsHtml = `
      <a class="item-btn btn-view" href="${fObj.driveUrl}" target="_blank" title="View on Google Drive">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
      </a>
    `;
  } else if (fObj.status === 'error') {
    statusBadge = `<span class="badge badge-danger" title="${fObj.errorMessage || 'Unknown error'}">Failed</span>`;
    actionsHtml = `
      <button class="item-btn btn-retry" onclick="retryFile('${fObj.id}')" title="Retry upload">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" /></svg>
      </button>
      <button class="item-btn btn-remove" onclick="removeFile('${fObj.id}')" title="Remove file">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    `;
  }

  return `
    <div class="file-item-card" id="card-${fObj.id}">
      <div class="file-item-main">
        <div class="${thumbClass}" ${styleAttr} ${clickHandler}>
          ${iconContent}
        </div>
        <div class="file-details">
          <div class="file-meta-top">
            <span class="file-title" title="${fObj.name}">${fObj.name}</span>
            <span class="file-extension">.${fObj.extension}</span>
          </div>
          <div class="file-meta-bottom">
            <span class="file-size-tag">${formatBytes(fObj.size)}</span>
            ${filepathBreadcrumbs}
          </div>
        </div>
        <div class="file-actions-area">
          ${statusBadge}
          ${actionsHtml}
        </div>
      </div>
      <div class="file-progress-wrapper" id="progressWrapper-${fObj.id}" style="display: ${progressStyle}">
        <div class="file-progress-bar-fill" id="progressFill-${fObj.id}" style="width: ${fObj.progress}%"></div>
      </div>
    </div>
  `;
}

// Get Custom SVG Icon path based on file extension
function getFileIconSvg(extension, mimeType) {
  const ext = extension.toLowerCase();
  
  // Audio & Video Media
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'mp3', 'wav', 'ogg', 'm4a'].includes(ext) || mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10l5-3v10l-5-3v-4z"/><rect x="2" y="5" width="13" height="14" rx="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  
  // PDF Document
  if (ext === 'pdf' || mimeType === 'application/pdf') {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10h3m-3 4h3m-9-4h.01M3 19V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>`;
  }
  
  // Office / Text Documents
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv'].includes(ext) || mimeType.startsWith('text/')) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`;
  }
  
  // Compressed Archives
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext) || mimeType.includes('zip') || mimeType.includes('compressed')) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25-2.25M12 13.875V9.75M3.75 7.5h16.5M9 5.625h6M9 5.625a1.875 1.875 0 113.75 0h-3.75z" /></svg>`;
  }
  
  // Code files
  if (['html', 'css', 'js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'json', 'xml', 'yaml', 'yml'].includes(ext)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>`;
  }
  
  // Fallback Generic File
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>`;
}

// Format File Bytes Utility
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Update card UI details selectively without list re-rendering
function updateCardUI(fObj) {
  const card = document.getElementById(`card-${fObj.id}`);
  if (card) {
    card.outerHTML = createFileCardHtml(fObj);
  }
}

// Update single card progress bar style directly
function updateProgressUI(fileId, progressVal) {
  const fill = document.getElementById(`progressFill-${fileId}`);
  if (fill) {
    fill.style.width = `${progressVal}%`;
  }
}

// Update overall progress bar footer stats
function updateOverallProgress() {
  const queueFooter = document.getElementById('queueFooter');
  const total = selectedFiles.length;
  
  if (total === 0) {
    queueFooter.style.display = 'none';
    return;
  }
  
  queueFooter.style.display = 'block';
  
  const successCount = selectedFiles.filter(f => f.status === 'success').length;
  const uploadingCount = selectedFiles.filter(f => f.status === 'uploading').length;
  const errorCount = selectedFiles.filter(f => f.status === 'error').length;
  const pendingCount = selectedFiles.filter(f => f.status === 'pending').length;
  
  const sumProgress = selectedFiles.reduce((acc, f) => acc + f.progress, 0);
  const avgProgress = Math.floor(sumProgress / total);
  
  document.getElementById('overallProgressBar').style.width = `${avgProgress}%`;
  document.getElementById('summaryPercent').innerText = `${avgProgress}%`;
  
  const totalSizeBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);
  const uploadedSizeBytes = selectedFiles.reduce((acc, f) => {
    if (f.status === 'success') return acc + f.size;
    if (f.status === 'uploading') return acc + (f.size * (f.progress / 100));
    return acc;
  }, 0);
  
  document.getElementById('summaryProgressStats').innerText = 
    `${successCount} / ${total} files uploaded • ${formatBytes(uploadedSizeBytes)} of ${formatBytes(totalSizeBytes)}`;
  
  const summaryUploadStatus = document.getElementById('summaryUploadStatus');
  
  if (isUploading) {
    summaryUploadStatus.innerText = `Uploading (${uploadingCount} active...)`;
  } else {
    if (pendingCount + errorCount > 0) {
      summaryUploadStatus.innerText = 'Ready to Upload';
    } else {
      summaryUploadStatus.innerText = 'Uploads Completed';
    }
  }
}

// Update overall interaction disable/enable state during uploads
function updateGlobalUIState() {
  const clearQueueBtn = document.getElementById('clearQueueBtn');
  const concurrencySelect = document.getElementById('uploadConcurrency');
  const filterTabsBtns = filterTabs.querySelectorAll('.tab-btn');
  
  if (isUploading) {
    folderNameInput.disabled = true;
    concurrencySelect.disabled = true;
    clearQueueBtn.disabled = true;
    uploadBtn.disabled = true;
    dropZone.classList.add('uploading');
    filterTabsBtns.forEach(btn => btn.disabled = true);
  } else {
    folderNameInput.disabled = false;
    concurrencySelect.disabled = false;
    clearQueueBtn.disabled = false;
    uploadBtn.disabled = false;
    dropZone.classList.remove('uploading');
    filterTabsBtns.forEach(btn => btn.disabled = false);
  }
}

// Upload Single File Logic (Reads base64 + updates simulated progress)
async function uploadSingleFile(fObj, folderName) {
  fObj.status = 'uploading';
  fObj.progress = 5;
  updateCardUI(fObj);
  updateOverallProgress();

  let progressInterval = null;

  // Simulated progress tick (slowing down as it approaches 95%)
  const startProgressSimulation = () => {
    progressInterval = setInterval(() => {
      if (fObj.progress < 85) {
        fObj.progress += Math.floor(Math.random() * 6) + 3; // +3% to +8%
      } else if (fObj.progress < 95) {
        fObj.progress += 1;
      }
      updateProgressUI(fObj.id, fObj.progress);
      updateOverallProgress();
    }, 400);
  };

  try {
    startProgressSimulation();
    
    // 1. Read file as Base64 in background
    const base64Data = await readFileAsBase64(fObj.file);
    fObj.progress = Math.max(fObj.progress, 30);
    updateProgressUI(fObj.id, fObj.progress);
    
    // 2. Upload to Google Drive via server side RPC or CORS Fallback POST
    const result = await uploadToGoogleDrive({
      name: fObj.name,
      type: fObj.type,
      filepath: fObj.filepath,
      base64: base64Data
    }, folderName);
    
    clearInterval(progressInterval);
    
    if (result.success) {
      fObj.status = 'success';
      fObj.progress = 100;
      fObj.driveUrl = result.url;
      fObj.driveId = result.id;
    } else {
      fObj.status = 'error';
      fObj.progress = 0;
      fObj.errorMessage = result.error || 'Server upload failed';
      showToast('Upload Error', `Failed to upload '${fObj.name}': ${fObj.errorMessage}`, 'danger', 6000);
    }
  } catch (err) {
    if (progressInterval) clearInterval(progressInterval);
    fObj.status = 'error';
    fObj.progress = 0;
    fObj.errorMessage = err.toString() || 'Client upload failed';
    showToast('Connection Error', `Network issue uploading '${fObj.name}': ${fObj.errorMessage}`, 'danger', 6000);
  }

  updateCardUI(fObj);
  updateOverallProgress();
}

// Concurrent Worker Pool Upload Controller
async function processAndUpload() {
  if (isUploading) return;

  const pendingFiles = selectedFiles.filter(f => f.status === 'pending' || f.status === 'error');
  if (pendingFiles.length === 0) {
    showToast('Uploads Complete', 'No pending files left to upload.', 'info', 3000);
    return;
  }

  isUploading = true;
  updateGlobalUIState();
  showToast('Starting Uploads', `Uploading ${pendingFiles.length} file(s) to Google Drive.`, 'info', 3000);

  const folderName = folderNameInput.value.trim();
  const concurrencyLimit = parseInt(document.getElementById('uploadConcurrency').value) || 1;

  let queue = [...pendingFiles];
  let resolveAll;
  const allFinishedPromise = new Promise(resolve => resolveAll = resolve);

  // Active concurrent runner loop
  function runNext() {
    if (queue.length === 0 && activeUploadsCount === 0) {
      resolveAll();
      return;
    }

    while (queue.length > 0 && activeUploadsCount < concurrencyLimit) {
      const fileObj = queue.shift();
      activeUploadsCount++;
      
      uploadSingleFile(fileObj, folderName).then(() => {
        activeUploadsCount--;
        runNext();
      });
    }
  }

  runNext();
  await allFinishedPromise;

  isUploading = false;
  updateGlobalUIState();

  const successList = selectedFiles.filter(f => f.status === 'success');
  const errorList = selectedFiles.filter(f => f.status === 'error');

  if (errorList.length === 0) {
    showToast('All Succeeded', `Successfully uploaded ${successList.length} files.`, 'success', 5000);
    // Auto clear queue on success
    setTimeout(() => {
      if (!isUploading) {
        clearQueue();
        folderNameInput.value = '';
        updateClearFolderBtnVisibility();
      }
    }, 3500);
  } else {
    showToast('Finished with Errors', `Uploaded ${successList.length} files successfully. ${errorList.length} failed.`, 'warning', 6000);
    renderFileList(); // Update to show error and retry buttons
  }
}

// Read raw file as Base64 helper
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result.split(',')[1]);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// Google Apps Script client runner or Fallback fetch request
function uploadToGoogleDrive(fileData, folderName) {
  // If running inside Google Apps Script iframe environment
  if (typeof google !== 'undefined' && google.script && google.script.run) {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(response => resolve(response))
        .withFailureHandler(error => reject(error))
        .uploadFile(fileData, folderName); 
    });
  } else {
    // Fallback for static website hosting (CORS Simple POST request)
    if (!WEB_APP_URL || WEB_APP_URL.trim() === "") {
      return Promise.reject("Google Apps Script Web App URL is not configured. Please set the 'WEB_APP_URL' constant at the top of 'js/upload.js' to enable uploads.");
    }
    
    // We send Content-Type text/plain to avoid OPTIONS preflight checks which GAS doesn't handle.
    // The GAS doPost(e) method parses JSON.parse(e.postData.contents) successfully.
    return fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({ fileData, folderName })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    });
  }
}

// Toast Notification System
function showToast(title, message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
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
  
  // Trigger CSS slide-in
  setTimeout(() => toast.classList.add('active'), 50);

  // Auto cleanup
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Lightbox Image Preview Modal System
function openLightbox(fileId) {
  const fObj = selectedFiles.find(f => f.id === fileId);
  if (!fObj || !fObj.thumbnailUrl) return;

  const modal = document.getElementById('imageLightbox');
  const img = document.getElementById('lightboxImg');
  const caption = document.getElementById('lightboxCaption');

  img.src = ''; // Clear image src initially
  
  img.onload = () => {
    caption.innerText = `${fObj.name} (${formatBytes(fObj.size)} • ${img.naturalWidth}x${img.naturalHeight}px)`;
  };

  img.src = fObj.thumbnailUrl;
  modal.style.display = 'block';
  setTimeout(() => modal.classList.add('active'), 10);
}

// Close Lightbox Image Modal
function closeLightbox() {
  const modal = document.getElementById('imageLightbox');
  modal.classList.remove('active');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
}

// Close lightbox on backdrop click or close X
document.getElementById('imageLightbox').addEventListener('click', (e) => {
  if (e.target.id === 'imageLightbox' || e.target.classList.contains('lightbox-close')) {
    closeLightbox();
  }
});

// Close lightbox on Escape press
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLightbox();
  }
});
