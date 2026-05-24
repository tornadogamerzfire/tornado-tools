/* ============================================================
   TORNADOTOOLS — FILE-CONVERTER.JS
   Category-based frontend UI/UX
   - Real XHR upload progress tracking
   - Cancel conversion button
   - Proper request abort handling
   - Locked UI during conversion
   - Better progress states/messages
   - Duplicate conversion request prevention
   - Clean reset after cancel/error/success
   ============================================================ */

'use strict';

// ============================================================
// API CONFIG
// ============================================================
const API_BASE = (() => {
  const metaBase = document.querySelector('meta[name="tornado-api-base"]')?.content?.trim();
  if (metaBase) return metaBase.replace(/\/$/, '');
  if (window.TORNADO_API_BASE) return String(window.TORNADO_API_BASE).replace(/\/$/, '');
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  return 'https://tornado-tools.onrender.com';
})();

const API_ENDPOINT = `${API_BASE}/api/converter/convert`;
const API_WARMUP = `${API_BASE}/api/converter/warmup`;
const API_SESSION_CLEANUP = (sessionId) => `${API_BASE}/api/converter/session/${encodeURIComponent(sessionId)}/cleanup`;

// ============================================================
// CATEGORY SYSTEM
// ============================================================
const FILE_CATEGORIES = {
  image: {
    label: 'Image',
    icon: '🖼️',
    formats: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'tif']
  },
  document: {
    label: 'Document',
    icon: '📕',
    formats: ['pdf', 'doc', 'docx', 'odt', 'rtf']
  },
  spreadsheet: {
    label: 'Spreadsheet',
    icon: '📊',
    formats: ['xls', 'xlsx', 'ods', 'csv', 'json']
  },
  presentation: {
    label: 'Presentation',
    icon: '📽️',
    formats: ['ppt', 'pptx', 'odp']
  },
  video: {
    label: 'Video',
    icon: '🎬',
    formats: ['mp4', 'mov', 'avi', 'mkv', 'webm']
  },
  audio: {
    label: 'Audio',
    icon: '🎵',
    formats: ['mp3', 'wav', 'ogg', 'flac']
  },
  archive: {
    label: 'Archive',
    icon: '🗜️',
    formats: ['zip', 'rar', '7z']
  },
  'text-data': {
    label: 'Text/Data',
    icon: '📝',
    formats: ['txt', 'xml', 'yaml']
  }
};

const CATEGORY_ORDER = [
  'image',
  'document',
  'spreadsheet',
  'presentation',
  'video',
  'audio',
  'archive',
  'text-data'
];

const FRONTEND_TEXT_TARGETS = ['csv', 'json'];
const EXTRACT_TARGET = 'extract';

let SUPPORTED_CONVERSIONS = {};
let capabilitiesReady = false;

function normalizeSupportedConversions(conversions) {
  const normalized = {};

  if (!conversions || typeof conversions !== 'object') {
    return normalized;
  }

  Object.entries(conversions).forEach(([sourceExt, targets]) => {
    const sourceKey = String(sourceExt || '').toLowerCase().trim();
    if (!sourceKey) return;

    const targetList = Array.isArray(targets) ? targets : [];
    normalized[sourceKey] = unique(
      targetList
        .map((targetExt) => String(targetExt || '').toLowerCase().trim())
        .filter(Boolean)
    );
  });

  return normalized;
}

async function loadCapabilities() {
  SUPPORTED_CONVERSIONS = {};
  capabilitiesReady = false;

  try {
    const response = await fetch(`${API_BASE}/api/converter/capabilities`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Capabilities request failed (HTTP ${response.status})`);
    }

    const payload = await response.json();
    const supportedConversions =
      payload &&
      payload.success &&
      payload.data &&
      payload.data.supportedConversions;

    if (!supportedConversions || typeof supportedConversions !== 'object') {
      throw new Error('Invalid capabilities response');
    }

    SUPPORTED_CONVERSIONS = normalizeSupportedConversions(supportedConversions);
    capabilitiesReady = true;
    return true;
  } catch (err) {
    SUPPORTED_CONVERSIONS = {};
    capabilitiesReady = false;
    showToast('Conversion engine unavailable', true);
    return false;
  }
}

function getCurrentTargetsForFormat(ext) {
  const key = String(ext || '').toLowerCase().trim();
  const targets = SUPPORTED_CONVERSIONS[key];
  return Array.isArray(targets) ? targets.slice() : [];
}

function isSupportedTargetForSource(sourceExt, targetExt) {
  const sourceKey = String(sourceExt || '').toLowerCase().trim();
  const targetKey = String(targetExt || '').toLowerCase().trim();
  const supportedTargets = SUPPORTED_CONVERSIONS[sourceKey] || [];
  return supportedTargets.includes(targetKey);
}

function canSwapCurrentPair() {
  return Boolean(
    state.file &&
    state.fromFormat &&
    state.toFormat &&
    isSupportedTargetForSource(state.toFormat, state.fromFormat)
  );
}

function updateSwapButtonState() {
  setSwapButtonEnabled(canSwapCurrentPair());
}

// ============================================================
// FORMAT DEFINITIONS
// ============================================================
const FORMAT_DEFINITIONS = {
  // Images
  png:  { label: 'PNG',  category: 'image',     relatedCategories: [], previewKind: 'image',   icon: '🖼️' },
  jpg:  { label: 'JPG',  category: 'image',     relatedCategories: [], previewKind: 'image',   icon: '🖼️' },
  jpeg: { label: 'JPEG', category: 'image',     relatedCategories: [], previewKind: 'image',   icon: '🖼️' },
  webp: { label: 'WEBP', category: 'image',     relatedCategories: [], previewKind: 'image',   icon: '🌐' },
  gif:  { label: 'GIF',  category: 'image',     relatedCategories: [], previewKind: 'image',   icon: '🖼️' },
  bmp:  { label: 'BMP',  category: 'image',     relatedCategories: [], previewKind: 'image',   icon: '🖼️' },
  svg:  { label: 'SVG',  category: 'image',     relatedCategories: [], previewKind: 'image',   icon: '🖼️' },
  tif:  { label: 'TIF',  category: 'image',     relatedCategories: [], previewKind: 'generic', icon: '🖼️' },

  // Documents
  pdf:  { label: 'PDF',  category: 'document',  relatedCategories: [], previewKind: 'generic', icon: '📕' },
  doc:  { label: 'DOC',  category: 'document',  relatedCategories: [], previewKind: 'generic', icon: '📕' },
  docx: { label: 'DOCX', category: 'document',  relatedCategories: [], previewKind: 'generic', icon: '📕' },
  odt:  { label: 'ODT',  category: 'document',  relatedCategories: [], previewKind: 'generic', icon: '📕' },
  rtf:  { label: 'RTF',  category: 'document',  relatedCategories: [], previewKind: 'generic', icon: '📕' },

  // Spreadsheet
  xls:  { label: 'XLS',  category: 'spreadsheet', relatedCategories: [], previewKind: 'generic', icon: '📊' },
  xlsx: { label: 'XLSX', category: 'spreadsheet', relatedCategories: [], previewKind: 'generic', icon: '📊' },
  ods:  { label: 'ODS',  category: 'spreadsheet', relatedCategories: [], previewKind: 'generic', icon: '📊' },
  csv:  { label: 'CSV',  category: 'spreadsheet', relatedCategories: ['text-data'], previewKind: 'generic', icon: '📊' },

  // Presentation
  ppt:  { label: 'PPT',  category: 'presentation', relatedCategories: [], previewKind: 'generic', icon: '📽️' },
  pptx: { label: 'PPTX', category: 'presentation', relatedCategories: [], previewKind: 'generic', icon: '📽️' },
  odp:  { label: 'ODP',  category: 'presentation', relatedCategories: [], previewKind: 'generic', icon: '📽️' },

  // Video
  mp4:  { label: 'MP4',  category: 'video',     relatedCategories: [], previewKind: 'generic', icon: '🎬' },
  mov:  { label: 'MOV',  category: 'video',     relatedCategories: [], previewKind: 'generic', icon: '🎬' },
  avi:  { label: 'AVI',  category: 'video',     relatedCategories: [], previewKind: 'generic', icon: '🎬' },
  mkv:  { label: 'MKV',  category: 'video',     relatedCategories: [], previewKind: 'generic', icon: '🎬' },
  webm: { label: 'WEBM', category: 'video',     relatedCategories: [], previewKind: 'generic', icon: '🎬' },

  // Audio
  mp3:  { label: 'MP3',  category: 'audio',     relatedCategories: [], previewKind: 'generic', icon: '🎵' },
  wav:  { label: 'WAV',  category: 'audio',     relatedCategories: [], previewKind: 'generic', icon: '🎵' },
  ogg:  { label: 'OGG',  category: 'audio',     relatedCategories: [], previewKind: 'generic', icon: '🎵' },
  flac: { label: 'FLAC', category: 'audio',     relatedCategories: [], previewKind: 'generic', icon: '🎵' },

  // Archive
  zip:  { label: 'ZIP',  category: 'archive',   relatedCategories: [], previewKind: 'generic', icon: '🗜️' },
  extract: { label: 'Extract All', category: 'archive', relatedCategories: [], previewKind: 'generic', icon: '📂' },
  rar:  { label: 'RAR',  category: 'archive',   relatedCategories: [], previewKind: 'generic', icon: '🗜️' },
  '7z': { label: '7Z',   category: 'archive',   relatedCategories: [], previewKind: 'generic', icon: '🗜️' },

  // Text/Data
  txt:  { label: 'TXT',  category: 'text-data', relatedCategories: [], previewKind: 'generic', icon: '📝' },
  json: { label: 'JSON', category: 'spreadsheet', relatedCategories: ['text-data'], previewKind: 'generic', icon: '⚙️' },
  xml:  { label: 'XML',  category: 'text-data', relatedCategories: [], previewKind: 'generic', icon: '📝' },
  yaml: { label: 'YAML', category: 'text-data', relatedCategories: [], previewKind: 'generic', icon: '📝' }
};

// ============================================================
// STATE
// ============================================================
const state = {
  file: null,
  fileExt: '',
  fileCategory: '',
  fromFormat: 'png',
  toFormat: 'jpg',
  currentTargets: [],
  converted: false,
  converting: false,
  backendReady: false,
  backendWarmupDone: false,
  backendSessionId: '',
  lastBackendResult: null,
  lastFrontendOutput: null,
  activeXhr: null,
  activeReader: null,
  _cancelRequested: false
};

// ============================================================
// DOM REFERENCES
// ============================================================
const dropZone         = document.getElementById('dropZone');
const fileInput        = document.getElementById('fileInput');
const browseBtn        = document.getElementById('browseBtn');

const previewSection   = document.getElementById('previewSection');
const previewThumb     = document.getElementById('previewThumb');
const fileIcon         = document.getElementById('fileIcon');
const fileName         = document.getElementById('fileName');
const fileType         = document.getElementById('fileType');
const fileSize         = document.getElementById('fileSize');
const removeFileBtn    = document.getElementById('removeFileBtn');

const controlsSection  = document.getElementById('controlsSection');
const fromSelect       = document.getElementById('fromFormat');
const toSelect         = document.getElementById('toFormat');
const swapBtn          = document.getElementById('swapBtn');
const convertBtn       = document.getElementById('convertBtn');

const progressSection  = document.getElementById('progressSection');
const progressBar      = document.getElementById('progressBar');
const progressGlow     = document.getElementById('progressGlow');
const progressPct      = document.getElementById('progressPct');
const progressStatus   = document.getElementById('progressStatus');
const cancelBtn        = document.getElementById('cancelBtn');

const resultSection    = document.getElementById('resultSection');
const resultIcon       = document.getElementById('resultIcon');
const resultFileName   = document.getElementById('resultFileName');
const resultBadge      = document.getElementById('resultBadge');
const downloadBtn      = document.getElementById('downloadBtn');
const convertAnotherBtn = document.getElementById('convertAnotherBtn');

const navToggle        = document.getElementById('navToggle');
const navLinks         = document.getElementById('navLinks');

const fcToast          = document.getElementById('fcToast');
const fcToastMsg       = document.getElementById('fcToastMsg');
const fcToastIcon      = document.getElementById('fcToastIcon');

// ============================================================
// TOAST
// ============================================================
let toastTimer = null;

function showToast(message, isError = false) {
  if (!fcToast || !fcToastMsg || !fcToastIcon) return;

  fcToastMsg.textContent = message;
  fcToast.classList.toggle('fc-toast-error', isError);
  fcToastIcon.textContent = isError ? '✕' : '✓';
  fcToast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    fcToast.classList.remove('show');
  }, 2800);
}

const backendStatus = (() => {
  let el = document.getElementById('backendStatus');
  if (!el && convertBtn && convertBtn.parentElement) {
    el = document.createElement('p');
    el.id = 'backendStatus';
    el.className = 'fc-backend-status';
    el.textContent = 'Preparing processing engine...';
    convertBtn.insertAdjacentElement('afterend', el);
  }
  return el;
})();

function setBackendStatus(message, variant = 'loading') {
  if (!backendStatus) return;
  backendStatus.textContent = message;
  backendStatus.classList.remove('is-loading', 'is-ready', 'is-error');
  backendStatus.classList.add(variant === 'ready' ? 'is-ready' : variant === 'error' ? 'is-error' : 'is-loading');
}

async function warmBackendOnce() {
  if (state.backendWarmupDone) return state.backendReady;
  state.backendWarmupDone = true;
  setBackendStatus('Preparing processing engine...', 'loading');
  setConvertButtonMode(false, 'Preparing processing engine...');
  try {
    const response = await fetch(API_WARMUP, { method: 'GET', cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Warmup failed (HTTP ${response.status})`);
    await response.json().catch(() => ({}));
    state.backendReady = true;
    setBackendStatus('Processing engine ready.', 'ready');
    if (state.currentTargets.length && convertBtn && state.file) {
      setConvertButtonMode(true);
    }
    return true;
  } catch (err) {
    state.backendReady = false;
    setBackendStatus('Processing engine unavailable right now.', 'error');
    return false;
  }
}

function cleanupBackendSession(immediate = true, delaySeconds = 0) {
  const sessionId = state.backendSessionId || state.lastBackendResult?.sessionId;
  if (!sessionId) return;
  const url = API_SESSION_CLEANUP(sessionId);
  const payload = JSON.stringify({ delaySeconds: immediate ? 0 : Math.max(0, delaySeconds || 300) });
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return;
    }
  } catch (_) {}
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true
  }).catch(() => {});
}

// ============================================================
// SCROLL REVEAL
// ============================================================
function initReveal() {
  const revealEls = document.querySelectorAll('.reveal');
  if (!revealEls.length) return;

  if (!('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    },
    { threshold: 0.08 }
  );

  revealEls.forEach((el) => observer.observe(el));
}

// ============================================================
// HELPERS
// ============================================================
function getExtFromFile(file) {
  if (!file || !file.name || file.name.indexOf('.') === -1) return '';
  const ext = file.name.split('.').pop().toLowerCase().trim();
  return ext;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function isPreviewableImage(ext) {
  return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(ext);
}

function getFormatMeta(ext) {
  return FORMAT_DEFINITIONS[ext] || null;
}

function getCategoryMeta(categoryKey) {
  return FILE_CATEGORIES[categoryKey] || null;
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

function getRenderableFormatGroups() {
  return CATEGORY_ORDER
    .map((categoryKey) => {
      const cat = getCategoryMeta(categoryKey);
      if (!cat) return null;

      const items = Object.entries(FORMAT_DEFINITIONS)
        .filter(([, meta]) => meta.category === categoryKey)
        .map(([ext, meta]) => ({ ext, meta }));

      return items.length ? { categoryKey, label: cat.label, items } : null;
    })
    .filter(Boolean);
}

function getNextSelectableTarget(sourceExt, preferredExt) {
  const sourceKey = String(sourceExt || '').toLowerCase().trim();
  const preferredKey = String(preferredExt || '').toLowerCase().trim();
  const supportedTargets = SUPPORTED_CONVERSIONS[sourceKey] || [];
  if (!supportedTargets.length) return '';
  return supportedTargets.includes(preferredKey) ? preferredKey : supportedTargets[0];
}

function setSectionVisibility(sectionEl, visible) {
  if (!sectionEl) return;
  sectionEl.style.display = visible ? 'block' : 'none';
  if (visible) {
    setTimeout(() => sectionEl.classList.add('visible'), 10);
  } else {
    sectionEl.classList.remove('visible');
  }
}

function showSection(el) {
  if (!el) return;
  setSectionVisibility(el, true);
}

function hideSection(el) {
  if (!el) return;
  setSectionVisibility(el, false);
}

function smoothScrollToPreview() {
  if (!previewSection || typeof previewSection.scrollIntoView !== 'function') return;
  setTimeout(() => {
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 120);
}

// ============================================================
// UI LOCK / UNLOCK
// ============================================================

/**
 * Lock all interactive controls during conversion.
 * Prevents duplicate requests and accidental file changes.
 */
function lockUI() {
  if (removeFileBtn) {
    removeFileBtn.disabled = true;
    removeFileBtn.style.opacity = '0.4';
    removeFileBtn.style.pointerEvents = 'none';
  }
  if (fromSelect)  { fromSelect.disabled = true; }
  if (toSelect)    { toSelect.disabled = true; }
  if (swapBtn)     { swapBtn.disabled = true; swapBtn.style.opacity = '0.3'; }
  if (browseBtn)   { browseBtn.disabled = true; browseBtn.style.opacity = '0.4'; }
  if (dropZone)    { dropZone.style.pointerEvents = 'none'; dropZone.style.opacity = '0.6'; }

  if (convertBtn) {
    convertBtn.disabled = true;
    convertBtn.innerHTML = '<span class="fc-convert-btn-icon fc-spin-icon">⟳</span>Converting...';
    convertBtn.style.opacity = '0.65';
    convertBtn.style.cursor = 'not-allowed';
  }

  if (cancelBtn) {
    cancelBtn.style.display = 'flex';
  }
}

/**
 * Unlock all interactive controls after conversion ends (success, error, cancel).
 */
function unlockUI() {
  if (removeFileBtn) {
    removeFileBtn.disabled = false;
    removeFileBtn.style.opacity = '';
    removeFileBtn.style.pointerEvents = '';
  }
  if (fromSelect)  { fromSelect.disabled = false; }
  if (toSelect)    { toSelect.disabled = false; }
  if (swapBtn)     { updateSwapButtonState(); }
  if (browseBtn)   { browseBtn.disabled = false; browseBtn.style.opacity = ''; }
  if (dropZone)    { dropZone.style.pointerEvents = ''; dropZone.style.opacity = ''; }

  if (convertBtn) {
    convertBtn.disabled = false;
    convertBtn.innerHTML = '<span class="fc-convert-btn-icon">⚡</span>Convert Now';
    convertBtn.style.opacity = '1';
    convertBtn.style.cursor = 'pointer';
  }

  if (cancelBtn) {
    cancelBtn.style.display = 'none';
  }
}

// ============================================================
// CONVERT BUTTON STATE
// ============================================================
function setConvertButtonMode(enabled, message = 'Convert Now') {
  if (!convertBtn) return;
  convertBtn.disabled = !enabled;
  convertBtn.style.opacity = enabled ? '1' : '0.5';
  convertBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
  convertBtn.innerHTML = enabled
    ? '<span class="fc-convert-btn-icon">⚡</span>' + message
    : '<span class="fc-convert-btn-icon">🔒</span>' + message;
}

function setSwapButtonEnabled(enabled) {
  if (!swapBtn) return;
  swapBtn.disabled = !enabled;
  swapBtn.style.opacity = enabled ? '1' : '0.3';
  swapBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
}

// ============================================================
// PROGRESS HELPERS
// ============================================================
function resetProgress() {
  if (progressBar) progressBar.style.width = '0%';
  if (progressPct) progressPct.textContent = '0%';
  if (progressStatus) progressStatus.textContent = 'Initializing...';
}

function setProgress(pct, status) {
  if (progressBar) progressBar.style.width = pct + '%';
  if (progressPct) progressPct.textContent = pct + '%';
  if (progressStatus && status) progressStatus.textContent = status;
}

// ============================================================
// PREVIEW THUMBNAIL
// ============================================================
function clearPreviewThumb() {
  if (previewThumb) {
    previewThumb.innerHTML = '';
    previewThumb.style.display = 'none';
  }
  if (fileIcon) fileIcon.style.display = 'block';
}

function showImageThumbnail(file) {
  if (!previewThumb || !fileIcon) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewThumb.innerHTML = `<img src="${e.target.result}" alt="Preview" />`;
    previewThumb.style.display = 'block';
    fileIcon.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function showGenericIcon(icon) {
  if (!previewThumb || !fileIcon) return;
  previewThumb.style.display = 'none';
  fileIcon.style.display = 'block';
  fileIcon.textContent = icon || '📄';
}

// ============================================================
// SELECT REBUILDERS
// ============================================================
function rebuildFromOptions(selectedExt) {
  if (!fromSelect) return;
  fromSelect.innerHTML = '';

  const groups = getRenderableFormatGroups();
  groups.forEach((group) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label;
    group.items.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.ext;
      opt.textContent = item.meta.label;
      optgroup.appendChild(opt);
    });
    fromSelect.appendChild(optgroup);
  });

  if (selectedExt) fromSelect.value = selectedExt;
}

function rebuildToOptions(meta) {
  if (!toSelect) return;

  const noSupportMessage = capabilitiesReady
    ? 'No supported conversions'
    : 'Conversion engine unavailable';

  const supportedTargets = getCurrentTargetsForFormat(state.fromFormat);
  state.currentTargets = supportedTargets.slice();
  toSelect.innerHTML = '';

  if (!supportedTargets.length) {
    const msgOpt = document.createElement('option');
    msgOpt.value = '';
    msgOpt.disabled = true;
    msgOpt.selected = true;
    msgOpt.textContent = noSupportMessage;
    toSelect.appendChild(msgOpt);
  }

  CATEGORY_ORDER.forEach((categoryKey) => {
    const cat = getCategoryMeta(categoryKey);
    if (!cat) return;

    const group = document.createElement('optgroup');
    group.label = cat.label;

    const added = new Set();

    Object.entries(FORMAT_DEFINITIONS).forEach(([ext, formatMeta]) => {
      if (formatMeta.category !== categoryKey) return;
      if (added.has(ext)) return;
      if (!supportedTargets.includes(ext)) return;

      added.add(ext);

      const opt = document.createElement('option');
      opt.value = ext;
      opt.textContent = formatMeta?.label || ext.toUpperCase();

      group.appendChild(opt);
    });

    if (group.children.length) {
      toSelect.appendChild(group);
    }
  });

  if (!supportedTargets.length) {
    state.toFormat = '';
    toSelect.disabled = false;
    setConvertButtonMode(false, noSupportMessage);
    setSwapButtonEnabled(false);
    return;
  }

  toSelect.disabled = false;

  const preferred = supportedTargets.includes(state.toFormat)
    ? state.toFormat
    : supportedTargets[0];

  toSelect.value = preferred;
  state.toFormat = preferred;

  setConvertButtonMode(true);
  updateSwapButtonState();
}

function updateFilePreview(file, meta) {
  if (!fileName || !fileType || !fileSize || !fileIcon) return;

  fileName.textContent = file.name;
  fileType.textContent = meta ? meta.label : (state.fileExt || '').toUpperCase();
  fileSize.textContent = formatBytes(file.size);
  fileIcon.textContent = meta?.icon || '📄';

  if (meta?.previewKind === 'image') {
    showImageThumbnail(file);
  } else {
    showGenericIcon(meta?.icon || '📄');
  }
}

function showUnsupportedMessage(message) {
  const toastMessage = message || (capabilitiesReady
    ? 'No supported conversions yet'
    : 'Conversion engine unavailable');

  showToast(toastMessage, true);
  setConvertButtonMode(false, toastMessage);
  setSwapButtonEnabled(false);
}

// ============================================================
// TEXT CONVERSION (frontend-only)
// ============================================================
function parseCSVLine(line) {
  const result = [];
  let current  = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  result.push(current);
  return result;
}

function convertTextFormat(content, from, to) {
  if (from === 'txt' && to === 'csv') {
    const lines = content.split('\n').filter(Boolean);
    return lines.map((line) => '"' + line.replace(/"/g, '""') + '"').join('\n');
  }

  if (from === 'txt' && to === 'json') {
    const lines = content.split('\n').filter(Boolean);
    return JSON.stringify({ lines }, null, 2);
  }

  throw new Error('Unsupported conversion: ' + from + ' → ' + to);
}

// ============================================================
// DOWNLOAD HELPERS
// ============================================================
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function fetchAndDownload(url, filename) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Network response was not ok');
  const blob = await response.blob();
  triggerDownload(blob, filename);
  return true;
}

// ============================================================
// BACKEND UPLOAD via XMLHttpRequest (real upload progress)
// ============================================================

/**
 * Uploads file to backend via XHR.
 * Stores XHR on state.activeXhr so it can be aborted by cancelConversion().
 * onUploadProgress(pct 0-100) is called during upload phase.
 * Returns a Promise that resolves with parsed JSON or rejects on error/abort.
 */
function uploadToBackendXHR(file, targetFormat, onUploadProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    state.activeXhr = xhr;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetFormat', targetFormat);

    xhr.open('POST', API_ENDPOINT, true);

    // Upload progress (0 → 90%: upload phase)
    if (xhr.upload) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && typeof onUploadProgress === 'function') {
          const pct = Math.floor((e.loaded / e.total) * 90);
          onUploadProgress(pct);
        }
      });
    }

    xhr.addEventListener('load', () => {
      state.activeXhr = null;
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          resolve(data);
        } else {
          reject(new Error(data.message || 'Conversion failed (HTTP ' + xhr.status + ')'));
        }
      } catch (parseErr) {
        reject(new Error('Invalid server response'));
      }
    });

    xhr.addEventListener('error', () => {
      state.activeXhr = null;
      reject(new Error('Network error — could not reach server'));
    });

    xhr.addEventListener('timeout', () => {
      state.activeXhr = null;
      reject(new Error('Request timed out'));
    });

    xhr.addEventListener('abort', () => {
      state.activeXhr = null;
      const err = new Error('Request cancelled');
      err.isAbort = true;
      reject(err);
    });

    xhr.timeout = 70000; // match backend 70s timeout
    xhr.send(formData);
  });
}

// ============================================================
// ABORT / CANCEL
// ============================================================
function cancelConversion() {
  if (!state.converting) return;

  if (state.activeXhr) {
    try { state.activeXhr.abort(); } catch (_) {}
    state.activeXhr = null;
  }

  if (state.activeReader) {
    try { state.activeReader.abort(); } catch (_) {}
    state.activeReader = null;
  }

  state._cancelRequested = true;
}

// ============================================================
// CONVERSION FLOW
// ============================================================
function startConversion() {
  if (!state.file) {
    showToast('Please select a file first', true);
    return;
  }

  const toFmt = (toSelect && toSelect.value) || state.toFormat;
  const supportedTargets = getCurrentTargetsForFormat(state.fromFormat);

  if (!supportedTargets.length) {
    showUnsupportedMessage(capabilitiesReady
      ? 'No supported conversions'
      : 'Conversion engine unavailable');
    return;
  }

  if (!supportedTargets.includes(toFmt)) {
    showToast('Unsupported conversion', true);
    return;
  }

  if (state.converting) return;

  state.converting = true;
  state._cancelRequested = false;

  lockUI();
  resetProgress();
  showSection(progressSection);
  hideSection(resultSection);

  if (progressGlow) progressGlow.style.opacity = '1';

  const useFrontendFallback = state.fileExt === 'txt' && FRONTEND_TEXT_TARGETS.includes(toFmt) && !state.backendReady;
  if (useFrontendFallback) {
    runFrontendConversion(toFmt);
  } else {
    runBackendConversion(toFmt);
  }
}

// ----------------------------------------
// BACKEND PATH — real XHR progress
// ----------------------------------------
async function runBackendConversion(toFmt) {
  try {
    setProgress(0, 'Preparing upload...');

    const result = await uploadToBackendXHR(state.file, toFmt, (uploadPct) => {
      // uploadPct: 0 → 90 during upload
      if (uploadPct <= 30) {
        setProgress(uploadPct, 'Uploading file... ' + uploadPct + '%');
      } else if (uploadPct <= 60) {
        setProgress(uploadPct, 'Sending to conversion engine...');
      } else {
        setProgress(uploadPct, 'Upload complete — awaiting processing...');
      }
    });

    // Upload done — processing phase: 90 → 100
    setProgress(92, 'Server processing conversion...');

    const fileData = result.data;
    if (!fileData || !fileData.outputFileName) {
      throw new Error('Server returned no output file');
    }

    setProgress(97, 'Preparing download...');

    finishBackendConversion(fileData, toFmt);

  } catch (err) {
    state.converting = false;
    unlockUI();
    hideSection(progressSection);
    resetProgress();

    if (err.isAbort || state._cancelRequested) {
      showToast('Conversion cancelled', false);
    } else {
      showToast(err.message || 'Conversion failed', true);
    }
  }
}

function finishBackendConversion(data, toFmt) {
  state.converting       = false;
  state.converted        = true;
  state.lastBackendResult = data;
  state.backendSessionId = data.sessionId || state.backendSessionId;

  setProgress(100, 'Done!');
  setBackendStatus('Conversion complete. Ready for download.', 'ready');

  const meta     = getFormatMeta(toFmt) || getFormatMeta(state.fileExt) || null;
  const outName  = data.downloadName || (state.file.name.replace(/\.[^.]+$/, '') + '_converted.' + toFmt);

  if (resultIcon)     resultIcon.textContent     = meta?.icon || '📄';
  if (resultFileName) resultFileName.textContent = outName;
  if (resultBadge)    resultBadge.textContent    = toFmt.toUpperCase();

  unlockUI();
  hideSection(progressSection);
  showSection(resultSection);
  showToast('Conversion complete!');

  setTimeout(() => {
    if (resultSection && typeof resultSection.scrollIntoView === 'function') {
      resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 200);
}

// ----------------------------------------
// FRONTEND PATH — text/data conversion
// ----------------------------------------
function runFrontendConversion(toFmt) {
  // All text conversion is synchronous via FileReader.
  // We animate progress honestly: read → convert → done.
  // No fake random timers.

  setProgress(5, 'Reading file data...');

  const reader = new FileReader();
  state.activeReader = reader;

  reader.onabort = () => {
    state.activeReader = null;
    state.converting = false;
    unlockUI();
    hideSection(progressSection);
    resetProgress();
    showToast('Conversion cancelled', false);
  };

  reader.onload = (e) => {
    state.activeReader = null;

    if (state._cancelRequested) {
      state.converting = false;
      unlockUI();
      hideSection(progressSection);
      resetProgress();
      showToast('Conversion cancelled', false);
      return;
    }

    setProgress(40, 'Analyzing format structure...');

    let outputContent;
    try {
      const raw = e.target.result;
      setProgress(60, 'Applying conversion matrix...');
      outputContent = convertTextFormat(raw, state.fromFormat, toFmt);
    } catch (err) {
      state.converting = false;
      unlockUI();
      hideSection(progressSection);
      resetProgress();
      showToast('Conversion error: ' + err.message, true);
      return;
    }

    setProgress(85, 'Encoding output format...');

    // Small yield so browser paints the 85% before we finish
    setTimeout(() => {
      if (state._cancelRequested) {
        state.converting = false;
        unlockUI();
        hideSection(progressSection);
        resetProgress();
        showToast('Conversion cancelled', false);
        return;
      }

      setProgress(100, 'Done!');
      finishFrontendConversion(toFmt, outputContent);
    }, 120);
  };

  reader.onerror = () => {
    state.activeReader = null;
    state.converting = false;
    unlockUI();
    hideSection(progressSection);
    resetProgress();
    showToast('Failed to read file', true);
  };

  reader.readAsText(state.file);
}

function finishFrontendConversion(toFmt, content) {
  state.converting         = false;
  state.converted          = true;
  state.lastFrontendOutput = {
    content: content,
    name: state.file.name.replace(/\.[^.]+$/, '') + '_converted.' + toFmt
  };

  const meta = getFormatMeta(toFmt) || getFormatMeta(state.fileExt) || null;

  if (resultIcon)     resultIcon.textContent     = meta?.icon || '📄';
  if (resultFileName) resultFileName.textContent = state.lastFrontendOutput.name;
  if (resultBadge)    resultBadge.textContent    = toFmt.toUpperCase();

  unlockUI();
  hideSection(progressSection);
  showSection(resultSection);
  showToast('Conversion complete!');

  setTimeout(() => {
    if (resultSection && typeof resultSection.scrollIntoView === 'function') {
      resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 200);
}

// ============================================================
// FILE HANDLING
// ============================================================
function handleFile(file) {
  if (!file) return;

  if (state.converting) {
    showToast('Please wait — conversion in progress', true);
    return;
  }

  const ext = getExtFromFile(file);
  const meta = getFormatMeta(ext);

  if (!meta) {
    showToast('Unsupported file format: .' + ext, true);
    return;
  }

  state.file = file;
  state.fileExt = ext;
  state.fileCategory = meta.category;
  state.fromFormat = ext;
  state.currentTargets = getCurrentTargetsForFormat(ext);
  state.toFormat = state.currentTargets[0] || '';
  state.converted = false;
  state.converting = false;
  state.lastBackendResult = null;
  state.lastFrontendOutput = null;
  state._cancelRequested = false;

  updateFilePreview(file, meta);

  if (fromSelect) fromSelect.value = ext;
  rebuildToOptions(meta);

  showSection(previewSection);
  showSection(controlsSection);
  hideSection(progressSection);
  hideSection(resultSection);

  if (!state.currentTargets.length) {
    if (capabilitiesReady) {
      showUnsupportedMessage('No supported conversions yet');
    } else {
      setConvertButtonMode(false, 'Conversion engine unavailable');
      setSwapButtonEnabled(false);
    }
  } else {
    setConvertButtonMode(true);
  }

  resetProgress();
  smoothScrollToPreview();
}

// ============================================================
// RESET
// ============================================================
function resetTool() {
  if (state.activeXhr) {
    try { state.activeXhr.abort(); } catch (_) {}
    state.activeXhr = null;
  }

  if (state.activeReader) {
    try { state.activeReader.abort(); } catch (_) {}
    state.activeReader = null;
  }

  state._cancelRequested = true;

  cleanupBackendSession(true, 0);

  state.file = null;
  state.fileExt = '';
  state.fileCategory = '';
  state.fromFormat = 'png';
  state.toFormat = 'jpg';
  state.currentTargets = [];
  state.converted = false;
  state.converting = false;
  state.backendSessionId = '';
  state.lastBackendResult = null;
  state.lastFrontendOutput = null;
  state._cancelRequested = false;
  state.activeXhr = null;
  state.activeReader = null;

  hideSection(previewSection);
  hideSection(controlsSection);
  hideSection(progressSection);
  hideSection(resultSection);

  if (fileInput) fileInput.value = '';

  resetProgress();
  clearPreviewThumb();

  unlockUI();
  rebuildFromOptions('png');
  rebuildToOptions(getFormatMeta('png'));
}

// ============================================================
// NAVBAR TOGGLE
// ============================================================
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    navToggle.classList.toggle('open');
  });
}

// ============================================================
// DRAG & DROP
// ============================================================
if (dropZone) {
  dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (!state.converting) dropZone.classList.add('fc-drag-over');
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!state.converting) dropZone.classList.add('fc-drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    if (!dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove('fc-drag-over');
    }
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('fc-drag-over');
    if (state.converting) return;
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    handleFile(file);
  });

  dropZone.addEventListener('click', (e) => {
    if (state.converting) return;
    if (e.target === browseBtn || e.target === fileInput) return;
    if (fileInput) fileInput.click();
  });
}

// ============================================================
// FILE INPUT
// ============================================================
if (fileInput) {
  const allExt = unique(Object.keys(FORMAT_DEFINITIONS).map((ext) => '.' + ext));
  fileInput.setAttribute('accept', ['image/*', ...allExt].join(','));

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleFile(file);
    fileInput.value = '';
  });
}

if (browseBtn) {
  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.converting) return;
    if (fileInput) fileInput.click();
  });
}

// ============================================================
// REMOVE FILE
// ============================================================
if (removeFileBtn) {
  removeFileBtn.addEventListener('click', () => {
    if (state.converting) return;
    cleanupBackendSession(true, 0);
    resetTool();
    showToast('File removed');
  });
}

// ============================================================
// FORMAT DROPDOWNS
// ============================================================
if (fromSelect) {
  rebuildFromOptions('png');
  fromSelect.addEventListener('change', () => {
    if (state.converting) return;
    state.fromFormat = fromSelect.value;
    const meta = getFormatMeta(state.fromFormat);
    state.currentTargets = getCurrentTargetsForFormat(state.fromFormat);
    rebuildToOptions(meta);

    if (state.file && state.fileExt && state.fileExt !== state.fromFormat) {
      showToast('Source format changed in controls.', false);
    }
  });
}

if (toSelect) {
  toSelect.addEventListener('change', () => {
    if (state.converting) return;
    state.toFormat = toSelect.value;
    updateSwapButtonState();
  });
}

if (swapBtn) {
  swapBtn.addEventListener('click', () => {
    if (state.converting || !state.file) return;

    const oldFrom = state.fromFormat;
    const oldTo   = state.toFormat;

    if (!oldFrom || !oldTo) {
      showToast('No supported conversions', true);
      return;
    }

    const reverseTargets = getCurrentTargetsForFormat(oldTo);
    if (!reverseTargets.includes(oldFrom)) {
      showToast('Cannot swap — reverse conversion not supported', true);
      return;
    }

    state.fromFormat = oldTo;
    state.toFormat = oldFrom;
    state.currentTargets = getCurrentTargetsForFormat(state.fromFormat);

    if (fromSelect) fromSelect.value = state.fromFormat;
    rebuildToOptions(getFormatMeta(state.fromFormat));
    if (toSelect) toSelect.value = state.toFormat;

    updateSwapButtonState();
    showToast('Formats swapped!');
  });
}

// ============================================================
// CONVERT BUTTON
// ============================================================
if (convertBtn) {
  convertBtn.addEventListener('click', () => {
    if (state.converting) return;

    if (!state.file) {
      showToast('Please select a file first', true);
      return;
    }

    if (!state.currentTargets.length) {
      showUnsupportedMessage();
      return;
    }

    startConversion();
  });
}

// ============================================================
// CANCEL BUTTON
// ============================================================
if (cancelBtn) {
  cancelBtn.addEventListener('click', cancelConversion);
}

// ============================================================
// DOWNLOAD BUTTON
// ============================================================
if (downloadBtn) {
  downloadBtn.addEventListener('click', async () => {
    if (!state.file || !state.converted) {
      showToast('Convert the file first', true);
      return;
    }

    const toFmt    = (toSelect && toSelect.value) || state.toFormat;
    const baseName = state.file.name.replace(/\.[^.]+$/, '');
    const outName  = baseName + '_converted.' + toFmt;

    // Frontend txt conversion — use stored output
    if (state.fileExt === 'txt' && FRONTEND_TEXT_TARGETS.includes(toFmt)) {
      if (state.lastFrontendOutput && state.lastFrontendOutput.content !== undefined) {
        const blob = new Blob([state.lastFrontendOutput.content], { type: 'text/plain;charset=utf-8' });
        triggerDownload(blob, state.lastFrontendOutput.name || outName);
        showToast('Download started!');
      } else {
        showToast('No converted output available — please convert again', true);
      }
      return;
    }

    // Backend conversion — fetch from server
    if (!state.lastBackendResult || !state.lastBackendResult.outputFileName) {
      showToast('No converted file available', true);
      return;
    }

    try {
      const url = `${API_BASE}/api/converter/download/${encodeURIComponent(state.lastBackendResult.outputFileName)}`;
      const name = state.lastBackendResult.downloadName || outName;
      await fetchAndDownload(url, name);
      showToast('Download started!');
    } catch (err) {
      showToast(err.message || 'Download failed', true);
    }
  });
}

// ============================================================
// CONVERT ANOTHER
// ============================================================
if (convertAnotherBtn) {
  convertAnotherBtn.addEventListener('click', () => {
    cleanupBackendSession(true, 0);
    resetTool();
    if (dropZone && typeof dropZone.scrollIntoView === 'function') {
      dropZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

// ============================================================
// INIT
// ============================================================
async function init() {
  initReveal();
  setConvertButtonMode(false, 'Loading conversion capabilities...');
  await loadCapabilities();
  rebuildFromOptions('png');
  rebuildToOptions(getFormatMeta('png'));
  setSwapButtonEnabled(false);
  hideSection(previewSection);
  hideSection(controlsSection);
  hideSection(progressSection);
  hideSection(resultSection);
  if (cancelBtn) cancelBtn.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  void init();
});

window.addEventListener('pagehide', () => {
  cleanupBackendSession(true, 0);
});

window.addEventListener('beforeunload', () => {
  cleanupBackendSession(true, 0);
});
