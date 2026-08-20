// Turns one admin-picked hex color into the full 6-value palette every
// theme needs (--career-primary and friends — see styles/variables.css).
// Asking an admin to hand-pick 6 correlated hex values would produce
// inconsistent-looking themes; this derives the rest with simple RGB
// mixing so any base color comes out coherent. Purely a frontend UI
// convenience — the backend just stores whatever 6 values it's given, no
// derivation happens server-side.

function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('');
}

// Linear-interpolates each channel toward `target` by `ratio` (0 = stays put, 1 = becomes target).
function mixToward(rgb, target, ratio) {
  return {
    r: rgb.r + (target.r - rgb.r) * ratio,
    g: rgb.g + (target.g - rgb.g) * ratio,
    b: rgb.b + (target.b - rgb.b) * ratio,
  };
}

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

export function isValidHex(hex) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test((hex || '').trim());
}

export function deriveTheme(primaryHex) {
  const rgb = hexToRgb(primaryHex);
  return {
    primaryColor: rgbToHex(rgb),
    primaryColorHover: rgbToHex(mixToward(rgb, BLACK, 0.15)),
    primaryColorLight: rgbToHex(mixToward(rgb, WHITE, 0.92)),
    primaryColorSoft: rgbToHex(mixToward(rgb, WHITE, 0.96)),
    primaryColor2: rgbToHex(mixToward(rgb, WHITE, 0.18)),
    primaryColorShadow: `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, .24)`,
  };
}
