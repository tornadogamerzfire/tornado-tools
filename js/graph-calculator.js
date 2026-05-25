'use strict';

const DEFAULT_VIEW = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
const MAX_HISTORY = 14;
const MAX_SERIES = 18;
const EPS = 1e-8;

const state = {
  equations: [],
  activeId: null,
  view: { ...DEFAULT_VIEW },
  showGrid: true,
  showAxes: true,
  renderPending: false,
  renderToken: 0,
  isPanning: false,
  panPointer: null,
  panStart: null,
  history: []
};

const el = {};
const byId = (id) => document.getElementById(id);

function cache() {
  [
    'graphPlot','graphOverlay','graphStatus','rootsList','intersectionsList','asymptotesList',
    'zoomOutBtn','zoomInBtn','homeViewBtn','fitViewBtn','fitButtonAlt','toggleGridBtn','toggleAxesBtn',
    'drawerToggle','drawerPanel','modeSelect','nameInput','exprInput','exprXInput','exprYInput',
    'exprField','paramFields','colorInput','tMinInput','tMaxInput','visibleInput','derivativeInput',
    'addEquationBtn','loadExampleBtn','clearAllBtn','xMinInput','xMaxInput','yMinInput','yMaxInput',
    'applyRangeBtn','equationList','historyList','clearHistoryBtn'
  ].forEach((id) => el[id] = byId(id));
}

function clamp(num, min, max) { return Math.min(max, Math.max(min, num)); }

function parseNumber(input, fallback) {
  const txt = String(input ?? '').trim();
  if (!txt) return fallback;
  try {
    const value = math.evaluate(normalizeExpression(txt));
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  } catch {
    const n = Number(txt);
    return Number.isFinite(n) ? n : fallback;
  }
}

function uniqueId() { return 'g' + Math.random().toString(36).slice(2, 10); }

function insertAtCursor(input, text) {
  if (!input) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0, start) + text + input.value.slice(end);
  const caret = start + text.length;
  requestAnimationFrame(() => {
    input.focus();
    input.setSelectionRange(caret, caret);
  });
}

function setStatus(message, tone = '') {
  if (!el.graphStatus) return;
  el.graphStatus.textContent = message;
  el.graphStatus.dataset.tone = tone;
}

function normalizeSuperscripts(text) {
  const map = { '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'-','⁼':'=','⁽':'(','⁾':')' };
  return text.replace(/([A-Za-z0-9π\)])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾]+)/g, (_, base, supers) => {
    const converted = supers.split('').map((ch) => map[ch] || ch).join('');
    return `${base}^${converted}`;
  }).replace(/^[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾]+/, (m) => m.split('').map((ch) => map[ch] || ch).join(''));
}

function replaceBracketGroups(text) {
  return text.replace(/\[/g, '(').replace(/\]/g, ')').replace(/\{/g, '(').replace(/\}/g, ')');
}

function replaceSimpleAbs(text) {
  let result = '';
  let open = false;
  for (const ch of text) {
    if (ch === '|') {
      result += open ? ')' : 'abs(';
      open = !open;
    } else {
      result += ch;
    }
  }
  return result;
}

function replaceImplicitMath(text) {
  return text
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi')
    .replace(/θ/g, 'theta')
    .replace(/τ/g, 'tau')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/√\s*([a-zA-Z0-9_.]+)/g, 'sqrt($1)')
    .replace(/(\d+(?:\.\d+)?)°/g, '($1*pi/180)')
    .replace(/(\))(\s*)(\()/g, '$1*$3')
    .replace(/(\d)(\s*)(\()/g, '$1*$3')
    .replace(/(^|[^A-Za-z0-9_])([xyzt])\s*\(/g, '$1$2*(')
    .replace(/(\))(\s*)(\d|[a-zA-Zπθ])/g, '$1*$3')
    .replace(/(\d)(\s*)([a-zA-Zπθ])/g, '$1*$3');
}

function stripLabel(expr, mode) {
  let out = String(expr || '').trim();
  out = out.replace(/^\s*(y|f\s*\(\s*x\s*\))\s*=\s*/i, '');
  if (mode === 'polar') out = out.replace(/^\s*r\s*=\s*/i, '');
  if (mode === 'parametric') {
    out = out.replace(/^\s*x\s*\(\s*t\s*\)\s*=\s*/i, '');
    out = out.replace(/^\s*y\s*\(\s*t\s*\)\s*=\s*/i, '');
  }
  return out.trim();
}

function formatEquationDisplay(eq) {
  if (!eq) return '';
  if (eq.mode === 'parametric') return `x(t) = ${eq.expr.x} • y(t) = ${eq.expr.y}`;
  if (eq.mode === 'polar') return `r = ${eq.expr}`;
  return `f(x) = ${stripLabel(eq.expr, 'standard')}`;
}

function normalizeExpression(input) {
  let text = String(input ?? '').trim();
  text = text.replace(/[;]+/g, ',');
  text = normalizeSuperscripts(text);
  text = replaceBracketGroups(text);
  text = replaceSimpleAbs(text);
  text = text
    .replace(/\bsin\b/gi, 'sin')
    .replace(/\bcos\b/gi, 'cos')
    .replace(/\btan\b/gi, 'tan')
    .replace(/\blog\b/gi, 'log10')
    .replace(/\bln\b/gi, 'log')
    .replace(/\babs\b/gi, 'abs');
  text = replaceImplicitMath(text);
  return text;
}

function compileExpression(text) {
  return math.compile(normalizeExpression(text));
}

function evaluateCompiled(compiled, scope = {}) {
  try { return compiled.evaluate(scope); } catch { return NaN; }
}

function sampleFunction(compiled, min, max, count = 520) {
  const points = [];
  const step = (max - min) / Math.max(1, count - 1);
  for (let i = 0; i < count; i++) {
    const x = min + step * i;
    const y = evaluateCompiled(compiled, { x, t: x, theta: x, pi: Math.PI });
    if (Number.isFinite(y)) points.push({ x, y }); else points.push(null);
  }
  return points;
}

function sampleParametric(compiledX, compiledY, min, max, count = 520) {
  const points = [];
  const step = (max - min) / Math.max(1, count - 1);
  for (let i = 0; i < count; i++) {
    const t = min + step * i;
    const x = evaluateCompiled(compiledX, { t, theta: t, x: t, y: t, pi: Math.PI });
    const y = evaluateCompiled(compiledY, { t, theta: t, x: t, y: t, pi: Math.PI });
    if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y }); else points.push(null);
  }
  return points;
}

function polarPoints(compiledR, min, max, count = 520) {
  const points = [];
  const step = (max - min) / Math.max(1, count - 1);
  for (let i = 0; i < count; i++) {
    const theta = min + step * i;
    const r = evaluateCompiled(compiledR, { theta, t: theta, x: theta, y: theta, pi: Math.PI });
    const x = Number.isFinite(r) ? r * Math.cos(theta) : NaN;
    const y = Number.isFinite(r) ? r * Math.sin(theta) : NaN;
    if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y }); else points.push(null);
  }
  return points;
}

function dedupeNumbers(values, epsilon = 1e-3) {
  const out = [];
  values.forEach((value) => {
    if (!Number.isFinite(value)) return;
    if (!out.some((v) => Math.abs(v - value) < epsilon)) out.push(value);
  });
  return out;
}

function dedupePoints(points) {
  return points.reduce((acc, item) => {
    if (!Number.isFinite(item.x) || !Number.isFinite(item.y)) return acc;
    if (!acc.some((p) => Math.abs(p.x - item.x) < 0.02 && Math.abs(p.y - item.y) < 0.02 && p.name === item.name)) {
      acc.push({ name: item.name, x: Number(item.x.toFixed(3)), y: Number(item.y.toFixed(3)) });
    }
    return acc;
  }, []);
}

function refineRoot(compiled, left, right, maxIter = 38) {
  let a = left;
  let b = right;
  let fa = evaluateCompiled(compiled, { x: a, t: a, theta: a, pi: Math.PI });
  let fb = evaluateCompiled(compiled, { x: b, t: b, theta: b, pi: Math.PI });
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) return null;
  if (Math.abs(fa) < EPS) return a;
  if (Math.abs(fb) < EPS) return b;
  if (fa * fb > 0) return null;
  for (let i = 0; i < maxIter; i++) {
    const mid = (a + b) / 2;
    const fm = evaluateCompiled(compiled, { x: mid, t: mid, theta: mid, pi: Math.PI });
    if (!Number.isFinite(fm)) return null;
    if (Math.abs(fm) < 1e-9 || Math.abs(b - a) < 1e-6) return mid;
    if (fa * fm <= 0) { b = mid; fb = fm; } else { a = mid; fa = fm; }
  }
  return (a + b) / 2;
}

function findRoots(compiled, min, max) {
  const roots = [];
  const samples = 900;
  const step = (max - min) / samples;
  let prevX = min;
  let prevY = evaluateCompiled(compiled, { x: prevX, t: prevX, theta: prevX, pi: Math.PI });

  for (let i = 1; i <= samples; i++) {
    const x = min + step * i;
    const y = evaluateCompiled(compiled, { x, t: x, theta: x, pi: Math.PI });
    if (Number.isFinite(prevY) && Number.isFinite(y)) {
      if (Math.abs(y) < 1e-6) roots.push(x);
      if (prevY === 0 || y === 0 || prevY * y < 0) {
        const root = refineRoot(compiled, prevX, x);
        if (root != null) roots.push(root);
      }
    }
    prevX = x;
    prevY = y;
  }
  return dedupeNumbers(roots);
}

function findIntersections(compiledA, compiledB, min, max) {
  const points = [];
  const samples = 900;
  const step = (max - min) / samples;
  let prevX = min;
  let prevY = evaluateCompiled(compiledA, { x: prevX, t: prevX, theta: prevX, pi: Math.PI }) - evaluateCompiled(compiledB, { x: prevX, t: prevX, theta: prevX, pi: Math.PI });

  for (let i = 1; i <= samples; i++) {
    const x = min + step * i;
    const y = evaluateCompiled(compiledA, { x, t: x, theta: x, pi: Math.PI }) - evaluateCompiled(compiledB, { x, t: x, theta: x, pi: Math.PI });
    if (Number.isFinite(prevY) && Number.isFinite(y) && (prevY === 0 || y === 0 || prevY * y < 0 || Math.abs(y) < 1e-6)) {
      const root = refineRoot({ evaluate(scope) { return evaluateCompiled(compiledA, scope) - evaluateCompiled(compiledB, scope); } }, prevX, x);
      if (root != null) {
        const yy = evaluateCompiled(compiledA, { x: root, t: root, theta: root, pi: Math.PI });
        points.push({ name: '', x: root, y: yy });
      }
    }
    prevX = x;
    prevY = y;
  }

  return points
    .filter((pt) => Number.isFinite(pt.x) && Number.isFinite(pt.y))
    .map((pt) => ({ x: Number(pt.x.toFixed(3)), y: Number(pt.y.toFixed(3)) }))
    .reduce((acc, pt) => {
      if (!acc.some((p) => Math.abs(p.x - pt.x) < 1e-3 && Math.abs(p.y - pt.y) < 1e-3)) acc.push(pt);
      return acc;
    }, []);
}

function detectVerticalAsymptotes(compiled, min, max) {
  const xs = [];
  const samples = 1200;
  const step = (max - min) / samples;
  let prevX = min;
  let prevY = evaluateCompiled(compiled, { x: prevX, t: prevX, theta: prevX, pi: Math.PI });
  for (let i = 1; i <= samples; i++) {
    const x = min + step * i;
    const y = evaluateCompiled(compiled, { x, t: x, theta: x, pi: Math.PI });
    const prevFinite = Number.isFinite(prevY);
    const currFinite = Number.isFinite(y);
    if ((!prevFinite && currFinite) || (prevFinite && !currFinite)) {
      xs.push((prevX + x) / 2);
    } else if (prevFinite && currFinite) {
      const hugeJump = Math.abs(y - prevY) > 250;
      const bothHuge = Math.abs(y) > 100 && Math.abs(prevY) > 100;
      const opposite = prevY * y < 0;
      if (hugeJump || (bothHuge && opposite)) xs.push((prevX + x) / 2);
    }
    prevX = x;
    prevY = y;
  }
  return dedupeNumbers(xs, 0.08);
}

function detectHorizontalAsymptotes(compiled, min, max) {
  const lines = [];
  const leftA = evaluateCompiled(compiled, { x: min, t: min, theta: min, pi: Math.PI });
  const leftB = evaluateCompiled(compiled, { x: min + 0.8, t: min + 0.8, theta: min + 0.8, pi: Math.PI });
  const rightA = evaluateCompiled(compiled, { x: max, t: max, theta: max, pi: Math.PI });
  const rightB = evaluateCompiled(compiled, { x: max - 0.8, t: max - 0.8, theta: max - 0.8, pi: Math.PI });
  if (Number.isFinite(leftA) && Number.isFinite(leftB) && Math.abs(leftA - leftB) < 0.35) lines.push((leftA + leftB) / 2);
  if (Number.isFinite(rightA) && Number.isFinite(rightB) && Math.abs(rightA - rightB) < 0.35) lines.push((rightA + rightB) / 2);
  return dedupeNumbers(lines, 0.08);
}

function formatPoint(pt) { return `(${pt.x.toFixed(3)}, ${pt.y.toFixed(3)})`; }

function loadHistory() {
  try {
    const raw = localStorage.getItem('graphCalculatorHistory');
    state.history = raw ? JSON.parse(raw) : [];
  } catch {
    state.history = [];
  }
  renderHistory();
}

function renderHistory() {
  if (!el.historyList) return;
  el.historyList.innerHTML = '';
  if (!state.history.length) {
    el.historyList.innerHTML = '<span class="gc-chip gc-chip-muted">No history yet</span>';
    return;
  }
  state.history.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gc-history-item';
    btn.textContent = item;
    btn.addEventListener('click', () => {
      if (el.exprInput) el.exprInput.value = item;
      if (el.exprInput) el.exprInput.focus();
    });
    el.historyList.appendChild(btn);
  });
}

function rememberHistory(text) {
  const list = [text, ...state.history.filter((x) => x !== text)].slice(0, MAX_HISTORY);
  state.history = list;
  try { localStorage.setItem('graphCalculatorHistory', JSON.stringify(list)); } catch {}
  renderHistory();
}

function currentMode() { return el.modeSelect?.value || 'standard'; }

function toggleModeFields() {
  const mode = currentMode();
  const isParametric = mode === 'parametric';
  el.exprField?.classList.toggle('gc-hidden', isParametric);
  el.paramFields?.classList.toggle('gc-hidden', !isParametric);
  if (el.derivativeInput) el.derivativeInput.disabled = isParametric || mode === 'polar';
}

function buildEquationFromEditor() {
  const mode = currentMode();
  const name = (el.nameInput?.value || '').trim() || ({ standard: 'Function', polar: 'Polar curve', parametric: 'Parametric curve' }[mode]);
  const color = el.colorInput?.value || '#00f5ff';
  const visible = el.visibleInput?.checked ?? true;
  const derivative = el.derivativeInput?.checked ?? false;
  const tMin = parseNumber(el.tMinInput?.value, 0);
  const tMax = parseNumber(el.tMaxInput?.value, 2 * Math.PI);
  if (mode === 'parametric') {
    const xExpr = stripLabel(el.exprXInput?.value || '', 'parametric');
    const yExpr = stripLabel(el.exprYInput?.value || '', 'parametric');
    if (!xExpr || !yExpr) throw new Error('Enter both x(t) and y(t).');
    return { id: uniqueId(), name, mode, color, visible, derivative: false, expr: { x: xExpr, y: yExpr }, tMin, tMax };
  }
  const rawExpr = String(el.exprInput?.value || '').trim();
  const expr = stripLabel(rawExpr, mode);
  if (!expr) throw new Error('Enter an equation first.');
  if (mode === 'standard' && /=/.test(rawExpr) && !/^\s*(y|f\s*\(\s*x\s*\))\s*=\s*/i.test(rawExpr)) {
    throw new Error('Use a single function expression for standard graphs. Relations like x² + y² = 1 are not supported here.');
  }
  if (mode === 'polar' && /=/.test(rawExpr) && !/^\s*r\s*=\s*/i.test(rawExpr)) {
    throw new Error('Use r = ... for polar graphs. Extra equals signs are not supported here.');
  }
  return { id: uniqueId(), name, mode, color, visible, derivative, expr, tMin, tMax };
}

function setEditorFromEquation(eq) {
  if (!eq) return;
  if (el.modeSelect) el.modeSelect.value = eq.mode;
  toggleModeFields();
  if (el.nameInput) el.nameInput.value = eq.name || '';
  if (el.colorInput) el.colorInput.value = eq.color || '#00f5ff';
  if (el.visibleInput) el.visibleInput.checked = !!eq.visible;
  if (el.derivativeInput) el.derivativeInput.checked = !!eq.derivative;
  if (el.tMinInput) el.tMinInput.value = eq.tMin != null ? String(eq.tMin) : '0';
  if (el.tMaxInput) el.tMaxInput.value = eq.tMax != null ? String(eq.tMax) : '2*pi';
  if (eq.mode === 'parametric') {
    if (el.exprXInput) el.exprXInput.value = eq.expr.x;
    if (el.exprYInput) el.exprYInput.value = eq.expr.y;
  } else if (el.exprInput) {
    el.exprInput.value = eq.expr;
  }
}

function addEquation(fromExample = false) {
  try {
    const eq = buildEquationFromEditor();
    state.equations.unshift(eq);
    if (state.equations.length > MAX_SERIES) state.equations.length = MAX_SERIES;
    state.activeId = eq.id;
    rememberHistory(eq.mode === 'parametric' ? `${eq.expr.x}, ${eq.expr.y}` : eq.expr);
    renderEquationList();
    scheduleRender();
    setStatus(fromExample ? 'Example loaded.' : 'Equation added.', 'ok');
  } catch (err) {
    setStatus(err.message || 'Could not add equation.', 'error');
  }
}

function removeEquation(id) {
  state.equations = state.equations.filter((eq) => eq.id !== id);
  if (state.activeId === id) state.activeId = state.equations[0]?.id || null;
  renderEquationList();
  scheduleRender();
}

function duplicateEquation(id) {
  const eq = state.equations.find((item) => item.id === id);
  if (!eq) return;
  const copy = JSON.parse(JSON.stringify(eq));
  copy.id = uniqueId();
  copy.name = `${eq.name} copy`;
  state.equations.unshift(copy);
  state.activeId = copy.id;
  renderEquationList();
  scheduleRender();
}

function toggleEquationVisibility(id) {
  const eq = state.equations.find((item) => item.id === id);
  if (!eq) return;
  eq.visible = !eq.visible;
  renderEquationList();
  scheduleRender();
}

function updateEquationColor(id, color) {
  const eq = state.equations.find((item) => item.id === id);
  if (!eq) return;
  eq.color = color;
  renderEquationList();
  scheduleRender();
}

function renderEquationList() {
  if (!el.equationList) return;
  el.equationList.innerHTML = '';
  if (!state.equations.length) {
    el.equationList.innerHTML = '<div class="gc-empty-state">No graphs added yet.</div>';
    return;
  }
  state.equations.forEach((eq) => {
    const card = document.createElement('article');
    card.className = `gc-equation-card${state.activeId === eq.id ? ' active' : ''}`;
    const top = document.createElement('div');
    top.className = 'gc-equation-top';
    const meta = document.createElement('div');
    meta.className = 'gc-equation-meta';
    const title = document.createElement('div');
    title.className = 'gc-equation-name';
    title.textContent = eq.name;
    const exp = document.createElement('div');
    exp.className = 'gc-equation-exp';
    exp.textContent = formatEquationDisplay(eq);
    const tags = document.createElement('div');
    tags.className = 'gc-tag-row';
    const modeTag = document.createElement('span');
    modeTag.className = 'gc-tag';
    modeTag.textContent = eq.mode;
    tags.appendChild(modeTag);
    if (eq.derivative && eq.mode === 'standard') {
      const derivativeTag = document.createElement('span');
      derivativeTag.className = 'gc-tag gc-tag-muted';
      derivativeTag.textContent = 'derivative';
      tags.appendChild(derivativeTag);
    }
    const visTag = document.createElement('span');
    visTag.className = 'gc-tag gc-tag-muted';
    visTag.textContent = eq.visible ? 'visible' : 'hidden';
    tags.appendChild(visTag);
    meta.append(title, exp, tags);
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'gc-mini';
    swatch.title = 'Change color';
    swatch.innerHTML = `<span class="gc-swatch" style="background:${eq.color}"></span> Color`;
    swatch.addEventListener('click', () => {
      const next = prompt('Enter a color value (hex or CSS color)', eq.color);
      if (next) updateEquationColor(eq.id, next.trim());
    });
    top.append(meta, swatch);
    const actions = document.createElement('div');
    actions.className = 'gc-equation-actions';
    const btns = [
      ['Hide', () => toggleEquationVisibility(eq.id)],
      ['Edit', () => { state.activeId = eq.id; setEditorFromEquation(eq); el.drawerPanel?.classList.add('open'); renderEquationList(); }],
      ['Copy expr', async () => {
        const txt = eq.mode === 'parametric' ? `x = ${eq.expr.x}\ny = ${eq.expr.y}` : stripLabel(eq.expr, eq.mode);
        try { await navigator.clipboard.writeText(txt); setStatus('Copied to clipboard.', 'ok'); } catch { setStatus('Copy failed.', 'error'); }
      }],
      ['Duplicate', () => duplicateEquation(eq.id)],
      ['Delete', () => removeEquation(eq.id)]
    ];
    btns.forEach(([label, fn], index) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `gc-mini${label === 'Delete' ? ' gc-mini-danger' : ''}`;
      b.textContent = label;
      b.addEventListener('click', fn);
      actions.appendChild(b);
    });
    card.append(top, actions);
    card.addEventListener('click', (ev) => { if (ev.target.closest('button')) return; state.activeId = eq.id; renderEquationList(); });
    el.equationList.appendChild(card);
  });
}

function setVisibleCount() { return state.equations.filter((eq) => eq.visible).length; }

function buildPlotData() {
  const data = [];
  const roots = [];
  const intersections = [];
  const asymX = [];
  const asymY = [];
  const xMin = state.view.xMin;
  const xMax = state.view.xMax;

  state.equations.forEach((eq) => {
    if (!eq.visible) return;
    if (eq.mode === 'standard') {
      const expr = normalizeExpression(eq.expr);
      let compiled;
      try { compiled = math.compile(expr); } catch { return; }
      data.push({ fn: expr, graphType: 'polyline', color: eq.color, fnType: 'linear', sampler: 'builtIn', attr: { 'stroke-width': 2.5 } });
      findRoots(compiled, xMin, xMax).forEach((x) => roots.push({ name: eq.name, x, y: 0 }));
      detectVerticalAsymptotes(compiled, xMin, xMax).forEach((x) => asymX.push({ name: eq.name, value: x }));
      detectHorizontalAsymptotes(compiled, xMin, xMax).forEach((y) => asymY.push({ name: eq.name, value: y }));
      if (eq.derivative) {
        try {
          const deriv = math.derivative(expr, 'x').toString();
          data.push({ fn: normalizeExpression(deriv), graphType: 'polyline', color: '#ffd166', fnType: 'linear', sampler: 'builtIn', attr: { 'stroke-width': 1.8, 'stroke-dasharray': '6 5' } });
        } catch {}
      }
      return;
    }
    if (eq.mode === 'polar') {
      let compiled;
      try { compiled = math.compile(normalizeExpression(stripLabel(eq.expr, 'polar'))); } catch { return; }
      const pts = polarPoints(compiled, eq.tMin, eq.tMax).filter(Boolean).map((pt) => [pt.x, pt.y]);
      data.push({ points: pts, fnType: 'points', graphType: 'polyline', color: eq.color, attr: { 'stroke-width': 2.5 } });
      return;
    }
    if (eq.mode === 'parametric') {
      let compiledX; let compiledY;
      try { compiledX = math.compile(normalizeExpression(eq.expr.x)); compiledY = math.compile(normalizeExpression(eq.expr.y)); } catch { return; }
      const pts = sampleParametric(compiledX, compiledY, eq.tMin, eq.tMax).filter(Boolean).map((pt) => [pt.x, pt.y]);
      data.push({ points: pts, fnType: 'points', graphType: 'polyline', color: eq.color, attr: { 'stroke-width': 2.5 } });
    }
  });

  for (let i = 0; i < state.equations.length; i++) {
    const a = state.equations[i];
    if (!a.visible || a.mode !== 'standard') continue;
    const compA = math.compile(normalizeExpression(a.expr));
    for (let j = i + 1; j < state.equations.length; j++) {
      const b = state.equations[j];
      if (!b.visible || b.mode !== 'standard') continue;
      const compB = math.compile(normalizeExpression(b.expr));
      findIntersections(compA, compB, xMin, xMax).forEach((pt) => intersections.push({ name: `${a.name} ∩ ${b.name}`, x: pt.x, y: pt.y }));
    }
  }

  return {
    data,
    roots: dedupePoints(roots),
    intersections: dedupePoints(intersections),
    asymX: dedupeNumbers(asymX.map((x) => x.value), 0.08).map((value) => ({ value })),
    asymY: dedupeNumbers(asymY.map((y) => y.value), 0.08).map((value) => ({ value }))
  };
}

function renderLists(analysis) {
  const rootItems = analysis.roots;
  const interItems = analysis.intersections;
  const xAs = analysis.asymX;
  const yAs = analysis.asymY;

  const fill = (container, emptyText, items, formatter) => {
    if (!container) return;
    container.innerHTML = '';
    if (!items.length) {
      container.innerHTML = `<span class="gc-chip gc-chip-muted">${emptyText}</span>`;
      return;
    }
    items.forEach((item) => {
      const chip = document.createElement('span');
      chip.className = 'gc-chip';
      chip.textContent = formatter(item);
      container.appendChild(chip);
    });
  };

  fill(el.rootsList, 'No roots yet', rootItems, (item) => `${item.name}: ${item.x.toFixed(3)}`);
  fill(el.intersectionsList, 'No intersections yet', interItems, (item) => `${item.name}: ${formatPoint(item)}`);
  fill(el.asymptotesList, 'No asymptotes yet', [...xAs.map((a) => `x=${a.value.toFixed(3)}`), ...yAs.map((a) => `y=${a.value.toFixed(3)}`)], (item) => item);
}

function scheduleRender() {
  if (state.renderPending) return;
  state.renderPending = true;
  state.renderToken += 1;
  const token = state.renderToken;
  requestAnimationFrame(() => {
    state.renderPending = false;
    if (token !== state.renderToken) return;
    renderGraph();
  });
}

function renderGraph() {
  if (!el.graphPlot || typeof functionPlot !== 'function') {
    setStatus('Graph engine not available.', 'error');
    return;
  }
  const analysis = buildPlotData();
  renderLists(analysis);
  const width = el.graphPlot.clientWidth || 300;
  const height = el.graphPlot.clientHeight || 300;
  const annotations = [
    ...(state.showAxes ? [{ x: 0 }, { y: 0 }] : []),
    ...analysis.asymX.map((item) => ({ x: item.value })),
    ...analysis.asymY.map((item) => ({ y: item.value }))
  ];
  try {
    functionPlot({
      target: '#graphPlot',
      width,
      height,
      data: analysis.data,
      xAxis: { domain: [state.view.xMin, state.view.xMax], label: 'x' },
      yAxis: { domain: [state.view.yMin, state.view.yMax], label: 'y' },
      grid: state.showGrid,
      annotations,
      disableZoom: true,
      tip: { xLine: state.showAxes, yLine: state.showAxes },
      logger: console
    });
    setStatus(state.equations.length ? `Graph updated. ${setVisibleCount()} visible equation(s).` : 'Add an equation to start plotting.', 'ok');
  } catch (err) {
    console.error(err);
    setStatus('Could not render graph. Check the equation syntax.', 'error');
  }
}

function syncRangeInputs() {
  if (el.xMinInput) el.xMinInput.value = String(state.view.xMin);
  if (el.xMaxInput) el.xMaxInput.value = String(state.view.xMax);
  if (el.yMinInput) el.yMinInput.value = String(state.view.yMin);
  if (el.yMaxInput) el.yMaxInput.value = String(state.view.yMax);
}

function setView(view) {
  state.view = { xMin: view.xMin, xMax: view.xMax, yMin: view.yMin, yMax: view.yMax };
  syncRangeInputs();
  scheduleRender();
}

function applyViewFromInputs() {
  const xMin = parseNumber(el.xMinInput?.value, state.view.xMin);
  const xMax = parseNumber(el.xMaxInput?.value, state.view.xMax);
  const yMin = parseNumber(el.yMinInput?.value, state.view.yMin);
  const yMax = parseNumber(el.yMaxInput?.value, state.view.yMax);
  if (!(xMin < xMax) || !(yMin < yMax)) {
    setStatus('Range values are invalid.', 'error');
    return;
  }
  setView({ xMin, xMax, yMin, yMax });
}

function zoomAt(clientX, clientY, factor) {
  const rect = el.graphPlot.getBoundingClientRect();
  const x = state.view.xMin + ((clientX - rect.left) / rect.width) * (state.view.xMax - state.view.xMin);
  const y = state.view.yMax - ((clientY - rect.top) / rect.height) * (state.view.yMax - state.view.yMin);
  setView({
    xMin: x + (state.view.xMin - x) * factor,
    xMax: x + (state.view.xMax - x) * factor,
    yMin: y + (state.view.yMin - y) * factor,
    yMax: y + (state.view.yMax - y) * factor
  });
}

function panTo(dx, dy) {
  const rect = el.graphPlot.getBoundingClientRect();
  const xSpan = state.panStart.view.xMax - state.panStart.view.xMin;
  const ySpan = state.panStart.view.yMax - state.panStart.view.yMin;
  setView({
    xMin: state.panStart.view.xMin - dx / rect.width * xSpan,
    xMax: state.panStart.view.xMax - dx / rect.width * xSpan,
    yMin: state.panStart.view.yMin + dy / rect.height * ySpan,
    yMax: state.panStart.view.yMax + dy / rect.height * ySpan
  });
}

function resetHome() { setView({ ...DEFAULT_VIEW }); }

function fitGraphToScreen() {
  if (!state.equations.length) { resetHome(); return; }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  state.equations.forEach((eq) => {
    if (!eq.visible) return;
    try {
      if (eq.mode === 'standard') {
        const compiled = compileExpression(eq.expr);
        sampleFunction(compiled, state.view.xMin, state.view.xMax, 800).filter(Boolean).forEach((pt) => {
          minX = Math.min(minX, pt.x); maxX = Math.max(maxX, pt.x); minY = Math.min(minY, pt.y); maxY = Math.max(maxY, pt.y);
        });
      } else if (eq.mode === 'polar') {
        const compiled = math.compile(normalizeExpression(stripLabel(eq.expr, 'polar')));
        polarPoints(compiled, eq.tMin, eq.tMax, 800).filter(Boolean).forEach((pt) => {
          minX = Math.min(minX, pt.x); maxX = Math.max(maxX, pt.x); minY = Math.min(minY, pt.y); maxY = Math.max(maxY, pt.y);
        });
      } else if (eq.mode === 'parametric') {
        const compiledX = math.compile(normalizeExpression(eq.expr.x));
        const compiledY = math.compile(normalizeExpression(eq.expr.y));
        sampleParametric(compiledX, compiledY, eq.tMin, eq.tMax, 800).filter(Boolean).forEach((pt) => {
          minX = Math.min(minX, pt.x); maxX = Math.max(maxX, pt.x); minY = Math.min(minY, pt.y); maxY = Math.max(maxY, pt.y);
        });
      }
    } catch {}
  });
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) { resetHome(); return; }
  const padX = Math.max(1, (maxX - minX) * 0.12);
  const padY = Math.max(1, (maxY - minY) * 0.12);
  setView({ xMin: minX - padX, xMax: maxX + padX, yMin: minY - padY, yMax: maxY + padY });
}

function bindGraphInteraction() {
  const stage = el.graphPlot;
  if (!stage) return;

  stage.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    zoomAt(ev.clientX, ev.clientY, ev.deltaY > 0 ? 1.14 : 0.88);
  }, { passive: false });

  stage.addEventListener('pointerdown', (ev) => {
    state.isPanning = true;
    state.panPointer = ev.pointerId;
    state.panStart = { x: ev.clientX, y: ev.clientY, view: { ...state.view } };
    stage.setPointerCapture(ev.pointerId);
  });

  stage.addEventListener('pointermove', (ev) => {
    if (!state.isPanning || ev.pointerId !== state.panPointer || !state.panStart) return;
    panTo(ev.clientX - state.panStart.x, ev.clientY - state.panStart.y);
  });

  const endPan = (ev) => {
    if (state.isPanning && ev.pointerId === state.panPointer) {
      state.isPanning = false;
      state.panPointer = null;
      state.panStart = null;
    }
  };
  stage.addEventListener('pointerup', endPan);
  stage.addEventListener('pointercancel', endPan);

  let pinchStart = null;
  stage.addEventListener('touchstart', (ev) => {
    if (ev.touches.length === 2) {
      const [a, b] = ev.touches;
      pinchStart = {
        distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        center: { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 },
        view: { ...state.view }
      };
    }
  }, { passive: true });

  stage.addEventListener('touchmove', (ev) => {
    if (!pinchStart || ev.touches.length !== 2) return;
    ev.preventDefault();
    const [a, b] = ev.touches;
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const factor = clamp(pinchStart.distance / distance, 0.4, 2.4);
    const rect = stage.getBoundingClientRect();
    const cx = (pinchStart.center.x - rect.left) / rect.width;
    const cy = (pinchStart.center.y - rect.top) / rect.height;
    const xSpan = pinchStart.view.xMax - pinchStart.view.xMin;
    const ySpan = pinchStart.view.yMax - pinchStart.view.yMin;
    setView({
      xMin: pinchStart.view.xMin + cx * xSpan * (1 - factor),
      xMax: pinchStart.view.xMax - (1 - cx) * xSpan * (1 - factor),
      yMin: pinchStart.view.yMin + (1 - cy) * ySpan * (1 - factor),
      yMax: pinchStart.view.yMax - cy * ySpan * (1 - factor)
    });
  }, { passive: false });

  stage.addEventListener('touchend', () => { pinchStart = null; });
  stage.addEventListener('touchcancel', () => { pinchStart = null; });
}

function clearAll() {
  state.equations = [];
  state.activeId = null;
  renderEquationList();
  scheduleRender();
  setStatus('All graphs cleared.', 'ok');
}

function loadExample() {
  const examples = [
    { mode: 'standard', name: 'Parabola', expr: 'x²', derivative: true, color: '#00f5ff' },
    { mode: 'standard', name: 'Cubic', expr: 'x^3 - 4x', derivative: true, color: '#6d8cff' },
    { mode: 'standard', name: 'Absolute value', expr: '|x|', derivative: false, color: '#00ff88' },
    { mode: 'standard', name: 'Reciprocal', expr: '1/(x-2)', derivative: false, color: '#ff5c6f' },
    { mode: 'polar', name: 'Rose', expr: '2sin(5θ)', color: '#ffb84d', tMin: '0', tMax: '2*pi' },
    { mode: 'polar', name: 'Cardioid', expr: '1 + cos(θ)', color: '#ff5c6f', tMin: '0', tMax: '2*pi' },
    { mode: 'parametric', name: 'Circle', expr: { x: 'cos(t)', y: 'sin(t)' }, color: '#00ff88', tMin: '0', tMax: '2*pi' },
    { mode: 'parametric', name: 'Lissajous', expr: { x: 'sin(3t)', y: 'sin(4t + pi/2)' }, color: '#ffd166', tMin: '0', tMax: '2*pi' }
  ];
  const pick = examples[state.equations.length % examples.length];
  if (el.modeSelect) el.modeSelect.value = pick.mode;
  toggleModeFields();
  if (el.nameInput) el.nameInput.value = pick.name;
  if (el.colorInput) el.colorInput.value = pick.color;
  if (el.visibleInput) el.visibleInput.checked = true;
  if (el.derivativeInput) el.derivativeInput.checked = !!pick.derivative;
  if (el.tMinInput) el.tMinInput.value = pick.tMin || '0';
  if (el.tMaxInput) el.tMaxInput.value = pick.tMax || '2*pi';
  if (pick.mode === 'parametric') {
    if (el.exprXInput) el.exprXInput.value = pick.expr.x;
    if (el.exprYInput) el.exprYInput.value = pick.expr.y;
  } else if (el.exprInput) {
    el.exprInput.value = pick.expr;
  }
  addEquation(true);
}

function initEvents() {
  el.modeSelect?.addEventListener('change', toggleModeFields);
  el.addEquationBtn?.addEventListener('click', addEquation);
  el.loadExampleBtn?.addEventListener('click', loadExample);
  el.clearAllBtn?.addEventListener('click', clearAll);
  el.applyRangeBtn?.addEventListener('click', applyViewFromInputs);
  el.fitButtonAlt?.addEventListener('click', fitGraphToScreen);
  el.zoomInBtn?.addEventListener('click', () => zoomAt(el.graphPlot.getBoundingClientRect().left + el.graphPlot.clientWidth / 2, el.graphPlot.getBoundingClientRect().top + el.graphPlot.clientHeight / 2, 0.82));
  el.zoomOutBtn?.addEventListener('click', () => zoomAt(el.graphPlot.getBoundingClientRect().left + el.graphPlot.clientWidth / 2, el.graphPlot.getBoundingClientRect().top + el.graphPlot.clientHeight / 2, 1.18));
  el.homeViewBtn?.addEventListener('click', resetHome);
  el.fitViewBtn?.addEventListener('click', fitGraphToScreen);
  el.toggleGridBtn?.addEventListener('click', () => { state.showGrid = !state.showGrid; scheduleRender(); });
  el.toggleAxesBtn?.addEventListener('click', () => { state.showAxes = !state.showAxes; scheduleRender(); });
  el.clearHistoryBtn?.addEventListener('click', () => { state.history = []; try { localStorage.removeItem('graphCalculatorHistory'); } catch {} renderHistory(); });
  el.drawerToggle?.addEventListener('click', () => { el.drawerPanel?.classList.toggle('open'); });

  document.querySelectorAll('.gc-key').forEach((btn) => {
    btn.addEventListener('click', () => {
      const token = btn.dataset.token || '';
      const input = currentMode() === 'parametric'
        ? (document.activeElement === el.exprYInput ? el.exprYInput : el.exprXInput)
        : el.exprInput;
      if (!input) return;
      if (token === '²') insertAtCursor(input, '^2');
      else if (token === '³') insertAtCursor(input, '^3');
      else if (token === '√(') insertAtCursor(input, 'sqrt(');
      else insertAtCursor(input, token);
    });
  });

  ['xMinInput','xMaxInput','yMinInput','yMaxInput'].forEach((id) => el[id]?.addEventListener('change', applyViewFromInputs));

  const onAddQuick = (ev) => {
    if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      addEquation();
    }
  };
  el.exprInput?.addEventListener('keydown', onAddQuick);
  el.exprXInput?.addEventListener('keydown', onAddQuick);
  el.exprYInput?.addEventListener('keydown', onAddQuick);
}

function initFromStorage() {
  loadHistory();
  setEditorFromEquation({ mode: 'standard', name: '', color: '#00f5ff', visible: true, derivative: false, expr: 'x²', tMin: 0, tMax: 2 * Math.PI });
  toggleModeFields();
  syncRangeInputs();
}

function observeResize() {
  const ro = new ResizeObserver(() => scheduleRender());
  if (el.graphPlot) ro.observe(el.graphPlot);
}

window.addEventListener('DOMContentLoaded', () => {
  cache();
  initFromStorage();
  initEvents();
  bindGraphInteraction();
  observeResize();
  renderEquationList();
  scheduleRender();
  setTimeout(() => { if (el.graphPlot?.clientWidth) scheduleRender(); }, 50);
});

window.addEventListener('beforeunload', () => {
  try { localStorage.setItem('graphCalculatorHistory', JSON.stringify(state.history.slice(0, MAX_HISTORY))); } catch {}
});
