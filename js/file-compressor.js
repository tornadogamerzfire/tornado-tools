'use strict';

const API_BASE = (() => {
  const metaBase = document.querySelector('meta[name="tornado-api-base"]')?.content?.trim();
  if (metaBase) return metaBase.replace(/\/$/, '');
  if (window.TORNADO_API_BASE) return String(window.TORNADO_API_BASE).replace(/\/$/, '');
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  return 'https://tornado-tools.onrender.com';
})();

const API_HEALTH = `${API_BASE}/api/compress/health`;
const API_WARMUP = `${API_BASE}/api/compress/warmup`;
const API_CAPABILITIES = `${API_BASE}/api/compress/capabilities`;
const API_COMPRESS = `${API_BASE}/api/compress/compress`;
const API_DOWNLOAD = (filename) => `${API_BASE}/api/compress/download/${encodeURIComponent(filename)}`;
const API_CLEANUP = (sessionId) => `${API_BASE}/api/compress/session/${encodeURIComponent(sessionId)}/cleanup`;

const DEFAULT_SUPPORTED = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tif', 'tiff', 'pdf'];
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const state = {
  file: null,
  backendReady: false,
  warmupDone: false,
  processing: false,
  sessionId: '',
  lastResult: null,
  activeXhr: null,
  supportedInputs: DEFAULT_SUPPORTED.slice(),
  targetToleranceBytes: 2048,
  maxUploadBytes: MAX_UPLOAD_BYTES,
  pendingCleanupSession: sessionStorage.getItem('tornadoFileCompressorSession') || ''
};

const el = {};
const byId = (id) => document.getElementById(id);

function cache() {
  [
    'backendStatus','dropZone','browseBtn','fileInput','previewSection','previewThumb','fileName','fileType','fileSize',
    'removeFileBtn','targetSizeInput','unitInput','compressBtn','resetBtn','processingHint','progressSection','progressPct',
    'progressBar','progressText','resultSection','resultName','resultBadge','resultSize','resultNote','downloadBtn',
    'compressAnotherBtn','navToggle','navLinks'
  ].forEach((id) => el[id] = byId(id));
}

function bytesToHuman(bytes) {
  if (!Number.isFinite(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function extOf(name) {
  const n = String(name || '');
  const idx = n.lastIndexOf('.');
  return idx >= 0 ? n.slice(idx + 1).toLowerCase() : '';
}

function isSupported(file) {
  const ext = extOf(file?.name);
  return Boolean(ext && state.supportedInputs.includes(ext));
}

function setStatus(message, tone = '') {
  if (!el.backendStatus) return;
  el.backendStatus.textContent = message;
  el.backendStatus.dataset.tone = tone;
}

function setProcessingHint(message, tone = '') {
  if (!el.processingHint) return;
  el.processingHint.textContent = message;
  el.processingHint.dataset.tone = tone;
}

function setProgress(pct, message) {
  if (el.progressBar) el.progressBar.style.width = `${pct}%`;
  if (el.progressPct) el.progressPct.textContent = `${pct}%`;
  if (message && el.progressText) el.progressText.textContent = message;
}

function showSection(section, show) {
  if (!section) return;
  section.style.display = show ? 'block' : 'none';
  if (show) section.classList.add('visible');
  else section.classList.remove('visible');
}

function setCompressButtonEnabled(enabled) {
  if (!el.compressBtn) return;
  el.compressBtn.disabled = !enabled;
}

function lockUI() {
  [el.browseBtn, el.fileInput, el.targetSizeInput, el.unitInput, el.removeFileBtn].forEach((node) => {
    if (node) node.disabled = true;
  });
  setCompressButtonEnabled(false);
}

function unlockUI() {
  [el.browseBtn, el.fileInput, el.targetSizeInput, el.unitInput, el.removeFileBtn].forEach((node) => {
    if (node) node.disabled = false;
  });
  setCompressButtonEnabled(Boolean(state.file && state.backendReady));
}

function showToast(message, isError = false) {
  if (!window.TornadoToast) return;
  TornadoToast.show(`${isError ? '⚠ ' : '✓ '}${message}`, 2500);
}

function renderPreview(file) {
  if (!el.previewSection || !el.previewThumb || !el.fileName || !el.fileType || !el.fileSize) return;
  el.fileName.textContent = file.name;
  el.fileType.textContent = extOf(file.name).toUpperCase() || 'FILE';
  el.fileSize.textContent = bytesToHuman(file.size);

  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = () => {
      el.previewThumb.innerHTML = `<img src="${reader.result}" alt="Preview" />`;
    };
    reader.readAsDataURL(file);
  } else {
    el.previewThumb.innerHTML = 'PDF';
  }

  showSection(el.previewSection, true);
}

function clearResult() {
  if (el.resultSection) showSection(el.resultSection, false);
  if (el.progressSection) showSection(el.progressSection, false);
  state.lastResult = null;
  state.sessionId = '';
}

function resetAll(keepFile = false) {
  if (state.activeXhr) {
    try { state.activeXhr.abort(); } catch (_) {}
    state.activeXhr = null;
  }
  state.processing = false;
  setProgress(0, 'Starting...');
  clearResult();
  if (!keepFile) {
    state.file = null;
    if (el.fileInput) el.fileInput.value = '';
    if (el.previewThumb) el.previewThumb.innerHTML = '📄';
    if (el.previewSection) showSection(el.previewSection, false);
  }
  unlockUI();
  setProcessingHint(state.backendReady ? 'Ready for compression.' : 'Preparing processing engine...');
  updateButtonState();
}

function updateButtonState() {
  const validTarget = Boolean(Number(el.targetSizeInput?.value) > 0);
  setCompressButtonEnabled(Boolean(state.file && state.backendReady && validTarget && !state.processing));
}

function currentTargetBytes() {
  const size = Number(el.targetSizeInput?.value);
  const unit = String(el.unitInput?.value || 'KB').toUpperCase();
  if (!Number.isFinite(size) || size <= 0) return 0;
  return unit === 'MB' ? Math.round(size * 1024 * 1024) : Math.round(size * 1024);
}

function validateFile(file) {
  if (!file) return 'Please choose a file first.';
  const ext = extOf(file.name);
  if (!ext || !state.supportedInputs.includes(ext)) {
    return 'Only JPG, JPEG, PNG, WEBP, BMP, TIF, TIFF and PDF files are supported.';
  }
  if (file.size > state.maxUploadBytes) {
    return `File is too large. Maximum upload size is ${bytesToHuman(state.maxUploadBytes)}.`;
  }
  return '';
}

async function loadCapabilities() {
  try {
    const response = await fetch(API_CAPABILITIES, { method: 'GET', cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Capabilities request failed (${response.status})`);
    const json = await response.json();
    if (json?.success && json?.data) {
      const inputs = json.data.supportedInputs || {};
      state.supportedInputs = [...new Set([
        ...(inputs.image || []),
        ...(inputs.pdf || []),
      ])];
      state.maxUploadBytes = Number(json.data.maxUploadBytes || MAX_UPLOAD_BYTES);
      state.targetToleranceBytes = Number(json.data.targetToleranceBytes || 2048);
    }
    return true;
  } catch (err) {
    return false;
  }
}

async function warmupOnce() {
  if (state.warmupDone) return state.backendReady;
  state.warmupDone = true;
  setStatus('Preparing processing engine...', 'loading');
  setProcessingHint('Preparing processing engine...');
  try {
    const response = await fetch(API_WARMUP, { method: 'GET', cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Warmup failed (${response.status})`);
    await response.json().catch(() => ({}));
    state.backendReady = true;
    setStatus('Processing engine ready.', 'ready');
    setProcessingHint('Ready for compression.');
    updateButtonState();
    return true;
  } catch (err) {
    state.backendReady = false;
    setStatus('Processing engine unavailable right now.', 'error');
    setProcessingHint('Processing engine unavailable right now.');
    updateButtonState();
    return false;
  }
}

function cleanupSession(sessionId, delaySeconds = 300) {
  if (!sessionId) return;
  const body = JSON.stringify({ delaySeconds });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(API_CLEANUP(sessionId), new Blob([body], { type: 'application/json' }));
      return;
    }
  } catch (_) {}
  fetch(API_CLEANUP(sessionId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

function rememberSession(sessionId) {
  state.sessionId = sessionId || '';
  if (sessionId) {
    sessionStorage.setItem('tornadoFileCompressorSession', sessionId);
  } else {
    sessionStorage.removeItem('tornadoFileCompressorSession');
  }
}

function cleanupPreviousReloadSession() {
  const nav = performance.getEntriesByType?.('navigation')?.[0];
  const navType = nav?.type || '';
  const existing = sessionStorage.getItem('tornadoFileCompressorSession');
  if (existing && navType === 'reload') {
    cleanupSession(existing, 0);
    sessionStorage.removeItem('tornadoFileCompressorSession');
  }
}

function uploadWithProgress(file, targetSize, unit) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    state.activeXhr = xhr;

    const form = new FormData();
    form.append('file', file);
    form.append('targetSize', String(targetSize));
    form.append('targetUnit', unit);

    xhr.open('POST', API_COMPRESS, true);
    xhr.timeout = 120000;

    if (xhr.upload) {
      xhr.upload.addEventListener('progress', (evt) => {
        if (!evt.lengthComputable) return;
        const pct = Math.min(70, Math.floor((evt.loaded / evt.total) * 70));
        setProgress(pct, `Uploading file... ${pct}%`);
      });
    }

    xhr.addEventListener('load', () => {
      state.activeXhr = null;
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          resolve(data);
        } else {
          reject(new Error(data?.detail || data?.message || `Compression failed (${xhr.status})`));
        }
      } catch (err) {
        reject(new Error('Invalid server response.'));
      }
    });

    xhr.addEventListener('error', () => {
      state.activeXhr = null;
      reject(new Error('Network error.'));
    });

    xhr.addEventListener('timeout', () => {
      state.activeXhr = null;
      reject(new Error('Request timed out.'));
    });

    xhr.addEventListener('abort', () => {
      state.activeXhr = null;
      const error = new Error('Request cancelled');
      error.isAbort = true;
      reject(error);
    });

    xhr.send(form);
  });
}

async function downloadFile(url, filename) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Download failed.');
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
}

async function startCompression() {
  if (!state.file || state.processing) return;

  const validationError = validateFile(state.file);
  if (validationError) {
    showToast(validationError, true);
    return;
  }

  const targetBytes = currentTargetBytes();
  if (!targetBytes) {
    showToast('Enter a valid target size.', true);
    return;
  }

  if (targetBytes < state.targetToleranceBytes) {
    showToast('Target size is too small.', true);
    return;
  }

  state.processing = true;
  lockUI();
  showSection(el.progressSection, true);
  clearResult();
  setProgress(2, 'Preparing upload...');
  setProcessingHint('Preparing processing engine...');

  try {
    const response = await uploadWithProgress(state.file, Number(el.targetSizeInput.value), String(el.unitInput.value || 'KB'));

    const result = response?.data || {};
    rememberSession(result.sessionId || '');

    setProgress(82, 'Compressing file on the backend...');
    const outputBytes = Number(result.outputBytes || 0);
    const originalBytes = Number(result.originalBytes || state.file.size);
    const pct = originalBytes > 0 ? Math.max(0, Math.round((1 - outputBytes / originalBytes) * 100)) : 0;
    const targetTxt = `${Number(el.targetSizeInput.value)} ${String(el.unitInput.value || 'KB').toUpperCase()}`;

    state.lastResult = result;

    if (el.resultName) el.resultName.textContent = result.downloadName || 'compressed-file';
    if (el.resultBadge) el.resultBadge.textContent = result.method ? result.method.toUpperCase() : 'READY';
    if (el.resultSize) el.resultSize.textContent = `${bytesToHuman(outputBytes)} • ${pct}% smaller`;
    if (el.resultNote) {
      const diff = Math.abs((outputBytes || 0) - (result.targetBytes || targetBytes));
      el.resultNote.textContent = `Target: ${targetTxt}. Output is ${bytesToHuman(outputBytes)}. Difference from target: ${bytesToHuman(diff)}.`;
    }

    setProgress(100, 'Compression complete.');
    showSection(el.resultSection, true);
    showToast('Compression complete!');
    setProcessingHint('Compression complete.');
    state.processing = false;
    unlockUI();
    setCompressButtonEnabled(false);
  } catch (err) {
    state.processing = false;
    unlockUI();
    showSection(el.progressSection, false);
    if (err?.isAbort) {
      showToast('Compression cancelled.', false);
    } else {
      showToast(err?.message || 'Compression failed.', true);
    }
    setProcessingHint(state.backendReady ? 'Ready for compression.' : 'Processing engine unavailable.');
  }
}

function bindFaq() {
  document.querySelectorAll('.faq-question').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const open = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });
}

function initDragDrop() {
  if (!el.dropZone) return;

  const chooseFile = () => {
    if (state.processing) return;
    el.fileInput?.click();
  };

  el.dropZone.addEventListener('click', (ev) => {
    if (ev.target === el.browseBtn || ev.target === el.fileInput) return;
    chooseFile();
  });

  el.dropZone.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      chooseFile();
    }
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    el.dropZone.addEventListener(eventName, (ev) => {
      ev.preventDefault();
      el.dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    el.dropZone.addEventListener(eventName, (ev) => {
      ev.preventDefault();
      if (eventName === 'drop' && ev.dataTransfer?.files?.length) {
        const file = ev.dataTransfer.files[0];
        handleSelectedFile(file);
      }
      el.dropZone.classList.remove('drag-over');
    });
  });
}

function handleSelectedFile(file) {
  const error = validateFile(file);
  if (error) {
    showToast(error, true);
    return;
  }
  state.file = file;
  renderPreview(file);
  updateButtonState();
  if (state.backendReady) setProcessingHint('Ready for compression.');
}

function bindEvents() {
  el.navToggle?.addEventListener('click', () => {
    el.navLinks?.classList.toggle('open');
    el.navToggle?.classList.toggle('open');
  });

  el.browseBtn?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (!state.processing) el.fileInput?.click();
  });

  el.fileInput?.addEventListener('change', (ev) => {
    const file = ev.target.files?.[0];
    if (file) handleSelectedFile(file);
    ev.target.value = '';
  });

  el.targetSizeInput?.addEventListener('input', updateButtonState);
  el.unitInput?.addEventListener('change', updateButtonState);

  el.compressBtn?.addEventListener('click', () => {
    void startCompression();
  });

  el.resetBtn?.addEventListener('click', () => {
    if (state.sessionId) cleanupSession(state.sessionId, 0);
    rememberSession('');
    resetAll(false);
  });

  el.removeFileBtn?.addEventListener('click', () => {
    if (state.sessionId) cleanupSession(state.sessionId, 0);
    rememberSession('');
    resetAll(false);
  });

  el.downloadBtn?.addEventListener('click', async () => {
    if (!state.lastResult?.outputFileName) {
      showToast('Nothing to download yet.', true);
      return;
    }
    try {
      const downloadName = state.lastResult.downloadName || state.lastResult.outputFileName;
      await downloadFile(API_DOWNLOAD(state.lastResult.outputFileName), downloadName);
      showToast('Download started!');
    } catch (err) {
      showToast(err?.message || 'Download failed.', true);
    }
  });

  el.compressAnotherBtn?.addEventListener('click', () => {
    if (state.sessionId) cleanupSession(state.sessionId, 0);
    rememberSession('');
    resetAll(false);
    el.dropZone?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  window.addEventListener('beforeunload', () => {
    if (state.sessionId) cleanupSession(state.sessionId, 300);
  });

  window.addEventListener('pagehide', () => {
    if (state.sessionId) cleanupSession(state.sessionId, 300);
  });
}

async function init() {
  cache();
  bindFaq();
  initDragDrop();
  cleanupPreviousReloadSession();
  bindEvents();

  showSection(el.previewSection, false);
  showSection(el.progressSection, false);
  showSection(el.resultSection, false);

  setProcessingHint('Preparing processing engine...');
  setStatus('Preparing processing engine...', 'loading');
  setCompressButtonEnabled(false);

  await loadCapabilities();
  await warmupOnce();
  unlockUI();

}

document.addEventListener('DOMContentLoaded', () => {
  void init();
});
