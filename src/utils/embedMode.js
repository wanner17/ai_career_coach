// The iframe target is `/?mode=embed&university=CODE` rather than a dedicated
// `/embed` route — a distinct path 404s on static hosts with no SPA rewrite
// rule configured (S3, plain nginx, etc.), a query string never does.
export function isEmbedMode() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('mode') === 'embed';
}
