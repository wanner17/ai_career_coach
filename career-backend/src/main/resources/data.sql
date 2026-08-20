-- INSERT IGNORE (not plain INSERT) so re-running this on every app restart
-- against a persistent MariaDB DB is idempotent instead of failing on PK
-- collisions the 2nd time the app boots. Works under H2's MariaDB mode too.

INSERT IGNORE INTO careermate_university
  (code, name, primary_color, primary_color_hover, primary_color_light, primary_color_soft, primary_color2, primary_color_shadow, logo_url)
VALUES
  ('SAMPLE',       '샘플대학교', '#7053f6', '#6044e6', '#f3efff', '#f8f6ff', '#8e71ff', 'rgba(112,83,246,.24)', '/assets/logo/sample.png'),
  ('UNIVERSITY_B', '미래대학교', '#1565c0', '#0d47a1', '#e8f1fb', '#f3f8fd', '#42a5f5', 'rgba(21,101,192,.24)', NULL);

-- external_user_id '20231234' stands in for whatever student-number field the
-- host university's own login session would hand us (see AuthController).
INSERT IGNORE INTO careermate_student_user
  (id, university_code, external_user_id, name, major, grade, desired_job, level, current_exp, next_level_exp)
VALUES
  (1, 'SAMPLE', '20231234', '김미래', '컴퓨터공학과', 4, '백엔드 개발자', 7, 1250, 1750);

INSERT IGNORE INTO careermate_skill_score (user_id, job_skill, resume, interview, company_analysis, career_readiness)
VALUES (1, 72, 64, 58, 80, 69);

-- Same 7 quests as src/data/mockQuests.js — ids 1-4 are is_today=TRUE (the
-- Dashboard widget), 5-7 fill out the full Quest page / weekly progress.
--
-- skill_target/skill_points (능력치 정의) are deliberately NOT set here —
-- schema.sql/data.sql both run as one script batch during bean init, before
-- config.SchemaMigrationRunner's ALTER TABLE (an ApplicationRunner, which
-- only fires after that init completes) has added those columns on a DB
-- where this table already existed. SchemaMigrationRunner's
-- backfillQuestSkillTargets() sets them right after boot instead — for both
-- a fresh DB and an existing one, so there's one source of truth, not two.
INSERT IGNORE INTO careermate_quest (id, name, description, category, target_grade, exp, period, is_today, status) VALUES
  (1, '이력서 업데이트 하기',        '이력서를 최신 상태로 등록합니다.',       '역량강화',   '전체',     100, '상시', TRUE,  '사용'),
  (2, '기업분석 1회 완료',           '관심 기업 1곳을 분석합니다.',            '실전준비',   '전체',     150, '상시', TRUE,  '사용'),
  (3, 'AI 모의면접 1회 완료',        'AI 모의면접을 1회 진행합니다.',          '실전준비',   '3~4학년',  250, '상시', TRUE,  '사용'),
  (4, '취업지원센터 프로그램 참여',   '취업지원센터 프로그램에 참여합니다.',    '교내프로그램', '전체',   200, '2026.03.01 ~ 2026.12.31', TRUE, '사용'),
  (5, '관심 직무 3개 선택하기',      '관심 직무를 3개 선택합니다.',            '진로탐색',   '1~2학년',   80, '상시', FALSE, '사용'),
  (6, '자기소개서 초안 작성',        '자기소개서 초안을 작성합니다.',          '역량강화',   '전체',     150, '상시', FALSE, '사용'),
  (7, '진로심리검사 참여하기',       '진로심리검사를 완료합니다.',             '진로탐색',   '전체',     100, '상시', FALSE, '미사용');

-- User 1 has completed quests 1,2,5,6 -> "4/7 완료" matches the frontend demo exactly.
INSERT IGNORE INTO careermate_user_quest (user_id, quest_id, completed, completed_at) VALUES
  (1, 1, TRUE,  CURRENT_TIMESTAMP),
  (1, 2, TRUE,  CURRENT_TIMESTAMP),
  (1, 3, FALSE, NULL),
  (1, 4, FALSE, NULL),
  (1, 5, TRUE,  CURRENT_TIMESTAMP),
  (1, 6, TRUE,  CURRENT_TIMESTAMP),
  (1, 7, FALSE, NULL);

-- Same 6 badges as src/data/mockBadges.js.
INSERT IGNORE INTO careermate_badge (id, name, unlock_type, unlock_value, icon, medal_class) VALUES
  (1, '이력서 마스터', 'QUEST', NULL, '★', 'gold'),
  (2, '기업분석가',    'QUEST', NULL, '◆', 'blue'),
  (3, '열정 러너',     'QUEST', NULL, '✦', 'purple'),
  (4, '면접왕',        'LEVEL', 5,    '🏆', 'gold'),
  (5, '커리어 루키',   'LEVEL', 10,   '🚀', 'blue'),
  (6, '프로페셔널',    'LEVEL', 20,   '👑', 'purple');

-- The 3 QUEST-type badges are already earned for the demo user (matches mock).
-- LEVEL-type badges are never inserted here — BadgeServiceImpl derives them
-- from careermate_student_user.level at read time instead.
INSERT IGNORE INTO careermate_user_badge (user_id, badge_id) VALUES
  (1, 1), (1, 2), (1, 3);
