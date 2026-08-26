package com.careermate.backend.config;

import javax.sql.DataSource;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Column-existence-checked ALTER TABLEs for tables that were already live on
 * the shared DB before a new column was needed — schema.sql's CREATE TABLE
 * IF NOT EXISTS can't add a column to a table that already exists, and this
 * server's MariaDB build rejected `ADD COLUMN IF NOT EXISTS` outright at
 * startup (syntax error, not just "unsupported"). Runs after schema.sql (via
 * DataSourceScriptDatabaseInitializer) since ApplicationRunner beans fire
 * after context refresh completes.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SchemaMigrationRunner implements ApplicationRunner {

    private final DataSource dataSource;

    @Override
    public void run(ApplicationArguments args) {
        addColumnIfMissing("careermate_ai_chat_log", "topic", "VARCHAR(20) NULL");
        // MALE/FEMALE — which evolution-avatar art style (see config/avatarEvolution.js
        // on the frontend) a student sees at their level. Picked once during the new-
        // account onboarding screen (see UserController#completeOnboarding); defaults to
        // FEMALE for any row created before this column existed.
        addColumnIfMissing("careermate_student_user", "avatar_gender", "VARCHAR(10) NOT NULL DEFAULT 'FEMALE'");
        // 지원 대상(채용공고/기업) 연동 시 그 요구사항 대비 부합도 — 대상 없이 첨삭한
        // 기존 행들은 둘 다 NULL(= "연동 안 함"과 동일하게 취급, 조회 시 구분됨).
        addColumnIfMissing("careermate_essay_review", "target_fit_score", "INT NULL");
        addColumnIfMissing("careermate_essay_review", "target_fit_comment", "TEXT NULL");
        // 이력서 첨삭 v2 — 원문 발췌 첨삭(원문/문제/개선예시)이 새로 생기면서 추가된 컬럼.
        // careermate_resume_review는 이번 세션에 막 생긴 테이블이라 대부분의 DB에선
        // CREATE TABLE IF NOT EXISTS가 이미 이 컬럼까지 포함해서 만들었겠지만, 그 사이에
        // 컬럼 없이 먼저 생성된 DB가 있을 수 있어 안전하게 둔다.
        addColumnIfMissing("careermate_resume_review", "excerpt_reviews_json", "TEXT NULL");
        // onboarding_completed briefly lived here (a flag for "row exists but
        // student hasn't finished the onboarding screen yet") — dropped once
        // AuthService moved to never creating the row until 시작하기 is actually
        // pressed (see AuthService#completeSignup), which makes that state
        // impossible by construction. Left as a stray column on any DB this
        // already ran against — harmless, nothing reads it (same call as the
        // careermate_quest columns above).
        // careermate_quest.skill_target/skill_points from an earlier 능력치
        // design (quest completion → skill bump) were reverted — 능력치 now
        // grows from real feature usage instead (AiChatService/
        // EssayReviewService), quests stay EXP/badge-only. Left the two
        // columns themselves in place on DBs where this already ran rather
        // than DROP COLUMN-ing a shared table; nothing reads them anymore.
    }

    private void addColumnIfMissing(String table, String column, String definition) {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        // No table_schema filter, and UPPER() on both sides of what's left:
        // `table_schema = DATABASE()` never matches on H2 at all — H2 stores the
        // SCHEMA name there (e.g. "PUBLIC"), while DATABASE() returns the
        // catalog/DB name ("CAREER_DB") — two different things that are never
        // equal, so this predicate silently zeroed out every row regardless of
        // case. That made every check report "missing" even when schema.sql's
        // CREATE TABLE already had the column (harmless for a column ONLY ever
        // added here, like topic/avatar_gender below, since re-adding a
        // genuinely-missing column just works — but target_fit_score is also in
        // schema.sql's CREATE TABLE now, so "missing" was a false positive and
        // the re-ALTER collided with the column that was already there, crashing
        // boot with "Duplicate column name"). This app only ever has one schema/
        // catalog per connection, so dropping the filter entirely is safe on both
        // MariaDB and H2.
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE UPPER(table_name) = UPPER(?) AND UPPER(column_name) = UPPER(?)",
                Integer.class, table, column);
        if (count != null && count > 0) {
            return; // already applied — e.g. a previous boot, or schema.sql's CREATE TABLE already has it
        }
        log.info("Applying migration: ALTER TABLE {} ADD COLUMN {} {}", table, column, definition);
        jdbc.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
    }
}
