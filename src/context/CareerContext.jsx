import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import * as api from '../api/career.js';
import { ApiError } from '../api/client.js';
import { didAvatarEvolve, getAvatarStage } from '../config/avatarEvolution.js';
import { getToken, setToken, clearToken } from '../utils/authStorage.js';
import { useTheme } from './ThemeContext.jsx';

const CareerContext = createContext(null);

let toastSeq = 1;

/**
 * Central state for the student experience — user/level/exp, quests, badges,
 * toasts, and the level-up modal — backed by career-backend.
 *
 * No login form: the host university page already authenticated this student
 * before it ever loaded our iframe (see career-embed.js's `externalUserId`
 * option), so on boot we either (a) already have a JWT from a previous visit,
 * (b) get `externalUserId` from the URL and silently identify-or-provision,
 * or (c) — direct/dev access with neither — show a tiny manual identify form.
 * Once authenticated, everything below can keep assuming `user` is defined,
 * same as when this was synchronous mock data.
 *
 * Same StrictMode-safety rule as before: setState calls that carry a real
 * side effect (setUser, pushToast, ...) are made directly in the event
 * handler, never nested inside another setState's updater function.
 */
export function CareerProvider({ children }) {
  const theme = useTheme();

  const [user, setUser] = useState(null);
  const [skills, setSkills] = useState(null);
  const [quests, setQuests] = useState([]);
  const [badges, setBadges] = useState([]);
  const [phase, setPhase] = useState('loading'); // loading | identify | error | ready
  const [error, setError] = useState(null);

  const [toasts, setToasts] = useState([]);
  const [levelUpInfo, setLevelUpInfo] = useState(null);
  const [confirmQuest, setConfirmQuest] = useState(null);

  const pushToast = useCallback((message) => {
    const id = toastSeq++;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  }, []);

  // Applies a 능력치 gain the backend already computed (capped at 100 there
  // too — see AiChatService#applyChatSkillBump / EssayReviewService) without
  // a second round trip. Quest completion doesn't call this anymore — 능력치
  // now only grows from real feature usage (AI 상담 topic engagement, essay
  // review), not from checking off a quest.
  const bumpSkill = useCallback((key, points) => {
    if (!key) return;
    setSkills((prev) => (prev ? { ...prev, [key]: Math.min(100, prev[key] + points) } : prev));
  }, []);

  const boot = useCallback(async (manualIdentify) => {
    setPhase('loading');
    setError(null);
    try {
      if (!getToken()) {
        const params = new URLSearchParams(window.location.search);
        const externalUserId = manualIdentify?.externalUserId || params.get('externalUserId');

        if (!externalUserId) {
          setPhase('identify'); // direct/dev access, nobody vouched for a student — ask
          return;
        }

        const identified = await api.identify({
          universityCode: theme.code,
          externalUserId,
          name: manualIdentify?.name || params.get('studentName') || undefined,
        });
        setToken(identified.token);
      }

      const dashboard = await api.getDashboard();
      setUser(dashboard.user);
      setSkills(dashboard.skills);
      setQuests(dashboard.quests);
      setBadges(dashboard.badges);
      setPhase('ready');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러오지 못했습니다.');
      setPhase('error');
    }
  }, [theme.code]);

  useEffect(() => {
    boot();
  }, [boot]);

  const identifyManually = useCallback((externalUserId, name) => {
    boot({ externalUserId, name });
  }, [boot]);

  const logout = useCallback(() => {
    clearToken();
    window.location.reload(); // simplest reset — re-runs boot() with a clean slate
  }, []);

  const completeQuest = useCallback(async (questId) => {
    const quest = quests.find((q) => q.id === questId);
    if (!quest || quest.completed) return; // guard: no re-granting EXP on a finished quest

    try {
      const result = await api.completeQuest(questId);
      if (result.alreadyCompleted) return; // server-side guard caught a race — no-op

      setUser(result.user);
      setQuests((prev) => prev.map((q) => (q.id === questId ? { ...q, completed: true } : q)));
      pushToast(`🎉 ${quest.title} 완료! +${result.expGained} EXP`);

      if (result.leveledUp) {
        setLevelUpInfo({
          fromLevel: result.fromLevel,
          toLevel: result.toLevel,
          avatarEvolved: didAvatarEvolve(result.fromLevel, result.toLevel),
          fromStage: getAvatarStage(result.fromLevel),
          toStage: getAvatarStage(result.toLevel),
        });
        // LEVEL-type badges are derived server-side from the new level — refetch
        // rather than re-implementing that rule here too.
        try {
          setBadges(await api.getBadges());
        } catch {
          // badge refresh failing shouldn't block the quest-complete flow the user just saw
        }
      }
    } catch (err) {
      pushToast(err instanceof ApiError ? `⚠ ${err.message}` : '⚠ 퀘스트 완료 처리에 실패했습니다.');
    }
  }, [quests, pushToast]);

  // 마이페이지 기본 정보 수정 — throws (doesn't swallow) so the form itself
  // can stay open and show the real error instead of silently failing.
  const updateProfile = useCallback(async (payload) => {
    const updated = await api.updateProfile(payload);
    setUser(updated);
    pushToast('✅ 기본 정보를 저장했어요.');
  }, [pushToast]);

  const requestCompleteQuest = useCallback((quest) => setConfirmQuest(quest), []);
  const cancelCompleteQuest = useCallback(() => setConfirmQuest(null), []);
  const confirmCompleteQuest = useCallback(() => {
    if (confirmQuest) completeQuest(confirmQuest.id);
    setConfirmQuest(null);
  }, [confirmQuest, completeQuest]);

  const dismissLevelUp = useCallback(() => setLevelUpInfo(null), []);

  if (phase === 'loading') {
    return <CareerStatusScreen>Career Growth Loop 불러오는 중...</CareerStatusScreen>;
  }
  if (phase === 'identify') {
    return <IdentifyForm universityName={theme.name} onSubmit={identifyManually} />;
  }
  if (phase === 'error') {
    return (
      <CareerStatusScreen isError>
        {error}
        <button className="career-status-retry" onClick={() => boot()}>다시 시도</button>
      </CareerStatusScreen>
    );
  }

  const value = {
    user, skills, badges, quests,
    toasts, pushToast, bumpSkill,
    confirmQuest, requestCompleteQuest, cancelCompleteQuest, confirmCompleteQuest,
    levelUpInfo, dismissLevelUp,
    updateProfile,
    logout,
  };

  return <CareerContext.Provider value={value}>{children}</CareerContext.Provider>;
}

function CareerStatusScreen({ children, isError = false }) {
  return (
    <div className="career-status-screen">
      <div className={`career-status-box ${isError ? 'is-error' : ''}`}>
        {!isError && <div className="career-status-spinner" aria-hidden="true" />}
        <div>{children}</div>
      </div>
    </div>
  );
}

// Only reachable via direct/dev access (no ?externalUserId=, no saved token) —
// the real embed flow never shows this, career-embed.js supplies the id
// silently. Stands in for "login" without a password: see the file-level doc.
function IdentifyForm({ universityName, onSubmit }) {
  const [externalUserId, setExternalUserId] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!externalUserId.trim()) return;
    onSubmit(externalUserId.trim(), name.trim() || undefined);
  };

  return (
    <div className="career-status-screen">
      <form className="identify-box" onSubmit={handleSubmit}>
        <h2>{universityName} 학번 확인</h2>
        <p>실제 서비스에서는 대학 홈페이지 로그인 정보로 자동 확인됩니다.<br />테스트를 위해 학번을 직접 입력해주세요.</p>
        <label>
          학번
          <input value={externalUserId} onChange={(e) => setExternalUserId(e.target.value)} placeholder="예: 20231234" autoFocus />
        </label>
        <label>
          이름 <span className="identify-box__optional">(처음 방문 시에만 사용)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 김미래" />
        </label>
        <button type="submit" disabled={!externalUserId.trim()}>확인</button>
      </form>
    </div>
  );
}

export function useCareer() {
  const ctx = useContext(CareerContext);
  if (!ctx) throw new Error('useCareer must be used within CareerProvider');
  return ctx;
}
