import AppShell from '../components/layout/AppShell.jsx';
import AvatarCard from '../components/avatar/AvatarCard.jsx';
import SkillCard from '../components/career/SkillCard.jsx';
import BadgeCard from '../components/career/BadgeCard.jsx';
import ScheduleCard from '../components/career/ScheduleCard.jsx';
import GoalProgress from '../components/career/GoalProgress.jsx';
import { mockSchedule } from '../data/mockSchedule.js';
import { useCareer } from '../context/CareerContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function MyPage({ navigate }) {
  const { user, skills, badges, quests } = useCareer();
  const theme = useTheme();
  const completed = quests.filter((q) => q.completed).length;

  const infoRows = [
    ['이름', user.name],
    ['대학', theme.name],
    ['학과', user.major],
    ['학년', `${user.grade}학년`],
    ['희망 직무', user.desiredJob],
    ['완료 퀘스트', `${completed} / ${quests.length}`],
  ];

  return (
    <AppShell activePath="/mypage" navigate={navigate} title="마이페이지" subtitle="나의 커리어 성장 현황을 한눈에 확인해보세요.">
      <section className="top-grid mypage-grid">
        <AvatarCard user={user} />
        <SkillCard skills={skills} navigate={navigate} />
        <article className="card mypage-info-card">
          <div className="card-head mypage-info-card__head"><h2>기본 정보</h2></div>
          <dl className="mypage-info-list">
            {infoRows.map(([label, value]) => (
              <div className="mypage-info-row" key={label}>
                <dt>{label}</dt><dd>{value}</dd>
              </div>
            ))}
          </dl>
        </article>
      </section>
      <section className="mypage-badges">
        <BadgeCard badges={badges} />
      </section>
      <section className="mypage-schedule">
        <ScheduleCard schedule={mockSchedule} />
      </section>
      <GoalProgress />
    </AppShell>
  );
}
