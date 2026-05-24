/* ============================================================
   TORNADOTOOLS — RESUME-BUILDER.JS
   Fixed:
   - Clean live preview
   - Stable PDF export from a separate unscaled export surface
   - Stable image export
   - Dynamic education / experience / projects
   - Photo upload
   - Template switching
   - localStorage restore
   - Zoom control
   - Section accordion
   ============================================================ */

(function () {
  'use strict';

  const DEFAULT_STATE = {
    template: 'modern',
    accent: '#6c63ff',
    font: "'Rajdhani', sans-serif",
    fontSize: '14px',
    photo: '',
    name: '',
    title: '',
    email: '',
    phone: '',
    address: '',
    linkedin: '',
    github: '',
    portfolio: '',
    summary: '',
    skills: '',
    education: [],
    experience: [],
    projects: []
  };

  const TEMPLATE_ALIASES = {
    modern: 'modern',
    minimal: 'minimal',
    neon: 'neon',
    corporate: 'corporate',
    ats: 'ats',
    elegant: 'elegant',
    sidebar: 'sidebar',
    compact: 'compact',
    executive: 'executive'
  };

  const LS_KEY = 'tornado_resume_v4';
  const EXPORT_WIDTH = 794;
  const EXPORT_HEIGHT = 1123;

  let state = cloneState(DEFAULT_STATE);
  let zoomLevel = 90;
  let toastTimer = null;
  let renderQueued = false;
  let exportShell = null;

  const $ = (id) => document.getElementById(id);

  const els = {
    resumeOutput: $('resumeOutput'),
    previewScale: $('previewScale'),
    previewViewport: $('previewViewport'),
    zoomVal: $('zoomVal'),
    btnZoomIn: $('btnZoomIn'),
    btnZoomOut: $('btnZoomOut'),
    btnDownloadPDF: $('btnDownloadPDF'),
    btnDownloadImg: $('btnDownloadImg'),
    btnClearAll: $('btnClearAll'),
    pdfOverlay: $('pdfOverlay'),
    rbToast: $('rbToast'),
    photoPreview: $('photoPreview'),
    photoImg: $('photoImg'),
    photoUpload: $('photoUpload'),
    btnRemovePhoto: $('btnRemovePhoto'),
    educationList: $('educationList'),
    experienceList: $('experienceList'),
    projectsList: $('projectsList'),
    skillTagsPreview: $('skillTagsPreview'),
    accentColor: $('accentColor'),
    fontFamily: $('fontFamily'),
    fontSize: $('fontSize'),
    fName: $('fName'),
    fTitle: $('fTitle'),
    fEmail: $('fEmail'),
    fPhone: $('fPhone'),
    fAddress: $('fAddress'),
    fLinkedIn: $('fLinkedIn'),
    fGithub: $('fGithub'),
    fPortfolio: $('fPortfolio'),
    fSummary: $('fSummary'),
    fSkills: $('fSkills')
  };

  function cloneState(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, '&#39;');
  }

  function normalizeTemplate(value) {
    const key = String(value || '').toLowerCase().trim();
    return TEMPLATE_ALIASES[key] || 'modern';
  }

  function normalizeUrl(raw) {
    const value = String(raw || '').trim();
    if (!value) return '';
    if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;
    return 'https://' + value.replace(/^\/+/, '');
  }

  function displayUrl(raw) {
    const value = String(raw || '').trim();
    if (!value) return '';
    return value
      .replace(/^https?:\/\//i, '')
      .replace(/^mailto:/i, '')
      .replace(/^tel:/i, '');
  }

  function slugifyFileName(value) {
    const base = String(value || 'resume')
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');
    return base || 'resume';
  }

  function emptyState(label) {
    return `<p class="res-empty-label">${escapeHtml(label)}</p>`;
  }

  function toast(msg, type, duration) {
    duration = duration || 2500;
    const el = els.rbToast;
    if (!el) return;

    el.textContent = msg;
    el.className = 'rb-toast show' + (type === 'warn' ? ' warn' : '');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('show');
    }, duration);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      state = Object.assign(cloneState(DEFAULT_STATE), parsed || {});
      state.template = normalizeTemplate(state.template);
      state.education = Array.isArray(state.education) ? state.education : [];
      state.experience = Array.isArray(state.experience) ? state.experience : [];
      state.projects = Array.isArray(state.projects) ? state.projects : [];
    } catch (err) {
      try { localStorage.removeItem(LS_KEY); } catch (e) {}
      state = cloneState(DEFAULT_STATE);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (err) {
      // ignore storage issues
    }
  }

  function setPhotoVisibility(hasPhoto) {
    const placeholder = document.querySelector('.rb-photo-placeholder');
    if (els.photoImg) {
      els.photoImg.style.display = hasPhoto ? 'block' : 'none';
      if (hasPhoto) {
        els.photoImg.src = state.photo;
      } else {
        els.photoImg.removeAttribute('src');
      }
    }
    if (placeholder) placeholder.style.display = hasPhoto ? 'none' : 'block';
  }

  function syncTemplateButtons() {
    document.querySelectorAll('.rb-tpl-btn').forEach((btn) => {
      btn.classList.toggle('active', normalizeTemplate(btn.dataset.tpl) === state.template);
    });
  }

  function populateForm() {
    if (els.fName) els.fName.value = state.name || '';
    if (els.fTitle) els.fTitle.value = state.title || '';
    if (els.fEmail) els.fEmail.value = state.email || '';
    if (els.fPhone) els.fPhone.value = state.phone || '';
    if (els.fAddress) els.fAddress.value = state.address || '';
    if (els.fLinkedIn) els.fLinkedIn.value = state.linkedin || '';
    if (els.fGithub) els.fGithub.value = state.github || '';
    if (els.fPortfolio) els.fPortfolio.value = state.portfolio || '';
    if (els.fSummary) els.fSummary.value = state.summary || '';
    if (els.fSkills) els.fSkills.value = state.skills || '';
    if (els.accentColor) els.accentColor.value = state.accent || DEFAULT_STATE.accent;
    if (els.fontFamily) els.fontFamily.value = state.font || DEFAULT_STATE.font;
    if (els.fontSize) els.fontSize.value = state.fontSize || DEFAULT_STATE.fontSize;

    syncTemplateButtons();
    setPhotoVisibility(Boolean(state.photo));

    clearList(els.educationList);
    clearList(els.experienceList);
    clearList(els.projectsList);

    (state.education || []).forEach((entry) => addEducationRow(entry));
    (state.experience || []).forEach((entry) => addExperienceRow(entry));
    (state.projects || []).forEach((entry) => addProjectRow(entry));

    if (!state.education.length) addEducationRow();
    if (!state.experience.length) addExperienceRow();
    if (!state.projects.length) addProjectRow();
  }

  function clearList(el) {
    if (!el) return;
    el.innerHTML = '';
  }

  function valueFromRow(row, key) {
    const node = row.querySelector(`[data-f="${key}"]`);
    return node ? String(node.value || '').trim() : '';
  }

  function collectEducation() {
    const rows = els.educationList ? els.educationList.querySelectorAll('.rb-entry') : [];
    state.education = Array.from(rows)
      .map((row) => ({
        degree: valueFromRow(row, 'degree'),
        school: valueFromRow(row, 'school'),
        year: valueFromRow(row, 'year'),
        grade: valueFromRow(row, 'grade')
      }))
      .filter((item) => item.degree || item.school || item.year || item.grade);
  }

  function collectExperience() {
    const rows = els.experienceList ? els.experienceList.querySelectorAll('.rb-entry') : [];
    state.experience = Array.from(rows)
      .map((row) => ({
        company: valueFromRow(row, 'company'),
        role: valueFromRow(row, 'role'),
        duration: valueFromRow(row, 'duration'),
        desc: valueFromRow(row, 'desc')
      }))
      .filter((item) => item.company || item.role || item.duration || item.desc);
  }

  function collectProjects() {
    const rows = els.projectsList ? els.projectsList.querySelectorAll('.rb-entry') : [];
    state.projects = Array.from(rows)
      .map((row) => ({
        title: valueFromRow(row, 'ptitle'),
        tech: valueFromRow(row, 'tech'),
        desc: valueFromRow(row, 'pdesc'),
        link: valueFromRow(row, 'plink')
      }))
      .filter((item) => item.title || item.tech || item.desc || item.link);
  }

  function collectAll() {
    state.name = els.fName ? els.fName.value.trim() : '';
    state.title = els.fTitle ? els.fTitle.value.trim() : '';
    state.email = els.fEmail ? els.fEmail.value.trim() : '';
    state.phone = els.fPhone ? els.fPhone.value.trim() : '';
    state.address = els.fAddress ? els.fAddress.value.trim() : '';
    state.linkedin = els.fLinkedIn ? els.fLinkedIn.value.trim() : '';
    state.github = els.fGithub ? els.fGithub.value.trim() : '';
    state.portfolio = els.fPortfolio ? els.fPortfolio.value.trim() : '';
    state.summary = els.fSummary ? els.fSummary.value.trim() : '';
    state.skills = els.fSkills ? els.fSkills.value.trim() : '';

    collectEducation();
    collectExperience();
    collectProjects();
    saveState();
  }

  function parseSkills() {
    const raw = String(state.skills || '');
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const levelMatch = item.match(/^(.*?)(?:\s*(?:=|:|-|\|)\s*(\d{1,3})\s*%?)$/) ||
                           item.match(/^(.*?)\s*\((\d{1,3})%\)$/);
        if (!levelMatch) {
          return { label: item, level: null };
        }
        const label = String(levelMatch[1] || '').trim();
        const level = Math.max(0, Math.min(100, parseInt(levelMatch[2], 10)));
        return { label: label || item, level: Number.isFinite(level) ? level : null };
      });
  }

  function renderSkillPreview() {
    if (!els.skillTagsPreview || !els.fSkills) return;
    const skills = String(els.fSkills.value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    els.skillTagsPreview.innerHTML = skills.length
      ? skills.map((item) => `<span class="rb-skill-chip">${escapeHtml(item)}</span>`).join('')
      : '';
  }

  function buildContacts(template) {
    const items = [
      { key: 'email', label: 'Email', icon: '✉', value: state.email, href: state.email ? `mailto:${state.email}` : '' },
      { key: 'phone', label: 'Phone', icon: '📱', value: state.phone, href: state.phone ? `tel:${state.phone}` : '' },
      { key: 'address', label: 'Address', icon: '📍', value: state.address, href: '' },
      { key: 'linkedin', label: 'LinkedIn', icon: '🔗', value: state.linkedin, href: normalizeUrl(state.linkedin) },
      { key: 'github', label: 'GitHub', icon: '💻', value: state.github, href: normalizeUrl(state.github) },
      { key: 'portfolio', label: 'Portfolio', icon: '🌐', value: state.portfolio, href: normalizeUrl(state.portfolio) }
    ].filter((item) => item.value);

    if (!items.length) return '';

    if (template === 'ats') {
      return items
        .map((item) => `${item.label}: ${escapeHtml(displayUrl(item.value) || item.value)}`)
        .join(' | ');
    }

    return items.map((item) => {
      if (item.href && (item.key === 'linkedin' || item.key === 'github' || item.key === 'portfolio')) {
        return `<span>${item.icon} <a href="${escapeAttr(item.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(displayUrl(item.value) || item.value)}</a></span>`;
      }
      if (item.href && (item.key === 'email' || item.key === 'phone')) {
        return `<span>${item.icon} <a href="${escapeAttr(item.href)}">${escapeHtml(item.value)}</a></span>`;
      }
      return `<span>${item.icon} ${escapeHtml(item.value)}</span>`;
    }).join('');
  }

  function linkify(raw) {
    const href = normalizeUrl(raw);
    if (!href) return '';
    return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(displayUrl(raw) || raw)}</a>`;
  }

  function photoMarkup() {
    if (state.photo) {
      return `<img class="res-photo" src="${escapeAttr(state.photo)}" alt="Profile photo">`;
    }
    return `<div class="res-photo-placeholder">👤</div>`;
  }

  function buildLinksList() {
    const links = [
      { label: 'LinkedIn', value: state.linkedin },
      { label: 'GitHub', value: state.github },
      { label: 'Portfolio', value: state.portfolio }
    ].filter((item) => item.value);

    if (!links.length) return emptyState('No links added yet.');

    return links
      .map((item) => `<div class="res-link-item">${escapeHtml(item.label)}: ${linkify(item.value)}</div>`)
      .join('');
  }

  function buildSkillMarkup() {
    const skills = parseSkills();
    if (!skills.length) return emptyState('No skills added yet.');

    const hasLevels = skills.some((s) => s.level !== null);

    if (!hasLevels) {
      return `<div class="res-skill-tags">
        ${skills.map((s) => `<span class="res-skill-tag">${escapeHtml(s.label)}</span>`).join('')}
      </div>`;
    }

    return `<div style="display:flex;flex-direction:column;gap:10px;">
      ${skills.map((s) => {
        if (s.level === null) {
          return `<span class="res-skill-tag" style="align-self:flex-start;">${escapeHtml(s.label)}</span>`;
        }
        return `
          <div class="res-skill-meter">
            <div class="res-skill-meter-top">
              <span>${escapeHtml(s.label)}</span>
              <span>${s.level}%</span>
            </div>
            <div class="res-skill-meter-track">
              <div class="res-skill-meter-fill" style="width:${s.level}%"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>`;
  }

  function buildEducation() {
    if (!state.education.length) return emptyState('No education added yet.');

    const html = state.education.map((e) => {
      if (!e.degree && !e.school && !e.year && !e.grade) return '';
      return `
        <div class="res-entry">
          <div class="res-entry-top">
            <div>
              <div class="res-entry-name">${escapeHtml(e.degree || '')}</div>
              <div class="res-entry-sub">${escapeHtml(e.school || '')}</div>
            </div>
            <div class="res-entry-date">${escapeHtml([e.year, e.grade].filter(Boolean).join(' · '))}</div>
          </div>
        </div>
      `;
    }).join('');

    return html || emptyState('No education added yet.');
  }

  function buildExperience() {
    if (!state.experience.length) return emptyState('No experience added yet.');

    const html = state.experience.map((e) => {
      if (!e.company && !e.role && !e.duration && !e.desc) return '';
      return `
        <div class="res-entry">
          <div class="res-entry-top">
            <div>
              <div class="res-entry-name">${escapeHtml(e.role || '')}</div>
              <div class="res-entry-sub">${escapeHtml(e.company || '')}</div>
            </div>
            <div class="res-entry-date">${escapeHtml(e.duration || '')}</div>
          </div>
          ${e.desc ? `<div class="res-entry-desc">${escapeHtml(e.desc).replace(/\n/g, '<br>')}</div>` : ''}
        </div>
      `;
    }).join('');

    return html || emptyState('No experience added yet.');
  }

  function buildProjects() {
    if (!state.projects.length) return emptyState('No projects added yet.');

    const html = state.projects.map((p) => {
      if (!p.title && !p.tech && !p.desc && !p.link) return '';
      return `
        <div class="res-entry">
          <div class="res-entry-top">
            <div>
              <div class="res-entry-name">${escapeHtml(p.title || '')}</div>
              ${p.tech ? `<div class="res-entry-sub">${escapeHtml(p.tech)}</div>` : ''}
            </div>
            ${p.link ? `<div class="res-entry-date">${linkify(p.link)}</div>` : ''}
          </div>
          ${p.desc ? `<div class="res-entry-desc">${escapeHtml(p.desc).replace(/\n/g, '<br>')}</div>` : ''}
        </div>
      `;
    }).join('');

    return html || emptyState('No projects added yet.');
  }

  function section(title, content, options) {
    options = options || {};
    const emptyText = options.empty || `No ${String(title).toLowerCase()} added yet.`;
    const body = content && String(content).trim() ? content : emptyState(emptyText);
    const prefix = options.prefix ? escapeHtml(options.prefix) : '';
    return `
      <div class="res-section">
        <div class="res-section-title">${prefix}${escapeHtml(title)}</div>
        ${body}
      </div>
    `;
  }

  function renderModern() {
    return `
      <div class="res-header">
        ${photoMarkup()}
        <div class="res-header-info">
          <div class="res-name">${escapeHtml(state.name || 'Your Name')}</div>
          <div class="res-title">${escapeHtml(state.title || 'Professional Title')}</div>
          <div class="res-contacts">${buildContacts('modern')}</div>
        </div>
      </div>

      <div class="res-body">
        <div class="res-sidebar">
          ${section('Links', buildLinksList())}
          ${section('Skills', buildSkillMarkup())}
          ${section('Education', buildEducation())}
        </div>

        <div class="res-main">
          ${state.summary ? section('Summary', `<div class="res-summary">${escapeHtml(state.summary).replace(/\n/g, '<br>')}</div>`) : ''}
          ${section('Experience', buildExperience())}
          ${section('Projects', buildProjects())}
        </div>
      </div>
    `;
  }

  function renderMinimal() {
    return `
      <div class="res-header">
        ${photoMarkup()}
        <div>
          <div class="res-name">${escapeHtml(state.name || 'Your Name')}</div>
          <div class="res-title">${escapeHtml(state.title || 'Professional Title')}</div>
          <div class="res-contacts">${buildContacts('minimal')}</div>
        </div>
      </div>

      <div class="res-body">
        ${state.summary ? section('About', `<div class="res-summary">${escapeHtml(state.summary).replace(/\n/g, '<br>')}</div>`) : ''}
        ${section('Experience', buildExperience())}
        ${section('Education', buildEducation())}
        ${section('Projects', buildProjects())}
        ${section('Skills', buildSkillMarkup())}
        ${section('Links', buildLinksList())}
      </div>
    `;
  }

  function renderNeon() {
    return `
      <div class="res-header">
        ${photoMarkup()}
        <div>
          <div class="res-name">${escapeHtml(state.name || 'YOUR NAME')}</div>
          <div class="res-title">${escapeHtml(state.title || 'PROFESSIONAL TITLE')}</div>
          <div class="res-contacts">${buildContacts('neon')}</div>
        </div>
      </div>

      <div class="res-body">
        <div>
          ${state.summary ? section('About', `<div class="res-summary">${escapeHtml(state.summary).replace(/\n/g, '<br>')}</div>`, { prefix: '// ' }) : ''}
          ${section('Experience', buildExperience(), { prefix: '// ' })}
          ${section('Projects', buildProjects(), { prefix: '// ' })}
        </div>
        <div>
          ${section('Education', buildEducation(), { prefix: '// ' })}
          ${section('Skills', buildSkillMarkup(), { prefix: '// ' })}
          ${section('Links', buildLinksList(), { prefix: '// ' })}
        </div>
      </div>
    `;
  }

  function renderCorporate() {
    return `
      <div class="res-header">
        ${photoMarkup()}
        <div>
          <div class="res-name">${escapeHtml(state.name || 'Your Name')}</div>
          <div class="res-title">${escapeHtml(state.title || 'Professional Title')}</div>
          <div class="res-contacts">${buildContacts('corporate')}</div>
        </div>
      </div>

      <div class="res-body">
        <div class="res-sidebar">
          ${state.summary ? section('Profile', `<div class="res-summary">${escapeHtml(state.summary).replace(/\n/g, '<br>')}</div>`) : ''}
          ${section('Skills', buildSkillMarkup())}
          ${section('Education', buildEducation())}
          ${section('Links', buildLinksList())}
        </div>

        <div class="res-main">
          ${section('Experience', buildExperience())}
          ${section('Projects', buildProjects())}
        </div>
      </div>
    `;
  }

  function renderATS() {
    return `
      <div class="res-header">
        <div>
          <div class="res-name">${escapeHtml(state.name || 'Your Name')}</div>
          <div class="res-title">${escapeHtml(state.title || 'Professional Title')}</div>
          <div class="res-contacts">${buildContacts('ats')}</div>
        </div>
      </div>

      <div class="res-body">
        ${state.summary ? section('Summary', `<div class="res-summary">${escapeHtml(state.summary).replace(/\n/g, '<br>')}</div>`) : ''}
        ${section('Skills', buildSkillMarkup())}
        ${section('Education', buildEducation())}
        ${section('Experience', buildExperience())}
        ${section('Projects', buildProjects())}
        ${section('Links', buildLinksList())}
      </div>
    `;
  }

  function renderElegant() {
    return `
      <div class="res-header">
        ${photoMarkup()}
        <div>
          <div class="res-name">${escapeHtml(state.name || 'Your Name')}</div>
          <div class="res-title">${escapeHtml(state.title || 'Professional Title')}</div>
          <div class="res-contacts">${buildContacts('elegant')}</div>
        </div>
      </div>

      <div class="res-body">
        <div class="res-main">
          ${state.summary ? section('Summary', `<div class="res-summary">${escapeHtml(state.summary).replace(/\n/g, '<br>')}</div>`) : ''}
          ${section('Experience', buildExperience())}
          ${section('Projects', buildProjects())}
        </div>

        <div class="res-sidebar">
          ${section('Education', buildEducation())}
          ${section('Skills', buildSkillMarkup())}
          ${section('Links', buildLinksList())}
        </div>
      </div>
    `;
  }

  function renderSidebar() {
    return `
      <div class="res-header">
        ${photoMarkup()}
        <div>
          <div class="res-name">${escapeHtml(state.name || 'Your Name')}</div>
          <div class="res-title">${escapeHtml(state.title || 'Professional Title')}</div>
          <div class="res-contacts">${buildContacts('sidebar')}</div>
        </div>
      </div>

      <div class="res-body">
        <div class="res-sidebar">
          ${state.summary ? section('Profile', `<div class="res-summary">${escapeHtml(state.summary).replace(/\n/g, '<br>')}</div>`) : ''}
          ${section('Skills', buildSkillMarkup())}
          ${section('Education', buildEducation())}
        </div>

        <div class="res-main">
          ${section('Experience', buildExperience())}
          ${section('Projects', buildProjects())}
          ${section('Links', buildLinksList())}
        </div>
      </div>
    `;
  }

  function renderCompact() {
    return `
      <div class="res-header">
        ${photoMarkup()}
        <div>
          <div class="res-name">${escapeHtml(state.name || 'Your Name')}</div>
          <div class="res-title">${escapeHtml(state.title || 'Professional Title')}</div>
          <div class="res-contacts">${buildContacts('compact')}</div>
        </div>
      </div>

      <div class="res-body">
        <div class="res-main">
          ${state.summary ? section('Summary', `<div class="res-summary">${escapeHtml(state.summary).replace(/\n/g, '<br>')}</div>`) : ''}
          ${section('Experience', buildExperience())}
          ${section('Projects', buildProjects())}
        </div>

        <div class="res-sidebar">
          ${section('Education', buildEducation())}
          ${section('Skills', buildSkillMarkup())}
          ${section('Links', buildLinksList())}
        </div>
      </div>
    `;
  }

  function renderExecutive() {
    return `
      <div class="res-header">
        ${photoMarkup()}
        <div>
          <div class="res-name">${escapeHtml(state.name || 'Your Name')}</div>
          <div class="res-title">${escapeHtml(state.title || 'Professional Title')}</div>
          <div class="res-contacts">${buildContacts('executive')}</div>
        </div>
      </div>

      <div class="res-body">
        <div class="res-sidebar">
          ${state.summary ? section('Executive Profile', `<div class="res-summary">${escapeHtml(state.summary).replace(/\n/g, '<br>')}</div>`) : ''}
          ${section('Education', buildEducation())}
          ${section('Skills', buildSkillMarkup())}
          ${section('Links', buildLinksList())}
        </div>

        <div class="res-main">
          ${section('Experience', buildExperience())}
          ${section('Projects', buildProjects())}
        </div>
      </div>
    `;
  }

  function renderResume() {
    collectAll();
    renderSkillPreview();

    if (!els.resumeOutput) return;

    els.resumeOutput.className = `resume-page tpl-${state.template}`;
    els.resumeOutput.style.setProperty('--resume-accent', state.accent || DEFAULT_STATE.accent);
    els.resumeOutput.style.fontFamily = state.font || DEFAULT_STATE.font;
    els.resumeOutput.style.fontSize = state.fontSize || DEFAULT_STATE.fontSize;
    els.resumeOutput.style.width = `${EXPORT_WIDTH}px`;
    els.resumeOutput.style.minHeight = `${EXPORT_HEIGHT}px`;

    switch (state.template) {
      case 'minimal':
        els.resumeOutput.innerHTML = renderMinimal();
        break;
      case 'neon':
        els.resumeOutput.innerHTML = renderNeon();
        break;
      case 'corporate':
        els.resumeOutput.innerHTML = renderCorporate();
        break;
      case 'ats':
        els.resumeOutput.innerHTML = renderATS();
        break;
      case 'elegant':
        els.resumeOutput.innerHTML = renderElegant();
        break;
      case 'sidebar':
        els.resumeOutput.innerHTML = renderSidebar();
        break;
      case 'compact':
        els.resumeOutput.innerHTML = renderCompact();
        break;
      case 'executive':
        els.resumeOutput.innerHTML = renderExecutive();
        break;
      case 'modern':
      default:
        els.resumeOutput.innerHTML = renderModern();
        break;
    }

    updatePreviewScale();
  }

  function renumberEntries(listEl, label) {
    if (!listEl) return;
    const items = listEl.querySelectorAll('.rb-entry');
    items.forEach((row, index) => {
      const badge = row.querySelector('.rb-entry-num');
      if (badge) badge.textContent = `${label} #${index + 1}`;
    });
  }

  function bindEntryRow(row) {
    row.querySelectorAll('.rb-input, .rb-textarea').forEach((inp) => {
      inp.addEventListener('input', scheduleRender);
      inp.addEventListener('change', scheduleRender);
    });
  }

  function createInput(value, placeholder, fieldName, type) {
    return `<input type="${type || 'text'}" data-f="${fieldName}" class="rb-input" placeholder="${escapeAttr(placeholder || '')}" value="${escapeAttr(value || '')}">`;
  }

  function createTextarea(value, placeholder, fieldName) {
    return `<textarea data-f="${fieldName}" class="rb-textarea" rows="3" placeholder="${escapeAttr(placeholder || '')}">${escapeHtml(value || '')}</textarea>`;
  }

  function addEducationRow(data) {
    if (!els.educationList) return;
    data = data || {};

    const row = document.createElement('div');
    row.className = 'rb-entry';
    row.innerHTML = `
      <div class="rb-entry-header">
        <span class="rb-entry-num">Education</span>
        <button class="rb-btn-remove" type="button" data-action="remove">✕ Remove</button>
      </div>
      <div class="rb-grid-2">
        <div class="rb-field">
          <label>Degree / Course</label>
          ${createInput(data.degree, 'B.Tech Computer Science', 'degree')}
        </div>
        <div class="rb-field">
          <label>Institution</label>
          ${createInput(data.school, 'IIT Delhi', 'school')}
        </div>
        <div class="rb-field">
          <label>Year / Duration</label>
          ${createInput(data.year, '2020 - 2024', 'year')}
        </div>
        <div class="rb-field">
          <label>CGPA / Percentage</label>
          ${createInput(data.grade, '8.5 / 86%', 'grade')}
        </div>
      </div>
    `;

    row.querySelector('[data-action="remove"]').addEventListener('click', () => {
      if (els.educationList.querySelectorAll('.rb-entry').length <= 1) {
        toast('At least one education entry is required.', 'warn');
        return;
      }
      row.remove();
      renumberEntries(els.educationList, 'Education');
      scheduleRender();
    });

    bindEntryRow(row);
    els.educationList.appendChild(row);
    renumberEntries(els.educationList, 'Education');
  }

  function addExperienceRow(data) {
    if (!els.experienceList) return;
    data = data || {};

    const row = document.createElement('div');
    row.className = 'rb-entry';
    row.innerHTML = `
      <div class="rb-entry-header">
        <span class="rb-entry-num">Experience</span>
        <button class="rb-btn-remove" type="button" data-action="remove">✕ Remove</button>
      </div>
      <div class="rb-grid-2">
        <div class="rb-field">
          <label>Role / Title</label>
          ${createInput(data.role, 'Frontend Developer', 'role')}
        </div>
        <div class="rb-field">
          <label>Company</label>
          ${createInput(data.company, 'TechNova Solutions', 'company')}
        </div>
        <div class="rb-field">
          <label>Duration</label>
          ${createInput(data.duration, 'May 2025 - Aug 2025', 'duration')}
        </div>
        <div class="rb-field rb-field-full">
          <label>Description</label>
          ${createTextarea(data.desc, 'Describe your responsibilities and achievements...', 'desc')}
        </div>
      </div>
    `;

    row.querySelector('[data-action="remove"]').addEventListener('click', () => {
      if (els.experienceList.querySelectorAll('.rb-entry').length <= 1) {
        toast('At least one experience entry is required.', 'warn');
        return;
      }
      row.remove();
      renumberEntries(els.experienceList, 'Experience');
      scheduleRender();
    });

    bindEntryRow(row);
    els.experienceList.appendChild(row);
    renumberEntries(els.experienceList, 'Experience');
  }

  function addProjectRow(data) {
    if (!els.projectsList) return;
    data = data || {};

    const row = document.createElement('div');
    row.className = 'rb-entry';
    row.innerHTML = `
      <div class="rb-entry-header">
        <span class="rb-entry-num">Project</span>
        <button class="rb-btn-remove" type="button" data-action="remove">✕ Remove</button>
      </div>
      <div class="rb-grid-2">
        <div class="rb-field">
          <label>Project Title</label>
          ${createInput(data.title, 'AI Resume Builder', 'ptitle')}
        </div>
        <div class="rb-field">
          <label>Tech Stack</label>
          ${createInput(data.tech, 'React, Node.js, MongoDB', 'tech')}
        </div>
        <div class="rb-field">
          <label>Project Link</label>
          ${createInput(data.link, 'github.com/your/project', 'plink', 'url')}
        </div>
        <div class="rb-field rb-field-full">
          <label>Description</label>
          ${createTextarea(data.desc, 'What does this project do? What problem does it solve?', 'pdesc')}
        </div>
      </div>
    `;

    row.querySelector('[data-action="remove"]').addEventListener('click', () => {
      if (els.projectsList.querySelectorAll('.rb-entry').length <= 1) {
        toast('At least one project entry is required.', 'warn');
        return;
      }
      row.remove();
      renumberEntries(els.projectsList, 'Project');
      scheduleRender();
    });

    bindEntryRow(row);
    els.projectsList.appendChild(row);
    renumberEntries(els.projectsList, 'Project');
  }

  function setZoom(next) {
    zoomLevel = Math.max(60, Math.min(130, next));
    updatePreviewScale();
    toast(`Preview zoom ${zoomLevel}%`, 'ok', 1100);
  }

  function updatePreviewScale() {
    if (!els.previewScale || !els.previewViewport) return;

    const availableWidth = Math.max(320, els.previewViewport.clientWidth - 36);
    const fitScale = Math.min(1, availableWidth / EXPORT_WIDTH);
    const finalScale = Math.max(0.35, Math.min(1.35, fitScale * (zoomLevel / 100)));

    els.previewScale.style.width = `${EXPORT_WIDTH}px`;
    els.previewScale.style.transformOrigin = 'top center';
    els.previewScale.style.transform = `scale(${finalScale})`;
    els.zoomVal.textContent = `${zoomLevel}%`;
  }

  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      renderResume();
    });
  }

  function bindBasicInputs() {
    const watched = [
      els.fName, els.fTitle, els.fEmail, els.fPhone,
      els.fAddress, els.fLinkedIn, els.fGithub,
      els.fPortfolio, els.fSummary, els.fSkills,
      els.accentColor, els.fontFamily, els.fontSize
    ];

    watched.forEach((el) => {
      if (!el) return;
      el.addEventListener('input', () => {
        if (el === els.fSkills) renderSkillPreview();
        scheduleRender();
      });
      el.addEventListener('change', () => {
        if (el === els.fSkills) renderSkillPreview();
        scheduleRender();
      });
    });
  }

  function bindTemplateButtons() {
    document.querySelectorAll('.rb-tpl-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.template = normalizeTemplate(btn.dataset.tpl);
        syncTemplateButtons();
        scheduleRender();
      });
    });
  }

  function bindAccordion() {
    document.querySelectorAll('.rb-section-header').forEach((header) => {
      header.addEventListener('click', () => {
        header.classList.toggle('collapsed');
        const section = header.closest('.rb-section');
        const body = section ? section.querySelector('.rb-section-body') : null;
        if (body) body.classList.toggle('open');
      });
    });
  }

  function bindDynamicButtons() {
    const addEducationBtn = $('btnAddEducation');
    const addExperienceBtn = $('btnAddExperience');
    const addProjectBtn = $('btnAddProject');

    if (addEducationBtn) {
      addEducationBtn.addEventListener('click', () => {
        addEducationRow();
        scheduleRender();
      });
    }

    if (addExperienceBtn) {
      addExperienceBtn.addEventListener('click', () => {
        addExperienceRow();
        scheduleRender();
      });
    }

    if (addProjectBtn) {
      addProjectBtn.addEventListener('click', () => {
        addProjectRow();
        scheduleRender();
      });
    }
  }

  function bindPhotoUpload() {
    if (els.photoUpload) {
      els.photoUpload.addEventListener('change', async () => {
        const file = els.photoUpload.files && els.photoUpload.files[0];
        if (!file) return;

        if (!file.type || !file.type.startsWith('image/')) {
          toast('Please choose an image file.', 'warn');
          els.photoUpload.value = '';
          return;
        }

        try {
          const dataUrl = await fileToDataUrl(file);
          state.photo = dataUrl;
          setPhotoVisibility(true);
          saveState();
          scheduleRender();
        } catch (err) {
          console.error(err);
          toast('Could not load photo.', 'warn');
        }
      });
    }

    if (els.btnRemovePhoto) {
      els.btnRemovePhoto.addEventListener('click', () => {
        state.photo = '';
        if (els.photoUpload) els.photoUpload.value = '';
        setPhotoVisibility(false);
        saveState();
        scheduleRender();
      });
    }
  }

  function bindZoom() {
    if (els.btnZoomIn) {
      els.btnZoomIn.addEventListener('click', () => setZoom(zoomLevel + 10));
    }
    if (els.btnZoomOut) {
      els.btnZoomOut.addEventListener('click', () => setZoom(zoomLevel - 10));
    }
  }

  function bindExportButtons() {
    if (els.btnDownloadPDF) els.btnDownloadPDF.addEventListener('click', exportPDF);
    if (els.btnDownloadImg) els.btnDownloadImg.addEventListener('click', exportImage);
    if (els.btnClearAll) els.btnClearAll.addEventListener('click', clearAll);
  }

  function bindResize() {
    window.addEventListener('resize', () => {
      updatePreviewScale();
    });
  }

  function bindPersistence() {
    window.addEventListener('beforeunload', saveState);
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function showOverlay(show) {
    if (els.pdfOverlay) {
      els.pdfOverlay.style.display = show ? 'flex' : 'none';
    }
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  function waitForFonts() {
    if (document.fonts && document.fonts.ready) return document.fonts.ready.catch(() => {});
    return Promise.resolve();
  }

  function waitForImages(root) {
    const imgs = Array.from(root.querySelectorAll('img'));
    if (!imgs.length) return Promise.resolve();

    return Promise.all(imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();

      return new Promise((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
    })).then(() => undefined);
  }

  function destroyExportSurface() {
    if (exportShell && exportShell.parentNode) {
      exportShell.parentNode.removeChild(exportShell);
    }
    exportShell = null;
  }

  function prepareExportSurface() {
    destroyExportSurface();

    const shell = document.createElement('div');
    shell.className = 'rb-export-shell';
    shell.setAttribute('aria-hidden', 'true');

    const paper = document.createElement('div');
    paper.className = `resume-page tpl-${state.template}`;
    paper.style.setProperty('--resume-accent', state.accent || DEFAULT_STATE.accent);
    paper.style.fontFamily = state.font || DEFAULT_STATE.font;
    paper.style.fontSize = state.fontSize || DEFAULT_STATE.fontSize;
    paper.style.width = `${EXPORT_WIDTH}px`;
    paper.style.minHeight = 'auto';
    paper.style.height = 'auto';
    paper.style.maxWidth = 'none';
    paper.style.overflow = 'visible';
    paper.style.boxShadow = 'none';
    paper.style.transform = 'none';
    paper.style.position = 'relative';
    // Ensure no margin/padding on the paper itself shifts content inside the shell
    paper.style.margin = '0';
    paper.style.padding = '0';
    paper.style.left = '0';
    paper.style.top = '0';
    paper.style.boxSizing = 'border-box';

    paper.innerHTML = buildResumeMarkupForExport();

    paper.querySelectorAll('*').forEach((node) => {
      node.style.transform = 'none';
    });

    paper.querySelectorAll('.res-body, .res-main, .res-sidebar').forEach((node) => {
      node.style.minHeight = '0';
      node.style.height = 'auto';
      node.style.overflow = 'visible';
    });

    paper.querySelectorAll('.res-header, .res-section, .res-entry').forEach((node) => {
      node.style.breakInside = 'avoid';
      node.style.pageBreakInside = 'avoid';
    });

    shell.appendChild(paper);
    document.body.appendChild(shell);
    exportShell = shell;
    return paper;
  }

  function buildResumeMarkupForExport() {
    switch (state.template) {
      case 'minimal':
        return renderMinimal();
      case 'neon':
        return renderNeon();
      case 'corporate':
        return renderCorporate();
      case 'ats':
        return renderATS();
      case 'elegant':
        return renderElegant();
      case 'sidebar':
        return renderSidebar();
      case 'compact':
        return renderCompact();
      case 'executive':
        return renderExecutive();
      case 'modern':
      default:
        return renderModern();
    }
  }

  async function exportPDF() {
    if (typeof window.html2pdf !== 'function') {
      toast('PDF library is missing.', 'warn');
      return;
    }

    collectAll();
    renderResume();
    showOverlay(true);

    try {
      const paper = prepareExportSurface();
      await waitForFonts();
      await waitForImages(paper);
      await nextFrame();

      // Force layout recalc so getBoundingClientRect is accurate
      paper.getBoundingClientRect();
      await nextFrame();

      const paperH = paper.scrollHeight || EXPORT_HEIGHT;
      const fileName = `${slugifyFileName(state.name || 'resume')}_resume.pdf`;

      const options = {
        margin: [0, 0, 0, 0],
        filename: fileName,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          // CRITICAL: x and y must be 0 because the export shell is at left:0, top:-9999px
          // If the shell were at left:-10000px the x offset would corrupt the canvas coordinate
          // system, causing left-side clipping and a giant empty right area.
          x: 0,
          y: 0,
          scrollX: 0,
          scrollY: 0,
          width: EXPORT_WIDTH,
          height: paperH,
          windowWidth: EXPORT_WIDTH,
          windowHeight: paperH
        },
        jsPDF: {
          unit: 'px',
          format: [EXPORT_WIDTH, paperH],
          orientation: 'portrait',
          hotfixes: ['px_scaling']
        },
        pagebreak: {
          mode: ['css', 'legacy']
        }
      };

      await window.html2pdf().set(options).from(paper).save();
      toast('PDF downloaded successfully.');
    } catch (err) {
      console.error(err);
      toast('PDF export failed.', 'warn');
    } finally {
      destroyExportSurface();
      showOverlay(false);
    }
  }

  async function exportImage() {
    if (typeof window.html2canvas !== 'function') {
      toast('Image export library is missing.', 'warn');
      return;
    }

    collectAll();
    renderResume();
    showOverlay(true);

    try {
      const paper = prepareExportSurface();
      await waitForFonts();
      await waitForImages(paper);
      await nextFrame();

      const canvas = await window.html2canvas(paper, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        width: EXPORT_WIDTH,
        height: paper.scrollHeight,
        windowWidth: EXPORT_WIDTH,
        windowHeight: paper.scrollHeight
      });

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Could not create image blob.');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slugifyFileName(state.name || 'resume')}_resume.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast('Image downloaded successfully.');
    } catch (err) {
      console.error(err);
      toast('Image export failed.', 'warn');
    } finally {
      destroyExportSurface();
      showOverlay(false);
    }
  }

  function clearAll() {
    const ok = window.confirm('Clear all resume data?');
    if (!ok) return;

    state = cloneState(DEFAULT_STATE);
    zoomLevel = 90;

    try { localStorage.removeItem(LS_KEY); } catch (e) {}

    populateForm();
    renderSkillPreview();
    renderResume();
    updatePreviewScale();
    toast('All data cleared.');
  }

  function init() {
    loadState();
    populateForm();
    bindBasicInputs();
    bindTemplateButtons();
    bindAccordion();
    bindDynamicButtons();
    bindPhotoUpload();
    bindZoom();
    bindExportButtons();
    bindResize();
    bindPersistence();
    renderSkillPreview();
    renderResume();
    updatePreviewScale();

    requestAnimationFrame(() => updatePreviewScale());
  }

  init();
})();