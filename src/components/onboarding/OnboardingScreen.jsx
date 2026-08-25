import { useState } from 'react';
import { avatarEvolutionStages } from '../../config/avatarEvolution.js';

// Lv.1 art for both styles — exactly what the student will see the moment
// they land on the dashboard right after this screen, so the picker previews
// the real thing rather than a generic icon.
const stage1 = avatarEvolutionStages[0];
const GENDER_OPTIONS = [
  { value: 'FEMALE', label: '여자 아바타', image: stage1.femaleImage },
  { value: 'MALE', label: '남자 아바타', image: stage1.maleImage },
];

// Shown once, right after AuthService provisions a brand-new account (see
// CareerContext's 'onboarding' phase) — before the student ever sees the
// dashboard. Same visual language as IdentifyForm's career-status-screen,
// one step further: name + which evolution-avatar art style they'll grow
// into (see config/avatarEvolution.js — this is the same value AiChat's
// "여자 코치"/"남자 코치" toggle already flips locally, just persisted for
// real now, see AvatarGenderContext.jsx).
export default function OnboardingScreen({ universityName, defaultName, onSubmit }) {
  const [name, setName] = useState(defaultName || '');
  const [avatarGender, setAvatarGender] = useState('FEMALE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(trimmed, avatarGender);
    } catch {
      setError('저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
      setSaving(false);
    }
  };

  return (
    <div className="career-status-screen">
      <form className="onboarding-box" onSubmit={handleSubmit}>
        <h2>{universityName}에 오신 걸 환영해요!</h2>
        <p>닉네임과 나만의 아바타 스타일을 골라주세요. 아바타 스타일은 AI상담 페이지에서 언제든 다시 바꿀 수 있어요.</p>

        <label className="onboarding-box__name">
          닉네임
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 김미래"
            maxLength={50}
            autoFocus
          />
        </label>

        <div className="onboarding-box__avatars">
          {GENDER_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              className={`onboarding-avatar-card ${avatarGender === opt.value ? 'is-selected' : ''}`}
              onClick={() => setAvatarGender(opt.value)}
            >
              <img src={opt.image} alt={opt.label} />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        {error && <p className="onboarding-box__error">{error}</p>}
        <button type="submit" disabled={!name.trim() || saving}>
          {saving ? '시작하는 중...' : '시작하기'}
        </button>
      </form>
    </div>
  );
}
