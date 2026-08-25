import { useTheme } from '../../context/ThemeContext.jsx';
import { useCareer } from '../../context/CareerContext.jsx';
import { useAvatarGender } from '../../context/AvatarGenderContext.jsx';
import { weeklySpecialQuest } from '../../data/mockQuests.js';
import BrandLogo from './BrandLogo.jsx';
import EvolutionAvatar from '../avatar/EvolutionAvatar.jsx';

// `implemented: false` items are visible in nav but not built yet in this MVP —
// clicking shows a "준비 중" toast instead of silently dropping the user on /quest.
const NAV_ITEMS = [
  { key: 'dashboard', icon: '⌂', label: '대시보드', path: '/', implemented: true },
  { key: 'quest', icon: '▣', label: '오늘의 퀘스트', path: '/quest', implemented: true },
  { key: 'ai-chat', icon: '◌', label: 'AI 상담', path: '/ai-chat', implemented: true },
  { key: 'growth', icon: '🌱', label: '나의 성장', path: '/growth', implemented: true },
  { key: 'ranking', icon: '🏆', label: '성장 랭킹', path: '/ranking', implemented: true },
  { key: 'interview', icon: '▻', label: 'AI 모의면접', path: '/interview', implemented: true },
  { key: 'resume', icon: '✎', label: '자기소개서 첨삭', path: '/essay', implemented: true },
  { key: 'company', icon: '⌕', label: '기업분석', path: '/company', implemented: true },
  { key: 'jobs', icon: '▤', label: '취업 공고', path: '/jobs', implemented: true },
  { key: 'mypage', icon: '♙', label: '마이페이지', path: '/mypage', implemented: true },
];

export default function Sidebar({ activePath, navigate, isOpen, onClose }) {
  const theme = useTheme();
  const { user, pushToast, logout } = useCareer();
  const { avatarGender } = useAvatarGender();

  const handleNavClick = (item) => {
    if (!item.implemented) {
      pushToast('🔧 준비 중인 기능입니다.');
      onClose?.();
      return;
    }
    navigate(item.path);
    onClose?.();
  };

  return (
    <>
      {isOpen && <div className="sidebar-scrim is-open" onClick={onClose} />}
      <aside className={`career-sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className="career-brand">
          <BrandLogo logo={theme.logo} />
          <div>
            <strong>AI 커리어 코치</strong>
            <p>{theme.name}</p>
          </div>
        </div>

        <nav className="career-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`career-nav__item ${activePath === item.path && item.implemented ? 'is-active' : ''}`}
              onClick={() => handleNavClick(item)}
              aria-current={activePath === item.path && item.implemented ? 'page' : undefined}
            >
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <div className="weekly-quest">
          <span className="weekly-quest__eyebrow">이번 주 특별 퀘스트</span>
          <strong>{weeklySpecialQuest.title}</strong>
          <b>EXP +{weeklySpecialQuest.exp}</b>
          <div className="gift">🎁</div>
          <button onClick={() => handleNavClick({ path: '/quest', implemented: true })}>참여하기</button>
        </div>

        {/* <div className="profile-box">
          <div className="profile-avatar"><EvolutionAvatar level={user.level} avatarGender={avatarGender} /></div>
          <div>
            <strong>{user.name}</strong>
            <p>{user.major} {user.grade}학년</p>
          </div>
          <button className="profile-box__logout" onClick={logout} aria-label="로그아웃" title="로그아웃">⏻</button>
        </div> */}
      </aside>
    </>
  );
}
