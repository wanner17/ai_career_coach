export default function ProgressBar({ percent, mini = false, barClass = '' }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={mini ? `mini-progress ${barClass}` : 'progress'}>
      <i style={{ width: `${clamped}%` }} />
    </div>
  );
}
