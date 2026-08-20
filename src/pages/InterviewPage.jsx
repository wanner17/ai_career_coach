import { useEffect } from 'react';
import AppShell from '../components/layout/AppShell.jsx';
import { useCareer } from '../context/CareerContext.jsx';
import { creditInterviewVisit } from '../api/career.js';

// External AI 모의면접 site, framed inside our normal sidebar/header chrome —
// same "outer app owns the shell, inner page owns the content" pattern as
// career-embed.js itself uses on a university host page, just one level in.
const INTERVIEW_URL = 'https://api.eisoft.co.kr:543/interview/';

export default function InterviewPage({ navigate }) {
  const { pushToast, bumpSkill } = useCareer();

  // 능력치 정의 v3 — 면접역량's only real usage signal, since the tool itself
  // is an external iframe with no completion callback we can hook into.
  // Credited once/day server-side (see SkillActivityController), so this
  // effect is safe to fire on every mount without its own guard.
  useEffect(() => {
    creditInterviewVisit()
      .then((res) => {
        if (res.skillGain) {
          bumpSkill('interview', res.skillGain.points);
          pushToast(`📈 ${res.skillGain.skillLabel} +${res.skillGain.points}`);
        }
      })
      .catch(() => {
        // best-effort — a lost skill point shouldn't block the page from rendering
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell activePath="/interview" navigate={navigate} title="AI 모의면접" subtitle="AI 면접관과 실전처럼 연습해보세요.">
      <div className="external-frame">
        <iframe
          src={INTERVIEW_URL}
          title="AI 모의면접"
          allow="camera; microphone"
        />
      </div>
    </AppShell>
  );
}
