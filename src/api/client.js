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

  // The user row this token points to is gone (e.g. deleted straight from the
  // DB, not through a real account-delete flow) — UserService/QuestService/
  // BadgeService all throw NotFoundException("사용자를 찾을 수 없습니다: ...")
  // for this, which maps to 404, not 401, so the 401-only check above misses
  // it and the app would otherwise retry forever with the same dead token
  // instead of re-identifying a fresh user.
  if (res.status === 404 && body?.message?.startsWith('사용자를 찾을 수 없습니다')) {
    clearToken();
  }

  if (!res.ok) {
    throw new ApiError(res.status, body?.message || `요청이 실패했습니다 (${res.status}).`);
  }
  return body;
}

export const apiGet = (path) => request(path);
export const apiPost = (path, body) => request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
export const apiPut = (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) });
export const apiDelete = (path) => request(path, { method: 'DELETE' });

// Streams a POST response as Server-Sent Events — used by the AI chat's
// live-typing reply (see api/career.js's streamAiChat). Manual SSE framing
// instead of the browser's EventSource: EventSource is GET-only and can't
// set a custom Authorization header, which would mean smuggling the JWT into
// the URL instead of reusing the same Bearer-header pattern as every other
// call in this file. onEvent(name, dataText) fires once per event frame, in
// arrival order; a thrown error inside onEvent aborts the stream and rejects
// this promise, same as any other apiXxx call's error handling.
export async function apiPostStream(path, body, onEvent) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없습니다. career-backend가 실행 중인지 확인해주세요.');
  }

  if (res.status === 401) clearToken();
  if (!res.ok || !res.body) {
    const isJson = res.headers.get('content-type')?.includes('application/json');
    const errBody = isJson ? await res.json().catch(() => null) : null;
    throw new ApiError(res.status, errBody?.message || `요청이 실패했습니다 (${res.status}).`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are blank-line-separated; each frame holds `event:`/`data:` lines.
    let sepIndex;
    while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);
      let eventName = 'message';
      const dataLines = [];
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim(); // event names are plain identifiers — no meaningful whitespace to preserve
        } else if (line.startsWith('data:')) {
          // SSE spec: strip at most ONE leading space after "data:" (the conventional
          // wire separator), never .trim() the whole value — a chunk's actual content
          // can legitimately BE a leading/trailing space (that's exactly where OpenAI's
          // streamed deltas put word-boundary spaces, e.g. "안녕" then " 하세요"), and
          // trimming those away is what glued every word together with no spacing.
          let value = line.slice(5);
          if (value.startsWith(' ')) value = value.slice(1);
          dataLines.push(value);
        }
      }
      if (dataLines.length > 0) onEvent(eventName, dataLines.join('\n'));
    }
  }
}

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
