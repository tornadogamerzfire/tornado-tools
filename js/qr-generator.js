/* ============================================================
   TORNADOTOOLS — QR-GENERATOR.JS
   Improvements:
     - Toast replaces alerts
     - Better error handling
     - Size display label
     - Download button state management
   ============================================================ */

const input       = document.getElementById('qrInput');
const container   = document.getElementById('qrCanvas');
const fgColor     = document.getElementById('fgColor');
const bgColor     = document.getElementById('bgColor');
const qrSize      = document.getElementById('qrSize');
const sizeLabel   = document.getElementById('qrSizeLabel');
const logoInput   = document.getElementById('logoInput');
const generateBtn = document.getElementById('generateQR');
const clearBtn    = document.getElementById('clearQR');
const downloadBtn = document.getElementById('downloadQR');

let qr = null;

/* ============================================================
   SIZE LABEL
   ============================================================ */
if (qrSize && sizeLabel) {
  qrSize.addEventListener('input', () => {
    sizeLabel.textContent = qrSize.value + 'px';
  });
}

/* ============================================================
   LOGO SHAPE
   ============================================================ */
function getLogoShape() {
  const checked = document.querySelector('input[name="logoShape"]:checked');
  return checked ? checked.value : 'square';
}

/* ============================================================
   COLOR MODE
   ============================================================ */
const modeRadios  = document.querySelectorAll('input[name="colorMode"]');
const gradientBox = document.getElementById('gradientBox');
const singleBox   = document.getElementById('singleColorBox');
const eyeToggle   = document.getElementById('eyeToggle');
const eyeBox      = document.getElementById('eyeBox');

modeRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    const isGrad = radio.value === 'gradient' && radio.checked;
    if (gradientBox) gradientBox.style.display = isGrad ? 'flex' : 'none';
    if (singleBox)   singleBox.style.display   = isGrad ? 'none' : 'flex';
  });
});

if (eyeToggle && eyeBox) {
  eyeToggle.addEventListener('change', () => {
    eyeBox.style.display = eyeToggle.checked ? 'block' : 'none';
  });
}

/* ============================================================
   GENERATE QR
   ============================================================ */
async function generateQR() {
  const text = input.value.trim();

  if (!text) {
    input.style.borderColor = 'rgba(255,80,80,0.5)';
    setTimeout(() => input.style.borderColor = '', 2000);
    TornadoToast.show('⚠ Enter text or a URL first');
    input.focus();
    return;
  }

  const size       = Math.min(Math.max(parseInt(qrSize?.value) || 280, 150), 500);
  const selectedMode = document.querySelector('input[name="colorMode"]:checked')?.value || 'single';
  const isGradient   = selectedMode === 'gradient';
  const useEye       = eyeToggle?.checked || false;
  const shape        = getLogoShape();

  container.innerHTML = '';
  if (downloadBtn) {
    downloadBtn.disabled  = true;
    downloadBtn.textContent = 'Generating...';
  }

  let dotsOptions;
  if (isGradient) {
    dotsOptions = {
      type: 'square',
      gradient: {
        type: document.getElementById('gradientType')?.value || 'linear',
        rotation: 0,
        colorStops: [
          { offset: 0, color: document.getElementById('grad1')?.value || '#000000' },
          { offset: 1, color: document.getElementById('grad2')?.value || '#6c63ff' }
        ]
      }
    };
  } else {
    dotsOptions = {
      type: 'square',
      color: fgColor?.value || '#000000'
    };
  }

  /* Load logo */
  let logoImg = null;
  if (logoInput?.files?.[0]) {
    try {
      logoImg = await loadImage(URL.createObjectURL(logoInput.files[0]));
    } catch {
      TornadoToast.show('⚠ Logo image failed to load — generating without logo', 3000);
    }
  }

  /* Generate */
  try {
    if (typeof QRCodeStyling === 'undefined') {
      TornadoToast.show('⚠ QR library failed to load', 3000);
      return;
    }

    qr = new QRCodeStyling({
      width:  size,
      height: size,
      data:   text,
      margin: 4,
      qrOptions: { errorCorrectionLevel: logoImg ? 'H' : 'M' },
      dotsOptions,
      backgroundOptions: { color: bgColor?.value || '#ffffff' },
      cornersSquareOptions: useEye ? { color: document.getElementById('eyeOuter')?.value } : {},
      cornersDotOptions:    useEye ? { color: document.getElementById('eyeInner')?.value } : {}
    });

    qr.append(container);
  } catch (err) {
    TornadoToast.show('⚠ QR generation failed — check your input', 3000);
    return;
  }

  /* Draw logo overlay */
  if (logoImg) {
    await new Promise(resolve => setTimeout(resolve, 150));
    const canvas = container.querySelector('canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const logoSize = size * 0.2;
      const x = (size - logoSize) / 2;
      const y = (size - logoSize) / 2;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 8, y - 8, logoSize + 16, logoSize + 16);

      ctx.save();
      if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(x + logoSize / 2, y + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
      }
      ctx.drawImage(logoImg, x, y, logoSize, logoSize);
      ctx.restore();
    }
  }

  if (downloadBtn) {
    downloadBtn.disabled    = false;
    downloadBtn.textContent = '⬇ Download PNG';
  }

  TornadoToast.show('✓ QR Code generated!');
}

/* ============================================================
   HELPERS
   ============================================================ */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* ============================================================
   CLEAR
   ============================================================ */
function clearQR() {
  input.value      = '';
  container.innerHTML = '';
  qr = null;
  if (downloadBtn) {
    downloadBtn.disabled    = false;
    downloadBtn.textContent = '⬇ Download PNG';
  }
}

/* ============================================================
   DOWNLOAD
   ============================================================ */
function downloadQR() {
  if (!qr) { TornadoToast.show('⚠ Generate a QR code first'); return; }
  try {
    qr.download({ name: 'tornadotools-qr', extension: 'png' });
    TornadoToast.show('✓ Downloading...');
  } catch {
    TornadoToast.show('⚠ Download failed — try regenerating');
  }
}

/* ============================================================
   EVENTS
   ============================================================ */
generateBtn.addEventListener('click', generateQR);
clearBtn.addEventListener('click', clearQR);
downloadBtn.addEventListener('click', downloadQR);

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generateQR(); }
});