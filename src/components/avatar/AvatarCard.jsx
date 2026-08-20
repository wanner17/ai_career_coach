import { calculateExpPercent } from '../../utils/careerLevel.js';
import { useAvatarGender } from '../../context/AvatarGenderContext.jsx';
import { avatarEvolutionStages, getAvatarStage, isMaxStage } from '../../config/avatarEvolution.js';
import EvolutionAvatar from './EvolutionAvatar.jsx';

// Avatar Card is now a read-only visualization of Career Level — no
// customize button, no equip/save state. The only thing the student picks
// anywhere in the app is FEMALE/MALE art style (나의 성장 page); everything
// else here is derived straight from `user.level`. Same full-bleed
// avatar-stage treatment as the Dashboard hero card (see
// career/ProfileSummaryCard.jsx) — one frame, not a photo-card nested in a
// bigger panel.
export default function AvatarCard({ user, pulse }) {
  const { avatarGender } = useAvatarGender();
  const stage = getAvatarStage(user.level);
  const percent = calculateExpPercent(user.currentExp, user.nextLevelExp);
  const maxed = isMaxStage(user.level);
  const nextStage = maxed ? null : avatarEvolutionStages[stage.stage]; // stage.stage is 1-based, array is 0-based → next is same index

  return (
    <article className="card avatar-card">
      <div className={`avatar-stage ${pulse ? 'pulse' : ''}`}>
        <EvolutionAvatar level={user.level} avatarGender={avatarGender} fill />
        <div className="avatar-badge">{stage.icon} {stage.name}</div>
      </div>

      <div className="level-box">
        <span className="level-box__label">Career Level</span>
        <strong>Lv. {user.level}</strong>
        <p>{stage.name}</p>
        <div className="progress"><i style={{ width: `${percent}%` }} /></div>
        <small>{user.currentExp.toLocaleString()} / {user.nextLevelExp.toLocaleString()} EXP ({percent}%)</small>
      </div>

      {maxed ? (
        <div className="next-evolution next-evolution--maxed">최종 진화 완료 ✨ Career Master</div>
      ) : (
        <div className="next-evolution">
          <span className="next-evolution__label">다음 아바타 진화</span>
          <strong>Lv.{nextStage.minLevel} · {nextStage.name}</strong>
          <span className="next-evolution__remaining">{nextStage.minLevel - user.level} Level 남음</span>
        </div>
      )}
    </article>
  );
}
