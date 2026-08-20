import { useCareer } from '../../context/CareerContext.jsx';

export default function ToastStack() {
  const { toasts } = useCareer();
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div className="toast" key={t.id} role="status">{t.message}</div>
      ))}
    </div>
  );
}
