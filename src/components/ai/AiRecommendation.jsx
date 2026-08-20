import { useCareer } from '../../context/CareerContext.jsx';

// Picks the lowest skill and recommends the matching quest — mock logic today,
// same shape a future GET /api/career/ai/recommendation would return.
const SKILL_TO_QUEST = {
  interview: { title: 'AI 모의면접을 진행해보세요!', desc: '현재 면접역량이 다른 역량보다 낮습니다. 모의면접을 통해 실전 감각을 키워보세요.', exp: 250, questId: 3 },
  resume: { title: '자기소개서 첨삭을 받아보세요!', desc: '자기소개서 역량을 보강하면 서류 통과율이 올라가요.', exp: 150, questId: 6 },
  jobSkill: { title: '직무역량 강화 콘텐츠를 확인해보세요!', desc: '직무역량을 채우면 다음 단계로 빠르게 나아갈 수 있어요.', exp: 100, questId: 1 },
  companyAnalysis: { title: '관심 기업분석을 이어가보세요!', desc: '기업분석을 더 쌓아 지원 전략을 구체화해보세요.', exp: 150, questId: 2 },
  careerReadiness: { title: '취업준비도를 높여보세요!', desc: '취업지원센터 프로그램 참여로 준비도를 채워보세요.', exp: 200, questId: 4 },
};

// A single slim banner, not a card with its own header — this is the one
// thing on the dashboard that should read as "one quick suggestion", not
// another box competing with Quest/Badge for attention.
export default function AiRecommendation({ skills, navigate }) {
  const { quests, requestCompleteQuest } = useCareer();
  const lowestKey = Object.entries(skills).sort((a, b) => a[1] - b[1])[0][0];
  const rec = SKILL_TO_QUEST[lowestKey];
  const targetQuest = quests.find((q) => q.id === rec.questId);

  const handleStart = () => {
    if (targetQuest && !targetQuest.completed) requestCompleteQuest(targetQuest);
    else navigate('/quest');
  };

  return (
    <article className="ai-recommend-banner">
      <div className="ai-recommend-banner__icon">🎯</div>
      <div className="ai-recommend-banner__body">
        <span className="ai-recommend-banner__eyebrow">AI 코치 추천</span>
        <strong>{rec.title}</strong>
        <p>{rec.desc} 완료 시 EXP +{rec.exp}</p>
      </div>
      <button onClick={handleStart}>바로 시작하기 →</button>
    </article>
  );
}
