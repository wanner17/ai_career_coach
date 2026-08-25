import { useEffect, useRef, useState } from 'react';
import { useCareer } from '../context/CareerContext.jsx';
import { initialChatLog } from '../data/mockChat.js';
import { skillMeta } from '../data/mockUser.js';
import { streamAiChat, getAiChatHistory } from '../api/career.js';

// Backend sends skillGain as a Korean label (자기소개서, 면접역량, ...) since
// that's all the toast needs — this maps it back to the skills object's key
// so CareerContext.bumpSkill() can update the right bar without a refetch.
const LABEL_TO_SKILL_KEY = Object.fromEntries(Object.entries(skillMeta).map(([key, meta]) => [meta.label, key]));

let msgSeq = 100;

export function formatChatTime(date) {
  return new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
}

// The system prompt asks the model not to use markdown, but that's a
// request, not a guarantee — LLMs reach for **bold** out of habit anyway.
// Rendering it is cheaper and more reliable than fighting the model for it.
export function renderWithBold(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

/**
 * Shared conversation state/logic for both AI 상담 surfaces — the Dashboard's
 * sticky AiCoachPanel and the standalone /ai-chat page's wider layout. Both
 * render this differently but talk to POST /api/career/ai/chat + GET
 * .../history the same way, so the state machine lives here once instead of
 * being copy-pasted between the two.
 */
export function useAiChat() {
  const { user, pushToast, bumpSkill } = useCareer();
  const [messages, setMessages] = useState(() =>
    initialChatLog.map((m) => ({ ...m, text: m.text.replace('{name}', user.name), time: null }))
  );
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  // Guards against a slow history fetch clobbering messages the student
  // already sent in this same panel/page session.
  const sentRef = useRef(false);

  const applyHistory = (history) => {
    setMessages(history.map((m) => ({
      id: `h-${m.id}`,
      from: m.role === 'user' ? 'user' : 'ai',
      text: m.message,
      time: formatChatTime(new Date(m.createdAt)),
    })));
  };

  // Past turns replace the fixed greeting once loaded — same "real record
  // wins over synthetic default" idea as EssayReview's history section.
  useEffect(() => {
    (async () => {
      try {
        const history = await getAiChatHistory();
        if (sentRef.current || history.length === 0) return;
        applyHistory(history);
      } catch {
        // keep showing the greeting fallback already in state
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Backs the "상담 기록" button — pulls a longer window than the default mount load.
  const loadFullHistory = async () => {
    try {
      const history = await getAiChatHistory(100);
      if (history.length > 0) applyHistory(history);
    } catch {
      // no-op — the click just won't do anything this time
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || typing) return; // also blocks double-send while a reply is in flight
    sentRef.current = true;
    setMessages((prev) => [...prev, { id: msgSeq++, from: 'user', text, time: formatChatTime(new Date()) }]);
    setInput('');
    setTyping(true);

    // The "•••" typing indicator (rendered from `typing`) stands in for however
    // long round 1's tool-decision + the first streamed token take; the moment
    // real text starts arriving, it's swapped for the growing bubble itself —
    // no more artificial MIN_TYPING_MS delay needed, the wait is now real.
    const aiMsgId = msgSeq++;
    let started = false;

    try {
      await streamAiChat(text, (eventName, dataText) => {
        if (eventName === 'chunk') {
          if (!started) {
            started = true;
            setTyping(false);
            setMessages((prev) => [...prev, { id: aiMsgId, from: 'ai', text: '', time: formatChatTime(new Date()) }]);
          }
          setMessages((prev) => prev.map((m) => (m.id === aiMsgId ? { ...m, text: m.text + dataText } : m)));
        } else if (eventName === 'done') {
          const response = JSON.parse(dataText);
          setMessages((prev) => prev.map((m) => (m.id === aiMsgId ? { ...m, recommendedQuest: response.recommendedQuest || null } : m)));

          // 능력치 정의 v2 — genuinely discussing a topic with the AI coach (not
          // a quest checkbox) is what grows the matching axis now; see
          // AiChatService#applyChatSkillBump for the once-per-day cap.
          if (response.skillGain) {
            bumpSkill(LABEL_TO_SKILL_KEY[response.skillGain.skillLabel], response.skillGain.points);
            pushToast(`📈 ${response.skillGain.skillLabel} +${response.skillGain.points}`);
          }
        } else if (eventName === 'error') {
          throw new Error('AI stream reported an error');
        }
        // 'tool' event — no dedicated UI for it yet; the typing dots already cover this gap.
      });

      if (!started) throw new Error('stream ended with no reply text'); // e.g. model produced only a meta block
    } catch {
      setMessages((prev) => {
        const errorMsg = { id: aiMsgId, from: 'ai', text: '⚠ 답변을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.', time: formatChatTime(new Date()) };
        // A bubble may already exist if streaming started then failed partway —
        // replace it rather than leaving a half-typed message plus an error one.
        return prev.some((m) => m.id === aiMsgId) ? prev.map((m) => (m.id === aiMsgId ? errorMsg : m)) : [...prev, errorMsg];
      });
    } finally {
      setTyping(false);
    }
  };

  // Guard against IME composition: while composing Korean (or any IME) input,
  // the "commit" Enter that finalizes a syllable block must NOT also send the
  // message. Both checks matter — nativeEvent.isComposing covers most browsers,
  // keyCode 229 catches Safari's stale isComposing on the commit keystroke.
  const handleKeyDown = (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    handleSend();
  };

  return { user, messages, input, setInput, typing, handleSend, handleKeyDown, loadFullHistory };
}
