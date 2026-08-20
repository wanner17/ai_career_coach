-- Mirrors src/config/universities.js, src/data/mock*.js on the frontend 1:1 —
-- see data.sql for the seed that reproduces the exact Dashboard demo state
-- (김미래, Lv.7, 1250/1750 EXP, 4/7 quests done).
--
-- Every table is prefixed `careermate_` (matches CareerMate.init() in
-- career-embed.js and the com.careermate.backend package) — this schema
-- shares a DB server (and possibly a DB) with other services, so the prefix
-- makes "which tables belong to this project" unambiguous in `SHOW TABLES`.

CREATE TABLE IF NOT EXISTS careermate_university (
  code                  VARCHAR(30)   NOT NULL PRIMARY KEY,
  name                  VARCHAR(100)  NOT NULL,
  primary_color         VARCHAR(20)   NOT NULL,
  primary_color_hover   VARCHAR(20)   NOT NULL,
  primary_color_light   VARCHAR(20)   NOT NULL,
  primary_color_soft    VARCHAR(20)   NOT NULL,
  primary_color2        VARCHAR(20)   NOT NULL,
  primary_color_shadow  VARCHAR(40)   NOT NULL,
  logo_url              VARCHAR(255)
);

-- No password/login form — the host university page already authenticated
-- this student before it ever loads our iframe, so we trust the identity it
-- hands us (university code + the university's own student id) and either
-- load that student's existing row or provision one on first visit. See
-- AuthController#identify / AuthService.
CREATE TABLE IF NOT EXISTS careermate_student_user (
  id                 BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  university_code    VARCHAR(30)   NOT NULL,
  external_user_id   VARCHAR(50)   NOT NULL,
  name               VARCHAR(50)   NOT NULL,
  major              VARCHAR(100),
  grade              INT           NOT NULL DEFAULT 1,
  desired_job        VARCHAR(100),
  level              INT           NOT NULL DEFAULT 1,
  current_exp        INT           NOT NULL DEFAULT 0,
  next_level_exp     INT           NOT NULL DEFAULT 250,
  avatar_frame       VARCHAR(20)   NOT NULL DEFAULT 'purple',
  avatar_sticker     VARCHAR(10),
  created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_careermate_user_university FOREIGN KEY (university_code) REFERENCES careermate_university (code),
  CONSTRAINT uq_careermate_user_external UNIQUE (university_code, external_user_id)
);

-- 1:1 with careermate_student_user — kept as its own table since these five
-- numbers are conceptually a separate "assessment" that could grow its own
-- history later.
CREATE TABLE IF NOT EXISTS careermate_skill_score (
  user_id            BIGINT  NOT NULL PRIMARY KEY,
  job_skill          INT     NOT NULL DEFAULT 0,
  resume             INT     NOT NULL DEFAULT 0,
  interview          INT     NOT NULL DEFAULT 0,
  company_analysis   INT     NOT NULL DEFAULT 0,
  career_readiness   INT     NOT NULL DEFAULT 0,
  CONSTRAINT fk_careermate_skill_user FOREIGN KEY (user_id) REFERENCES careermate_student_user (id)
);

-- Master quest catalog — doubles as the admin CRUD table AND the student
-- quest list (no separate "admin quest" table like the frontend mock had;
-- one source of truth here).
CREATE TABLE IF NOT EXISTS careermate_quest (
  id            BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(200)  NOT NULL,
  description   VARCHAR(500),
  category      VARCHAR(30)   NOT NULL,
  target_grade  VARCHAR(20)   NOT NULL DEFAULT '전체',
  exp           INT           NOT NULL,
  period        VARCHAR(60)   NOT NULL DEFAULT '상시',
  is_today      BOOLEAN       NOT NULL DEFAULT FALSE,
  status        VARCHAR(10)   NOT NULL DEFAULT '사용',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Per-student completion state — a quest is global, but "completed" is per user.
CREATE TABLE IF NOT EXISTS careermate_user_quest (
  user_id       BIGINT     NOT NULL,
  quest_id      BIGINT     NOT NULL,
  completed     BOOLEAN    NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMP  NULL,
  PRIMARY KEY (user_id, quest_id),
  CONSTRAINT fk_careermate_uq_user FOREIGN KEY (user_id) REFERENCES careermate_student_user (id),
  CONSTRAINT fk_careermate_uq_quest FOREIGN KEY (quest_id) REFERENCES careermate_quest (id) ON DELETE CASCADE
);

-- unlock_type = QUEST | LEVEL. LEVEL-type badges are NOT tracked in
-- careermate_user_badge — "earned" is derived at read time as
-- (user.level >= unlock_value), exactly mirroring the frontend's
-- CareerContext badge derivation. That's what fixed the "Lv.7 but
-- 면접왕(requiredLevel 5) still locked" data-consistency bug in the frontend
-- MVP; keeping the same rule server-side means it can't recur.
CREATE TABLE IF NOT EXISTS careermate_badge (
  id             BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(50)  NOT NULL,
  unlock_type    VARCHAR(10)  NOT NULL,
  unlock_value   INT,
  icon           VARCHAR(10),
  medal_class    VARCHAR(20)
);

-- Only QUEST-type badge grants are stored here.
CREATE TABLE IF NOT EXISTS careermate_user_badge (
  user_id     BIGINT     NOT NULL,
  badge_id    BIGINT     NOT NULL,
  earned_at   TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, badge_id),
  CONSTRAINT fk_careermate_ub_user FOREIGN KEY (user_id) REFERENCES careermate_student_user (id),
  CONSTRAINT fk_careermate_ub_badge FOREIGN KEY (badge_id) REFERENCES careermate_badge (id)
);

-- AI 상담 mock log — schema-ready for when POST /api/career/ai/chat starts
-- calling a real model; the response is still keyword-mocked for now (see
-- AiChatServiceImpl), same as the frontend's data/mockChat.js.
CREATE TABLE IF NOT EXISTS careermate_ai_chat_log (
  id          BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT        NOT NULL,
  role        VARCHAR(10)   NOT NULL,
  message     VARCHAR(2000) NOT NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_careermate_chat_user FOREIGN KEY (user_id) REFERENCES careermate_student_user (id)
);

-- 능력치 정의 v3 — grows from actually consuming content (a job/company
-- detail page opened, the mock-interview tool opened), not a quest checkbox
-- and not just "discussed it in chat" (see AiChatService/WorknetController/
-- SkillActivityController for the credit() call sites). The UNIQUE
-- constraint IS the dedup: crediting the same (user, skill, activity_key)
-- twice is a silent no-op (INSERT IGNORE), so re-opening the same job
-- posting 50 times only ever counts once — see SkillActivityService.
CREATE TABLE IF NOT EXISTS careermate_skill_activity_log (
  id            BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT        NOT NULL,
  skill         VARCHAR(20)   NOT NULL,
  activity_key  VARCHAR(100)  NOT NULL,
  points        INT           NOT NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_careermate_skill_activity UNIQUE (user_id, skill, activity_key),
  CONSTRAINT fk_careermate_skill_activity_user FOREIGN KEY (user_id) REFERENCES careermate_student_user (id)
);

-- careermate_ai_chat_log.topic was added after this table was already live
-- (CREATE TABLE IF NOT EXISTS above is a no-op against an existing table),
-- and this DB server's MariaDB build doesn't accept `ADD COLUMN IF NOT
-- EXISTS` (confirmed — it crashed startup with a syntax error), so a plain
-- idempotent ALTER can't live here as a script statement. See
-- config/SchemaMigrationRunner for the actual column-existence-checked
-- migration instead. Only ever set on role='user' rows — see
-- AiChatService's topic taxonomy / "상담 인사이트".

-- 자기소개서 첨삭 이력 — see EssayReviewService. target_* is null for a plain
-- (no job/company picked) review; when set, target_context is what actually
-- went into the AI prompt (job title/company intro text the frontend already
-- had loaded — see pages/EssayReview.jsx), stored too so history can show
-- exactly what was evaluated against, not just a label.
-- categories_json/suggestions_json store EssayReviewResponse's arrays as
-- plain JSON text (parsed back into the same DTO shape on read) rather than
-- normalizing into child tables — this app has no other case that needs to
-- query into them individually, so the extra join complexity wouldn't earn
-- its keep.
CREATE TABLE IF NOT EXISTS careermate_essay_review (
  id                  BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id             BIGINT        NOT NULL,
  question            VARCHAR(500),
  content             TEXT          NOT NULL,
  target_type         VARCHAR(20),
  target_label        VARCHAR(255),
  target_context      TEXT,
  overall_score       INT           NOT NULL,
  summary             TEXT,
  categories_json      TEXT         NOT NULL,
  suggestions_json     TEXT,
  rewritten_example   TEXT,
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_careermate_essay_user FOREIGN KEY (user_id) REFERENCES careermate_student_user (id)
);
