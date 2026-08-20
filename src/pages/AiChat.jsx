import { Fragment, useEffect, useRef, useState } from 'react';
import AppShell from '../components/layout/AppShell.jsx';
import CoachAvatar from '../components/ai/CoachAvatar.jsx';
import QuestRecommendationChip from '../components/ai/QuestRecommendationChip.jsx';
import { useAiChat, renderWithBold } from '../hooks/useAiChat.jsx';
import { useAvatarGender } from '../context/AvatarGenderContext.jsx';
import { useCareer } from '../context/CareerContext.jsx';
import { getAiChatInsights } from '../api/career.js';

// Highest LEVEL-type badge the student has actually earned at their current
// level — e.g. "면접왕" once Lv.5 is cleared — not a hardcoded placeholder.
function currentTitle(badges, level) {
  const earned = badges.filter((b) => b.unlockType === 'LEVEL' && b.earned && b.unlockValue <= level);
  if (earned.length === 0) return null;
  return earned.sort((a, b) => b.unlockValue - a.unlockValue)[0].name;
}

const TOPIC_ICONS = { 직무역량: '💼', 자기소개서: '✍️', 면접: '🎤', 기업분석: '🔍', 취업준비: '🎯', 진로탐색: '🧭', 기타: '💬' };

// "상담 인사이트" — differentiator #3: every user turn AiChatService tags
// with a topic gets counted here, turning the conversation history into a
// small trend view instead of a log nobody looks at again.
function InsightsCard({ insights }) {
  if (!insights || insights.length === 0) return null;
  const max = Math.max(...insights.map((t) => t.count));

  return (
    <article className="card ai-insights">
      <h3 className="job-detail__section">상담 인사이트 · 관심 주제</h3>
      <ul className="ai-insights__list">
        {insights.map((t) => (
          <li key={t.topic}>
            <span className="ai-insights__label">{TOPIC_ICONS[t.topic] || '💬'} {t.topic}</span>
            <div className="ai-insights__bar"><span style={{ width: `${(t.count / max) * 100}%` }} /></div>
            <span className="ai-insights__count">{t.count}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

// Standalone AI 상담 page — a wide two-column "consult room" (large coach
// portrait + student info card on the left, roomy conversation on the
// right), distinct from the Dashboard's compact sticky AiCoachPanel. Both
// share the same conversation state via useAiChat().
export default function AiChat({ navigate }) {
  const { user, badges } = useCareer();
  const { avatarGender, setAvatarGender } = useAvatarGender();
  const { messages, input, setInput, typing, handleSend, handleKeyDown, loadFullHistory } = useAiChat();
  const bodyRef = useRef(null);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, typing]);

  // Refetch once on mount, then again after every turn completes (typing
  // flips back to false) — a fresh topic tag from the just-sent message
  // should show up without a manual reload.
  useEffect(() => {
    if (typing) return;
    getAiChatInsights().then(setInsights).catch(() => setInsights([]));
  }, [typing]);

  const title = currentTitle(badges, user.level);

  return (
    <AppShell activePath="/ai-chat" navigate={navigate} title="AI 상담" subtitle="궁금한 커리어 고민을 편하게 물어보세요.">
      <article className="card ai-consult">
        <div className="ai-consult__header">
          <h2>AI 커리어 코치</h2>
          <button type="button" className="ai-consult__history-btn" onClick={loadFullHistory}>◷ 상담 기록</button>
        </div>

        <div className="ai-consult__body">
          <aside className="ai-consult__coach">
            <div className="ai-consult__visual">
              <span className="ai-consult__visual-badge">✦ AI Career Coach</span>
              <CoachAvatar />
            </div>

            <div className="ai-consult__gender-switch">
              <button type="button" className={avatarGender === 'FEMALE' ? 'active' : ''} onClick={() => setAvatarGender('FEMALE')}>여자 코치</button>
              <button type="button" className={avatarGender === 'MALE' ? 'active' : ''} onClick={() => setAvatarGender('MALE')}>남자 코치</button>
            </div>

            <section className="ai-consult__user-card">
              <h3>{user.name}님의 정보</h3>
              <dl className="ai-consult__info-grid">
                <dt>학과</dt><dd>{user.major || '미입력'}</dd>
                <dt>학년</dt><dd>{user.grade}학년</dd>
                <dt>희망직무</dt><dd>{user.desiredJob || '미입력'}</dd>
                <dt>현재 레벨</dt><dd>Lv.{user.level}{title ? ` · ${title}` : ''}</dd>
              </dl>
              <button type="button" className="ai-consult__edit-btn" onClick={() => navigate('/mypage')}>정보 수정</button>
            </section>
          </aside>

          <main className="ai-consult__chat">
            <div className="ai-consult__messages" ref={bodyRef}>
              {messages.map((m) => (
                <Fragment key={m.id}>
                  <div className={`ai-consult__row ${m.from}`}>
                    {m.from === 'ai' ? (
                      <>
                        <div className="ai-consult__bubble">{renderWithBold(m.text)}</div>
                        {m.time && <span className="ai-consult__time">{m.time}</span>}
                      </>
                    ) : (
                      <>
                        {m.time && <span className="ai-consult__time">{m.time}</span>}
                        <div className="ai-consult__bubble">{renderWithBold(m.text)}</div>
                      </>
                    )}
                  </div>
                  {m.from === 'ai' && <QuestRecommendationChip recommendedQuest={m.recommendedQuest} />}
                </Fragment>
              ))}
              {typing && (
                <div className="ai-consult__row ai">
                  <div className="ai-consult__bubble ai-consult__bubble--typing">
                    <div className="typing-indicator"><span /><span /><span /></div>
                  </div>
                </div>
              )}
            </div>
            <div className="ai-consult__input">
              <div className="ai-consult__input-shell">
                <input
                  type="text"
                  placeholder="궁금한 내용을 입력하세요..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button type="button" onClick={handleSend} disabled={typing}>➤</button>
              </div>
            </div>
          </main>
        </div>
      </article>

      <InsightsCard insights={insights} />
    </AppShell>
  );
}
