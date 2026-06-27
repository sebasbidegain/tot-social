require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT, 10) || 3306;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS || '';
const DB_NAME = process.env.DB_NAME;

const TABLES = [
  `CREATE TABLE IF NOT EXISTS hashtags (
      id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name            VARCHAR(100) NOT NULL,
      thought_count   INT UNSIGNED NOT NULL DEFAULT 0,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_hashtag_name (name),
      INDEX idx_hashtag_count (thought_count DESC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS thought_hashtags (
      thought_id      BIGINT UNSIGNED NOT NULL,
      hashtag_id      BIGINT UNSIGNED NOT NULL,
      PRIMARY KEY (thought_id, hashtag_id),
      CONSTRAINT fk_th_thought FOREIGN KEY (thought_id) REFERENCES thoughts (id) ON DELETE CASCADE,
      CONSTRAINT fk_th_hashtag FOREIGN KEY (hashtag_id) REFERENCES hashtags (id) ON DELETE CASCADE,
      INDEX idx_th_hashtag (hashtag_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS thought_mentions (
      id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      thought_id      BIGINT UNSIGNED NOT NULL,
      mentioned_user_id BIGINT UNSIGNED NOT NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_tm_thought FOREIGN KEY (thought_id) REFERENCES thoughts (id) ON DELETE CASCADE,
      CONSTRAINT fk_tm_user FOREIGN KEY (mentioned_user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE KEY uq_tm_pair (thought_id, mentioned_user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS mutes (
      id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      muter_id        BIGINT UNSIGNED NOT NULL,
      muted_id        BIGINT UNSIGNED NOT NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_mute_muter FOREIGN KEY (muter_id) REFERENCES users (id) ON DELETE CASCADE,
      CONSTRAINT fk_mute_muted FOREIGN KEY (muted_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE KEY uq_mute_pair (muter_id, muted_id),
      INDEX idx_mute_muted (muted_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS thought_edits (
      id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      thought_id      BIGINT UNSIGNED NOT NULL,
      old_content     TEXT NOT NULL,
      edited_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_te_thought FOREIGN KEY (thought_id) REFERENCES thoughts (id) ON DELETE CASCADE,
      INDEX idx_te_thought (thought_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS link_previews (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS push_subscriptions (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

const ALTERS = [
  'ALTER TABLE thoughts ADD COLUMN parent_thought_id BIGINT UNSIGNED NULL DEFAULT NULL',
  'ALTER TABLE thoughts ADD COLUMN quoted_thought_id BIGINT UNSIGNED NULL DEFAULT NULL',
  'ALTER TABLE thoughts ADD COLUMN is_edited TINYINT(1) NOT NULL DEFAULT 0',
  'ALTER TABLE thoughts ADD COLUMN reply_count INT UNSIGNED NOT NULL DEFAULT 0',
  'ALTER TABLE thoughts ADD INDEX idx_thoughts_parent (parent_thought_id)',
  'ALTER TABLE notifications MODIFY COLUMN type ENUM(\'like\',\'comment\',\'follow\',\'friend_request\',\'friend_accept\',\'repost\',\'mention\',\'quote\') NOT NULL',
];

async function migrate() {
  console.log('Connecting to MySQL...');
  const conn = await mysql.createConnection({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASS, database: DB_NAME,
  });

  console.log('Creating v2 tables...');
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
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') {
        console.log('  - already exists, skipping');
      } else { throw err; }
    }
  }

  console.log('v2 migration complete!');
  await conn.end();
}

migrate().catch(err => { console.error('Migration failed:', err); process.exit(1); });
