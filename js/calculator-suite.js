/* ============================================================
   TORNADOTOOLS — CALCULATOR-SUITE.JS
   FIXED: All helper functions are self-contained in this file.
   No external dependency on utils.js needed.
   All result sections now correctly show after calculation.
   ============================================================ */

/* ============================================================
   LOCAL HELPERS — self-contained, no utils.js needed
   ============================================================ */
function _show(el) { if (el) el.style.display = 'block'; }
function _hide(el) { if (el) el.style.display = 'none';  }

function _toast(msg, duration) {
  duration = duration || 2500;
  if (window.TornadoToast) { TornadoToast.show(msg, duration); return; }
  var t = document.getElementById('_ft');
  if (!t) {
    t = document.createElement('div');
    t.id = '_ft';
    t.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:rgba(0,245,255,0.12);border:1px solid rgba(0,245,255,0.3);color:#00f5ff;font-family:monospace;font-size:13px;padding:12px 28px;border-radius:100px;z-index:9999;transition:opacity 0.3s;pointer-events:none;';
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(t._tmr);
  t._tmr = setTimeout(function() { t.style.opacity = '0'; }, duration);
}

function _inputError(id, msg) {
  var el = document.getElementById(id);
  if (el) {
    el.style.borderColor = 'rgba(255,80,80,0.6)';
    el.style.boxShadow   = '0 0 0 3px rgba(255,80,80,0.1)';
    el.focus();
    setTimeout(function() { el.style.borderColor = ''; el.style.boxShadow = ''; }, 2500);
  }
  _toast('⚠ ' + msg, 3000);
}

function _formatINR(n) {
  if (isNaN(n)) return '₹0';
  return '₹' + Number(n.toFixed(2)).toLocaleString('en-IN');
}

/* ============================================================
   TAB SYSTEM
   ============================================================ */
var tabs     = document.querySelectorAll('.tab-btn');
var sections = document.querySelectorAll('.calc-section');

tabs.forEach(function(btn) {
  btn.addEventListener('click', function() {
    tabs.forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    var target = btn.dataset.tab;
    sections.forEach(function(sec) {
      sec.classList.toggle('active', sec.id === target);
    });
  });
});

/* ============================================================
   BASIC CALCULATOR — math.js, no eval()
   ============================================================ */
var display = document.getElementById('calcDisplay');
var buttons = document.querySelectorAll('.calc-btn');

function sanitizeExpr(exp) {
  exp = exp.replace(/\xD7/g, '*').replace(/\xF7/g, '/').replace(/\s+/g, '');
  if (!exp) return null;
  var depth = 0;
  for (var i = 0; i < exp.length; i++) {
    if (exp[i] === '(') depth++;
    if (exp[i] === ')') depth--;
    if (depth < 0) return null;
  }
  if (depth !== 0) return null;
  if (/[^0-9+\-*/().%^]/.test(exp)) return null;
  return exp;
}

function evalBasic(exp) {
  try {
    exp = exp.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
    var result = math.evaluate(exp);
    if (!isFinite(result)) return null;
    return +parseFloat(result.toPrecision(12));
  } catch(e) { return null; }
}

function saveHistory(exp, result) {
  var h = [];
  try { h = JSON.parse(localStorage.getItem('calcHistory')) || []; } catch(e) {}
  h.unshift({ exp: exp, result: result });
  if (h.length > 25) h.pop();
  try { localStorage.setItem('calcHistory', JSON.stringify(h)); } catch(e) {}
  renderHistory();
}

function renderHistory() {
  var list = document.getElementById('historyList');
  if (!list) return;
  var h = [];
  try { h = JSON.parse(localStorage.getItem('calcHistory')) || []; } catch(e) {}
  list.innerHTML = '';
  if (!h.length) {
    list.innerHTML = '<div class="history-item" style="color:var(--text-muted);cursor:default;">No history yet</div>';
    return;
  }
  h.forEach(function(item) {
    var div = document.createElement('div');
    div.className = 'history-item';
    div.textContent = item.exp + ' = ' + item.result;
    div.addEventListener('click', function() { display.value = String(item.result); });
    list.appendChild(div);
  });
}

var clearHistBtn = document.getElementById('clearHistory');
if (clearHistBtn) {
  clearHistBtn.addEventListener('click', function() {
    try { localStorage.removeItem('calcHistory'); } catch(e) {}
    renderHistory();
  });
}

buttons.forEach(function(btn) {
  btn.addEventListener('click', function() {
    var val = btn.dataset.value || btn.innerText;
    if (btn.id === 'clearCalc') { display.value = ''; return; }
    if (btn.id === 'backspace') { display.value = display.value.slice(0,-1); return; }
    if (btn.id === 'equalCalc') {
      var raw  = display.value;
      var safe = sanitizeExpr(raw);
      if (!safe) { display.value = 'Invalid'; return; }
      var res = evalBasic(safe);
      if (res === null) { display.value = 'Error'; return; }
      display.value = res;
      saveHistory(raw, res);
      return;
    }
    if (!btn.classList.contains('equal') && !btn.classList.contains('danger')) {
      display.value += val;
    }
  });
});

document.addEventListener('keydown', function(e) {
  var sec = document.getElementById('basic');
  if (!sec || !sec.classList.contains('active')) return;
  if ('0123456789+-*/.()%'.indexOf(e.key) !== -1) { display.value += e.key; e.preventDefault(); }
  else if (e.key === 'Enter')     { var eq = document.getElementById('equalCalc'); if(eq) eq.click(); }
  else if (e.key === 'Backspace') { display.value = display.value.slice(0,-1); }
  else if (e.key === 'Escape')    { display.value = ''; }
});

renderHistory();


/* ============================================================
   SCIENTIFIC CALCULATOR — upgraded
   ============================================================ */
var sciDisplay = document.getElementById('sciDisplay');
var sciButtons = document.querySelectorAll('.sci-btn');
var sciEqual   = document.getElementById('sciEqual');
var sciClear   = document.getElementById('sciClear');
var sciBack    = document.getElementById('sciBack');
var sciModeBtn = document.getElementById('sciMode');
var sciAnsBtn  = document.getElementById('sciAns');
var sciLeftBtn = document.getElementById('sciLeft');
var sciRightBtn = document.getElementById('sciRight');
var sciMemLabel = document.getElementById('sciMemLabel');

var sciState = {
  degMode: true,
  memory: 0,
  ans: 0
};

function sciFormatNumber(n) {
  n = Number(n);
  if (!isFinite(n)) return 'Error';
  if (n === 0) return '0';
  var abs = Math.abs(n);
  if (abs >= 1e12 || abs < 1e-9) {
    return n.toExponential(10).replace(/\.?0+e/, 'e');
  }
  return String(Number(n.toPrecision(12)));
}

function sciUpdateModeLabel() {
  if (sciModeBtn) {
    sciModeBtn.textContent = sciState.degMode ? 'DEG' : 'RAD';
    sciModeBtn.setAttribute('aria-label', 'Angle mode: ' + (sciState.degMode ? 'degrees' : 'radians'));
  }
}

function sciUpdateMemoryLabel() {
  if (sciMemLabel) {
    sciMemLabel.textContent = 'M: ' + sciFormatNumber(sciState.memory);
  }
}

function sciFocusEnd() {
  if (!sciDisplay) return;
  sciDisplay.focus();
  try {
    var len = sciDisplay.value.length;
    sciDisplay.setSelectionRange(len, len);
  } catch (e) {}
}

function sciInsert(text) {
  if (!sciDisplay) return;
  var value = String(text);
  var start = typeof sciDisplay.selectionStart === 'number' ? sciDisplay.selectionStart : sciDisplay.value.length;
  var end   = typeof sciDisplay.selectionEnd === 'number' ? sciDisplay.selectionEnd : start;
  sciDisplay.value = sciDisplay.value.slice(0, start) + value + sciDisplay.value.slice(end);
  var pos = start + value.length;
  sciDisplay.focus();
  try { sciDisplay.setSelectionRange(pos, pos); } catch (e) {}
}

function sciBackspace() {
  if (!sciDisplay) return;
  var start = typeof sciDisplay.selectionStart === 'number' ? sciDisplay.selectionStart : sciDisplay.value.length;
  var end   = typeof sciDisplay.selectionEnd === 'number' ? sciDisplay.selectionEnd : start;

  if (start !== end) {
    sciDisplay.value = sciDisplay.value.slice(0, start) + sciDisplay.value.slice(end);
    try { sciDisplay.setSelectionRange(start, start); } catch (e) {}
  } else if (start > 0) {
    sciDisplay.value = sciDisplay.value.slice(0, start - 1) + sciDisplay.value.slice(end);
    try { sciDisplay.setSelectionRange(start - 1, start - 1); } catch (e) {}
  }
  sciDisplay.focus();
}

function sciMoveCursor(delta) {
  if (!sciDisplay) return;
  var start = typeof sciDisplay.selectionStart === 'number' ? sciDisplay.selectionStart : sciDisplay.value.length;
  var next = Math.max(0, Math.min(sciDisplay.value.length, start + delta));
  sciDisplay.focus();
  try { sciDisplay.setSelectionRange(next, next); } catch (e) {}
}

function sciToggleMode() {
  sciState.degMode = !sciState.degMode;
  sciUpdateModeLabel();
  _toast('Angle mode: ' + (sciState.degMode ? 'DEG' : 'RAD'));
}

function sciNormalizeExpression(exp) {
  exp = String(exp || '').trim();
  if (!exp) return null;

  exp = exp
    .replace(/\s+/g, '')
    .replace(/[×⋅·]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/π/g, 'pi')
    .replace(/sin⁻¹\(/g, 'asin(')
    .replace(/cos⁻¹\(/g, 'acos(')
    .replace(/tan⁻¹\(/g, 'atan(')
    .replace(/√\(/g, 'sqrt(')
    .replace(/∛\(/g, 'cbrt(')
    .replace(/10ˣ/g, 'pow10(')
    .replace(/eˣ/g, 'exp(')
    .replace(/(\d+(?:\.\d+)?)E([+\-]?\d+)/g, '($1*10^($2))')
    .replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');

  return exp;
}

function sciFactorial(n) {
  n = Number(n);
  if (!isFinite(n) || n < 0 || Math.floor(n) !== n) return NaN;
  var out = 1;
  for (var i = 2; i <= n; i++) {
    out *= i;
    if (!isFinite(out)) return out;
  }
  return out;
}

function sciNcr(n, r) {
  n = Number(n);
  r = Number(r);
  if (!isFinite(n) || !isFinite(r) || n < 0 || r < 0 || Math.floor(n) !== n || Math.floor(r) !== r || r > n) return NaN;
  r = Math.min(r, n - r);
  var out = 1;
  for (var i = 1; i <= r; i++) {
    out = out * (n - r + i) / i;
  }
  return out;
}

function sciNpr(n, r) {
  n = Number(n);
  r = Number(r);
  if (!isFinite(n) || !isFinite(r) || n < 0 || r < 0 || Math.floor(n) !== n || Math.floor(r) !== r || r > n) return NaN;
  var out = 1;
  for (var i = 0; i < r; i++) {
    out *= (n - i);
    if (!isFinite(out)) return out;
  }
  return out;
}

function sciCreateScope() {
  var pi = Math.PI;
  function degToRad(x) { return x * pi / 180; }
  function radToDeg(x) { return x * 180 / pi; }
  var log10 = Math.log10 ? function(x) { return Math.log10(x); } : function(x) { return Math.log(x) / Math.LN10; };
  var log2 = Math.log2 ? function(x) { return Math.log2(x); } : function(x) { return Math.log(x) / Math.LN2; };
  var cbrt = Math.cbrt ? function(x) { return Math.cbrt(x); } : function(x) { return Math.pow(x, 1 / 3); };
  var sinh = Math.sinh ? function(x) { return Math.sinh(x); } : function(x) { return (Math.exp(x) - Math.exp(-x)) / 2; };
  var cosh = Math.cosh ? function(x) { return Math.cosh(x); } : function(x) { return (Math.exp(x) + Math.exp(-x)) / 2; };
  var tanh = Math.tanh ? function(x) { return Math.tanh(x); } : function(x) { return sinh(x) / cosh(x); };

  return {
    pi: pi,
    e: Math.E,
    Ans: sciState.ans,
    ans: sciState.ans,

    sin: function(x) { return sciState.degMode ? Math.sin(degToRad(x)) : Math.sin(x); },
    cos: function(x) { return sciState.degMode ? Math.cos(degToRad(x)) : Math.cos(x); },
    tan: function(x) { return sciState.degMode ? Math.tan(degToRad(x)) : Math.tan(x); },

    asin: function(x) { return sciState.degMode ? radToDeg(Math.asin(x)) : Math.asin(x); },
    acos: function(x) { return sciState.degMode ? radToDeg(Math.acos(x)) : Math.acos(x); },
    atan: function(x) { return sciState.degMode ? radToDeg(Math.atan(x)) : Math.atan(x); },

    sinh: sinh,
    cosh: cosh,
    tanh: tanh,

    log: log10,
    log10: log10,
    log2: log2,
    ln: function(x) { return Math.log(x); },

    sqrt: function(x) { return Math.sqrt(x); },
    cbrt: cbrt,
    pow10: function(x) { return Math.pow(10, x); },
    exp: function(x) { return Math.exp(x); },
    abs: function(x) { return Math.abs(x); },
    floor: function(x) { return Math.floor(x); },
    ceil: function(x) { return Math.ceil(x); },
    round: function(x) { return Math.round(x); },
    mod: function(a, b) { return ((a % b) + b) % b; },
    yroot: function(x, y) { x = Number(x); y = Number(y); if (!isFinite(x) || !isFinite(y) || y === 0) return NaN; return Math.pow(x, 1 / y); },
    nCr: sciNcr,
    nPr: sciNpr,
    fact: sciFactorial,
    factorial: sciFactorial,
    random: Math.random
  };
}

function sciEvaluateRaw(raw) {
  var exp = sciNormalizeExpression(raw);
  if (!exp) return { ok: false, message: 'Invalid expression' };

  try {
    var result = math.evaluate(exp, sciCreateScope());

    if (result && typeof result.toNumber === 'function') {
      result = result.toNumber();
    }

    if (typeof result !== 'number' || !isFinite(result)) {
      return { ok: false, message: 'Error' };
    }

    return { ok: true, value: result, text: sciFormatNumber(result) };
  } catch (err) {
    return { ok: false, message: 'Error' };
  }
}

function sciUseResult(raw, resultText) {
  sciState.ans = Number(resultText);
  if (!isFinite(sciState.ans)) sciState.ans = 0;
  if (sciDisplay) sciDisplay.value = resultText;
  saveHistory(raw, resultText);
}

function sciGetCurrentValue() {
  if (!sciDisplay) return null;
  var evaluated = sciEvaluateRaw(sciDisplay.value);
  return evaluated.ok ? evaluated.value : null;
}

function sciHandleAction(action, btn) {
  if (!action) return;

  if (action === 'insert') {
    var value = btn && btn.dataset ? btn.dataset.value : '';
    if (value === 'E') value = 'E';
    if (value === 'RND' || value === 'random()') value = 'random()';
    sciInsert(value);
    return;
  }

  if (action === 'clear') {
    if (sciDisplay) sciDisplay.value = '';
    sciFocusEnd();
    return;
  }

  if (action === 'backspace') {
    sciBackspace();
    return;
  }

  if (action === 'evaluate') {
    if (!sciDisplay) return;
    var raw = sciDisplay.value;
    var evaluated = sciEvaluateRaw(raw);
    if (!evaluated.ok) {
      sciDisplay.value = evaluated.message || 'Error';
      return;
    }
    sciUseResult(raw, evaluated.text);
    _toast('✓ Calculated');
    return;
  }

  if (action === 'cursor-left') {
    sciMoveCursor(-1);
    return;
  }

  if (action === 'cursor-right') {
    sciMoveCursor(1);
    return;
  }

  if (action === 'ans') {
    sciInsert(sciFormatNumber(sciState.ans));
    return;
  }

  if (action === 'memory-clear') {
    sciState.memory = 0;
    sciUpdateMemoryLabel();
    _toast('Memory cleared');
    return;
  }

  if (action === 'memory-recall') {
    sciInsert(sciFormatNumber(sciState.memory));
    return;
  }

  if (action === 'memory-store') {
    var storeVal = sciGetCurrentValue();
    if (storeVal === null) {
      _toast('Enter a valid expression first');
      return;
    }
    sciState.memory = storeVal;
    sciUpdateMemoryLabel();
    _toast('Memory stored');
    return;
  }

  if (action === 'memory-plus' || action === 'memory-minus') {
    var memVal = sciGetCurrentValue();
    if (memVal === null) {
      _toast('Enter a valid expression first');
      return;
    }
    sciState.memory += (action === 'memory-plus' ? memVal : -memVal);
    sciUpdateMemoryLabel();
    _toast(action === 'memory-plus' ? 'Memory added' : 'Memory subtracted');
    return;
  }
}

if (sciModeBtn) {
  sciModeBtn.addEventListener('click', sciToggleMode);
}

if (sciAnsBtn) {
  sciAnsBtn.addEventListener('click', function() {
    sciInsert(sciFormatNumber(sciState.ans));
  });
}

if (sciClear) {
  sciClear.addEventListener('click', function() {
    sciHandleAction('clear');
  });
}

if (sciBack) {
  sciBack.addEventListener('click', function() {
    sciHandleAction('backspace');
  });
}

if (sciLeftBtn) {
  sciLeftBtn.addEventListener('click', function() {
    sciHandleAction('cursor-left');
  });
}

if (sciRightBtn) {
  sciRightBtn.addEventListener('click', function() {
    sciHandleAction('cursor-right');
  });
}

sciButtons.forEach(function(btn) {
  btn.addEventListener('click', function() {
    var action = btn.dataset.action || '';
    if (action) {
      sciHandleAction(action, btn);
      return;
    }

    var value = btn.dataset.value || btn.innerText.trim();
    sciInsert(value);
  });
});

if (sciDisplay) {
  sciDisplay.addEventListener('keydown', function(e) {
    var key = e.key;

    if (key === 'Enter') {
      if (sciEqual) sciEqual.click();
      e.preventDefault();
      return;
    }

    if (key === 'Escape') {
      sciDisplay.value = '';
      e.preventDefault();
      return;
    }

    if (key === 'Backspace') {
      sciBackspace();
      e.preventDefault();
      return;
    }

    if (key === 'ArrowLeft') {
      sciMoveCursor(-1);
      e.preventDefault();
      return;
    }

    if (key === 'ArrowRight') {
      sciMoveCursor(1);
      e.preventDefault();
      return;
    }
  });
}

document.addEventListener('keydown', function(e) {
  var sec = document.getElementById('scientific');
  if (!sec || !sec.classList.contains('active')) return;

  var key = e.key;
  var allowed = '0123456789+-*/.()%^!,';
  if (allowed.indexOf(key) !== -1) {
    sciInsert(key);
    e.preventDefault();
    return;
  }

  if (key === 'Enter') {
    if (sciEqual) sciEqual.click();
    e.preventDefault();
    return;
  }

  if (key === 'Backspace') {
    sciBackspace();
    e.preventDefault();
    return;
  }

  if (key === 'Escape') {
    if (sciDisplay) sciDisplay.value = '';
    e.preventDefault();
    return;
  }

  if (key === 'ArrowLeft') {
    sciMoveCursor(-1);
    e.preventDefault();
    return;
  }

  if (key === 'ArrowRight') {
    sciMoveCursor(1);
    e.preventDefault();
    return;
  }
});

sciUpdateModeLabel();
sciUpdateMemoryLabel();

/* ============================================================
   EMI CALCULATOR
   BUG FIX: _show(emiResult) makes result visible
   ============================================================ */
var calcEMIBtn  = document.getElementById('calcEMI');
var clearEMIBtn = document.getElementById('clearEMI');

if (calcEMIBtn) {
  calcEMIBtn.addEventListener('click', function() {
    var P    = parseFloat(document.getElementById('emiPrincipal').value);
    var rate = parseFloat(document.getElementById('emiRate').value);
    var n    = parseFloat(document.getElementById('emiMonths').value);

    if (isNaN(P)    || P    <= 0) { _inputError('emiPrincipal', 'Enter a valid loan amount'); return; }
    if (isNaN(rate) || rate <= 0) { _inputError('emiRate',      'Enter a valid interest rate'); return; }
    if (isNaN(n)    || n    <= 0) { _inputError('emiMonths',    'Enter valid tenure in months'); return; }

    var r        = rate / 12 / 100;
    var emi      = P * r * Math.pow(1+r, n) / (Math.pow(1+r, n) - 1);
    var totalPay = emi * n;
    var totalInt = totalPay - P;

    document.getElementById('emiValue').textContent  = _formatINR(emi);
    document.getElementById('emiTotal').innerHTML    = _formatINR(totalPay) + '<span>Total Payment</span>';
    document.getElementById('emiInterest').innerHTML = _formatINR(totalInt) + '<span>Total Interest</span>';

    _show(document.getElementById('emiResult'));   /* ← KEY FIX */
    _toast('✓ EMI calculated!');
  });
}

if (clearEMIBtn) {
  clearEMIBtn.addEventListener('click', function() {
    ['emiPrincipal','emiRate','emiMonths'].forEach(function(id) {
      var el = document.getElementById(id); if(el) el.value = '';
    });
    _hide(document.getElementById('emiResult'));
  });
}

/* ============================================================
   UNIT CONVERTER
   BUG FIX: _show(unitResult) makes result visible
   ============================================================ */
var UNIT_DATA = {
  length: {
    units: ['Meter','Kilometer','Centimeter','Millimeter','Micrometer','Nanometer','Mile','Nautical Mile','Yard','Foot','Inch'],
    base:  { 'Meter':1,'Kilometer':1000,'Centimeter':0.01,'Millimeter':0.001,'Micrometer':0.000001,'Nanometer':1e-9,'Mile':1609.344,'Nautical Mile':1852,'Yard':0.9144,'Foot':0.3048,'Inch':0.0254 }
  },
  weight: {
    units: ['Kilogram','Gram','Milligram','Microgram','Pound','Ounce','Ton'],
    base:  { 'Kilogram':1,'Gram':0.001,'Milligram':0.000001,'Microgram':1e-9,'Pound':0.453592,'Ounce':0.0283495,'Ton':1000 }
  },
  temp: { units: ['Celsius','Fahrenheit','Kelvin'], base: {} },
  area: {
    units: ['Sq Meter','Sq Kilometer','Sq Foot','Sq Inch','Acre','Hectare'],
    base:  { 'Sq Meter':1,'Sq Kilometer':1e6,'Sq Foot':0.092903,'Sq Inch':0.00064516,'Acre':4046.86,'Hectare':10000 }
  },
  volume: {
    units: ['Liter','Milliliter','Cubic Meter','Cubic Centimeter','Gallon','Pint','Cup'],
    base:  { 'Liter':1,'Milliliter':0.001,'Cubic Meter':1000,'Cubic Centimeter':0.001,'Gallon':3.78541,'Pint':0.473176,'Cup':0.24 }
  },
  time: {
    units: ['Second','Minute','Hour','Day','Week','Month','Year'],
    base:  { 'Second':1,'Minute':60,'Hour':3600,'Day':86400,'Week':604800,'Month':2629800,'Year':31557600 }
  },
  data: {
    units: ['Bit','Byte','Kilobyte','Megabyte','Gigabyte','Terabyte'],
    base:  { 'Bit':0.125,'Byte':1,'Kilobyte':1024,'Megabyte':1024*1024,'Gigabyte':1024*1024*1024,'Terabyte':1024*1024*1024*1024 }
  },
  energy: {
    units: ['Joule','Kilojoule','Calorie','Kilocalorie','Watt Hour','Kilowatt Hour'],
    base:  { 'Joule':1,'Kilojoule':1000,'Calorie':4.184,'Kilocalorie':4184,'Watt Hour':3600,'Kilowatt Hour':3600000 }
  },
  pressure: {
    units: ['Pascal','Kilopascal','Bar','Atmosphere','PSI'],
    base:  { 'Pascal':1,'Kilopascal':1000,'Bar':100000,'Atmosphere':101325,'PSI':6894.757 }
  },
  speed: {
    units: ['m/s','km/h','mph','knot','ft/s'],
    base:  { 'm/s':1,'km/h':0.277778,'mph':0.44704,'knot':0.514444,'ft/s':0.3048 }
  }
};

var currentUnitCat = 'length';

function buildUnitSelects(cat) {
  var fSel = document.getElementById('unitFrom');
  var tSel = document.getElementById('unitTo');
  if (!fSel || !tSel) return;
  var units = UNIT_DATA[cat].units;
  fSel.innerHTML = units.map(function(u,i){ return '<option value="'+u+'"'+(i===0?' selected':'')+'>'+u+'</option>'; }).join('');
  tSel.innerHTML = units.map(function(u,i){ return '<option value="'+u+'"'+(i===1?' selected':'')+'>'+u+'</option>'; }).join('');
}

function convertTemp(val, from, to) {
  var c;
  if (from==='Celsius')    c = val;
  if (from==='Fahrenheit') c = (val-32)*5/9;
  if (from==='Kelvin')     c = val-273.15;
  if (to==='Celsius')    return c;
  if (to==='Fahrenheit') return c*9/5+32;
  if (to==='Kelvin')     return c+273.15;
}

function doUnitConvert() {
  var fSel      = document.getElementById('unitFrom');
  var tSel      = document.getElementById('unitTo');
  var valInp    = document.getElementById('unitInput');
  var resultBox = document.getElementById('unitResult');
  var resultVal = document.getElementById('unitValue');
  var caption   = document.getElementById('unitCaption');

  var value = parseFloat(valInp ? valInp.value : '');
  if (isNaN(value)) { _inputError('unitInput', 'Enter a valid number'); return; }

  var from   = fSel.value;
  var to     = tSel.value;
  var result;

  if (currentUnitCat === 'temp') {
    result = convertTemp(value, from, to);
  } else {
    var bm = UNIT_DATA[currentUnitCat].base;
    result = value * bm[from] / bm[to];
  }

  var formatted = +result.toPrecision(8);
  if (resultVal) resultVal.textContent = formatted;
  if (caption)   caption.textContent   = value+' '+from+' = '+formatted+' '+to;

  _show(resultBox);   /* ← KEY FIX */
  _toast('✓ Converted!');
}

document.querySelectorAll('.unit-category-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.unit-category-btn').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    currentUnitCat = btn.dataset.category;
    buildUnitSelects(currentUnitCat);
    _hide(document.getElementById('unitResult'));
    var inp = document.getElementById('unitInput'); if(inp) inp.value = '';
  });
});

var convertUnitBtn = document.getElementById('convertUnit');
var clearUnitBtn   = document.getElementById('clearUnit');
var unitSwapBtn    = document.getElementById('unitSwap');

if (convertUnitBtn) convertUnitBtn.addEventListener('click', doUnitConvert);
if (clearUnitBtn)   clearUnitBtn.addEventListener('click', function() {
  var inp = document.getElementById('unitInput'); if(inp) inp.value = '';
  _hide(document.getElementById('unitResult'));
});
if (unitSwapBtn) unitSwapBtn.addEventListener('click', function() {
  var f=document.getElementById('unitFrom'), t=document.getElementById('unitTo');
  if(f&&t){ var tmp=f.value; f.value=t.value; t.value=tmp; }
});

buildUnitSelects('length');

/* ============================================================
   AGE CALCULATOR
   BUG FIX: _show(ageResult) makes result visible
   ============================================================ */
var calcAgeBtn  = document.getElementById('calcAge');
var clearAgeBtn = document.getElementById('clearAge');

if (calcAgeBtn) {
  calcAgeBtn.addEventListener('click', function() {
    var dobEl = document.getElementById('dob');
    if (!dobEl || !dobEl.value) { _inputError('dob','Select your date of birth'); return; }

    var dob   = new Date(dobEl.value);
    var today = new Date();
    if (dob >= today) { _inputError('dob','Date of birth must be in the past'); return; }

    var years  = today.getFullYear() - dob.getFullYear();
    var months = today.getMonth()    - dob.getMonth();
    var days   = today.getDate()     - dob.getDate();

    if (days < 0) {
      months--;
      days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }
    if (months < 0) { years--; months += 12; }

    var totalDays  = Math.floor((today - dob) / 86400000);
    var totalWeeks = Math.floor(totalDays / 7);
    var nextBday   = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    if (nextBday <= today) nextBday.setFullYear(today.getFullYear()+1);
    var daysToNext = Math.ceil((nextBday - today) / 86400000);

    var eY = document.getElementById('ageYears');
    var eM = document.getElementById('ageMonths');
    var eD = document.getElementById('ageDays');
    if (eY) eY.textContent = years;
    if (eM) eM.textContent = months;
    if (eD) eD.textContent = days;

    var bonus = document.getElementById('ageBonusInfo');
    if (bonus) {
      bonus.innerHTML =
        '<strong style="color:var(--neon-cyan)">More details:</strong><br>'+
        'Total days: <strong>'+totalDays.toLocaleString('en-IN')+'</strong> &nbsp;|&nbsp; '+
        'Total weeks: <strong>'+totalWeeks.toLocaleString('en-IN')+'</strong><br>'+
        'Total months: <strong>'+(years*12+months)+'</strong> &nbsp;|&nbsp; '+
        'Next birthday in: <strong>'+daysToNext+' days</strong>';
      _show(bonus);
    }

    _show(document.getElementById('ageResult'));   /* ← KEY FIX */
    _toast('✓ Age calculated!');
  });
}

if (clearAgeBtn) {
  clearAgeBtn.addEventListener('click', function() {
    var d = document.getElementById('dob'); if(d) d.value = '';
    _hide(document.getElementById('ageResult'));
    _hide(document.getElementById('ageBonusInfo'));
  });
}

/* ============================================================
   TIP CALCULATOR
   BUG FIX: _show(tipResult) makes result visible
   ============================================================ */
var calcTipBtn  = document.getElementById('calcTip');
var clearTipBtn = document.getElementById('clearTip');

if (calcTipBtn) {
  calcTipBtn.addEventListener('click', function() {
    var bill   = parseFloat(document.getElementById('tipBill').value);
    var pct    = parseFloat(document.getElementById('tipPercent').value);
    var people = parseInt(document.getElementById('tipPeople').value) || 1;

    if (isNaN(bill) || bill <= 0)  { _inputError('tipBill',    'Enter a valid bill amount'); return; }
    if (isNaN(pct)  || pct  <  0)  { _inputError('tipPercent', 'Enter a valid tip %');       return; }
    if (people < 1) people = 1;

    var tipAmt = bill * pct / 100;
    var total  = bill + tipAmt;

    document.getElementById('tipAmount').textContent       = _formatINR(tipAmt);
    document.getElementById('tipTotal').textContent        = _formatINR(total);
    document.getElementById('tipPerPerson').textContent    = _formatINR(total   / people);
    document.getElementById('tipTipPerPerson').textContent = _formatINR(tipAmt  / people);

    _show(document.getElementById('tipResult'));   /* ← KEY FIX */
    _toast('✓ Tip calculated!');
  });
}

if (clearTipBtn) {
  clearTipBtn.addEventListener('click', function() {
    ['tipBill','tipPercent','tipPeople'].forEach(function(id){
      var el=document.getElementById(id); if(el) el.value='';
    });
    _hide(document.getElementById('tipResult'));
  });
}
