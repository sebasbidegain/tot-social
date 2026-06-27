const { db, withTransaction } = require('../config/db');
const blocksService = require('./blocks.service');
const { ForbiddenError } = require('../utils/errors');

async function toggle(userId, thoughtId) {
  const [[thought]] = await db.query('SELECT user_id FROM thoughts WHERE id = ? AND is_deleted = 0', [thoughtId]);
  if (!thought) return { reposted: false };

  const blocked = await blocksService.isBlockedEitherWay(userId, thought.user_id);
  if (blocked) throw new ForbiddenError('Cannot interact with this user');

  const [delResult] = await db.query(
    'DELETE FROM reposts WHERE user_id = ? AND thought_id = ?',
    [userId, thoughtId]
  );

  if (delResult.affectedRows > 0) {
    await db.query('UPDATE thoughts SET repost_count = GREATEST(repost_count - 1, 0) WHERE id = ?', [thoughtId]);
    return { reposted: false };
  }

  try {
    await db.query(
      'INSERT INTO reposts (user_id, thought_id) VALUES (?, ?)',
      [userId, thoughtId]
    );
    await db.query('UPDATE thoughts SET repost_count = repost_count + 1 WHERE id = ?', [thoughtId]);
    return { reposted: true };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return { reposted: true };
    throw err;
  }
}

async function isReposted(userId, thoughtId) {
  const [[row]] = await db.query(
    'SELECT COUNT(*) AS c FROM reposts WHERE user_id = ? AND thought_id = ?',
    [userId, thoughtId]
  );
  return row.c > 0;
}

module.exports = { toggle, isReposted };
