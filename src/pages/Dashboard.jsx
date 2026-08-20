import { useEffect, useRef, useState } from 'react';
import AppShell from '../components/layout/AppShell.jsx';
import ProfileSummaryCard from '../components/career/ProfileSummaryCard.jsx';
import QuestCard from '../components/quest/QuestCard.jsx';
import BadgeCard from '../components/career/BadgeCard.jsx';
import AiRecommendation from '../components/ai/AiRecommendation.jsx';
import { useCareer } from '../context/CareerContext.jsx';

// No persistent AI panel here anymore — "AI 상담" is a nav item (Sidebar),
// same as any other screen. That's the biggest single decluttering move:
// it was eating a fixed 300px column plus visual attention on every visit,
// even for the vast majority of a session spent not chatting.
export default function Dashboard({ navigate }) {
  const { user, skills, badges, quests } = useCareer();
  const prevUser = useRef({ exp: user.currentExp, level: user.level });
  const [pulse, setPulse] = useState(false);

  // Brief avatar pulse whenever EXP or Level actually moves (quest completion /
  // level-up rollover) — NOT on every render.
  useEffect(() => {
    const expChanged = prevUser.current.exp !== user.currentExp;
    const levelChanged = prevUser.current.level !== user.level;

    if (expChanged || levelChanged) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 500);
      prevUser.current = { exp: user.currentExp, level: user.level };
      return () => clearTimeout(t);
    }

    prevUser.current = { exp: user.currentExp, level: user.level };
  }, [user.currentExp, user.level]);

  return (
    <AppShell activePath="/" navigate={navigate}>
      <ProfileSummaryCard user={user} skills={skills} pulse={pulse} navigate={navigate} />

      <section className="dashboard-row">
        <QuestCard quests={quests} navigate={navigate} />
        <BadgeCard badges={badges} />
      </section>

      <AiRecommendation skills={skills} navigate={navigate} />
    </AppShell>
  );
}
