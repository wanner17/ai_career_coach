import { useCareer } from '../../context/CareerContext.jsx';

// Turns AiChatService's recommendedQuestId into an actual action instead of
// leaving it as text the student has to go act on themselves elsewhere —
// this is the "퀘스트 추천 → 원클릭 실행" differentiator. Looks the quest up
// live (not just trusting the chat response) so a quest finished elsewhere
// in the meantime doesn't leave a stale chip.
export default function QuestRecommendationChip({ recommendedQuest }) {
  const { quests, requestCompleteQuest } = useCareer();
  if (!recommendedQuest) return null;

  const live = quests.find((q) => q.id === recommendedQuest.id);
  if (!live || live.completed) return null;

  return (
    <button type="button" className="ai-quest-chip" onClick={() => requestCompleteQuest(live)}>
      <span>🎯 {live.title}</span>
      <span className="ai-quest-chip__exp">+{live.exp} EXP · 바로 시작하기</span>
    </button>
  );
}
