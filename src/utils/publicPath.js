// Prefixes a root-relative /public asset path (e.g. '/assets/avatar/...')
// with the build's base path. Vite only rewrites asset references it can see
// at build time (import()'d assets, <link>/<script> tags) — a plain string
// literal used directly as an <img src> (see config/avatarEvolution.js) is
// invisible to that rewrite, so under a subpath deployment (VITE_BASE_PATH=
// '/career/', see vite.config.js) it would keep resolving against the origin
// root and 404. Root deployment: BASE_URL is '/', so this is a no-op.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function withBase(path) {
  return BASE + path;
}
