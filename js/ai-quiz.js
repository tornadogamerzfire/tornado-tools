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

const API_HEALTH = `${API_BASE}/api/quiz/health`;
const API_WARMUP = `${API_BASE}/api/quiz/warmup`;
const API_CAPABILITIES = `${API_BASE}/api/quiz/capabilities`;
const API_GENERATE = `${API_BASE}/api/quiz/generate`;
const API_SUBMIT = `${API_BASE}/api/quiz/submit`;
const API_SESSION_CLEANUP = (token) => `${API_BASE}/api/quiz/session/${encodeURIComponent(token)}/cleanup`;

const STORAGE_KEY = 'tornado-ai-quiz-session';

const state = {
  backendReady: false,
  warmupDone: false,
  generating: false,
  submitting: false,
  quiz: null,
  currentIndex: 0,
  answers: {},
  timerSeconds: 0,
  timerHandle: null,
  sessionToken: '',
};

const el = {};
const byId = (id) => document.getElementById(id);

function cache() {
  [
    'backendStatus', 'processingHint', 'navToggle', 'navLinks',
    'topicInput', 'levelInput', 'difficultyInput', 'branchPanel', 'branchInput', 'semesterInput',
    'countModeInput', 'manualCountWrap', 'questionCountInput', 'randomCountWrap', 'randomMinInput', 'randomMaxInput',
    'timerModeInput', 'timerWrap', 'timerMinutesInput',
    'generateBtn', 'resetBtn', 'quizCard', 'timerDisplay', 'progressBar', 'questionCounter', 'answeredCounter',
    'questionTypeLabel', 'questionText', 'questionSub', 'answerArea', 'prevBtn', 'nextBtn', 'submitBtn',
    'resultCard', 'scoreValue', 'percentageValue', 'gradeValue', 'correctCount', 'wrongCount', 'skippedCount',
    'resultNote', 'newQuizBtn', 'clearSavedBtn'
  ].forEach((id) => el[id] = byId(id));
}

function setStatus(message, tone = '') {
  if (!el.backendStatus) return;
  el.backendStatus.textContent = message;
  el.backendStatus.dataset.tone = tone;
}

function setHint(message, tone = '') {
  if (!el.processingHint) return;
  el.processingHint.textContent = message;
  el.processingHint.dataset.tone = tone;
}

function toast(message, isError = false) {
  if (window.TornadoToast) {
    TornadoToast.show(`${isError ? '⚠ ' : '✓ '}${message}`, 2500);
  }
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9+\-*/().,%?#!@&'"\s]/gi, '')
    .trim();
}

function formatTimer(totalSeconds) {
  const secs = Math.max(0, Math.floor(totalSeconds || 0));
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSelectedQuestionTypes() {
  return Array.from(document.querySelectorAll('input[name="qtype"]:checked')).map((node) => node.value);
}

function currentCount() {
  const mode = String(el.countModeInput?.value || 'manual');
  if (mode === 'random') {
    const min = clamp(Number(el.randomMinInput?.value || 5), 5, 30);
    const max = clamp(Number(el.randomMaxInput?.value || 10), 5, 30);
    const safeMin = Math.min(min, max);
    const safeMax = Math.max(min, max);
    return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
  }
  return clamp(Number(el.questionCountInput?.value || 10), 5, 30);
}

function currentTimerSeconds() {
  const mode = String(el.timerModeInput?.value || 'no_limit');
  if (mode === 'no_limit') return 0;
  return clamp(Number(el.timerMinutesInput?.value || 10), 5, 60) * 60;
}

function updateLevelFields() {
  const level = String(el.levelInput?.value || '');
  const showBranch = ['diploma', 'iti', 'iit'].includes(level);
  el.branchPanel?.classList.toggle('quiz-hidden', !showBranch);
}

function updateCountFields() {
  const mode = String(el.countModeInput?.value || 'manual');
  el.manualCountWrap?.classList.toggle('quiz-hidden', mode !== 'manual');
  el.randomCountWrap?.classList.toggle('quiz-hidden', mode !== 'random');
}

function updateTimerFields() {
  const mode = String(el.timerModeInput?.value || 'no_limit');
  el.timerWrap?.classList.toggle('quiz-hidden', mode !== 'manual');
}

function currentConfig() {
  return {
    topic: String(el.topicInput?.value || '').trim(),
    level: String(el.levelInput?.value || 'class-10'),
    subject: String(el.topicInput?.value || '').trim(),
    branch: String(el.branchInput?.value || '').trim(),
    semester: String(el.semesterInput?.value || '').trim(),
    difficulty: String(el.difficultyInput?.value || 'medium'),
    questionTypes: getSelectedQuestionTypes(),
    countMode: String(el.countModeInput?.value || 'manual'),
    questionCount: Number(el.questionCountInput?.value || 10),
    randomMin: Number(el.randomMinInput?.value || 5),
    randomMax: Number(el.randomMaxInput?.value || 15),
    timerMode: String(el.timerModeInput?.value || 'no_limit'),
    timerMinutes: Number(el.timerMinutesInput?.value || 10),
  };
}

function validateConfig(config) {
  if (!config.topic || config.topic.length < 2) return 'Enter a valid topic or subject.';
  if (!config.questionTypes.length) return 'Choose at least one question type.';
  const count = config.countMode === 'random'
    ? Math.max(config.randomMin, config.randomMax)
    : config.questionCount;
  if (!Number.isFinite(count) || count < 5 || count > 30) return 'Question count must be between 5 and 30.';
  if (config.countMode === 'random' && (config.randomMin < 5 || config.randomMax > 30 || config.randomMin > config.randomMax)) {
    return 'Random range must stay between 5 and 30 and min must be less than max.';
  }
  if (config.timerMode === 'manual' && (!Number.isFinite(config.timerMinutes) || config.timerMinutes < 5 || config.timerMinutes > 60)) {
    return 'Timer must be between 5 and 60 minutes.';
  }
  return '';
}

function saveSession() {
  if (!state.quiz) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      sessionToken: state.sessionToken,
      quiz: state.quiz,
      currentIndex: state.currentIndex,
      answers: state.answers,
      timerSeconds: state.timerSeconds,
      savedAt: Date.now(),
    }));
  } catch (_) {}
}

function clearSavedSession() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  state.sessionToken = '';
}

function restoreSession() {
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch (_) {}
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    if (!data?.quiz?.questions?.length) return false;
    state.sessionToken = data.sessionToken || '';
    state.quiz = data.quiz;
    state.currentIndex = clamp(Number(data.currentIndex || 0), 0, data.quiz.questions.length - 1);
    state.answers = data.answers || {};
    state.timerSeconds = Number(data.timerSeconds || 0);
    renderQuiz();
    showQuiz();
    resumeTimer();
    setHint('Saved quiz restored from localStorage.', 'ready');
    return true;
  } catch {
    return false;
  }
}

function cleanupBackendSession(sessionToken, delaySeconds = 300) {
  if (!sessionToken) return;
  const body = JSON.stringify({ delaySeconds });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(API_SESSION_CLEANUP(sessionToken), new Blob([body], { type: 'application/json' }));
      return;
    }
  } catch (_) {}
  fetch(API_SESSION_CLEANUP(sessionToken), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

async function loadCapabilities() {
  try {
    const res = await fetch(API_CAPABILITIES, { method: 'GET', cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('capabilities');
    const json = await res.json();
    if (json?.success) {
      setStatus('Quiz engine ready.', 'ready');
      setHint('Ready to generate quizzes.');
      state.backendReady = true;
      updateGenerateButton();
      return;
    }
    throw new Error('bad response');
  } catch (_) {
    setStatus('Quiz engine warming up. You can still try generation.', 'warning');
    setHint('Quiz engine warming up. You can still try generation.', 'warning');
    state.backendReady = false;
    updateGenerateButton();
  }
}

async function warmupOnce() {
  if (state.warmupDone) return state.backendReady;
  state.warmupDone = true;
  setStatus('Preparing quiz engine...', 'loading');
  setHint('Preparing quiz engine...');
  try {
    const res = await fetch(API_WARMUP, { method: 'GET', cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('warmup');
    const json = await res.json().catch(() => ({}));
    if (json?.success !== false) {
      state.backendReady = true;
      setStatus('Quiz engine ready.', 'ready');
      setHint('Ready to generate quizzes.');
      updateGenerateButton();
      return true;
    }
    throw new Error('bad response');
  } catch (_) {
    state.backendReady = false;
    setStatus('Quiz engine warming up. You can still try generation.', 'warning');
    setHint('Quiz engine warming up. You can still try generation.', 'warning');
    updateGenerateButton();
    return false;
  }
}

function updateGenerateButton() {
  const valid = !validateConfig(currentConfig());
  if (el.generateBtn) el.generateBtn.disabled = !valid || state.generating || state.submitting;
}

function showQuiz() {
  if (el.quizCard) el.quizCard.style.display = 'block';
  if (el.resultCard) el.resultCard.style.display = 'none';
}

function showResult() {
  if (el.quizCard) el.quizCard.style.display = 'none';
  if (el.resultCard) el.resultCard.style.display = 'block';
}

function resetQuizOnly() {
  state.quiz = null;
  state.currentIndex = 0;
  state.answers = {};
  state.timerSeconds = 0;
  state.generating = false;
  state.submitting = false;
  if (state.timerHandle) {
    clearInterval(state.timerHandle);
    state.timerHandle = null;
  }
  if (el.timerDisplay) el.timerDisplay.textContent = '--:--';
  if (el.progressBar) el.progressBar.style.width = '0%';
  if (el.questionCounter) el.questionCounter.textContent = 'Question 1/1';
  if (el.answeredCounter) el.answeredCounter.textContent = '0 answered';
  if (el.questionText) el.questionText.textContent = 'Question text';
  if (el.questionSub) el.questionSub.textContent = 'Pick the best answer and continue.';
  if (el.answerArea) el.answerArea.innerHTML = '';
  showQuiz();
  updateGenerateButton();
}

function renderProgress() {
  const total = state.quiz?.questions?.length || 1;
  const current = clamp(state.currentIndex + 1, 1, total);
  if (el.questionCounter) el.questionCounter.textContent = `Question ${current}/${total}`;
  if (el.answeredCounter) {
    const answered = Object.keys(state.answers).filter((k) => String(state.answers[k] ?? '').trim() !== '').length;
    el.answeredCounter.textContent = `${answered} answered`;
  }
  if (el.progressBar) el.progressBar.style.width = `${Math.round((current / total) * 100)}%`;
}

function renderQuestion() {
  if (!state.quiz?.questions?.length) return;
  const q = state.quiz.questions[state.currentIndex];
  if (!q) return;
  if (el.questionTypeLabel) el.questionTypeLabel.textContent = String(q.type || '').replaceAll('_', ' ').toUpperCase();
  if (el.questionText) el.questionText.textContent = q.question || '';
  if (el.questionSub) el.questionSub.textContent = q.subtext || 'Pick the best answer and continue.';
  if (!el.answerArea) return;
  el.answerArea.innerHTML = '';

  const saved = state.answers[q.id];

  if (q.type === 'mcq' || q.type === 'true_false') {
    (q.options || []).forEach((option) => {
      const row = document.createElement('label');
      row.className = 'quiz-answer-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `answer-${q.id}`;
      input.value = option;
      if (String(saved ?? '') === String(option)) input.checked = true;
      input.addEventListener('change', () => {
        state.answers[q.id] = option;
        saveSession();
        renderProgress();
        updateNavButtons();
      });
      const span = document.createElement('span');
      span.textContent = option;
      row.append(input, span);
      el.answerArea.appendChild(row);
    });
  } else {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tool-input quiz-fill-input';
    input.placeholder = 'Type your answer';
    input.value = String(saved ?? '');
    input.addEventListener('input', () => {
      state.answers[q.id] = input.value;
      saveSession();
      renderProgress();
      updateNavButtons();
    });
    el.answerArea.appendChild(input);
  }

  renderProgress();
  updateNavButtons();
}

function updateNavButtons() {
  if (el.prevBtn) el.prevBtn.disabled = state.currentIndex <= 0;
  if (el.nextBtn) el.nextBtn.disabled = !state.quiz || state.currentIndex >= (state.quiz.questions.length - 1);
  if (el.submitBtn) el.submitBtn.disabled = !state.quiz || state.submitting;
}

function renderQuiz() {
  if (!state.quiz?.questions?.length) return;
  renderQuestion();
  showQuiz();
}

function startTimer() {
  if (state.timerHandle) {
    clearInterval(state.timerHandle);
    state.timerHandle = null;
  }
  if (!state.timerSeconds || state.timerSeconds <= 0) {
    if (el.timerDisplay) el.timerDisplay.textContent = '--:--';
    return;
  }
  const tick = () => {
    if (state.timerSeconds <= 0) {
      if (state.timerHandle) {
        clearInterval(state.timerHandle);
        state.timerHandle = null;
      }
      if (el.timerDisplay) el.timerDisplay.textContent = '00:00';
      void submitQuiz(true);
      return;
    }
    if (el.timerDisplay) el.timerDisplay.textContent = formatTimer(state.timerSeconds);
    state.timerSeconds -= 1;
    saveSession();
  };
  tick();
  state.timerHandle = setInterval(tick, 1000);
}

function resumeTimer() {
  if (state.timerSeconds > 0) startTimer();
  else if (el.timerDisplay) el.timerDisplay.textContent = '--:--';
}

function gradeFromPercentage(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 40) return 'D';
  return 'Fail';
}

async function generateQuiz() {
  if (state.generating || state.submitting) return;
  const config = currentConfig();
  const validation = validateConfig(config);
  if (validation) {
    toast(validation, true);
    return;
  }

  state.generating = true;
  updateGenerateButton();
  setStatus('Generating quiz...', 'loading');
  setHint('Generating quiz...');
  if (el.generateBtn) el.generateBtn.textContent = 'Generating...';

  const payload = {
    topic: config.topic,
    level: config.level,
    subject: config.topic,
    branch: config.branch || '',
    semester: config.semester || '',
    difficulty: config.difficulty,
    questionTypes: config.questionTypes,
    countMode: config.countMode,
    questionCount: currentCount(),
    randomMin: config.randomMin,
    randomMax: config.randomMax,
    timerMode: config.timerMode,
    timerMinutes: config.timerMinutes,
  };

  try {
    const res = await fetch(API_GENERATE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.detail || json?.message || 'Quiz generation failed.');
    }

    state.quiz = json.data.quiz;
    state.currentIndex = 0;
    state.answers = {};
    state.sessionToken = json.data.sessionToken || '';
    state.timerSeconds = Number(json.data.quiz?.timeLimitSeconds || 0);
    saveSession();

    if (state.timerSeconds > 0) startTimer();
    else if (state.timerHandle) {
      clearInterval(state.timerHandle);
      state.timerHandle = null;
    }

    renderQuiz();
    showQuiz();
    setStatus(`Quiz ready. ${state.quiz.questions.length} question(s) loaded.`, 'ready');
    setHint('Quiz ready. Answer one question at a time.');
    toast('Quiz generated successfully!');
  } catch (err) {
    setStatus('Quiz generation failed. Try again.', 'error');
    setHint(err?.message || 'Quiz generation failed.', 'error');
    toast(err?.message || 'Quiz generation failed.', true);
  } finally {
    state.generating = false;
    if (el.generateBtn) el.generateBtn.textContent = 'Generate Quiz';
    updateGenerateButton();
  }
}

function renderResult(result) {
  if (el.scoreValue) el.scoreValue.textContent = String(result.score ?? 0);
  if (el.percentageValue) el.percentageValue.textContent = `${result.percentage ?? 0}%`;
  if (el.gradeValue) el.gradeValue.textContent = result.grade ?? 'F';
  if (el.correctCount) el.correctCount.textContent = `Correct: ${result.correctCount ?? 0}`;
  if (el.wrongCount) el.wrongCount.textContent = `Wrong: ${result.wrongCount ?? 0}`;
  if (el.skippedCount) el.skippedCount.textContent = `Skipped: ${result.skippedCount ?? 0}`;
  if (el.resultNote) {
    el.resultNote.textContent = `You completed the quiz. Score: ${result.score ?? 0}/${result.total ?? 0}.`;
  }
}

async function submitQuiz(auto = false) {
  if (!state.quiz || state.submitting) return;
  state.submitting = true;
  updateNavButtons();
  setStatus(auto ? 'Auto submitting quiz...' : 'Submitting quiz...', 'loading');
  setHint(auto ? 'Time ended. Auto submitting...' : 'Submitting quiz...');

  if (state.timerHandle) {
    clearInterval(state.timerHandle);
    state.timerHandle = null;
  }

  const answers = {};
  for (const question of state.quiz.questions) {
    if (state.answers[question.id] != null) answers[question.id] = state.answers[question.id];
  }

  try {
    const res = await fetch(API_SUBMIT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sessionToken: state.sessionToken,
        answers,
        elapsedSeconds: state.quiz.timeLimitSeconds ? Math.max(0, state.quiz.timeLimitSeconds - state.timerSeconds) : 0,
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.detail || json?.message || 'Submission failed.');
    }

    renderResult(json.data);
    showResult();
    setStatus('Quiz submitted successfully.', 'ready');
    setHint('Result calculated and saved session cleared.');
    toast('Quiz submitted!');
    clearSavedSession();
  } catch (err) {
    setStatus('Submission failed.', 'error');
    setHint(err?.message || 'Submission failed.', 'error');
    toast(err?.message || 'Submission failed.', true);
  } finally {
    state.submitting = false;
    updateGenerateButton();
  }
}

function gotoQuestion(nextIndex) {
  if (!state.quiz?.questions?.length) return;
  state.currentIndex = clamp(nextIndex, 0, state.quiz.questions.length - 1);
  renderQuestion();
  saveSession();
}

function bindEvents() {
  el.navToggle?.addEventListener('click', () => {
    el.navLinks?.classList.toggle('open');
    el.navToggle?.classList.toggle('open');
  });

  el.levelInput?.addEventListener('change', () => {
    updateLevelFields();
    updateGenerateButton();
  });
  el.countModeInput?.addEventListener('change', () => {
    updateCountFields();
    updateGenerateButton();
  });
  el.timerModeInput?.addEventListener('change', () => {
    updateTimerFields();
    updateGenerateButton();
  });

  [el.topicInput, el.difficultyInput, el.questionCountInput, el.randomMinInput, el.randomMaxInput, el.timerMinutesInput, el.branchInput, el.semesterInput]
    .forEach((node) => node?.addEventListener('input', updateGenerateButton));

  document.querySelectorAll('input[name="qtype"]').forEach((node) => node.addEventListener('change', updateGenerateButton));

  el.generateBtn?.addEventListener('click', () => { void generateQuiz(); });

  el.resetBtn?.addEventListener('click', () => {
    if (state.sessionToken) cleanupBackendSession(state.sessionToken, 0);
    clearSavedSession();
    resetQuizOnly();
    if (el.quizCard) el.quizCard.style.display = 'none';
    if (el.resultCard) el.resultCard.style.display = 'none';
    setStatus('Preparing quiz engine...', 'loading');
    setHint('Preparing quiz engine...');
  });

  el.prevBtn?.addEventListener('click', () => gotoQuestion(state.currentIndex - 1));
  el.nextBtn?.addEventListener('click', () => gotoQuestion(state.currentIndex + 1));
  el.submitBtn?.addEventListener('click', () => { void submitQuiz(false); });

  el.newQuizBtn?.addEventListener('click', () => {
    if (state.sessionToken) cleanupBackendSession(state.sessionToken, 0);
    clearSavedSession();
    resetQuizOnly();
    if (el.quizCard) el.quizCard.style.display = 'none';
    if (el.resultCard) el.resultCard.style.display = 'none';
  });

  el.clearSavedBtn?.addEventListener('click', () => {
    if (state.sessionToken) cleanupBackendSession(state.sessionToken, 0);
    clearSavedSession();
    toast('Saved quiz session cleared.');
  });

  window.addEventListener('beforeunload', () => {
    if (state.sessionToken) cleanupBackendSession(state.sessionToken, 300);
    saveSession();
  });

  window.addEventListener('pagehide', () => {
    if (state.sessionToken) cleanupBackendSession(state.sessionToken, 300);
    saveSession();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveSession();
  });
}

function initFaq() {
  document.querySelectorAll('.faq-question').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const open = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });
}

async function init() {
  cache();
  initFaq();
  bindEvents();
  updateLevelFields();
  updateCountFields();
  updateTimerFields();
  updateGenerateButton();
  setStatus('Preparing quiz engine...', 'loading');
  setHint('Preparing quiz engine...');

  const restored = restoreSession();
  if (!restored) {
    if (el.quizCard) el.quizCard.style.display = 'none';
    if (el.resultCard) el.resultCard.style.display = 'none';
  }

  await loadCapabilities();
  await warmupOnce();

  if (!restored) {
    if (el.quizCard) el.quizCard.style.display = 'none';
    if (el.resultCard) el.resultCard.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  void init();
});
