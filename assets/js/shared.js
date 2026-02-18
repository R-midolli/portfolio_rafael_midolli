/* =========================================================
   shared.js — Theme & language toggles for all pages
   ========================================================= */
(function(){
  /* ── Theme ── */
  var themeBtn = document.getElementById('themeToggle');
  var themeIcon = document.getElementById('themeIcon');
  if(themeBtn && themeIcon){
    var saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.dataset.theme = saved;
    themeIcon.textContent = saved === 'light' ? '☀️' : '🌙';
    themeBtn.addEventListener('click', function(){
      var next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('theme', next);
      themeIcon.textContent = next === 'light' ? '☀️' : '🌙';
    });
  }

  /* ── Language ── */
  var langBtn = document.getElementById('langToggle');
  var langIcon = document.getElementById('langIcon');

  function getLang(){ return document.documentElement.dataset.lang || 'fr'; }

  function setLanguage(lang){
    document.documentElement.dataset.lang = lang;
    document.documentElement.lang = lang;
    localStorage.setItem('lang', lang);
    if(langIcon) langIcon.textContent = lang === 'fr' ? 'FR' : 'EN';
    document.dispatchEvent(new CustomEvent('langchange', {detail:{lang:lang}}));
  }

  if(langBtn && langIcon){
    setLanguage(localStorage.getItem('lang') || 'fr');
    langBtn.addEventListener('click', function(){
      setLanguage(getLang() === 'fr' ? 'en' : 'fr');
    });
  }

  /* Expose for page-specific scripts */
  window.__rm = { getLang: getLang, setLanguage: setLanguage };
})();
