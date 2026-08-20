// Pure EXP/Level math, kept out of components/context so it's a one-file swap
// when a real backend starts returning these numbers instead.

// EXP required to clear `level` = level * 250 (Lv.7 -> 1750, matches the mock user).
export function getRequiredExp(level) {
  return level * 250;
}

export function calculateExpPercent(currentExp, nextLevelExp) {
  if (!nextLevelExp) return 0;
  return Math.max(0, Math.min(100, Math.round((currentExp / nextLevelExp) * 100)));
}

// Applies +amount EXP to a {level, currentExp} pair, resolving any level-ups
// (chains if amount is large enough to clear more than one level at once).
export function calculateLevel(user, amount) {
  let { level, currentExp } = user;
  let nextLevelExp = getRequiredExp(level);
  currentExp += amount;

  const fromLevel = level;
  while (currentExp >= nextLevelExp) {
    currentExp -= nextLevelExp;
    level += 1;
    nextLevelExp = getRequiredExp(level);
  }

  return {
    level,
    currentExp,
    nextLevelExp,
    leveledUp: level > fromLevel,
    fromLevel,
  };
}
