const STEPS = [
  { key: 'explore', label: '진로 탐색' },
  { key: 'build', label: '역량 강화' },
  { key: 'prepare', label: '실전 준비' },
  { key: 'apply', label: '지원 시작' },
  { key: 'offer', label: '최종 합격' },
];

// Mock journey progress — `activeIndex` marks the current step, steps before it are done.
export default function GoalProgress({ percent = 63, activeIndex = 2 }) {
  return (
    <section className="goal-card">
      <div>
        <span>당신의 목표까지</span>
        <strong>{percent}% 진행 중!</strong>
      </div>
      <div className="goal-steps">
        {STEPS.map((step, i) => (
          <div key={step.key} className={`goal-step ${i < activeIndex ? 'done' : i === activeIndex ? 'active' : ''}`}>
            <i>{i < activeIndex ? '✓' : i === activeIndex ? '⏱' : i === STEPS.length - 1 ? '★' : '•'}</i>
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
