// Level-based avatar evolution — replaces the old layer/dress-up system
// entirely. Each stage is one finished, already-composited image; there is
// no layering, no per-item coordinate math, nothing to equip. The avatar is
// a read-only visualization of Career Level, not something the student
// customizes piece by piece.
export const avatarEvolutionStages = [
  { stage: 1, minLevel: 1, maxLevel: 4, key: 'CAREER_SPROUT', name: '커리어 새싹', icon: '🌱', femaleImage: '/assets/avatar/evolution/female/female_lv01_04.png', maleImage: '/assets/avatar/evolution/male/male_lv01_04.png' },
  { stage: 2, minLevel: 5, maxLevel: 9, key: 'CAMPUS_ROOKIE', name: '커리어 루키', icon: '🎒', femaleImage: '/assets/avatar/evolution/female/female_lv05_09.png', maleImage: '/assets/avatar/evolution/male/male_lv05_09.png' },
  { stage: 3, minLevel: 10, maxLevel: 14, key: 'CAREER_EXPLORER', name: '커리어 탐험가', icon: '🧭', femaleImage: '/assets/avatar/evolution/female/female_lv10_14.png', maleImage: '/assets/avatar/evolution/male/male_lv10_14.png' },
  { stage: 4, minLevel: 15, maxLevel: 19, key: 'PORTFOLIO_BUILDER', name: '실전 준비생', icon: '📁', femaleImage: '/assets/avatar/evolution/female/female_lv15_19.png', maleImage: '/assets/avatar/evolution/male/male_lv15_19.png' },
  { stage: 5, minLevel: 20, maxLevel: 24, key: 'INTERVIEW_CHALLENGER', name: '취업 도전자', icon: '💼', femaleImage: '/assets/avatar/evolution/female/female_lv20_24.png', maleImage: '/assets/avatar/evolution/male/male_lv20_24.png' },
  { stage: 6, minLevel: 25, maxLevel: 29, key: 'CAREER_PRO', name: '커리어 프로', icon: '🏆', femaleImage: '/assets/avatar/evolution/female/female_lv25_29.png', maleImage: '/assets/avatar/evolution/male/male_lv25_29.png' },
  { stage: 7, minLevel: 30, maxLevel: Infinity, key: 'CAREER_MASTER', name: '커리어 마스터', icon: '🎓', femaleImage: '/assets/avatar/evolution/female/female_lv30.png', maleImage: '/assets/avatar/evolution/male/male_lv30.png' },
];

export function getAvatarStage(level) {
  return avatarEvolutionStages.find((s) => level >= s.minLevel && level <= s.maxLevel) || avatarEvolutionStages[0];
}

export function getAvatarImage(level, avatarGender) {
  const stage = getAvatarStage(level);
  if (!stage) return null;
  return avatarGender === 'MALE' ? stage.maleImage : stage.femaleImage;
}

// Level Up modal / Dashboard use this rather than comparing minLevel/maxLevel
// windows by hand — a "stage changed" event is what should trigger the
// evolution-flavored modal (see components/common/LevelUpModal.jsx), not
// every level-up.
export function didAvatarEvolve(previousLevel, level) {
  return getAvatarStage(previousLevel).stage !== getAvatarStage(level).stage;
}

export function isMaxStage(level) {
  return getAvatarStage(level).stage === avatarEvolutionStages.length;
}
