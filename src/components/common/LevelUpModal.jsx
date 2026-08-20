import Modal from './Modal.jsx';
import { useCareer } from '../../context/CareerContext.jsx';
import { useAvatarGender } from '../../context/AvatarGenderContext.jsx';
import EvolutionAvatar from '../avatar/EvolutionAvatar.jsx';

// Plain level-up (no stage change) keeps the simple text modal. Crossing an
// avatar evolution stage boundary (see config/avatarEvolution.js) gets the
// bigger moment — before/after portraits + stage names, same modal shell.
export default function LevelUpModal() {
  const { levelUpInfo, dismissLevelUp } = useCareer();
  const { avatarGender } = useAvatarGender();
  if (!levelUpInfo) return null;
  const { fromLevel, toLevel, avatarEvolved, fromStage, toStage } = levelUpInfo;

  if (avatarEvolved) {
    return (
      <Modal onClose={dismissLevelUp} boxClassName="levelup-box levelup-box--evolution">
        <div className="levelup-emoji">✨</div>
        <h3>AVATAR EVOLUTION</h3>
        <div className="levelup-transition">
          <span>Lv.{fromLevel}</span>
          <span className="arrow">→</span>
          <span>Lv.{toLevel}</span>
        </div>
        <div className="evolution-compare">
          <div className="evolution-compare__side">
            <EvolutionAvatar level={fromLevel} avatarGender={avatarGender} />
            <span>{fromStage.name}</span>
          </div>
          <span className="evolution-compare__arrow">→</span>
          <div className="evolution-compare__side">
            <EvolutionAvatar level={toLevel} avatarGender={avatarGender} evolving />
            <span>{toStage.name}</span>
          </div>
        </div>
        <p>{toStage.name}(으)로 성장했습니다!</p>
        <button onClick={dismissLevelUp}>확인</button>
      </Modal>
    );
  }

  return (
    <Modal onClose={dismissLevelUp} boxClassName="levelup-box">
      <div className="levelup-emoji">🎉</div>
      <h3>LEVEL UP!</h3>
      <div className="levelup-transition">
        <span>Lv.{fromLevel}</span>
        <span className="arrow">→</span>
        <span>Lv.{toLevel}</span>
      </div>
      <p>커리어 레벨이 상승했습니다!</p>
      <button onClick={dismissLevelUp}>확인</button>
    </Modal>
  );
}
