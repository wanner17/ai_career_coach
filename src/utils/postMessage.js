// Structure-only for now — no host page actually listens yet. Wiring this up
// for real (2nd phase) means the host calling window.addEventListener('message', ...)
// and passing a concrete allowedOrigin instead of the '*' dev default below.
const SOURCE = 'CAREER_MATE';

// career-embed.js forwards its `allowedOrigin` init option onto the iframe URL
// (?allowedOrigin=...) so the embedded app can target postMessage at the real
// host domain instead of '*' once a host provides one — see CareerMate.init().
function resolveAllowedOrigin() {
  if (typeof window === 'undefined') return '*';
  return new URLSearchParams(window.location.search).get('allowedOrigin') || '*';
}

/**
 * @param {string} type e.g. 'QUEST_COMPLETE', 'LEVEL_UP'
 * @param {object} payload
 * @param {string} [allowedOrigin] target origin; defaults to the `allowedOrigin`
 *   URL param, then '*' if neither is set.
 */
export function notifyParent(type, payload, allowedOrigin) {
  if (typeof window === 'undefined' || window.parent === window) return; // not embedded
  try {
    window.parent.postMessage({ source: SOURCE, type, payload }, allowedOrigin || resolveAllowedOrigin());
  } catch {
    // best-effort only — never let a notify failure break the UI
  }
}
