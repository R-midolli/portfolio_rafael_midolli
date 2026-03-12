(function () {
  "use strict";

  var WIDGET_API_URL = "https://midolli-ai.onrender.com";
  var WIDGET_CSS_PATH = "assets/midolli-widget.css";
  var WIDGET_JS_PATH = "assets/midolli-widget.js";

  function ensureStylesheet() {
    if (document.querySelector('link[data-midolli-widget="css"]')) return;

    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = WIDGET_CSS_PATH;
    link.setAttribute("data-midolli-widget", "css");
    document.head.appendChild(link);
  }

  function initWidget() {
    if (!window.MidolliAI || window.__midolliWidgetInitialized) return;

    window.__midolliWidgetInitialized = true;
    window.MidolliAI.init({
      apiUrl: WIDGET_API_URL,
      lang: document.documentElement.dataset.lang || "fr",
      theme: document.documentElement.dataset.theme || "dark",
    });
  }

  function ensureScript() {
    if (window.MidolliAI) {
      initWidget();
      return;
    }

    var existing = document.querySelector('script[data-midolli-widget="js"]');
    if (existing) {
      existing.addEventListener("load", initWidget, { once: true });
      return;
    }

    var script = document.createElement("script");
    script.src = WIDGET_JS_PATH;
    script.defer = true;
    script.setAttribute("data-midolli-widget", "js");
    script.addEventListener("load", initWidget, { once: true });
    document.body.appendChild(script);
  }

  function boot() {
    ensureStylesheet();
    ensureScript();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();