// One JWT, in localStorage, no refresh token — matches the backend's
// deliberately simple session model (see career-backend's JwtService).
const TOKEN_KEY = 'careermate_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
