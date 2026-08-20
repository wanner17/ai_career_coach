// Thin fetch wrapper for career-backend. Every function in api/career.js
// routes through here so error handling / base URL / JSON parsing / auth
// header lives in exactly one place.
import { getToken, clearToken } from '../utils/authStorage.js';

// `??` not `||` — an internal-server deploy sets VITE_API_BASE="" on purpose
// (see root Dockerfile/nginx.conf: nginx reverse-proxies /api/** to the
// backend container, so the SPA calls its own same origin). `||` would
// treat that empty string as "unset" and silently fall back to localhost.
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const token = getToken();

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch {
    // network failure (backend down, CORS, DNS...) — surface one consistent error type
    throw new ApiError(0, '서버에 연결할 수 없습니다. career-backend가 실행 중인지 확인해주세요.');
  }

  if (res.status === 204) return null; // e.g. DELETE

  // Token missing/expired/invalid — drop it so the next boot re-identifies
  // instead of looping on 401s forever.
  if (res.status === 401) clearToken();

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(res.status, body?.message || `요청이 실패했습니다 (${res.status}).`);
  }
  return body;
}

export const apiGet = (path) => request(path);
export const apiPost = (path, body) => request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
export const apiPut = (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) });
export const apiDelete = (path) => request(path, { method: 'DELETE' });

// Same auth/base-URL handling as `request()`, but for endpoints that don't
// return JSON (e.g. /api/career/worknet's raw XML passthrough — see
// WorknetService) — `request()` would silently drop a non-JSON body to null.
export async function apiGetText(path) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없습니다. career-backend가 실행 중인지 확인해주세요.');
  }
  if (res.status === 401) clearToken();
  const text = await res.text();
  if (!res.ok) throw new ApiError(res.status, `요청이 실패했습니다 (${res.status}).`);
  return text;
}
