import AppShell from '../components/layout/AppShell.jsx';
import EvolutionAvatar from '../components/avatar/EvolutionAvatar.jsx';
import { useCareer } from '../context/CareerContext.jsx';
import { useAvatarGender } from '../context/AvatarGenderContext.jsx';
import { avatarEvolutionStages, getAvatarStage, isMaxStage } from '../config/avatarEvolution.js';
import { calculateExpPercent } from '../utils/careerLevel.js';

// "나의 성장" — replaces the old avatar customize page. Nothing here is
// equipped/saved; the avatar is a straight readout of Career Level. The only
// choice a student makes on this whole screen is FEMALE/MALE art style.
// (능력치 상세 lives on its own page — see pages/SkillDetailPage.jsx — not
// here: 능력치 is profile/status info, not part of this page's level/avatar
// growth narrative.)
export default function GrowthPage({ navigate }) {
  const { user } = useCareer();
  const { avatarGender, setAvatarGender } = useAvatarGender();

  const stage = getAvatarStage(user.level);
  const percent = calculateExpPercent(user.currentExp, user.nextLevelExp);
  const maxed = isMaxStage(user.level);
  const nextStage = maxed ? null : avatarEvolutionStages[stage.stage];

  return (
    <AppShell activePath="/growth" navigate={navigate} title="🌱 나의 성장" subtitle="퀘스트를 완료하고 EXP를 쌓아 커리어 아바타를 성장시켜보세요.">
      <div className="growth-page-grid">
        <article className="card avatar-page-preview">
          <div className="avatar-stage">
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

          <div className="gender-toggle">
            <span className="avatar-page-hint">사용할 아바타를 선택해주세요</span>
            <div className="gender-toggle__buttons">
              <button className={avatarGender === 'FEMALE' ? 'is-active' : ''} onClick={() => setAvatarGender('FEMALE')}>여성 아바타</button>
              <button className={avatarGender === 'MALE' ? 'is-active' : ''} onClick={() => setAvatarGender('MALE')}>남성 아바타</button>
            </div>
          </div>
        </article>

        <article className="card growth-journey">
          <div className="card-head"><h2>커리어 성장 여정</h2></div>
          <ul className="journey-list">
            {avatarEvolutionStages.map((s) => {
              const reached = user.level >= s.minLevel;
              const current = s.stage === stage.stage;
              return (
                <li key={s.key} className={`journey-item ${reached ? 'is-reached' : 'is-locked'} ${current ? 'is-current' : ''}`}>
                  <span className="journey-item__dot">{reached ? '●' : '🔒'}</span>
                  <div className="journey-item__body">
                    <strong>{s.name}</strong>
                    <span>Lv.{s.minLevel}{Number.isFinite(s.maxLevel) ? `~${s.maxLevel}` : '+'}</span>
                  </div>
                  {current && <span className="journey-item__current">현재</span>}
                </li>
              );
            })}
          </ul>
        </article>
      </div>
    </AppShell>
  );
}
