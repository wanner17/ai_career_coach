import { useCareer } from '../../context/CareerContext.jsx';

export default function Header({ title, subtitle, onHamburgerClick, compact = false }) {
  const { user } = useCareer();
  return (
    <header className="career-header">
      <div className="career-header__title-row">
        <button className="hamburger-btn" onClick={onHamburgerClick} aria-label="메뉴 열기">☰</button>
        <div>
          <h1>{title || `안녕하세요, ${user.name}님! 👋`}</h1>
          {!compact && <p>{subtitle || '오늘도 커리어 성장 한 걸음 내딛는 하루가 되세요!'}</p>}
        </div>
      </div>
      {/* Just a notification bell — the message icon and settings button were
          two more things fighting for attention without doing much (embed
          mode drops even this — dead weight in a small iframe). */}
      {!compact && (
        <div className="career-header__actions">
          <button className="icon-btn" aria-label="알림 (3건)">🔔<span className="badge-dot" aria-hidden="true">3</span></button>
          <button className="icon-btn" aria-label="내 프로필">👤</button>
        </div>
      )}
    </header>
  );
}
