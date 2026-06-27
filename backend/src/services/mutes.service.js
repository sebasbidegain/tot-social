const { db } = require('../config/db');
const { ValidationError, ConflictError } = require('../utils/errors');

async function muteUser(muterId, mutedId) {
  if (muterId === mutedId) throw new ValidationError('Cannot mute yourself');
  try {
    await db.query('INSERT INTO mutes (muter_id, muted_id) VALUES (?, ?)', [muterId, mutedId]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new ConflictError('User already muted');
    throw err;
  }
}

async function unmuteUser(muterId, mutedId) {
  await db.query('DELETE FROM mutes WHERE muter_id = ? AND muted_id = ?', [muterId, mutedId]);
}

async function getMutedUsers(muterId, cursor, limit) {
  const [rows] = await db.query(
    `SELECT m.id, u.id AS user_id, u.username, u.display_name, u.avatar_url, m.created_at
     FROM mutes m
     JOIN users u ON u.id = m.muted_id
     WHERE m.muter_id = ? AND m.id < ?
     ORDER BY m.id DESC
     LIMIT ?`,
    [muterId, cursor, limit]
  );
  return rows.map(r => ({
    id: r.id,
    user: { id: r.user_id, username: r.username, display_name: r.display_name, avatar_url: r.avatar_url || '' },
    created_at: r.created_at,
  }));
}

async function isMuted(muterId, mutedId) {
  const [[row]] = await db.query(
    'SELECT COUNT(*) AS c FROM mutes WHERE muter_id = ? AND muted_id = ?',
    [muterId, mutedId]
  );
  return row.c > 0;
}

module.exports = { muteUser, unmuteUser, getMutedUsers, isMuted };
