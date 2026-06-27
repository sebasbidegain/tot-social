require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT, 10) || 3306;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS || '';
const DB_NAME = process.env.DB_NAME;

const TABLES = [
  `CREATE TABLE IF NOT EXISTS friend_requests (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS friendships (
      id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id         BIGINT UNSIGNED NOT NULL,
      friend_id       BIGINT UNSIGNED NOT NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_fs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      CONSTRAINT fk_fs_friend FOREIGN KEY (friend_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE KEY uq_fs_pair (user_id, friend_id),
      INDEX idx_fs_friend (friend_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

async function migrate() {
  console.log('Connecting to MySQL...');
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
  });

  console.log('Creating friend tables...');
  for (const stmt of TABLES) {
    await conn.query(stmt);
  }

  // Add friend_count to users if not exists
  try {
    await conn.query('ALTER TABLE users ADD COLUMN friend_count INT UNSIGNED NOT NULL DEFAULT 0');
    console.log('Added friend_count column to users');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    console.log('friend_count column already exists');
  }

  console.log('Friends migration complete!');
  await conn.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
