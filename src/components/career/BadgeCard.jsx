export default function BadgeCard({ badges }) {
  const earnedCount = badges.filter((b) => b.earned).length;
  return (
    <article className="card badge-card">
      <div className="card-head">
        <h2>보유 배지</h2>
        <div className="badge-card__head-right">
          <span className="badge-card__count">{earnedCount}/{badges.length}</span>
          <a href="#">더보기 ›</a>
        </div>
      </div>
      <div className="badge-list">
        {badges.map((b) => (
          <div key={b.id} className={b.earned ? '' : 'locked'}>
            <span className={`medal ${b.earned ? b.medalClass : ''}`}>{b.earned ? b.icon : '🔒'}</span>
            <strong>{b.name}</strong>
            <small>{b.unlockType === 'LEVEL' ? `Lv.${b.unlockValue}` : '퀘스트 달성'}</small>
          </div>
        ))}
      </div>
    </article>
  );
}
