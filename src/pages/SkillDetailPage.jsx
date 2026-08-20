import AppShell from '../components/layout/AppShell.jsx';
import { useCareer } from '../context/CareerContext.jsx';
import { skillMeta } from '../data/mockUser.js';

const barClassBySkill = {
  jobSkill: '', resume: 'bluebar', interview: 'orangebar', companyAnalysis: 'purplebar', careerReadiness: 'yellowbar',
};

// 능력치 정의 v3 — grows from actually consuming content, not a quest
// checkbox (see SkillActivityService / AiChatService / WorknetController).
// Each row explains the real mechanism and links straight to the feature
// that grows it.
const GROWTH_INFO = {
  jobSkill: { text: '취업공고에서 채용공고 상세를 열어볼 때마다 조금씩 올라가요 (같은 공고는 한 번만).', cta: '채용공고 보러 가기', to: '/jobs' },
  resume: { text: 'AI 첨삭을 받을 때마다 조금씩 올라가요 (하루 제한 없음).', cta: '자소서 첨삭받기', to: '/essay' },
  interview: { text: 'AI 모의면접 페이지에 접속하면 하루 한 번 올라가요.', cta: 'AI 모의면접 하러 가기', to: '/interview' },
  companyAnalysis: { text: '기업분석에서 기업 상세를 열어볼 때마다 조금씩 올라가요 (같은 기업은 한 번만).', cta: '기업분석 하러 가기', to: '/company' },
  careerReadiness: { text: 'AI 상담에서 취업준비·진로탐색 관련 질문을 하면 하루 한 번 올라가요.', cta: 'AI 상담하러 가기', to: '/ai-chat' },
};

// Dedicated drill-down for "자세히 보기" from both the Dashboard hero card
// and 마이페이지's 나의 역량 card — a bare score on either of those can't
// answer "왜 이 숫자인지, 어떻게 올리는지", so this page does. No sidebar
// entry of its own (드릴다운, not a top-level section) — closest to
// 마이페이지 conceptually, so that's what highlights in the sidebar here.
export default function SkillDetailPage({ navigate }) {
  const { skills } = useCareer();

  return (
    <AppShell activePath="/mypage" navigate={navigate} title="능력치 상세" subtitle="각 능력치가 어떤 활동으로 오르는지 확인해보세요.">
      <article className="card skill-detail-card">
        <div className="skill-detail-list">
          {Object.entries(skillMeta).map(([key, meta]) => {
            const info = GROWTH_INFO[key];
            return (
              <div className="skill-detail-row" key={key}>
                <div className="skill-detail-row__head">
                  <span className={`skill-icon ${meta.colorClass}`}>{meta.icon}</span>
                  <b>{meta.label}</b>
                  <div className={`mini-progress ${barClassBySkill[key]}`}><i style={{ width: `${skills[key]}%` }} /></div>
                  <strong>{skills[key]}</strong>
                </div>
                <div className="skill-detail-row__growth">
                  <span>{info.text}</span>
                  <button type="button" onClick={() => navigate(info.to)}>{info.cta} ›</button>
                </div>
              </div>
            );
          })}
        </div>
      </article>
    </AppShell>
  );
}
