// One function per career-backend endpoint — see career-backend/README.md for
// the full contract. userId travels via the JWT (see api/client.js), not as
// a param here — only /api/auth/identify and the admin endpoints don't need one.
import { apiGet, apiGetText, apiPost, apiPut, apiDelete } from './client.js';

export const getUniversity = (code) => apiGet(`/api/career/university/${code}`);

// No password — the host page already authenticated this student; we just
// trust (universityCode, externalUserId) and load-or-provision. See
// career-backend's AuthService.
export const identify = (payload) => apiPost('/api/auth/identify', payload);

export const getUser = () => apiGet('/api/career/user/me');
export const getDashboard = () => apiGet('/api/career/dashboard/me');
export const updateAvatar = (payload) => apiPut('/api/career/user/me/avatar', payload);
export const updateProfile = (payload) => apiPut('/api/career/user/me/profile', payload);

export const getQuests = () => apiGet('/api/career/quests');
export const completeQuest = (questId) => apiPost(`/api/career/quests/${questId}/complete`);

export const getBadges = () => apiGet('/api/career/badges');

export const sendAiChat = (message) => apiPost('/api/career/ai/chat', { message });
export const getAiChatHistory = (limit = 20) => apiGet(`/api/career/ai/chat/history?limit=${limit}`);
export const getAiChatInsights = () => apiGet('/api/career/ai/chat/insights');

// Fires once per InterviewPage mount — 면접역량's only real usage signal
// (the mock-interview tool is an external iframe with no completion callback).
export const creditInterviewVisit = () => apiPost('/api/career/skills/interview-visit');

export const reviewEssay = (payload) => apiPost('/api/career/essay/review', payload);
export const getEssayHistory = (limit = 20) => apiGet(`/api/career/essay/history?limit=${limit}`);

// Raw XML passthrough — see career-backend's WorknetService for why.
// `params` mirrors the legacy worknet controller's query shape
// (type/callTp/keyword/startPage/sortOrderBy/areaCd/eventNo/empSeqno/empCoNo).
export const getWorknetXml = (params) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
  return apiGetText(`/api/career/worknet?${query.toString()}`);
};

export const getAdminQuests = () => apiGet('/api/admin/quests');
export const createAdminQuest = (payload) => apiPost('/api/admin/quests', payload);
export const updateAdminQuest = (id, payload) => apiPut(`/api/admin/quests/${id}`, payload);
export const deleteAdminQuest = (id) => apiDelete(`/api/admin/quests/${id}`);

export const getAdminStudents = () => apiGet('/api/admin/students');

export const getAdminBadges = () => apiGet('/api/admin/badges');
export const createAdminBadge = (payload) => apiPost('/api/admin/badges', payload);
export const updateAdminBadge = (id, payload) => apiPut(`/api/admin/badges/${id}`, payload);
export const deleteAdminBadge = (id) => apiDelete(`/api/admin/badges/${id}`);

export const getAdminStats = () => apiGet('/api/admin/stats');
export const getAdminDashboard = () => apiGet('/api/admin/dashboard');

export const updateAdminUniversity = (code, payload) => apiPut(`/api/admin/universities/${code}`, payload);
