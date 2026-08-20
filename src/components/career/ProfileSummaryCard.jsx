import { calculateExpPercent } from '../../utils/careerLevel.js';
import { useAvatarGender } from '../../context/AvatarGenderContext.jsx';
import { avatarEvolutionStages, getAvatarStage, isMaxStage } from '../../config/avatarEvolution.js';
import { skillMeta } from '../../data/mockUser.js';
import EvolutionAvatar from '../avatar/EvolutionAvatar.jsx';

const barClassBySkill = {
  jobSkill: '', resume: 'bluebar', interview: 'orangebar', companyAnalysis: 'purplebar', careerReadiness: 'yellowbar',
};

// Dashboard hero card: avatar + Career Level + 능력치 in one wide card
// (photo left as a full-bleed "stage" — object-fit:cover, no small vertical
// photo-frame nested inside it — stats right). Finished per-stage art, so no
// part-by-part positioning is ever needed here. MyPage keeps its own
// AvatarCard/SkillCard as separate cards; this component isn't reused there.
export default function ProfileSummaryCard({ user, skills, pulse, navigate }) {
  const { avatarGender } = useAvatarGender();
  const stage = getAvatarStage(user.level);
  const percent = calculateExpPercent(user.currentExp, user.nextLevelExp);
  const maxed = isMaxStage(user.level);
  const nextStage = maxed ? null : avatarEvolutionStages[stage.stage];

  return (
    <section className="hero">
      <div className="avatar-side">
        <div className={`avatar-stage ${pulse ? 'pulse' : ''}`}>
          <EvolutionAvatar level={user.level} avatarGender={avatarGender} fill />
          <div className="avatar-badge">{stage.icon} {stage.name}</div>
        </div>

        {maxed ? (
          <div className="evolution-box evolution-box--maxed">최종 진화 완료 ✨ Career Master</div>
        ) : (
          <div className="evolution-box">
            다음 아바타 진화
            <strong>Lv.{nextStage.minLevel} · {nextStage.name}</strong>
            {nextStage.minLevel - user.level} Level 남음
          </div>
        )}
      </div>

      <div className="detail">
        <div className="level-kicker">Career Level</div>
        <div className="level-line">
          <div className="level">Lv. {user.level}</div>
          <div className="stage-name">{stage.name}</div>
        </div>

        <div className="exp">
          <div className="progress"><i style={{ width: `${percent}%` }} /></div>
          <div className="exp-text">{user.currentExp.toLocaleString()} / {user.nextLevelExp.toLocaleString()} EXP ({percent}%)</div>
        </div>

        <div className="divider" />

        <div className="section-head">
          <strong>능력치</strong>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate?.('/skills'); }}>자세히 보기 ›</a>
        </div>

        <div className="skills">
          {Object.entries(skills).map(([key, value]) => {
            const meta = skillMeta[key];
            if (!meta) return null;
            return (
              <div className="skill" key={key}>
                <div className={`icon ${meta.colorClass}`}>{meta.icon}</div>
                <div className="skill-name">{meta.label}</div>
                <div className={`bar ${barClassBySkill[key]}`}><span style={{ width: `${value}%` }} /></div>
                <div className="score">{value}</div>
              </div>
            );
          })}
        </div>

        {!maxed && (
          <div className="next-card">
            <div>
              <div className="title">CAREER EVOLUTION</div>
              <strong>퀘스트를 완료해 다음 모습으로 성장하세요.</strong>
            </div>
            <button className="level-chip" onClick={() => navigate?.('/quest')}>다음 진화 Lv.{nextStage.minLevel}</button>
          </div>
        )}
      </div>
    </section>
  );
}
