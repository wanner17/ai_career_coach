// One JWT, in localStorage, no refresh token — matches the backend's
// deliberately simple session model (see career-backend's JwtService).
const TOKEN_KEY = 'careermate_token';

// Which (university, externalUserId) the cached token above was minted for.
// Without this, switching host-page accounts in the same browser (logout as
// student A, log back in as student B, both loading this same embed) would
// silently keep reusing A's still-valid token — boot() only ever checked
// "do we have *a* token", never "is it *this* student's token" — so B would
// see A's avatar/level/quests. Cleared together with the token in
// clearToken() so the two can never drift out of sync.
const IDENTITY_KEY = 'careermate_identity';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(IDENTITY_KEY);
}

export function getIdentity() {
  try {
    return JSON.parse(localStorage.getItem(IDENTITY_KEY));
  } catch {
    return null;
  }
}

export function setIdentity(universityCode, externalUserId) {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify({ universityCode, externalUserId }));
}
