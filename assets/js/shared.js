/* =========================================================
   shared.js — Modern Animated Toggles & Core Logic
   ========================================================= */

(function () {
  /* ── 1. Inject Modern Pill Toggles CSS ── */
  const style = document.createElement('style');
  style.innerHTML = `
    /* Common Toggle Styles */
    .btn-toggle-liquid {
      position: relative;
      display: inline-flex;
      align-items: center;
      border: none;
      border-radius: 999px;
      cursor: pointer;
      outline: none;
      padding: 0;
      overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.15);
      transition: background-color 0.5s ease;
      flex-shrink: 0;
    }
    .btn-toggle-liquid:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

    .thumb-liquid {
      position: absolute;
      top: 4px;
      left: 4px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 5;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      transition: transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1), background-color 0.5s ease;
      overflow: hidden;
    }

    /* ── Theme Toggle Specifics ── */
    #themeToggle {
      width: 80px;
      height: 40px;
      background-color: #bae6fd; /* sky-200 */
    }
    html[data-theme="dark"] #themeToggle {
      background-color: #334155; /* slate-700 */
    }

    #themeToggle .thumb-liquid {
      width: 32px;
      height: 32px;
      transform: translateX(0);
      background-color: #fbbf24; /* yellow-400 */
      color: #fff;
    }
    html[data-theme="dark"] #themeToggle .thumb-liquid {
      transform: translateX(40px);
      background-color: #0f172a; /* slate-900 */
      color: #fef08a; /* yellow-200 */
    }

    /* Clouds (Light Mode) */
    .theme-clouds {
      position: absolute;
      inset: 0;
      opacity: 1;
      transition: opacity 0.5s ease;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 8px;
      color: rgba(255,255,255,0.9);
    }
    html[data-theme="dark"] .theme-clouds { opacity: 0; }

    /* Stars (Dark Mode) */
    .theme-stars {
      position: absolute;
      inset: 0;
      opacity: 0;
      transition: opacity 0.5s ease;
    }
    html[data-theme="dark"] .theme-stars { opacity: 1; }
    
    .t-star { position: absolute; background: white; border-radius: 50%; }
    @keyframes twinkelStar { 
      0%, 100% { opacity: 1; transform: scale(1); } 
      50% { opacity: 0.3; transform: scale(0.8); } 
    }

    /* ── Language Toggle Specifics ── */
    #langToggle {
      width: 96px;
      height: 40px;
      background-color: #e2e8f0; /* slate-200 */
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
      margin-left: 8px;
    }
    html[data-theme="dark"] #langToggle {
      background-color: #1e293b; /* slate-800 */
      box-shadow: inset 0 2px 6px rgba(0,0,0,0.3);
    }

    #langToggle .thumb-liquid {
      width: 32px;
      height: 32px;
      background-color: #fff;
      border: 1px solid #cbd5e1;
      transform: translateX(0);
    }
    html[data-theme="dark"] #langToggle .thumb-liquid {
      border-color: #475569;
    }
    html[data-lang="en"] #langToggle .thumb-liquid {
      transform: translateX(56px);
    }

    .lang-text {
      position: absolute;
      font-size: 13px;
      font-weight: 800;
      z-index: 1;
      transition: color 0.3s;
      color: #64748b; /* slate-500 */
    }
    html[data-theme="dark"] .lang-text { color: #94a3b8; }
    
    .lang-text.fr { left: 14px; }
    .lang-text.en { right: 14px; }

    /* ── Grid/List Layout Toggle ── */
    .btn-layout-toggle {
      position: relative;
      display: inline-flex;
      align-items: center;
      width: 76px;
      height: 36px;
      border-radius: 12px;
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 4px;
      cursor: pointer;
    }
    .layout-slider {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 32px;
      height: 28px;
      border-radius: 8px;
      background: var(--surface-hover);
      border: 1px solid var(--border);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1;
    }
    /* Grid Mode Active (Default) */
    .btn-layout-toggle:not(.is-list) .layout-slider {
      transform: translateX(0);
    }
    .btn-layout-toggle:not(.is-list) .icon-grid {
      color: var(--accent);
    }
    .btn-layout-toggle:not(.is-list) .icon-list {
      color: var(--text-muted);
    }
    /* List Mode Active */
    .btn-layout-toggle.is-list .layout-slider {
      transform: translateX(36px);
    }
    .btn-layout-toggle.is-list .icon-list {
      color: var(--accent);
    }
    .btn-layout-toggle.is-list .icon-grid {
      color: var(--text-muted);
    }
    
    .btn-layout-toggle svg {
      width: 18px;
      height: 18px;
      position: relative;
      z-index: 2;
      flex: 1;
      transition: fill 0.3s;
    }

    /* Grid vs List CSS Changes */
    .projects-grid.layout-list {
      display: flex;
      flex-direction: column;
    }
    .projects-grid.layout-list .project-card {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 24px;
      padding: 24px;
    }
    .projects-grid.layout-list .project-card > div.project-status {
      position: absolute;
      top: 24px;
      right: 24px;
      margin: 0;
    }
    .projects-grid.layout-list .project-card > h3 {
      min-width: 250px;
      margin: 0;
    }
    .projects-grid.layout-list .project-card > p {
      flex: 1;
      margin: 0;
    }
    .projects-grid.layout-list .project-card > .project-tags {
      margin: 0;
    }
    .projects-grid.layout-list .project-card > .btn-case {
      margin-left: auto;
    }
    @media (max-width: 900px) {
      .projects-grid.layout-list .project-card { flex-direction: column; align-items: flex-start; }
      .projects-grid.layout-list .project-card > div.project-status { position: static; margin-bottom: 12px; }
      .projects-grid.layout-list .project-card > .btn-case { margin-left: 0; width: 100%; justify-content: center; }
    }
  `;
  document.head.appendChild(style);

  /* ── 2. SVG Assets ── */
  const svgSun = `<svg style="width:20px;height:20px;" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 1.336a1 1 0 011.415 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zM19 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM15.636 15.636a1 1 0 010 1.415l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.415 0zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4.22-1.336a1 1 0 01-1.415 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zM4 10a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zM5.78 4.75a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM10 6a4 4 0 100 8 4 4 0 000-8z" clip-rule="evenodd" /></svg>`;
  const svgMoon = `<svg style="width:20px;height:20px;" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>`;
  const svgClouds = `<svg style="width:24px;height:18px;" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 19c-2.485 0-4.5-2.015-4.5-4.5 0-.256.022-.507.062-.752a5.503 5.503 0 00-6.062-1.748A4.498 4.498 0 002.5 15C2.5 17.485 4.515 19 7 19h10.5z" /></svg>`;

  const flagFr = `<svg style="width:100%;height:100%;object-fit:cover;border-radius:50%;" viewBox="0 0 3 2" preserveAspectRatio="none"><rect width="1" height="2" fill="#0055A4" /><rect x="1" width="1" height="2" fill="#FFFFFF" /><rect x="2" width="1" height="2" fill="#EF4135" /></svg>`;
  const flagEn = `<svg style="width:100%;height:100%;object-fit:cover;border-radius:50%;" viewBox="0 0 60 30" preserveAspectRatio="none"><clipPath id="uk-clip"><rect width="60" height="30" /></clipPath><g clip-path="url(#uk-clip)"><rect width="60" height="30" fill="#012169" /><path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" stroke-width="6" /><path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="4" /><path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" stroke-width="10" /><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6" /></g></svg>`;

  /* ── 3. Initialize Theme Toggle ── */
  var themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    // Restructure DOM
    themeBtn.className = "btn-toggle-liquid";
    themeBtn.innerHTML = `
      <div class="theme-clouds">${svgClouds}</div>
      <div class="theme-stars">
        <div class="t-star" style="top:12px;left:14px;width:3px;height:3px;animation:twinkelStar 2s infinite;"></div>
        <div class="t-star" style="top:22px;left:32px;width:2px;height:2px;"></div>
        <div class="t-star" style="top:26px;left:18px;width:2.5px;height:2.5px;animation:twinkelStar 2s infinite 1s;"></div>
      </div>
      <div class="thumb-liquid" id="themeThumb"></div>
    `;
    var themeThumb = document.getElementById('themeThumb');

    // Logic
    var savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.dataset.theme = savedTheme;
    themeThumb.innerHTML = savedTheme === 'light' ? svgSun : svgMoon;

    themeBtn.addEventListener('click', function () {
      var next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('theme', next);
      themeThumb.innerHTML = next === 'light' ? svgSun : svgMoon;
    });
  }

  /* ── 4. Initialize Lang Toggle ── */
  var langBtn = document.getElementById('langToggle');

  function getLang() { return document.documentElement.dataset.lang || 'fr'; }
  function setLanguage(lang) {
    document.documentElement.dataset.lang = lang;
    document.documentElement.lang = lang;
    localStorage.setItem('lang', lang);
    var langThumb = document.getElementById('langThumb');
    if (langThumb) langThumb.innerHTML = lang === 'fr' ? flagFr : flagEn;
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  }

  if (langBtn) {
    // Restructure DOM
    langBtn.className = "btn-toggle-liquid";
    langBtn.innerHTML = `
      <span class="lang-text fr">FR</span>
      <span class="lang-text en">EN</span>
      <div class="thumb-liquid" id="langThumb"></div>
    `;

    // Logic
    setLanguage(localStorage.getItem('lang') || 'fr');
    langBtn.addEventListener('click', function () {
      setLanguage(getLang() === 'fr' ? 'en' : 'fr');
    });
  }

  /* ── 5. Initialize Layout Toggle ── */
  var layoutToggleBtn = document.getElementById('layoutToggle');
  var projectsContainer = document.getElementById('projectsContainer');

  if (layoutToggleBtn && projectsContainer) {
    layoutToggleBtn.addEventListener('click', function () {
      // Toggle class on the container
      var isList = projectsContainer.classList.toggle('layout-list');
      // Toggle state class on the button itself for the slider animation
      layoutToggleBtn.classList.toggle('is-list', isList);
    });
  }

  /* Expose for page-specific scripts */
  window.__rm = { getLang: getLang, setLanguage: setLanguage };
})();
