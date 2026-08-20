import { useCallback, useEffect, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { CareerProvider } from './context/CareerContext.jsx';
import { AvatarGenderProvider } from './context/AvatarGenderContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Quest from './pages/Quest.jsx';
import AiChat from './pages/AiChat.jsx';
import InterviewPage from './pages/InterviewPage.jsx';
import Jobs from './pages/Jobs.jsx';
import CompanyAnalysis from './pages/CompanyAnalysis.jsx';
import EssayReview from './pages/EssayReview.jsx';
import MyPage from './pages/MyPage.jsx';
import GrowthPage from './pages/GrowthPage.jsx';
import SkillDetailPage from './pages/SkillDetailPage.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminQuest from './pages/admin/AdminQuest.jsx';
import AdminProgram from './pages/admin/AdminProgram.jsx';
import AdminStudents from './pages/admin/AdminStudents.jsx';
import AdminBadge from './pages/admin/AdminBadge.jsx';
import AdminStats from './pages/admin/AdminStats.jsx';
import AdminSettings from './pages/admin/AdminSettings.jsx';

// iframe embedding uses `/?mode=embed&university=CODE` (see utils/embedMode.js),
// not a dedicated route, so the same "/" Dashboard serves both normal and
// embedded visitors — no extra path for a static host to 404 on.
const ROUTES = {
  '/': Dashboard,
  '/quest': Quest,
  '/ai-chat': AiChat,
  '/interview': InterviewPage,
  '/growth': GrowthPage,
  '/jobs': Jobs,
  '/company': CompanyAnalysis,
  '/essay': EssayReview,
  '/mypage': MyPage,
  '/skills': SkillDetailPage,
  '/admin': AdminDashboard,
  '/admin/quest': AdminQuest,
  '/admin/programs': AdminProgram,
  '/admin/students': AdminStudents,
  '/admin/badges': AdminBadge,
  '/admin/stats': AdminStats,
  '/admin/settings': AdminSettings,
};

// Tiny pathname router — no react-router dependency needed for ~7 routes.
// Keeps the university query string intact across navigate() calls.
function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path) => {
    if (path === window.location.pathname) return;
    window.history.pushState({}, '', path + window.location.search);
    setPathname(path);
  }, []);

  return [pathname, navigate];
}

// CareerProvider now does a real GET /api/career/dashboard fetch on mount —
// only the student-facing pages need that (and its loading/error gate).
// Admin has its own independent data fetching (see AdminQuest.jsx) and
// shouldn't wait on, or fail because of, the student dashboard call.
const STUDENT_PATHS = new Set(['/', '/quest', '/ai-chat', '/interview', '/growth', '/jobs', '/company', '/essay', '/mypage', '/skills']);

export default function App() {
  const [pathname, navigate] = usePathname();
  const Page = ROUTES[pathname] || Dashboard;
  const page = <Page navigate={navigate} />;

  return (
    <ThemeProvider>
      {STUDENT_PATHS.has(pathname)
        ? <CareerProvider><AvatarGenderProvider>{page}</AvatarGenderProvider></CareerProvider>
        : page}
    </ThemeProvider>
  );
}
