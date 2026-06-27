require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT, 10) || 3306;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS || '';
const DB_NAME = process.env.DB_NAME;

const TABLES = [
  // ── Notifications ──
  `CREATE TABLE IF NOT EXISTS notifications (
      id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id         BIGINT UNSIGNED NOT NULL,
      actor_id        BIGINT UNSIGNED NOT NULL,
      type            ENUM('like','comment','follow','friend_request','friend_accept','repost') NOT NULL,
      entity_type     ENUM('thought','comment','user') NULL,
      entity_id       BIGINT UNSIGNED NULL,
      is_read         TINYINT(1) NOT NULL DEFAULT 0,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      CONSTRAINT fk_notif_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE CASCADE,
      INDEX idx_notif_user_read (user_id, is_read, id DESC),
      INDEX idx_notif_user_created (user_id, created_at DESC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── Direct Messages ──
  `CREATE TABLE IF NOT EXISTS conversations (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS messages (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── Bookmarks ──
  `CREATE TABLE IF NOT EXISTS bookmarks (
      id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id         BIGINT UNSIGNED NOT NULL,
      thought_id      BIGINT UNSIGNED NOT NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_bm_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      CONSTRAINT fk_bm_thought FOREIGN KEY (thought_id) REFERENCES thoughts (id) ON DELETE CASCADE,
      UNIQUE KEY uq_bm_user_thought (user_id, thought_id),
      INDEX idx_bm_user_created (user_id, created_at DESC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── Reposts ──
  `CREATE TABLE IF NOT EXISTS reposts (
      id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id         BIGINT UNSIGNED NOT NULL,
      thought_id      BIGINT UNSIGNED NOT NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_rp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      CONSTRAINT fk_rp_thought FOREIGN KEY (thought_id) REFERENCES thoughts (id) ON DELETE CASCADE,
      UNIQUE KEY uq_rp_user_thought (user_id, thought_id),
      INDEX idx_rp_user_created (user_id, created_at DESC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── Blocks ──
  `CREATE TABLE IF NOT EXISTS blocks (
      id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      blocker_id      BIGINT UNSIGNED NOT NULL,
      blocked_id      BIGINT UNSIGNED NOT NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_block_blocker FOREIGN KEY (blocker_id) REFERENCES users (id) ON DELETE CASCADE,
      CONSTRAINT fk_block_blocked FOREIGN KEY (blocked_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE KEY uq_block_pair (blocker_id, blocked_id),
      INDEX idx_block_blocked (blocked_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── Reports ──
  `CREATE TABLE IF NOT EXISTS reports (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── Email verification tokens ──
  `CREATE TABLE IF NOT EXISTS email_verifications (
      id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id         BIGINT UNSIGNED NOT NULL,
      token_hash      VARCHAR(64) NOT NULL,
      expires_at      TIMESTAMP NOT NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_ev_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE KEY uq_ev_hash (token_hash),
      INDEX idx_ev_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── Password reset tokens ──
  `CREATE TABLE IF NOT EXISTS password_resets (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

const ALTERS = [
  // Add repost_count to thoughts
  `ALTER TABLE thoughts ADD COLUMN repost_count INT UNSIGNED NOT NULL DEFAULT 0`,
  // Add email_verified to users
  `ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0`,
  // Add theme preference to users
  `ALTER TABLE users ADD COLUMN theme VARCHAR(10) NOT NULL DEFAULT 'light'`,
];

async function migrate() {
  console.log('Connecting to MySQL...');
  const conn = await mysql.createConnection({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASS, database: DB_NAME,
  });

  console.log('Creating tables...');
  for (const stmt of TABLES) {
    await conn.query(stmt);
    console.log('  ✓ table created');
  }

  console.log('Running ALTER statements...');
  for (const stmt of ALTERS) {
    try {
      await conn.query(stmt);
      console.log('  ✓ alter applied');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('  - column already exists, skipping');
      } else { throw err; }
    }
  }

  console.log('Features migration complete!');
  await conn.end();
}

migrate().catch(err => { console.error('Migration failed:', err); process.exit(1); });
