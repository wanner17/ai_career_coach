/**
 * career-embed.js — drop this + one init() call into any university homepage.
 *
 *   <script src="/career-embed.js"></script>
 *   <script>
 *     CareerMate.init({
 *       university: "SAMPLE",
 *       label: "AI 커리어 코치",
 *       primaryColor: "#7053F6",
 *       primaryHoverColor: "#6044E6",
 *       externalUserId: "20231234",   // the host page's own logged-in student id
 *       studentName: "김미래",         // optional — only used the 1st time this student is seen
 *     });
 *   </script>
 *
 * Creates a floating button, a modal, and an iframe pointing at the Career
 * Avatar Front app. No framework/build step required on the host page.
 *
 * There's no login form inside the widget — the host page already knows who's
 * logged in, so `externalUserId` is how it vouches for that student. This is
 * fine for an MVP where the host page itself sits behind the university's own
 * login, but it's an unsigned value a visitor could tamper with by hand-editing
 * the iframe URL; a real deployment should replace it with a signed token the
 * host page's server mints, not a bare id passed straight through client JS.
 */
(function () {
  var DEFAULT_PRIMARY = '#7053f6';
  var DEFAULT_PRIMARY_HOVER = '#6044e6';
  var DEFAULT_PRIMARY_SHADOW = 'rgba(112,83,246,.4)';

  // No color-mix() dependency (patchy support pre-Safari 16.2 / older Chrome) —
  // derive the shadow tint from the hex color directly instead.
  function hexToRgba(hex, alpha) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var num = parseInt(h, 16);
    if (isNaN(num)) return DEFAULT_PRIMARY_SHADOW;
    var r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  var STYLE = [
    // --cm-primary/--cm-primary-hover/--cm-primary-shadow carry CSS-level
    // defaults so the widget still themes correctly even before init() runs
    // its own setProperty calls below.
    ':root{--cm-primary:' + DEFAULT_PRIMARY + ';--cm-primary-hover:' + DEFAULT_PRIMARY_HOVER + ';--cm-primary-shadow:' + DEFAULT_PRIMARY_SHADOW + ';}',
    '.cm-fab{position:fixed;right:22px;bottom:22px;z-index:99998;',
    'border:0;border-radius:999px;padding:14px 20px;font-size:14px;font-weight:700;',
    'background:var(--cm-primary);color:#fff;box-shadow:0 14px 30px var(--cm-primary-shadow);',
    'cursor:pointer;display:flex;align-items:center;gap:8px;font-family:system-ui,sans-serif;',
    'transition:background .15s ease;}',
    '.cm-fab:hover{background:var(--cm-primary-hover);}',
    '.cm-overlay{position:fixed;inset:0;background:rgba(20,15,45,.5);z-index:99999;',
    'display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;',
    'pointer-events:none;transition:opacity .2s ease;}',
    '.cm-overlay.cm-open{opacity:1;pointer-events:auto;}',
    // Desktop modal: roomy enough that the Dashboard/AI panel 3-col layout has
    // real breathing room (the Career Avatar Front's own desktop breakpoint is 1024px).
    '.cm-modal{width:min(1500px,calc(100vw - 60px));height:min(900px,calc(100vh - 60px));',
    'background:#fff;border-radius:18px;overflow:hidden;position:relative;',
    'border-top:4px solid var(--cm-primary);',
    'box-shadow:0 30px 80px rgba(0,0,0,.35);transform:translateY(16px);transition:transform .2s ease;}',
    '.cm-overlay.cm-open .cm-modal{transform:translateY(0);}',
    '.cm-modal iframe{width:100%;height:100%;border:0;display:block;}',
    '.cm-close{position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:9px;',
    'border:0;background:rgba(255,255,255,.92);font-size:16px;cursor:pointer;z-index:2;}',
    '@media (max-width:767px){.cm-modal{width:100vw;height:100vh;height:100dvh;border-radius:0;border-top:0;}}',
  ].join('');

  function injectStyle() {
    var tag = document.createElement('style');
    tag.textContent = STYLE;
    document.head.appendChild(tag);
  }

  function resolveBaseUrl() {
    // Prefer the origin this script itself was loaded from.
    var script = document.currentScript;
    if (script && script.src) {
      try { return new URL(script.src).origin; } catch (e) { /* fallthrough */ }
    }
    return window.location.origin;
  }

  var instance = null;

  function init(options) {
    // A host page calling init() twice (double <script> include, re-run on SPA
    // route change, a copy-pasted snippet, etc.) must not get a 2nd floating
    // button/modal/iframe — return the already-built instance instead.
    if (instance) return instance;
    if (window.__CAREER_MATE_INSTANCE__) return window.__CAREER_MATE_INSTANCE__;

    options = options || {};
    var university = options.university || 'SAMPLE';
    var label = options.label || 'AI 커리어 코치';
    var baseUrl = options.baseUrl || resolveBaseUrl();
    var primaryColor = options.primaryColor || DEFAULT_PRIMARY;
    var primaryHoverColor = options.primaryHoverColor || DEFAULT_PRIMARY_HOVER;

    injectStyle();
    // Scoped to :root, but this is a single-instance widget (guarded above) so
    // that's equivalent to scoping it to the widget's own DOM subtree.
    document.documentElement.style.setProperty('--cm-primary', primaryColor);
    document.documentElement.style.setProperty('--cm-primary-hover', primaryHoverColor);
    document.documentElement.style.setProperty('--cm-primary-shadow', hexToRgba(primaryColor, .4));

    var fab = document.createElement('button');
    fab.className = 'cm-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', label + ' 열기');
    fab.innerHTML = '🤖 ' + label;

    // Query-param embed URL (not a dedicated /embed route) — works unmodified
    // on any static host, no server-side rewrite rule required.
    var iframeSrc = baseUrl + '/?mode=embed&university=' + encodeURIComponent(university);
    if (options.allowedOrigin) {
      iframeSrc += '&allowedOrigin=' + encodeURIComponent(options.allowedOrigin);
    }
    if (options.externalUserId) {
      iframeSrc += '&externalUserId=' + encodeURIComponent(options.externalUserId);
    }
    if (options.studentName) {
      iframeSrc += '&studentName=' + encodeURIComponent(options.studentName);
    }

    var overlay = document.createElement('div');
    overlay.className = 'cm-overlay';
    overlay.innerHTML =
      '<div class="cm-modal" role="dialog" aria-modal="true" aria-label="' + label + '">' +
      '<button class="cm-close" type="button" aria-label="닫기">✕</button>' +
      '<iframe src="' + iframeSrc + '" title="' + label + '"></iframe>' +
      '</div>';

    document.body.appendChild(fab);
    document.body.appendChild(overlay);

    var closeBtn = overlay.querySelector('.cm-close');
    var lastFocused = null;

    function open() {
      lastFocused = document.activeElement;
      overlay.classList.add('cm-open');
      closeBtn.focus();
    }
    function close() {
      overlay.classList.remove('cm-open');
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    fab.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('cm-open')) close();
    });

    instance = { open: open, close: close };
    window.__CAREER_MATE_INSTANCE__ = instance;
    return instance;
  }

  window.CareerMate = { init: init };
})();
