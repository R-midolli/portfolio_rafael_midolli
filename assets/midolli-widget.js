/**
 * Midolli-AI — Widget (IIFE)
 * Exposes only window.MidolliAI = { init }
 * No external dependencies. No innerHTML with API content (XSS).
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------
  // i18n
  // ---------------------------------------------------------------
  const I18N = {
    fr: {
      welcome:
        "Bonjour ! Je suis Midolli-AI, l'assistant de Rafael Midolli. Je connais tout sur son parcours de Data Analyst, ses projets et son expertise. Comment puis-je vous aider ?",
      chips: ["🎓 Formation", "📊 Résultats", "🛠️ Stack", "📁 Projets"],
      placeholder: "Posez votre question...",
      disclaimer: "Midolli-AI peut faire des erreurs.",
      subtitle: "Assistant Data Portfolio",
      send: "Envoyer",
      responded: "répondu en",
    },
    en: {
      welcome:
        "Hello! I'm Midolli-AI, Rafael Midolli's assistant. I know everything about his Data Analyst journey, projects and expertise. How can I help you?",
      chips: ["🎓 Education", "📊 Results", "🛠️ Stack", "📁 Projects"],
      placeholder: "Ask me anything...",
      disclaimer: "Midolli-AI can make mistakes.",
      subtitle: "Data Portfolio Assistant",
      send: "Send",
      responded: "responded in",
    },
  };

  // ---------------------------------------------------------------
  // State
  // ---------------------------------------------------------------
  let _cfg = { apiUrl: "", lang: "fr", theme: "dark" };
  let _isOpen = false;
  let _hasOpened = false;
  let _history = [];
  let _els = {};

  // ---------------------------------------------------------------
  // SVG helpers
  // ---------------------------------------------------------------
  function logoSVG(size) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));

    // Gradient fill
    var defs = document.createElementNS(ns, "defs");
    var grad = document.createElementNS(ns, "linearGradient");
    grad.id = "mai-grad-" + size;
    grad.setAttribute("x1", "0%"); grad.setAttribute("y1", "0%");
    grad.setAttribute("x2", "100%"); grad.setAttribute("y2", "100%");
    var s1 = document.createElementNS(ns, "stop");
    s1.setAttribute("offset", "0%"); s1.setAttribute("stop-color", "#6d28d9");
    var s2 = document.createElementNS(ns, "stop");
    s2.setAttribute("offset", "100%"); s2.setAttribute("stop-color", "#4f46e5");
    grad.appendChild(s1); grad.appendChild(s2);
    defs.appendChild(grad);
    svg.appendChild(defs);

    // Circle
    var circle = document.createElementNS(ns, "circle");
    circle.setAttribute("cx", "50"); circle.setAttribute("cy", "50");
    circle.setAttribute("r", "50");
    circle.setAttribute("fill", "url(#mai-grad-" + size + ")");
    svg.appendChild(circle);

    // --- FAB config (size >= 40): 62px circle ---
    // --- Avatar config (size < 40): 42px circle ---
    var isFab = size >= 40;
    var fontSize = isFab ? "24" : "16";

    // "M" letter
    var mText = document.createElementNS(ns, "text");
    mText.setAttribute("x", "50");
    mText.setAttribute("y", "33");
    mText.setAttribute("text-anchor", "middle");
    mText.setAttribute("dominant-baseline", "middle");
    mText.setAttribute("fill", "#ffffff");
    mText.setAttribute("font-family", "monospace");
    mText.setAttribute("font-weight", "900");
    mText.setAttribute("font-size", fontSize);
    mText.textContent = "M";
    svg.appendChild(mText);

    // Divider line
    var line = document.createElementNS(ns, "line");
    line.setAttribute("x1", "30"); line.setAttribute("y1", "50");
    line.setAttribute("x2", "70"); line.setAttribute("y2", "50");
    line.setAttribute("stroke", "#c4b5fd");
    line.setAttribute("stroke-width", "1.5");
    line.setAttribute("opacity", "0.5");
    svg.appendChild(line);

    // "AI" text
    var aiText = document.createElementNS(ns, "text");
    aiText.setAttribute("x", "50");
    aiText.setAttribute("y", "69");
    aiText.setAttribute("text-anchor", "middle");
    aiText.setAttribute("dominant-baseline", "middle");
    aiText.setAttribute("fill", "#ffffff");
    aiText.setAttribute("font-family", "monospace");
    aiText.setAttribute("font-weight", "900");
    aiText.setAttribute("font-size", fontSize);
    aiText.setAttribute("letter-spacing", "1");
    aiText.textContent = "AI";
    svg.appendChild(aiText);

    return svg;
  }


  function sendIcon() {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    var line = document.createElementNS(ns, "line");
    line.setAttribute("x1", "22");
    line.setAttribute("y1", "2");
    line.setAttribute("x2", "11");
    line.setAttribute("y2", "13");
    svg.appendChild(line);
    var poly = document.createElementNS(ns, "polygon");
    poly.setAttribute("points", "22 2 15 22 11 13 2 9 22 2");
    svg.appendChild(poly);
    return svg;
  }

  // ---------------------------------------------------------------
  // Minimal markdown renderer (safe, no innerHTML with API content)
  // ---------------------------------------------------------------
  function renderMarkdown(text) {
    var container = el("div");

    // Split by code blocks first
    var parts = text.split(/```(\w*)\n?([\s\S]*?)```/g);
    for (var i = 0; i < parts.length; i++) {
      if (i % 3 === 0) {
        // Normal text
        renderInlineMarkdown(parts[i], container);
      } else if (i % 3 === 1) {
        // Language label
        var lang = parts[i];
        var code = parts[i + 1] || "";
        i++; // skip code part
        var block = el("div", "mai-code-block");
        if (lang) {
          var label = el("div", "mai-code-label");
          label.textContent = lang;
          block.appendChild(label);
        }
        var pre = document.createElement("pre");
        pre.style.margin = "0";
        pre.style.whiteSpace = "pre-wrap";
        pre.textContent = code.trim();
        block.appendChild(pre);
        container.appendChild(block);
      }
    }
    return container;
  }

  function renderInlineMarkdown(text, container) {
    if (!text) return;
    var lines = text.split("\n");
    for (var l = 0; l < lines.length; l++) {
      var line = lines[l];
      if (!line.trim() && l < lines.length - 1) {
        container.appendChild(document.createElement("br"));
        continue;
      }
      // Process bold **text** and inline `code`
      var parts = line.split(/(\*\*.*?\*\*|`[^`]+`)/g);
      for (var p = 0; p < parts.length; p++) {
        var part = parts[p];
        if (!part) continue;
        if (part.startsWith("**") && part.endsWith("**")) {
          var strong = document.createElement("strong");
          strong.textContent = part.slice(2, -2);
          container.appendChild(strong);
        } else if (part.startsWith("`") && part.endsWith("`")) {
          var code = document.createElement("code");
          code.textContent = part.slice(1, -1);
          container.appendChild(code);
        } else {
          container.appendChild(document.createTextNode(part));
        }
      }
      if (l < lines.length - 1) {
        container.appendChild(document.createElement("br"));
      }
    }
  }

  // ---------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------
  function el(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function t() {
    return I18N[_cfg.lang] || I18N.fr;
  }

  // ---------------------------------------------------------------
  // Build DOM
  // ---------------------------------------------------------------
  function buildDOM() {
    // Container for theme class
    var root = el("div", "mai-root mai-" + _cfg.theme);
    root.id = "mai-root";

    // Pulse ring
    var pulse = el("div", "mai-pulse-ring");
    pulse.id = "mai-pulse-ring";
    root.appendChild(pulse);
    _els.pulse = pulse;

    // FAB
    var fab = el("button", "mai-fab");
    fab.id = "mai-fab";
    fab.setAttribute("aria-label", "Open Midolli-AI chat");
    fab.appendChild(logoSVG(52));
    fab.addEventListener("click", togglePanel);
    root.appendChild(fab);
    _els.fab = fab;

    // Panel
    var panel = el("div", "mai-panel");
    panel.id = "mai-panel";
    root.appendChild(panel);
    _els.panel = panel;

    buildPanel(panel);

    document.body.appendChild(root);
    _els.root = root;

    // Show pulse ring after 3s if not opened yet
    setTimeout(function () {
      if (!_hasOpened && _els.pulse) {
        _els.pulse.style.display = "block";
      }
    }, 3000);
  }

  function buildPanel(panel) {
    // --- Header ---
    var header = el("div", "mai-header");

    var avatar = el("div", "mai-avatar");
    avatar.appendChild(logoSVG(28));
    var dot = el("div", "mai-status-dot");
    avatar.appendChild(dot);
    header.appendChild(avatar);

    var info = el("div", "mai-header-info");
    var name = el("div", "mai-header-name");
    name.textContent = "Midolli-AI";
    info.appendChild(name);
    var sub = el("div", "mai-header-subtitle");
    sub.textContent = t().subtitle;
    _els.subtitle = sub;
    info.appendChild(sub);
    header.appendChild(info);

    var actions = el("div", "mai-header-actions");

    var closeBtn = el("button", "mai-header-btn");
    closeBtn.textContent = "✕";
    closeBtn.setAttribute("aria-label", "Close chat");
    closeBtn.addEventListener("click", togglePanel);
    actions.appendChild(closeBtn);

    header.appendChild(actions);
    panel.appendChild(header);

    // --- Timestamp ---
    var ts = el("div", "mai-timestamp");
    _els.timestamp = ts;
    panel.appendChild(ts);

    // --- Messages ---
    var msgs = el("div", "mai-messages");
    _els.messages = msgs;
    panel.appendChild(msgs);

    // --- Chips ---
    var chips = el("div", "mai-chips");
    _els.chips = chips;
    panel.appendChild(chips);
    renderChips();

    // --- Input Area ---
    var inputArea = el("div", "mai-input-area");

    var textarea = document.createElement("textarea");
    textarea.className = "mai-textarea";
    textarea.rows = 1;
    textarea.placeholder = t().placeholder;
    textarea.addEventListener("input", function () {
      sendBtn.disabled = !textarea.value.trim();
      // Auto-resize
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 100) + "px";
    });
    textarea.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (textarea.value.trim()) sendMessage();
      }
    });
    _els.textarea = textarea;
    inputArea.appendChild(textarea);

    var sendBtn = el("button", "mai-send-btn");
    sendBtn.disabled = true;
    sendBtn.setAttribute("aria-label", t().send);
    sendBtn.appendChild(sendIcon());
    sendBtn.addEventListener("click", sendMessage);
    _els.sendBtn = sendBtn;
    inputArea.appendChild(sendBtn);

    panel.appendChild(inputArea);

    // --- Disclaimer ---
    var disc = el("div", "mai-disclaimer");
    disc.textContent = t().disclaimer;
    _els.disclaimer = disc;
    panel.appendChild(disc);
  }

  // ---------------------------------------------------------------
  // Chips
  // ---------------------------------------------------------------
  function renderChips() {
    var chips = _els.chips;
    chips.innerHTML = "";
    var labels = t().chips;
    for (var i = 0; i < labels.length; i++) {
      (function (label) {
        var chip = el("button", "mai-chip");
        chip.textContent = label;
        chip.addEventListener("click", function () {
          _els.textarea.value = label;
          _els.sendBtn.disabled = false;
          sendMessage();
        });
        chips.appendChild(chip);
      })(labels[i]);
    }
  }

  // ---------------------------------------------------------------
  // Panel toggle
  // ---------------------------------------------------------------
  function togglePanel() {
    _isOpen = !_isOpen;
    _els.panel.classList.toggle("mai-open", _isOpen);

    if (_isOpen && !_hasOpened) {
      _hasOpened = true;
      // Hide pulse ring
      if (_els.pulse) _els.pulse.style.display = "none";
      // Show timestamp
      var now = new Date();
      _els.timestamp.textContent =
        now.toLocaleDateString(_cfg.lang === "fr" ? "fr-FR" : "en-US", {
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        });
      // Welcome message
      renderMessage(t().welcome, "bot");
    }
  }

  // ---------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------
  function renderMessage(content, role, meta) {
    var wrapper = el("div", "mai-message mai-message-" + role);
    var bubble = el("div", role === "user" ? "mai-user-bubble" : "mai-bot-bubble");

    if (role === "bot") {
      var md = renderMarkdown(content);
      bubble.appendChild(md);
    } else {
      bubble.textContent = content;
    }

    wrapper.appendChild(bubble);

    // Response time meta tag below bot bubbles
    if (role === "bot" && meta) {
      var metaEl = el("div", "mai-response-meta");
      metaEl.textContent = meta;
      wrapper.appendChild(metaEl);
    }

    _els.messages.appendChild(wrapper);
    _els.messages.scrollTop = _els.messages.scrollHeight;
  }

  function showTyping() {
    var wrapper = el("div", "mai-message mai-message-bot");
    wrapper.id = "mai-typing";
    var indicator = el("div", "mai-typing-indicator mai-bot-bubble");
    for (var i = 0; i < 3; i++) {
      indicator.appendChild(el("div", "mai-typing-dot"));
    }
    wrapper.appendChild(indicator);
    _els.messages.appendChild(wrapper);
    _els.messages.scrollTop = _els.messages.scrollHeight;
  }

  function hideTyping() {
    var typing = document.getElementById("mai-typing");
    if (typing) typing.remove();
  }

  // ---------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------
  function sendMessage() {
    var text = _els.textarea.value.trim();
    if (!text) return;

    // Clear input
    _els.textarea.value = "";
    _els.textarea.style.height = "auto";
    _els.sendBtn.disabled = true;

    // Hide chips after first message
    _els.chips.style.display = "none";

    // Render user bubble
    renderMessage(text, "user");
    _history.push({ role: "user", content: text });

    // Show typing
    showTyping();
    var startTime = Date.now();

    // Timeout: abort after 45s to avoid infinite loading
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, 45000);

    // API call
    fetch(_cfg.apiUrl + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        message: text,
        history: _history.slice(-6),
        lang: _cfg.lang,
        page_context: window.location.pathname,
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        hideTyping();
        var reply = data.reply || "...";
        var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        var meta = "⚡ " + t().responded + " " + elapsed + "s";
        renderMessage(reply, "bot", meta);
        _history.push({ role: "assistant", content: reply });
      })
      .catch(function (err) {
        hideTyping();
        var errMsg;
        if (err.name === "AbortError") {
          errMsg = _cfg.lang === "fr"
            ? "La réponse a pris trop de temps. Veuillez réessayer."
            : "Response took too long. Please try again.";
        } else {
          errMsg = _cfg.lang === "fr"
            ? "Désolé, une erreur est survenue. Veuillez réessayer."
            : "Sorry, an error occurred. Please try again.";
        }
        renderMessage(errMsg, "bot");
        console.error("[Midolli-AI]", err);
      })
      .finally(function () {
        clearTimeout(timeoutId);
        _els.sendBtn.disabled = false;
      });
  }

  // ---------------------------------------------------------------
  // Sync theme & language
  // ---------------------------------------------------------------
  function syncTheme() {
    if (!_els.root) return;
    _els.root.className = "mai-root mai-" + _cfg.theme;
    if (_els.themeBtn) {
      _els.themeBtn.textContent = _cfg.theme === "dark" ? "☀️" : "🌙";
    }
  }

  function syncLang() {
    if (!_els.subtitle) return;
    _els.subtitle.textContent = t().subtitle;
    _els.textarea.placeholder = t().placeholder;
    _els.disclaimer.textContent = t().disclaimer;
    _els.sendBtn.setAttribute("aria-label", t().send);
    if (_els.langBtn) {
      _els.langBtn.textContent = _cfg.lang === "fr" ? "EN" : "FR";
    }
    renderChips();
  }

  // ---------------------------------------------------------------
  // Portfolio sync via MutationObserver
  // ---------------------------------------------------------------
  function setupObservers() {
    // Theme observer — watches documentElement data-theme (set by shared.js)
    var themeObs = new MutationObserver(function () {
      var theme = document.documentElement.dataset.theme || "dark";
      if (theme !== _cfg.theme) {
        _cfg.theme = theme;
        syncTheme();
      }
    });
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // Language observer — watches html data-lang attribute (set by shared.js setLanguage)
    var htmlObs = new MutationObserver(function () {
      var lang = document.documentElement.dataset.lang || "fr";
      if (lang !== _cfg.lang) {
        _cfg.lang = lang === "en" ? "en" : "fr";
        syncLang();
      }
    });
    htmlObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-lang"],
    });

    // Also listen to portfolio's custom langchange event (dispatched by shared.js setLanguage)
    document.addEventListener("langchange", function (e) {
      var lang = (e.detail && e.detail.lang) ? e.detail.lang : null;
      if (lang && lang !== _cfg.lang) {
        _cfg.lang = lang === "en" ? "en" : "fr";
        syncLang();
      }
    });
  }

  // ---------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------
  function init(config) {
    _cfg.apiUrl = (config.apiUrl || "").replace(/\/$/, "");
    _cfg.lang = config.lang || "fr";
    _cfg.theme = config.theme || "dark";
    if (_cfg.lang.length > 2) _cfg.lang = _cfg.lang.substring(0, 2);
    if (_cfg.lang !== "en") _cfg.lang = "fr";

    buildDOM();
    setupObservers();
  }

  // ---------------------------------------------------------------
  // Expose
  // ---------------------------------------------------------------
  window.MidolliAI = { init: init };
})();
