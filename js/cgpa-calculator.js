/* ============================================================
   TORNADOTOOLS — CGPA-CALCULATOR.JS
   FIXED:
     - Result containers sgpaDisplay / cgpaDisplay now show
     - Self-contained helpers (no utils.js dependency)
     - 0 SGPA (F grade) bug fixed with isNaN check
     - animateCount runs on the correct .result-value div
   ============================================================ */

/* ============================================================
   LOCAL HELPERS — self-contained
   ============================================================ */
function _show(el) { if (el) el.style.display = 'block'; }
function _hide(el) { if (el) el.style.display = 'none';  }

function _toast(msg, duration) {
  duration = duration || 2500;
  if (window.TornadoToast) { TornadoToast.show(msg, duration); return; }
  var t = document.getElementById('_cft');
  if (!t) {
    t = document.createElement('div');
    t.id = '_cft';
    t.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:rgba(0,245,255,0.12);border:1px solid rgba(0,245,255,0.3);color:#00f5ff;font-family:monospace;font-size:13px;padding:12px 28px;border-radius:100px;z-index:9999;transition:opacity 0.3s;pointer-events:none;';
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(t._tmr);
  t._tmr = setTimeout(function() { t.style.opacity = '0'; }, duration);
}

function _animCount(el, target) {
  if (!el) return;
  var start    = performance.now();
  var duration = 700;
  function step(now) {
    var p   = Math.min((now - start) / duration, 1);
    var ease = 1 - Math.pow(1 - p, 3);
    el.textContent = (target * ease).toFixed(2);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target.toFixed(2);
  }
  requestAnimationFrame(step);
}

/* ============================================================
   ELEMENTS
   ============================================================ */
var subjectsContainer = document.getElementById('subjectsContainer');
var addSubjectBtn     = document.getElementById('addSubject');
var calculateSGPABtn  = document.getElementById('calculateSGPA');
var clearAllBtn       = document.getElementById('clearAll');

var semesterContainer = document.getElementById('semesterContainer');
var addSemesterBtn    = document.getElementById('addSemester');
var calculateCGPABtn  = document.getElementById('calculateCGPA');
var clearCGPABtn      = document.getElementById('clearCGPA');

var modeBtns    = document.querySelectorAll('.mode-btn');
var sgpaSection = document.getElementById('sgpaSection');
var cgpaSection = document.getElementById('cgpaSection');

/* ============================================================
   ADD SUBJECT ROW
   ============================================================ */
function addSubject() {
  var row = document.createElement('div');
  row.className = 'subject-row';
  row.innerHTML =
    '<input type="number" placeholder="Credits" class="credit" min="1" max="10" step="0.5">' +
    '<select class="grade">' +
      '<option value="">-- Grade --</option>' +
      '<option value="10">O  (10 pts)</option>' +
      '<option value="9">A+ (9 pts)</option>' +
      '<option value="8">A  (8 pts)</option>' +
      '<option value="7">B+ (7 pts)</option>' +
      '<option value="6">B  (6 pts)</option>' +
      '<option value="5">C  (5 pts)</option>' +
      '<option value="4">D  (4 pts)</option>' +
      '<option value="0">F  (0 pts)</option>' +
    '</select>' +
    '<button class="remove-subject" title="Remove">&#x2715;</button>';

  subjectsContainer.appendChild(row);

  row.querySelector('.remove-subject').addEventListener('click', function() {
    if (subjectsContainer.children.length <= 1) {
      _toast('⚠ At least one subject required'); return;
    }
    row.remove();
  });
}

if (addSubjectBtn) addSubjectBtn.addEventListener('click', addSubject);
for (var _i = 0; _i < 3; _i++) addSubject();

/* ============================================================
   CALCULATE SGPA
   BUG FIX: shows sgpaDisplay after calculation
   ============================================================ */
function calculateSGPA() {
  var creditInputs = subjectsContainer.querySelectorAll('.credit');
  var gradeSelects = subjectsContainer.querySelectorAll('.grade');
  var totalCredits = 0, weightedSum = 0, valid = true;

  subjectsContainer.querySelectorAll('.subject-row').forEach(function(r) {
    r.style.borderColor = ''; r.style.boxShadow = '';
  });

  for (var i = 0; i < creditInputs.length; i++) {
    var cVal = creditInputs[i].value.trim();
    var gVal = gradeSelects[i].value;
    var row  = creditInputs[i].closest('.subject-row');

    if (!cVal || gVal === '') {
      row.style.borderColor = 'rgba(255,80,80,0.5)';
      _toast('⚠ Subject '+(i+1)+': fill both credits and grade', 3000);
      valid = false; break;
    }

    var c = parseFloat(cVal);
    var g = parseFloat(gVal); // 0 is valid (F grade)

    if (isNaN(c) || c <= 0 || c > 10) {
      row.style.borderColor = 'rgba(255,80,80,0.5)';
      _toast('⚠ Subject '+(i+1)+': credits must be 1–10', 3000);
      valid = false; break;
    }
    if (isNaN(g) || g < 0 || g > 10) {
      row.style.borderColor = 'rgba(255,80,80,0.5)';
      _toast('⚠ Subject '+(i+1)+': invalid grade', 3000);
      valid = false; break;
    }

    totalCredits += c;
    weightedSum  += c * g;
  }

  if (!valid) return;
  if (totalCredits === 0) { _toast('⚠ No valid subjects'); return; }

  var sgpa = weightedSum / totalCredits;

  /* TARGET THE DIV CHILD, not an input element */
  var resultDiv  = document.getElementById('sgpaResult');
  var displayBox = document.getElementById('sgpaDisplay');

  _animCount(resultDiv, sgpa);   /* animate the number */
  _show(displayBox);              /* ← KEY FIX: make container visible */

  _toast('✓ SGPA: ' + sgpa.toFixed(2));
}

if (calculateSGPABtn) calculateSGPABtn.addEventListener('click', calculateSGPA);

/* ============================================================
   ADD SEMESTER ROW
   ============================================================ */
function addSemester() {
  var row = document.createElement('div');
  row.className = 'subject-row';
  row.innerHTML =
    '<input type="number" placeholder="SGPA (e.g. 8.5)" class="sem-sgpa" min="0" max="10" step="0.01">' +
    '<input type="number" placeholder="Total Credits" class="sem-credit" min="1" max="50">' +
    '<button class="remove-subject" title="Remove">&#x2715;</button>';

  semesterContainer.appendChild(row);

  row.querySelector('.remove-subject').addEventListener('click', function() {
    if (semesterContainer.children.length <= 1) {
      _toast('⚠ At least one semester required'); return;
    }
    row.remove();
  });
}

if (addSemesterBtn) addSemesterBtn.addEventListener('click', addSemester);
for (var _j = 0; _j < 2; _j++) addSemester();

/* ============================================================
   CALCULATE CGPA
   BUG FIX: isNaN check + shows cgpaDisplay after calculation
   ============================================================ */
function calculateCGPA() {
  var sgpaInputs   = semesterContainer.querySelectorAll('.sem-sgpa');
  var creditInputs = semesterContainer.querySelectorAll('.sem-credit');
  var totalCredits = 0, weightedSum = 0, counted = 0;

  for (var i = 0; i < sgpaInputs.length; i++) {
    var sVal = sgpaInputs[i].value.trim();
    var cVal = creditInputs[i].value.trim();

    if (sVal === '' && cVal === '') continue; // skip blank rows

    var s = parseFloat(sVal);
    var c = parseFloat(cVal);

    /* isNaN instead of !s — fixes 0-SGPA being skipped */
    if (isNaN(s) || isNaN(c) || c <= 0 || s < 0 || s > 10) {
      var badRow = sgpaInputs[i].closest('.subject-row');
      if (badRow) badRow.style.borderColor = 'rgba(255,80,80,0.5)';
      _toast('⚠ Semester '+(i+1)+': enter valid SGPA (0–10) and credits', 3000);
      return;
    }

    weightedSum  += s * c;
    totalCredits += c;
    counted++;
  }

  if (counted === 0 || totalCredits === 0) {
    _toast('⚠ Fill at least one semester'); return;
  }

  var cgpa = weightedSum / totalCredits;

  /* TARGET THE DIV CHILD, not an input element */
  var resultDiv  = document.getElementById('cgpaResult');
  var displayBox = document.getElementById('cgpaDisplay');

  _animCount(resultDiv, cgpa);   /* animate the number */
  _show(displayBox);              /* ← KEY FIX: make container visible */

  _toast('✓ CGPA: ' + cgpa.toFixed(2));
}

if (calculateCGPABtn) calculateCGPABtn.addEventListener('click', calculateCGPA);

/* ============================================================
   CLEAR BUTTONS
   ============================================================ */
function clearSGPA() {
  subjectsContainer.innerHTML = '';
  for (var i = 0; i < 3; i++) addSubject();
  _hide(document.getElementById('sgpaDisplay'));
}

function clearCGPAFn() {
  semesterContainer.innerHTML = '';
  for (var i = 0; i < 2; i++) addSemester();
  _hide(document.getElementById('cgpaDisplay'));
}

if (clearAllBtn)  clearAllBtn.addEventListener('click',  clearSGPA);
if (clearCGPABtn) clearCGPABtn.addEventListener('click', clearCGPAFn);

/* ============================================================
   MODE SWITCH
   ============================================================ */
modeBtns.forEach(function(btn) {
  btn.addEventListener('click', function() {
    modeBtns.forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    if (btn.dataset.mode === 'sgpa') {
      _show(sgpaSection); _hide(cgpaSection);
    } else {
      _hide(sgpaSection); _show(cgpaSection);
    }
  });
});
