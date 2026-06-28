-- ============================================================================
-- ToT App — Full Schema Migration
-- Generated: 2026-06-28
--
-- Safe to re-run: uses IF NOT EXISTS for tables, and wraps ALTER ADD COLUMN
-- in stored procedures that check INFORMATION_SCHEMA before acting.
--
-- Production baseline (7 tables):
--   comments, follows, likes, refresh_tokens, thought_media, thoughts, users
--
-- This script:
--   1. ALTERs existing tables to add missing columns
--   2. CREATEs all missing tables (18 new tables)
--   3. Adds missing indexes
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Helper: safe_add_column — adds a column only if it doesn't already exist
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS safe_add_column;
DELIMITER //
CREATE PROCEDURE safe_add_column(
    IN p_table    VARCHAR(64),
    IN p_column   VARCHAR(64),
    IN p_definition TEXT
)
BEGIN
    SET @col_exists = (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = p_table
          AND COLUMN_NAME  = p_column
    );
    IF @col_exists = 0 THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- Helper: safe_add_index — adds an index only if it doesn't already exist
DROP PROCEDURE IF EXISTS safe_add_index;
DELIMITER //
CREATE PROCEDURE safe_add_index(
    IN p_table      VARCHAR(64),
    IN p_index_name VARCHAR(64),
    IN p_columns    TEXT
)
BEGIN
    SET @idx_exists = (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = p_table
          AND INDEX_NAME   = p_index_name
    );
    IF @idx_exists = 0 THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD INDEX `', p_index_name, '` (', p_columns, ')');
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- Helper: safe_modify_column — modifies a column definition (always safe to re-run)
DROP PROCEDURE IF EXISTS safe_modify_column;
DELIMITER //
CREATE PROCEDURE safe_modify_column(
    IN p_table      VARCHAR(64),
    IN p_column     VARCHAR(64),
    IN p_definition TEXT
)
BEGIN
    SET @col_exists = (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = p_table
          AND COLUMN_NAME  = p_column
    );
    IF @col_exists > 0 THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` MODIFY COLUMN `', p_column, '` ', p_definition);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;


-- ============================================================================
-- SECTION 1: ALTER EXISTING TABLES — add missing columns
-- ============================================================================

-- ── users: add friend_count, email_verified, theme ──
CALL safe_add_column('users', 'friend_count',    'INT UNSIGNED NOT NULL DEFAULT 0');
CALL safe_add_column('users', 'email_verified',  'TINYINT(1) NOT NULL DEFAULT 0');
CALL safe_add_column('users', 'theme',           "VARCHAR(10) NOT NULL DEFAULT 'light'");

-- ── thoughts: add repost_count, reply_count, is_edited, parent_thought_id, quoted_thought_id ──
CALL safe_add_column('thoughts', 'repost_count',      'INT UNSIGNED NOT NULL DEFAULT 0');
CALL safe_add_column('thoughts', 'reply_count',        'INT UNSIGNED NOT NULL DEFAULT 0');
CALL safe_add_column('thoughts', 'is_edited',          'TINYINT(1) NOT NULL DEFAULT 0');
CALL safe_add_column('thoughts', 'parent_thought_id',  'BIGINT UNSIGNED NULL DEFAULT NULL');
CALL safe_add_column('thoughts', 'quoted_thought_id',  'BIGINT UNSIGNED NULL DEFAULT NULL');

-- ── thoughts: add missing index on parent_thought_id ──
CALL safe_add_index('thoughts', 'idx_thoughts_parent', 'parent_thought_id');


-- ============================================================================
-- SECTION 2: CREATE ALL MISSING TABLES
-- ============================================================================

-- ── friend_requests ──
CREATE TABLE IF NOT EXISTS friend_requests (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sender_id       BIGINT UNSIGNED NOT NULL,
    receiver_id     BIGINT UNSIGNED NOT NULL,
    status          ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_fr_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_fr_receiver FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE KEY uq_fr_pair (sender_id, receiver_id),
    INDEX idx_fr_receiver_status (receiver_id, status),
    INDEX idx_fr_sender_status (sender_id, status),
    CONSTRAINT chk_no_self_friend CHECK (sender_id <> receiver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── friendships ──
CREATE TABLE IF NOT EXISTS friendships (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    friend_id       BIGINT UNSIGNED NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_fs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_fs_friend FOREIGN KEY (friend_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE KEY uq_fs_pair (user_id, friend_id),
    INDEX idx_fs_friend (friend_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── notifications ──
CREATE TABLE IF NOT EXISTS notifications (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    actor_id        BIGINT UNSIGNED NOT NULL,
    type            ENUM('like','comment','follow','friend_request','friend_accept','repost','mention','quote') NOT NULL,
    entity_type     ENUM('thought','comment','user') NULL,
    entity_id       BIGINT UNSIGNED NULL,
    is_read         TINYINT(1) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_notif_user_read (user_id, is_read, id DESC),
    INDEX idx_notif_user_created (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If notifications already exists but has the old enum (without mention/quote), update it
CALL safe_modify_column('notifications', 'type',
    "ENUM('like','comment','follow','friend_request','friend_accept','repost','mention','quote') NOT NULL");

-- ── conversations ──
CREATE TABLE IF NOT EXISTS conversations (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_a_id       BIGINT UNSIGNED NOT NULL,
    user_b_id       BIGINT UNSIGNED NOT NULL,
    last_message_at TIMESTAMP NULL DEFAULT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_conv_a FOREIGN KEY (user_a_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_conv_b FOREIGN KEY (user_b_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE KEY uq_conv_pair (user_a_id, user_b_id),
    INDEX idx_conv_b (user_b_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── messages ──
CREATE TABLE IF NOT EXISTS messages (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    conversation_id BIGINT UNSIGNED NOT NULL,
    sender_id       BIGINT UNSIGNED NOT NULL,
    content         TEXT NOT NULL,
    is_read         TINYINT(1) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_msg_conv_created (conversation_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── bookmarks ──
CREATE TABLE IF NOT EXISTS bookmarks (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    thought_id      BIGINT UNSIGNED NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_bm_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_bm_thought FOREIGN KEY (thought_id) REFERENCES thoughts (id) ON DELETE CASCADE,
    UNIQUE KEY uq_bm_user_thought (user_id, thought_id),
    INDEX idx_bm_user_created (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── reposts ──
CREATE TABLE IF NOT EXISTS reposts (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    thought_id      BIGINT UNSIGNED NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_rp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_thought FOREIGN KEY (thought_id) REFERENCES thoughts (id) ON DELETE CASCADE,
    UNIQUE KEY uq_rp_user_thought (user_id, thought_id),
    INDEX idx_rp_user_created (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── blocks ──
CREATE TABLE IF NOT EXISTS blocks (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    blocker_id      BIGINT UNSIGNED NOT NULL,
    blocked_id      BIGINT UNSIGNED NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_block_blocker FOREIGN KEY (blocker_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_block_blocked FOREIGN KEY (blocked_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE KEY uq_block_pair (blocker_id, blocked_id),
    INDEX idx_block_blocked (blocked_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── reports ──
CREATE TABLE IF NOT EXISTS reports (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    reporter_id     BIGINT UNSIGNED NOT NULL,
    reported_type   ENUM('thought','comment','user') NOT NULL,
    reported_id     BIGINT UNSIGNED NOT NULL,
    reason          VARCHAR(500) NOT NULL,
    status          ENUM('pending','reviewed','dismissed') NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_report_reporter FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_report_status (status, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── email_verifications ──
CREATE TABLE IF NOT EXISTS email_verifications (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    token_hash      VARCHAR(64) NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_ev_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE KEY uq_ev_hash (token_hash),
    INDEX idx_ev_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── password_resets ──
CREATE TABLE IF NOT EXISTS password_resets (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    token_hash      VARCHAR(64) NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    used            TINYINT(1) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_pr_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE KEY uq_pr_hash (token_hash),
    INDEX idx_pr_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── hashtags ──
CREATE TABLE IF NOT EXISTS hashtags (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name            VARCHAR(100) NOT NULL,
    thought_count   INT UNSIGNED NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_hashtag_name (name),
    INDEX idx_hashtag_count (thought_count DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── thought_hashtags ──
CREATE TABLE IF NOT EXISTS thought_hashtags (
    thought_id      BIGINT UNSIGNED NOT NULL,
    hashtag_id      BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (thought_id, hashtag_id),
    CONSTRAINT fk_th_thought FOREIGN KEY (thought_id) REFERENCES thoughts (id) ON DELETE CASCADE,
    CONSTRAINT fk_th_hashtag FOREIGN KEY (hashtag_id) REFERENCES hashtags (id) ON DELETE CASCADE,
    INDEX idx_th_hashtag (hashtag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── thought_mentions ──
CREATE TABLE IF NOT EXISTS thought_mentions (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    thought_id      BIGINT UNSIGNED NOT NULL,
    mentioned_user_id BIGINT UNSIGNED NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_tm_thought FOREIGN KEY (thought_id) REFERENCES thoughts (id) ON DELETE CASCADE,
    CONSTRAINT fk_tm_user FOREIGN KEY (mentioned_user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE KEY uq_tm_pair (thought_id, mentioned_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── mutes ──
CREATE TABLE IF NOT EXISTS mutes (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    muter_id        BIGINT UNSIGNED NOT NULL,
    muted_id        BIGINT UNSIGNED NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_mute_muter FOREIGN KEY (muter_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_mute_muted FOREIGN KEY (muted_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE KEY uq_mute_pair (muter_id, muted_id),
    INDEX idx_mute_muted (muted_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── thought_edits ──
CREATE TABLE IF NOT EXISTS thought_edits (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    thought_id      BIGINT UNSIGNED NOT NULL,
    old_content     TEXT NOT NULL,
    edited_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_te_thought FOREIGN KEY (thought_id) REFERENCES thoughts (id) ON DELETE CASCADE,
    INDEX idx_te_thought (thought_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── link_previews ──
CREATE TABLE IF NOT EXISTS link_previews (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    thought_id      BIGINT UNSIGNED NOT NULL,
    url             VARCHAR(2048) NOT NULL,
    title           VARCHAR(500) NULL,
    description     VARCHAR(1000) NULL,
    image_url       VARCHAR(2048) NULL,
    site_name       VARCHAR(200) NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_lp_thought FOREIGN KEY (thought_id) REFERENCES thoughts (id) ON DELETE CASCADE,
    INDEX idx_lp_thought (thought_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── push_subscriptions ──
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    endpoint        VARCHAR(500) NOT NULL,
    p256dh          VARCHAR(200) NOT NULL,
    auth            VARCHAR(100) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_ps_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE KEY uq_ps_endpoint (endpoint),
    INDEX idx_ps_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- SECTION 3: FULLTEXT INDEX (idempotent — ignores ER_DUP_KEYNAME)
-- ============================================================================
-- The fulltext index on thoughts.content is created in migrate.js but may be
-- missing if that migration was skipped. We use the safe_add_index helper
-- which only checks INFORMATION_SCHEMA.STATISTICS; for FULLTEXT we do a
-- direct check instead.
DROP PROCEDURE IF EXISTS safe_add_fulltext;
DELIMITER //
CREATE PROCEDURE safe_add_fulltext(
    IN p_table      VARCHAR(64),
    IN p_index_name VARCHAR(64),
    IN p_column     VARCHAR(64)
)
BEGIN
    SET @idx_exists = (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = p_table
          AND INDEX_NAME   = p_index_name
    );
    IF @idx_exists = 0 THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD FULLTEXT INDEX `', p_index_name, '` (`', p_column, '`)');
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

CALL safe_add_fulltext('thoughts', 'ft_thoughts_content', 'content');


-- ============================================================================
-- CLEANUP: drop helper procedures
-- ============================================================================
DROP PROCEDURE IF EXISTS safe_add_column;
DROP PROCEDURE IF EXISTS safe_add_index;
DROP PROCEDURE IF EXISTS safe_modify_column;
DROP PROCEDURE IF EXISTS safe_add_fulltext;


-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Existing tables altered:
--   users     : +friend_count, +email_verified, +theme
--   thoughts  : +repost_count, +reply_count, +is_edited, +parent_thought_id,
--               +quoted_thought_id, +idx_thoughts_parent
--   notifications : MODIFY type enum to include 'mention','quote'
--
-- New tables created (18):
--   friend_requests, friendships, notifications, conversations, messages,
--   bookmarks, reposts, blocks, reports, email_verifications, password_resets,
--   hashtags, thought_hashtags, thought_mentions, mutes, thought_edits,
--   link_previews, push_subscriptions
--
-- Total tables after migration: 25
-- ============================================================================
