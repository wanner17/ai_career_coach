import { useRef, useEffect } from 'react';
import CoachAvatar from './CoachAvatar.jsx';
import QuestRecommendationChip from './QuestRecommendationChip.jsx';
import { useAiChat, renderWithBold } from '../../hooks/useAiChat.jsx';

// Dashboard's sticky right-hand AI panel (isOpen/onClose drive the mobile
// slide-in). The standalone /ai-chat page has its own wider layout (see
// pages/AiChat.jsx) built around the coach's large character art — both
// share conversation state/logic via useAiChat() rather than duplicating it.
export default function AiCoachPanel({ isOpen, onClose }) {
  const { messages, input, setInput, typing, handleSend, handleKeyDown, loadFullHistory } = useAiChat();
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, typing]);

  return (
    <aside className={`ai-panel ${isOpen ? 'is-open' : ''}`}>
      <div className="ai-panel__head">
        <h2>AI 커리어 코치</h2>
        <div className="ai-panel__head-actions">
          <a href="#" onClick={(e) => { e.preventDefault(); loadFullHistory(); }}>대화 기록</a>
          {onClose && <button className="ai-panel-close" onClick={onClose} aria-label="닫기">✕</button>}
        </div>
      </div>
      <div className="ai-panel__body" ref={bodyRef}>
        {messages.map((m, i) => (
          m.from === 'ai' && i === 0 ? (
            <div className="coach-avatar-wrap" key={m.id}>
              <div className="coach-avatar"><CoachAvatar /></div>
              <div>
                <div className="bubble left">{renderWithBold(m.text)}</div>
                <QuestRecommendationChip recommendedQuest={m.recommendedQuest} />
              </div>
            </div>
          ) : (
            <div key={m.id}>
              <div className={`bubble ${m.from === 'user' ? 'right' : 'left long'}`}>{renderWithBold(m.text)}</div>
              {m.from === 'ai' && <QuestRecommendationChip recommendedQuest={m.recommendedQuest} />}
            </div>
          )
        ))}
        {typing && (
          <>
            <div className="bubble left typing-bubble">
              <div className="typing-indicator"><span /><span /><span /></div>
            </div>
            <div className="typing-caption">AI 코치가 답변을 작성하고 있습니다...</div>
          </>
        )}
      </div>
      <div className="ai-input">
        <input
          type="text"
          placeholder="메시지를 입력하세요..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={handleSend} disabled={typing}>➤</button>
      </div>
    </aside>
  );
}
