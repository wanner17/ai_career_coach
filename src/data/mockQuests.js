// The quest list itself now comes from GET /api/career/quests?userId=
// (see src/api/career.js). CATEGORIES/weeklySpecialQuest below are static UI
// content with no backend table — the category filter labels and the
// sidebar's featured-quest callout aren't per-student data.
export const CATEGORIES = ['진로탐색', '역량강화', '실전준비', '교내프로그램'];

export const weeklySpecialQuest = {
  title: '현직자 직무특강 참여하기',
  exp: 500,
};
