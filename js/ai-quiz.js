'use strict';

const DEFAULT_CATALOG = {
  root: '/backend/data/question-bank',
  questionTypes: ['mcq', 'true_false', 'fill_blank'],
  difficulties: ['easy', 'medium', 'hard'],
  levels: [
    {
      value: 'class-1',
      label: 'Class 1',
      kind: 'school',
      subjects: [
        { value: 'english', label: 'English' },
        { value: 'math', label: 'Math' },
        { value: 'science', label: 'Science' },
      ],
      branches: [],
      semesters: [],
      subjectsByBranch: {},
      semestersByBranch: {},
      subjectsByBranchSemester: {},
    },
    {
      value: 'class-2',
      label: 'Class 2',
      kind: 'school',
      subjects: [
        { value: 'english', label: 'English' },
        { value: 'math', label: 'Math' },
        { value: 'science', label: 'Science' },
      ],
      branches: [],
      semesters: [],
      subjectsByBranch: {},
      semestersByBranch: {},
      subjectsByBranchSemester: {},
    },
    {
      value: 'class-3',
      label: 'Class 3',
      kind: 'school',
      subjects: [
        { value: 'english', label: 'English' },
        { value: 'math', label: 'Math' },
        { value: 'science', label: 'Science' },
      ],
      branches: [],
      semesters: [],
      subjectsByBranch: {},
      semestersByBranch: {},
      subjectsByBranchSemester: {},
    },
    {
      value: 'class-4',
      label: 'Class 4',
      kind: 'school',
      subjects: [
        { value: 'english', label: 'English' },
        { value: 'math', label: 'Math' },
        { value: 'science', label: 'Science' },
      ],
      branches: [],
      semesters: [],
      subjectsByBranch: {},
      semestersByBranch: {},
      subjectsByBranchSemester: {},
    },
    {
      value: 'class-5',
      label: 'Class 5',
      kind: 'school',
      subjects: [
        { value: 'english', label: 'English' },
        { value: 'math', label: 'Math' },
        { value: 'science', label: 'Science' },
      ],
      branches: [],
      semesters: [],
      subjectsByBranch: {},
      semestersByBranch: {},
      subjectsByBranchSemester: {},
    },
    {
      value: 'class-6',
      label: 'Class 6',
      kind: 'school',
      subjects: [
        { value: 'english', label: 'English' },
        { value: 'math', label: 'Math' },
        { value: 'science', label: 'Science' },
      ],
      branches: [],
      semesters: [],
      subjectsByBranch: {},
      semestersByBranch: {},
      subjectsByBranchSemester: {},
    },
    {
      value: 'class-7',
      label: 'Class 7',
      kind: 'school',
      subjects: [
        { value: 'english', label: 'English' },
        { value: 'math', label: 'Math' },
        { value: 'science', label: 'Science' },
      ],
      branches: [],
      semesters: [],
      subjectsByBranch: {},
      semestersByBranch: {},
      subjectsByBranchSemester: {},
    },
    {
      value: 'class-8',
      label: 'Class 8',
      kind: 'school',
      subjects: [
        { value: 'english', label: 'English' },
        { value: 'math', label: 'Math' },
        { value: 'science', label: 'Science' },
      ],
      branches: [],
      semesters: [],
      subjectsByBranch: {},
      semestersByBranch: {},
      subjectsByBranchSemester: {},
    },
    {
      value: 'class-9',
      label: 'Class 9',
      kind: 'school',
      subjects: [
        { value: 'english', label: 'English' },
        { value: 'math', label: 'Math' },
        { value: 'science', label: 'Science' },
      ],
      branches: [],
      semesters: [],
      subjectsByBranch: {},
      semestersByBranch: {},
      subjectsByBranchSemester: {},
    },
    {
      value: 'class-10',
      label: 'Class 10',
      kind: 'school',
      subjects: [
        { value: 'english', label: 'English' },
        { value: 'math', label: 'Math' },
        { value: 'science', label: 'Science' },
      ],
      branches: [],
      semesters: [],
      subjectsByBranch: {},
      semestersByBranch: {},
      subjectsByBranchSemester: {},
    },
    {
      value: 'class-11',
      label: 'Class 11',
      kind: 'school',
      subjects: [
        { value: 'english', label: 'English' },
        { value: 'math', label: 'Math' },
        { value: 'science', label: 'Science' },
      ],
      branches: [],
      semesters: [],
      subjectsByBranch: {},
      semestersByBranch: {},
      subjectsByBranchSemester: {},
    },
    {
      value: 'class-12',
      label: 'Class 12',
      kind: 'school',
      subjects: [
        { value: 'english', label: 'English' },
        { value: 'math', label: 'Math' },
        { value: 'science', label: 'Science' },
      ],
      branches: [],
      semesters: [],
      subjectsByBranch: {},
      semestersByBranch: {},
      subjectsByBranchSemester: {},
    },
    {
      value: 'diploma',
      label: 'Diploma',
      kind: 'branch-semester',
      branches: [
        { value: 'Civil', label: 'Civil' },
        { value: 'CSE', label: 'CSE' },
        { value: 'Electrical', label: 'Electrical' },
        { value: 'Electronics', label: 'Electronics' },
        { value: 'Mechanical', label: 'Mechanical' },
      ],
      semesters: [
        { value: 'semester-1', label: 'Semester 1' },
        { value: 'semester-2', label: 'Semester 2' },
        { value: 'semester-3', label: 'Semester 3' },
      ],
      subjectsByBranch: {
        Civil: [{ value: 'civil-engineering-basics', label: 'Civil Engineering Basics' }],
        CSE: [{ value: 'programming-fundamentals', label: 'Programming Fundamentals' }],
        Electrical: [{ value: 'electrical-basics', label: 'Electrical Basics' }],
        Electronics: [{ value: 'electronics-basics', label: 'Electronics Basics' }],
        Mechanical: [{ value: 'mechanical-basics', label: 'Mechanical Basics' }],
      },
      semestersByBranch: {
        Civil: [
          { value: 'semester-1', label: 'Semester 1' },
          { value: 'semester-2', label: 'Semester 2' },
          { value: 'semester-3', label: 'Semester 3' },
        ],
        CSE: [
          { value: 'semester-1', label: 'Semester 1' },
          { value: 'semester-2', label: 'Semester 2' },
          { value: 'semester-3', label: 'Semester 3' },
        ],
        Electrical: [
          { value: 'semester-1', label: 'Semester 1' },
          { value: 'semester-2', label: 'Semester 2' },
          { value: 'semester-3', label: 'Semester 3' },
        ],
        Electronics: [
          { value: 'semester-1', label: 'Semester 1' },
          { value: 'semester-2', label: 'Semester 2' },
          { value: 'semester-3', label: 'Semester 3' },
        ],
        Mechanical: [
          { value: 'semester-1', label: 'Semester 1' },
          { value: 'semester-2', label: 'Semester 2' },
          { value: 'semester-3', label: 'Semester 3' },
        ],
      },
      subjectsByBranchSemester: {
        Civil: {
          'semester-1': [{ value: 'civil-engineering-basics', label: 'Civil Engineering Basics' }],
          'semester-2': [{ value: 'civil-engineering-basics', label: 'Civil Engineering Basics' }],
          'semester-3': [{ value: 'civil-engineering-basics', label: 'Civil Engineering Basics' }],
        },
        CSE: {
          'semester-1': [{ value: 'programming-fundamentals', label: 'Programming Fundamentals' }],
          'semester-2': [{ value: 'programming-fundamentals', label: 'Programming Fundamentals' }],
          'semester-3': [{ value: 'programming-fundamentals', label: 'Programming Fundamentals' }],
        },
        Electrical: {
          'semester-1': [{ value: 'electrical-basics', label: 'Electrical Basics' }],
          'semester-2': [{ value: 'electrical-basics', label: 'Electrical Basics' }],
          'semester-3': [{ value: 'electrical-basics', label: 'Electrical Basics' }],
        },
        Electronics: {
          'semester-1': [{ value: 'electronics-basics', label: 'Electronics Basics' }],
          'semester-2': [{ value: 'electronics-basics', label: 'Electronics Basics' }],
          'semester-3': [{ value: 'electronics-basics', label: 'Electronics Basics' }],
        },
        Mechanical: {
          'semester-1': [{ value: 'mechanical-basics', label: 'Mechanical Basics' }],
          'semester-2': [{ value: 'mechanical-basics', label: 'Mechanical Basics' }],
          'semester-3': [{ value: 'mechanical-basics', label: 'Mechanical Basics' }],
        },
      },
    },
    {
      value: 'iti',
      label: 'ITI',
      kind: 'branch-semester',
      branches: [
        { value: 'computer-operator', label: 'Computer Operator' },
        { value: 'electrician', label: 'Electrician' },
        { value: 'fitter', label: 'Fitter' },
        { value: 'mechanic', label: 'Mechanic' },
        { value: 'welder', label: 'Welder' },
      ],
      semesters: [
        { value: 'semester-1', label: 'Semester 1' },
        { value: 'semester-2', label: 'Semester 2' },
        { value: 'semester-3', label: 'Semester 3' },
      ],
      subjectsByBranch: {
        'computer-operator': [{ value: 'trade-basics', label: 'Trade Basics' }],
        electrician: [{ value: 'trade-basics', label: 'Trade Basics' }],
        fitter: [{ value: 'trade-basics', label: 'Trade Basics' }],
        mechanic: [{ value: 'trade-basics', label: 'Trade Basics' }],
        welder: [{ value: 'trade-basics', label: 'Trade Basics' }],
      },
      semestersByBranch: {
        'computer-operator': [
          { value: 'semester-1', label: 'Semester 1' },
          { value: 'semester-2', label: 'Semester 2' },
          { value: 'semester-3', label: 'Semester 3' },
        ],
        electrician: [
          { value: 'semester-1', label: 'Semester 1' },
          { value: 'semester-2', label: 'Semester 2' },
          { value: 'semester-3', label: 'Semester 3' },
        ],
        fitter: [
          { value: 'semester-1', label: 'Semester 1' },
          { value: 'semester-2', label: 'Semester 2' },
          { value: 'semester-3', label: 'Semester 3' },
        ],
        mechanic: [
          { value: 'semester-1', label: 'Semester 1' },
          { value: 'semester-2', label: 'Semester 2' },
          { value: 'semester-3', label: 'Semester 3' },
        ],
        welder: [
          { value: 'semester-1', label: 'Semester 1' },
          { value: 'semester-2', label: 'Semester 2' },
          { value: 'semester-3', label: 'Semester 3' },
        ],
      },
      subjectsByBranchSemester: {
        'computer-operator': {
          'semester-1': [{ value: 'trade-basics', label: 'Trade Basics' }],
          'semester-2': [{ value: 'trade-basics', label: 'Trade Basics' }],
          'semester-3': [{ value: 'trade-basics', label: 'Trade Basics' }],
        },
        electrician: {
          'semester-1': [{ value: 'trade-basics', label: 'Trade Basics' }],
          'semester-2': [{ value: 'trade-basics', label: 'Trade Basics' }],
          'semester-3': [{ value: 'trade-basics', label: 'Trade Basics' }],
        },
        fitter: {
          'semester-1': [{ value: 'trade-basics', label: 'Trade Basics' }],
          'semester-2': [{ value: 'trade-basics', label: 'Trade Basics' }],
          'semester-3': [{ value: 'trade-basics', label: 'Trade Basics' }],
        },
        mechanic: {
          'semester-1': [{ value: 'trade-basics', label: 'Trade Basics' }],
          'semester-2': [{ value: 'trade-basics', label: 'Trade Basics' }],
          'semester-3': [{ value: 'trade-basics', label: 'Trade Basics' }],
        },
        welder: {
          'semester-1': [{ value: 'trade-basics', label: 'Trade Basics' }],
          'semester-2': [{ value: 'trade-basics', label: 'Trade Basics' }],
          'semester-3': [{ value: 'trade-basics', label: 'Trade Basics' }],
        },
      },
    },
    {
      value: 'graduation',
      label: 'Graduation',
      kind: 'branch-semester',
      branches: [
        { value: 'BA', label: 'BA' },
        { value: 'BCA', label: 'BCA' },
        { value: 'BCom', label: 'BCom' },
        { value: 'BSc', label: 'BSc' },
        { value: 'BTech', label: 'BTech' },
      ],
      semesters: [
        { value: 'semester-1', label: 'Semester 1' },
        { value: 'semester-2', label: 'Semester 2' },
      ],
      subjectsByBranch: {
        BA: [{ value: 'humanities-foundation', label: 'Humanities Foundation' }],
        BCA: [{ value: 'programming-fundamentals', label: 'Programming Fundamentals' }],
        BCom: [{ value: 'commerce-basics', label: 'Commerce Basics' }],
        BSc: [{ value: 'science', label: 'Science' }],
        BTech: [{ value: 'engineering-fundamentals', label: 'Engineering Fundamentals' }],
      },
      semestersByBranch: {
        BA: [
          { value: 'semester-1', label: 'Semester 1' },
          { value: 'semester-2', label: 'Semester 2' },
        ],
        BCA: [
          { value: 'semester-1', label: 'Semester 1' },
          { value: 'semester-2', label: 'Semester 2' },
        ],
        BCom: [
          { value: 'semester-1', label: 'Semester 1' },
          { value: 'semester-2', label: 'Semester 2' },
        ],
        BSc: [
          { value: 'semester-1', label: 'Semester 1' },
          { value: 'semester-2', label: 'Semester 2' },
        ],
        BTech: [
          { value: 'semester-1', label: 'Semester 1' },
          { value: 'semester-2', label: 'Semester 2' },
        ],
      },
      subjectsByBranchSemester: {
        BA: {
          'semester-1': [{ value: 'humanities-foundation', label: 'Humanities Foundation' }],
          'semester-2': [{ value: 'humanities-foundation', label: 'Humanities Foundation' }],
        },
        BCA: {
          'semester-1': [{ value: 'programming-fundamentals', label: 'Programming Fundamentals' }],
          'semester-2': [{ value: 'programming-fundamentals', label: 'Programming Fundamentals' }],
        },
        BCom: {
          'semester-1': [{ value: 'commerce-basics', label: 'Commerce Basics' }],
          'semester-2': [{ value: 'commerce-basics', label: 'Commerce Basics' }],
        },
        BSc: {
          'semester-1': [{ value: 'science', label: 'Science' }],
          'semester-2': [{ value: 'science', label: 'Science' }],
        },
        BTech: {
          'semester-1': [{ value: 'engineering-fundamentals', label: 'Engineering Fundamentals' }],
          'semester-2': [{ value: 'engineering-fundamentals', label: 'Engineering Fundamentals' }],
        },
      },
    },
    {
      value: 'iit',
      label: 'IIT / JEE',
      kind: 'branch-subject',
      branches: [
        { value: 'jee-main', label: 'JEE Main' },
        { value: 'jee-advanced', label: 'JEE Advanced' },
      ],
      semesters: [],
      subjectsByBranch: {
        'jee-main': [
          { value: 'physics', label: 'Physics' },
          { value: 'math', label: 'Math' },
          { value: 'chemistry', label: 'Chemistry' },
        ],
        'jee-advanced': [
          { value: 'physics', label: 'Physics' },
          { value: 'math', label: 'Math' },
          { value: 'chemistry', label: 'Chemistry' },
        ],
      },
      semestersByBranch: {},
      subjectsByBranchSemester: {},
    },
    {
      value: 'competitive',
      label: 'Competitive Exams',
      kind: 'branch-subject',
      branches: [
        { value: 'banking', label: 'Banking' },
        { value: 'cuet', label: 'CUET' },
        { value: 'nda', label: 'NDA' },
        { value: 'railway', label: 'Railway' },
        { value: 'ssc', label: 'SSC' },
        { value: 'upsc', label: 'UPSC' },
      ],
      semesters: [],
      subjectsByBranch: {
        banking: [{ value: 'aptitude', label: 'Aptitude' }],
        cuet: [{ value: 'humanities-foundation', label: 'Humanities Foundation' }],
        nda: [{ value: 'general-studies', label: 'General Studies' }],
        railway: [{ value: 'general-studies', label: 'General Studies' }],
        ssc: [{ value: 'aptitude', label: 'Aptitude' }],
        upsc: [{ value: 'general-studies', label: 'General Studies' }],
      },
      semestersByBranch: {},
      subjectsByBranchSemester: {},
    },
  ],
};

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
  persistSession: false,
  catalog: DEFAULT_CATALOG,
};

const el = {};
const byId = (id) => document.getElementById(id);

function cache() {
  [
    'backendStatus', 'processingHint', 'navToggle', 'navLinks',
    'levelInput', 'customLevelWrap', 'customLevelInput',
    'branchPanel', 'branchLabel', 'branchInput', 'customBranchInput',
    'semesterPanel', 'semesterLabel', 'semesterInput', 'customSemesterInput',
    'subjectPanel', 'subjectLabel', 'subjectInput', 'customSubjectInput',
    'difficultyInput', 'countModeInput', 'manualCountWrap', 'questionCountInput',
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

function setHidden(node, hidden) {
  if (!node) return;
  node.classList.toggle('quiz-hidden', hidden);
}

function populateSelect(select, items, placeholder, includeOther = true) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = '';
  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = placeholder;
  select.appendChild(placeholderOption);
  (items || []).forEach((item) => {
    const option = document.createElement('option');
    option.value = String(item.value ?? '');
    option.textContent = String(item.label ?? item.value ?? '');
    select.appendChild(option);
  });
  if (includeOther) {
    const other = document.createElement('option');
    other.value = 'other';
    other.textContent = 'Other';
    select.appendChild(other);
  }
  if (Array.from(select.options).some((opt) => opt.value === current)) {
    select.value = current;
  }
}

function levelEntries() {
  return Array.isArray(state.catalog?.levels) ? state.catalog.levels : [];
}

function getLevelEntry(levelValue) {
  return levelEntries().find((entry) => String(entry.value) === String(levelValue)) || null;
}

const LEVEL_DISPLAY_ORDER = [
  'class-1', 'class-2', 'class-3', 'class-4', 'class-5', 'class-6',
  'class-7', 'class-8', 'class-9', 'class-10', 'class-11', 'class-12',
  'diploma', 'iti', 'graduation', 'iit', 'competitive'
];

function normalizeCatalog(catalog) {
  if (!catalog || typeof catalog !== 'object') return DEFAULT_CATALOG;
  const next = { ...DEFAULT_CATALOG, ...catalog };
  if (!Array.isArray(next.levels) || !next.levels.length) return DEFAULT_CATALOG;
  return next;
}

function staticLevelItems() {
  const order = new Map(LEVEL_DISPLAY_ORDER.map((value, index) => [value, index]));
  return [...levelEntries()]
    .sort((a, b) => (order.get(String(a.value)) ?? 999) - (order.get(String(b.value)) ?? 999))
    .map((entry) => ({
      value: entry.value,
      label: entry.label,
    }));
}

function subjectItemsForLevel(levelEntry, branchValue, semesterValue) {
  if (!levelEntry) return [];
  if (levelEntry.kind === 'school') {
    return Array.isArray(levelEntry.subjects) ? levelEntry.subjects : [];
  }
  if (levelEntry.kind === 'branch-semester') {
    if (branchValue && semesterValue) {
      return levelEntry.subjectsByBranchSemester?.[branchValue]?.[semesterValue] || [];
    }
    if (branchValue) {
      return levelEntry.subjectsByBranch?.[branchValue] || [];
    }
    return [];
  }
  if (levelEntry.kind === 'branch-subject') {
    if (branchValue) {
      return levelEntry.subjectsByBranch?.[branchValue] || [];
    }
    return [];
  }
  return [];
}

function semesterItemsForLevel(levelEntry, branchValue) {
  if (!levelEntry || levelEntry.kind !== 'branch-semester') return [];
  if (branchValue && levelEntry.semestersByBranch?.[branchValue]) {
    return levelEntry.semestersByBranch[branchValue];
  }
  return Array.isArray(levelEntry.semesters) ? levelEntry.semesters : [];
}

function branchItemsForLevel(levelEntry) {
  if (!levelEntry) return [];
  return Array.isArray(levelEntry.branches) ? levelEntry.branches : [];
}

function syncBranchCustomInput() {
  const levelValue = String(el.levelInput?.value || '');
  if (levelValue === 'other') return;
  setHidden(el.customBranchInput, String(el.branchInput?.value || '') !== 'other');
}

function syncSemesterCustomInput() {
  const levelValue = String(el.levelInput?.value || '');
  if (levelValue === 'other') return;
  setHidden(el.customSemesterInput, String(el.semesterInput?.value || '') !== 'other');
}

function syncSubjectCustomInput() {
  const levelValue = String(el.levelInput?.value || '');
  if (levelValue === 'other') return;
  const showCustom = String(el.subjectInput?.value || '') === 'other' || el.subjectInput?.classList.contains('quiz-hidden');
  setHidden(el.customSubjectInput, !showCustom);
}

function currentCustomValue(selectNode, customNode) {
  const raw = String(selectNode?.value || '');
  const customVisible = customNode && !customNode.classList.contains('quiz-hidden');
  const selectHidden = selectNode && selectNode.classList.contains('quiz-hidden');
  if (raw === 'other' || selectHidden || (raw === '' && customVisible)) {
    return String(customNode?.value || '').trim().replace(/\s+/g, ' ');
  }
  return raw.trim();
}

function currentQuestionTypeValues() {
  return Array.from(document.querySelectorAll('input[name="qtype"]:checked')).map((node) => node.value);
}

function currentConfig() {
  const levelRaw = String(el.levelInput?.value || 'class-10');
  const levelEntry = getLevelEntry(levelRaw);
  const customLevel = currentCustomValue(el.levelInput, el.customLevelInput);
  const selectedLevel = levelRaw === 'other' ? customLevel : levelRaw;

  const branchVisible = !['school'].includes(levelEntry?.kind) || levelRaw === 'other';
  const semesterVisible = levelEntry?.kind === 'branch-semester' || levelRaw === 'other';

  const branch = branchVisible
    ? currentCustomValue(el.branchInput, el.customBranchInput)
    : '';

  const semester = semesterVisible
    ? currentCustomValue(el.semesterInput, el.customSemesterInput)
    : '';

  const subject = currentCustomValue(el.subjectInput, el.customSubjectInput);

  return {
    topic: subject || selectedLevel,
    level: selectedLevel,
    subject,
    branch,
    semester,
    difficulty: String(el.difficultyInput?.value || 'medium'),
    questionTypes: currentQuestionTypeValues(),
    countMode: String(el.countModeInput?.value || 'manual'),
    questionCount: Number(el.questionCountInput?.value || 10),
    randomMin: 5,
    randomMax: 30,
    timerMode: String(el.timerModeInput?.value || 'no_limit'),
    timerMinutes: Number(el.timerMinutesInput?.value || 10),
  };
}

function validateConfig(config) {
  const levelEntry = getLevelEntry(String(config.level || ''));
  const isCustomLevel = !levelEntry || String(config.level || '') === 'other';
  const branchVisible = isCustomLevel || levelEntry.kind !== 'school';
  const semesterVisible = isCustomLevel || levelEntry.kind === 'branch-semester';

  if (!config.level || config.level.length < 2) return 'Choose a valid education level.';
  if (branchVisible && (!config.branch || config.branch.length < 2)) return 'Choose or type a valid branch / trade.';
  if (semesterVisible && (!config.semester || config.semester.length < 2)) return 'Choose or type a valid semester.';
  if (!config.subject || config.subject.length < 2) return 'Choose or type a valid topic / subject.';
  if (!config.questionTypes.length) return 'Choose at least one question type.';
  if (config.countMode === 'manual' && (!Number.isFinite(config.questionCount) || config.questionCount < 5 || config.questionCount > 30)) {
    return 'Question count must be between 5 and 30.';
  }
  if (config.timerMode === 'manual' && (!Number.isFinite(config.timerMinutes) || config.timerMinutes < 5 || config.timerMinutes > 60)) {
    return 'Timer must be between 5 and 60 minutes.';
  }
  return '';
}

function saveSession() {
  if (!state.persistSession || !state.quiz) return;
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
  state.persistSession = false;
}

function restoreSession() {
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch (_) {}
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    if (!data?.quiz?.questions?.length) return false;
    state.sessionToken = data.sessionToken || '';
    state.persistSession = true;
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

function resetToSetup(message = 'Preparing quiz engine...') {
  if (state.sessionToken) cleanupBackendSession(state.sessionToken, 0);
  clearSavedSession();
  resetQuizOnly();
  if (el.quizCard) el.quizCard.style.display = 'none';
  if (el.resultCard) el.resultCard.style.display = 'none';
  setStatus(message, 'loading');
  setHint(message);
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

function updateLevelUI() {
  const levelValue = String(el.levelInput?.value || 'class-10');
  const levelEntry = getLevelEntry(levelValue);

  const isOther = levelValue === 'other';
  const isSchool = levelEntry?.kind === 'school';
  const isBranchSemester = levelEntry?.kind === 'branch-semester';
  const isBranchSubject = levelEntry?.kind === 'branch-subject';

  setHidden(el.customLevelWrap, !isOther);
  setHidden(el.branchPanel, isSchool && !isOther);
  setHidden(el.semesterPanel, !(isBranchSemester || isOther));
  setHidden(el.subjectPanel, false);

  if (el.branchLabel) {
    el.branchLabel.textContent = isBranchSubject ? 'Exam / Track' : 'Branch / Trade';
  }
  if (el.semesterLabel) {
    el.semesterLabel.textContent = 'Semester';
  }
  if (el.subjectLabel) {
    el.subjectLabel.textContent = 'Topic / Subject';
  }

  if (isOther) {
    setHidden(el.branchInput, true);
    setHidden(el.semesterInput, true);
    setHidden(el.subjectInput, true);
    setHidden(el.customBranchInput, false);
    setHidden(el.customSemesterInput, false);
    setHidden(el.customSubjectInput, false);
    if (el.customLevelInput && !el.customLevelInput.value) {
      el.customLevelInput.placeholder = 'Type education level exactly as you need it';
    }
  } else if (isSchool) {
    setHidden(el.branchInput, true);
    setHidden(el.customBranchInput, true);
    setHidden(el.semesterInput, true);
    setHidden(el.customSemesterInput, true);
    setHidden(el.subjectInput, false);
    setHidden(el.customSubjectInput, true);
    populateSelect(el.subjectInput, subjectItemsForLevel(levelEntry), 'Select topic / subject');
  } else if (isBranchSemester) {
    setHidden(el.branchInput, false);
    setHidden(el.customBranchInput, true);
    setHidden(el.semesterInput, false);
    setHidden(el.customSemesterInput, true);
    setHidden(el.subjectInput, false);
    setHidden(el.customSubjectInput, true);
    populateSelect(el.branchInput, branchItemsForLevel(levelEntry), 'Select branch / trade');
    populateSelect(el.semesterInput, semesterItemsForLevel(levelEntry, String(el.branchInput?.value || '')), 'Select semester');
    populateSelect(el.subjectInput, subjectItemsForLevel(levelEntry, String(el.branchInput?.value || ''), String(el.semesterInput?.value || '')), 'Select topic / subject');
  } else if (isBranchSubject) {
    setHidden(el.branchInput, false);
    setHidden(el.customBranchInput, true);
    setHidden(el.semesterInput, true);
    setHidden(el.customSemesterInput, true);
    setHidden(el.subjectInput, false);
    setHidden(el.customSubjectInput, true);
    populateSelect(el.branchInput, branchItemsForLevel(levelEntry), isBranchSubject ? 'Select exam / track' : 'Select branch / trade');
    populateSelect(el.subjectInput, subjectItemsForLevel(levelEntry, String(el.branchInput?.value || '')), 'Select topic / subject');
  }

  syncBranchCustomInput();
  syncSemesterCustomInput();
  syncSubjectCustomInput();
  updateSubjectPanel();
  updateGenerateButton();
}

function updateSubjectPanel() {
  const levelValue = String(el.levelInput?.value || 'class-10');
  const levelEntry = getLevelEntry(levelValue);
  const isOther = levelValue === 'other';

  if (isOther) {
    setHidden(el.subjectInput, true);
    setHidden(el.customSubjectInput, false);
    return;
  }

  const branchValue = currentCustomValue(el.branchInput, el.customBranchInput);
  const semesterValue = currentCustomValue(el.semesterInput, el.customSemesterInput);
  const subjects = subjectItemsForLevel(levelEntry, branchValue, semesterValue);

  if (subjects.length) {
    setHidden(el.subjectInput, false);
    populateSelect(el.subjectInput, subjects, 'Select topic / subject');
  } else {
    setHidden(el.subjectInput, true);
  }

  syncSubjectCustomInput();
}

function updateBranchUI() {
  const levelValue = String(el.levelInput?.value || 'class-10');
  const levelEntry = getLevelEntry(levelValue);
  if (!levelEntry) return;

  if (levelEntry.kind === 'branch-semester' || levelEntry.kind === 'branch-subject') {
    populateSelect(el.branchInput, branchItemsForLevel(levelEntry), levelEntry.kind === 'branch-subject' ? 'Select exam / track' : 'Select branch / trade');
    const branchValue = String(el.branchInput?.value || '');
    if (levelEntry.kind === 'branch-semester') {
      populateSelect(el.semesterInput, semesterItemsForLevel(levelEntry, branchValue), 'Select semester');
    }
    syncBranchCustomInput();
    updateSubjectPanel();
  }
}

function updateSemesterUI() {
  const levelValue = String(el.levelInput?.value || 'class-10');
  const levelEntry = getLevelEntry(levelValue);
  if (levelEntry?.kind !== 'branch-semester') return;
  const branchValue = String(el.branchInput?.value || '');
  populateSelect(el.semesterInput, semesterItemsForLevel(levelEntry, branchValue), 'Select semester');
  syncSemesterCustomInput();
  updateSubjectPanel();
}

async function loadCapabilities() {
  try {
    const res = await fetch(API_CAPABILITIES, { method: 'GET', cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('capabilities');
    const json = await res.json();
    if (json?.success && json?.data?.bankCatalog) {
      state.catalog = normalizeCatalog(json.data.bankCatalog);
      renderLevelOptions();
      updateLevelUI();
      setStatus('Quiz engine ready.', 'ready');
      setHint('Ready to generate quizzes.');
      state.backendReady = true;
      updateGenerateButton();
      return;
    }
    throw new Error('bad response');
  } catch (_) {
    state.catalog = normalizeCatalog(DEFAULT_CATALOG);
    renderLevelOptions();
    updateLevelUI();
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
  state.persistSession = false;
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

  const manualMode = String(el.countModeInput?.value || 'manual') === 'manual';
  const payload = {
    topic: config.subject,
    level: config.level,
    subject: config.subject,
    branch: config.branch || '',
    semester: config.semester || '',
    difficulty: config.difficulty,
    questionTypes: config.questionTypes,
    countMode: manualMode ? 'manual' : 'auto',
    questionCount: manualMode ? clamp(Number(el.questionCountInput?.value || 10), 5, 30) : 10,
    randomMin: manualMode ? 5 : 5,
    randomMax: manualMode ? 30 : 30,
    timerMode: String(el.timerModeInput?.value || 'no_limit'),
    timerMinutes: String(el.timerModeInput?.value || 'no_limit') === 'manual' ? clamp(Number(el.timerMinutesInput?.value || 10), 5, 60) : 10,
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
    state.persistSession = true;
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

function renderLevelOptions() {
  populateSelect(el.levelInput, staticLevelItems(), 'Choose education level');
}

function bindEvents() {
  el.navToggle?.addEventListener('click', () => {
    el.navLinks?.classList.toggle('open');
    el.navToggle?.classList.toggle('open');
  });

  el.levelInput?.addEventListener('change', () => {
    updateLevelUI();
    updateBranchUI();
    updateSemesterUI();
    updateGenerateButton();
  });

  el.customLevelInput?.addEventListener('input', updateGenerateButton);

  el.branchInput?.addEventListener('change', () => {
    const levelEntry = getLevelEntry(String(el.levelInput?.value || ''));
    if (levelEntry?.kind === 'branch-semester') {
      updateSemesterUI();
    }
    syncBranchCustomInput();
    updateSubjectPanel();
    updateGenerateButton();
  });
  el.customBranchInput?.addEventListener('input', updateGenerateButton);

  el.semesterInput?.addEventListener('change', () => {
    syncSemesterCustomInput();
    updateSubjectPanel();
    updateGenerateButton();
  });
  el.customSemesterInput?.addEventListener('input', updateGenerateButton);

  el.subjectInput?.addEventListener('change', () => {
    syncSubjectCustomInput();
    updateGenerateButton();
  });
  el.customSubjectInput?.addEventListener('input', updateGenerateButton);

  el.difficultyInput?.addEventListener('change', updateGenerateButton);

  el.countModeInput?.addEventListener('change', () => {
    const manual = String(el.countModeInput?.value || 'manual') === 'manual';
    setHidden(el.manualCountWrap, !manual);
    updateGenerateButton();
  });

  el.timerModeInput?.addEventListener('change', () => {
    const manual = String(el.timerModeInput?.value || 'no_limit') === 'manual';
    setHidden(el.timerWrap, !manual);
    updateGenerateButton();
  });

  [el.questionCountInput, el.timerMinutesInput]
    .forEach((node) => node?.addEventListener('input', updateGenerateButton));

  document.querySelectorAll('input[name="qtype"]').forEach((node) => node.addEventListener('change', updateGenerateButton));

  el.generateBtn?.addEventListener('click', () => { void generateQuiz(); });

  el.resetBtn?.addEventListener('click', () => {
    resetToSetup('Preparing quiz engine...');
  });

  el.prevBtn?.addEventListener('click', () => gotoQuestion(state.currentIndex - 1));
  el.nextBtn?.addEventListener('click', () => gotoQuestion(state.currentIndex + 1));
  el.submitBtn?.addEventListener('click', () => { void submitQuiz(false); });

  el.newQuizBtn?.addEventListener('click', () => {
    resetToSetup('Preparing quiz engine...');
  });

  el.clearSavedBtn?.addEventListener('click', () => {
    resetToSetup('Saved quiz session cleared.');
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
  renderLevelOptions();
  setHidden(el.manualCountWrap, String(el.countModeInput?.value || 'manual') !== 'manual');
  setHidden(el.timerWrap, String(el.timerModeInput?.value || 'no_limit') !== 'manual');
  updateLevelUI();
  updateBranchUI();
  updateSemesterUI();
  updateSubjectPanel();
  updateGenerateButton();
  setStatus('Preparing quiz engine...', 'loading');
  setHint('Preparing quiz engine...');
  state.persistSession = false;

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
