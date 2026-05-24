/* ============================================================
   TORNADOTOOLS — NUMBER-CONVERTER.JS
   Improvements:
     - Better validation messages via toast
     - Handles leading zeros in binary/octal
     - Copy result button on output
     - Shows conversion steps in info box
   ============================================================ */

const input      = document.getElementById('numberInput');
const output     = document.getElementById('resultOutput');
const fromBase   = document.getElementById('fromBase');
const toBase     = document.getElementById('toBase');
const convertBtn = document.getElementById('convertBtn');
const clearBtn   = document.getElementById('clearBtn');
const infoBox    = document.getElementById('conversionInfo');

/* ============================================================
   TEXT ↔ BINARY
   ============================================================ */
function textToBinary(text) {
  return text.split('')
    .map(c => c.charCodeAt(0).toString(2).padStart(8, '0'))
    .join(' ');
}

function binaryToText(binary) {
  return binary.trim().split(/\s+/).map(b => {
    const code = parseInt(b, 2);
    if (isNaN(code) || code < 0 || code > 127) return '?';
    return String.fromCharCode(code);
  }).join('');
}

/* ============================================================
   VALIDATION
   ============================================================ */
function isValidForBase(value, base) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const allowed = chars.slice(0, base);
  return value.toUpperCase().split('').every(c => allowed.includes(c));
}

/* ============================================================
   CONVERSION
   ============================================================ */
function convertNumber() {
  let value    = input.value.trim();
  const rawFrom = fromBase.value;
  const rawTo   = toBase.value;

  if (!value) {
    input.style.borderColor = 'rgba(255,80,80,0.5)';
    setTimeout(() => input.style.borderColor = '', 2000);
    TornadoToast.show('⚠ Please enter a value to convert');
    input.focus();
    return;
  }

  if (rawFrom === rawTo) {
    output.value = value;
    showInfo(`Same base — no conversion needed.`);
    return;
  }

  /* TEXT → BINARY */
  if (rawFrom === 'text') {
    if (rawTo !== '2') {
      TornadoToast.show('⚠ Text can only convert to Binary');
      return;
    }
    output.value = textToBinary(value);
    showInfo(`Converted each character to its 8-bit ASCII binary representation.`);
    return;
  }

  /* BINARY → TEXT */
  if (rawTo === 'text') {
    if (rawFrom !== '2') {
      TornadoToast.show('⚠ Only Binary (base 2) can convert to Text');
      return;
    }
    const result = binaryToText(value);
    output.value = result;
    showInfo(`Parsed each 8-bit binary group as an ASCII character.`);
    return;
  }

  const baseFrom = parseInt(rawFrom);
  const baseTo   = parseInt(rawTo);

  // Validate
  if (!isValidForBase(value.replace(/\s+/g, ''), baseFrom)) {
    input.style.borderColor = 'rgba(255,80,80,0.5)';
    setTimeout(() => input.style.borderColor = '', 2500);
    TornadoToast.show(`⚠ Invalid input for base-${baseFrom}. Check your value.`, 3000);
    return;
  }

  try {
    const clean   = value.replace(/\s+/g, '');
    const decimal = parseInt(clean, baseFrom);

    if (!isFinite(decimal)) {
      TornadoToast.show('⚠ Number too large to convert');
      return;
    }

    const result = decimal.toString(baseTo).toUpperCase();
    output.value = result;

    const baseNames = { 2: 'Binary', 8: 'Octal', 10: 'Decimal', 16: 'Hexadecimal' };
    showInfo(
      `${clean} (${baseNames[baseFrom] || 'Base ' + baseFrom}) → ` +
      `${decimal} (Decimal) → ` +
      `${result} (${baseNames[baseTo] || 'Base ' + baseTo})`
    );
  } catch {
    TornadoToast.show('⚠ Conversion failed. Please check your input.');
  }
}

/* ============================================================
   INFO BOX
   ============================================================ */
function showInfo(text) {
  if (!infoBox) return;
  infoBox.textContent = text;
  infoBox.style.display = 'block';
}

/* ============================================================
   SWAP BASES
   ============================================================ */
const swapBtn = document.getElementById('swapBases');
if (swapBtn) {
  swapBtn.addEventListener('click', () => {
    const temp   = fromBase.value;
    fromBase.value = toBase.value;
    toBase.value   = temp;
    // Also swap input/output if there's a result
    if (output.value) {
      input.value  = output.value;
      output.value = '';
      if (infoBox) infoBox.style.display = 'none';
    }
  });
}

/* ============================================================
   COPY OUTPUT
   ============================================================ */
const copyOutputBtn = document.getElementById('copyOutput');
if (copyOutputBtn) {
  copyOutputBtn.addEventListener('click', async () => {
    if (!output.value) { TornadoToast.show('⚠ Nothing to copy yet'); return; }
    const ok = await copyToClipboard(output.value);
    if (ok) {
      copyOutputBtn.textContent = '✓ Copied';
      copyOutputBtn.classList.add('copied');
      TornadoToast.show('✓ Result copied!');
      setTimeout(() => {
        copyOutputBtn.textContent = 'Copy';
        copyOutputBtn.classList.remove('copied');
      }, 2500);
    }
  });
}

/* ============================================================
   CLEAR
   ============================================================ */
function clearAll() {
  input.value  = '';
  output.value = '';
  if (infoBox) infoBox.style.display = 'none';
  input.focus();
}

/* ============================================================
   EVENTS
   ============================================================ */
convertBtn.addEventListener('click', convertNumber);
clearBtn.addEventListener('click', clearAll);

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') convertNumber();
});