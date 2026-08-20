import QuestItem from './QuestItem.jsx';

// Dashboard widget: today's 4 quests + link to the full Quest page.
export default function QuestCard({ quests, navigate }) {
  const todays = quests.filter((q) => q.today);
  return (
    <article className="card quest-card">
      <div className="card-head">
        <h2>오늘의 퀘스트</h2>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/quest'); }}>전체 보기 ›</a>
      </div>
      <div className="quest-list">
        {todays.map((q) => <QuestItem key={q.id} quest={q} />)}
      </div>
      <button className="quest-more" onClick={() => navigate('/quest')}>퀘스트 더보기⌄</button>
    </article>
  );
}
