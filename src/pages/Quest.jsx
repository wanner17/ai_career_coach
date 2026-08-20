import { useState } from 'react';
import AppShell from '../components/layout/AppShell.jsx';
import QuestItem from '../components/quest/QuestItem.jsx';
import { CATEGORIES } from '../data/mockQuests.js';
import { useCareer } from '../context/CareerContext.jsx';

export default function Quest({ navigate }) {
  const { quests } = useCareer();
  const [activeCategory, setActiveCategory] = useState('전체');

  const completedCount = quests.filter((q) => q.completed).length;
  const percent = Math.round((completedCount / quests.length) * 100);
  const visible = activeCategory === '전체' ? quests : quests.filter((q) => q.category === activeCategory);

  return (
    <AppShell activePath="/quest" navigate={navigate} title="오늘의 퀘스트" subtitle="퀘스트를 완료하고 EXP를 획득해보세요.">
      <article className="card quest-progress-card">
        <div className="quest-progress-card__head">
          <strong>이번 주 진행률</strong>
          <span>{completedCount} / {quests.length} 완료</span>
        </div>
        <div className="progress"><i style={{ width: `${percent}%` }} /></div>
      </article>

      <div className="quest-category-tabs">
        {['전체', ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            className={`quest-category-tab ${activeCategory === cat ? 'is-active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <article className="card">
        <div className="quest-list">
          {visible.map((q) => <QuestItem key={q.id} quest={q} showCategory />)}
          {visible.length === 0 && <p className="quest-empty">해당 카테고리의 퀘스트가 없습니다.</p>}
        </div>
      </article>
    </AppShell>
  );
}
