// User profile / skill scores now come from GET /api/career/dashboard/{userId}
// (see src/api/career.js, src/context/CareerContext.jsx). skillMeta below is
// pure UI metadata (icon/label/color per skill key) — it has no backend
// equivalent and isn't going to get one, so it stays here.
export const skillMeta = {
  jobSkill: { label: '직무역량', icon: '💼', colorClass: 'green' },
  resume: { label: '자기소개서', icon: '▤', colorClass: 'blue' },
  interview: { label: '면접역량', icon: '👤', colorClass: 'orange' },
  companyAnalysis: { label: '기업분석력', icon: '▥', colorClass: 'purple' },
  careerReadiness: { label: '취업준비도', icon: '✦', colorClass: 'yellow' },
};
