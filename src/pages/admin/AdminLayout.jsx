import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import BrandLogo from '../../components/layout/BrandLogo.jsx';

// `path: null` = still a nav placeholder (no screen built yet) — clicking
// shows a "준비 중" alert instead of navigating, same pattern AdminQuest.jsx
// already uses for its own error alerts.
const NAV = [
  { key: 'dashboard', icon: '⌂', label: 'Dashboard', path: '/admin' },
  { key: 'students', icon: '☺', label: '학생관리', path: '/admin/students' },
  { key: 'quest', icon: '▣', label: 'Quest 관리', path: '/admin/quest' },
  { key: 'programs', icon: '▤', label: '프로그램 관리', path: '/admin/programs' },
  { key: 'badges', icon: '★', label: 'Badge 관리', path: '/admin/badges' },
  { key: 'stats', icon: '▥', label: '통계', path: '/admin/stats' },
  { key: 'settings', icon: '⚙', label: '설정', path: '/admin/settings' },
];

// Admin's own shell (no AI panel, no student sidebar). `active` picks which
// nav item highlights; `navigate` is threaded through from App.jsx's router
// same as every student page. Sidebar collapses to a hamburger-triggered
// drawer below 1024px, mirroring the student Sidebar's behavior.
export default function AdminLayout({ children, active, navigate }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const handleNavClick = (item) => {
    setOpen(false);
    if (!item.path) {
      window.alert('준비 중인 메뉴입니다.');
      return;
    }
    navigate?.(item.path);
  };

  return (
    <div className="career-app no-ai-panel">
      {open && <div className="sidebar-scrim is-open" onClick={() => setOpen(false)} />}
      <aside className={`career-sidebar ${open ? 'is-open' : ''}`}>
        <div className="career-brand">
          <BrandLogo logo={theme.logo} />
          <div>
            <strong>{theme.name} 관리자</strong>
            <p>Career Growth 관리 콘솔</p>
          </div>
        </div>
        <nav className="career-nav">
          {NAV.map((item) => (
            <a
              key={item.key}
              className={`career-nav__item ${item.key === active ? 'is-active' : ''} ${!item.path ? 'is-soon' : ''}`}
              href="#"
              onClick={(e) => { e.preventDefault(); handleNavClick(item); }}
            >
              <span>{item.icon}</span>{item.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="admin-main">
        <button className="hamburger-btn admin-hamburger" onClick={() => setOpen(true)} aria-label="관리자 메뉴 열기">☰</button>
        {children}
      </main>
    </div>
  );
}
