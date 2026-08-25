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
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
                Integer.class, table, column);
        if (count != null && count > 0) {
            return; // already applied — e.g. a previous boot
        }
        log.info("Applying migration: ALTER TABLE {} ADD COLUMN {} {}", table, column, definition);
        jdbc.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
    }
}
