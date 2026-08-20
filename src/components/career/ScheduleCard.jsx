import { useState } from 'react';

export default function ScheduleCard({ schedule }) {
  const [items, setItems] = useState(schedule);
  const apply = (id) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, applied: true } : it)));

  return (
    <article className="card schedule-card">
      <div className="card-head"><h2>예정된 프로그램</h2><a href="#">전체 보기 ›</a></div>
      <div className="schedule-list">
        {items.map((it) => (
          <div className="schedule-item" key={it.id}>
            <time>{it.date}<small>{it.day}</small></time>
            <div>
              <strong>{it.title}</strong>
              <p>{it.desc}</p>
              <small>{it.time}</small>
            </div>
            <button disabled={it.applied} onClick={() => apply(it.id)}>{it.applied ? '신청완료' : '신청하기'}</button>
          </div>
        ))}
      </div>
    </article>
  );
}
