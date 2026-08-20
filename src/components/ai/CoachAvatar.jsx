import { useState } from 'react';
import { useAvatarGender } from '../../context/AvatarGenderContext.jsx';

const IMAGE_BY_GENDER = {
  FEMALE: '/assets/avatar/ai_coach_female.png',
  MALE: '/assets/avatar/ai_coach_male.png',
};

// Same "try the image, fall back on failure" shape as layout/BrandLogo.jsx.
// Gender follows the same app-wide avatarGender choice the student's own
// EvolutionAvatar uses (see AvatarGenderContext) — one switch, one look.
export default function CoachAvatar({ gender }) {
  const { avatarGender } = useAvatarGender();
  const resolvedGender = gender || avatarGender;
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span className="coach-avatar__fallback" aria-hidden="true">✨</span>;
  }

  return (
    <img
      src={IMAGE_BY_GENDER[resolvedGender]}
      alt="AI 커리어 코치 아바타"
      onError={() => setFailed(true)}
    />
  );
}
