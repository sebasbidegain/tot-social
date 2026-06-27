const { db, withTransaction } = require('../config/db');
const { ConflictError, ValidationError } = require('../utils/errors');

async function blockUser(blockerId, blockedId) {
  if (blockerId === blockedId) throw new ValidationError('Cannot block yourself');

  return withTransaction(async (conn) => {
    try {
      await conn.query(
        'INSERT INTO blocks (blocker_id, blocked_id) VALUES (?, ?)',
        [blockerId, blockedId]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') throw new ConflictError('User already blocked');
      throw err;
    }

    // Remove friendships (with counter fix)
    const [friendDel] = await conn.query(
      'DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [blockerId, blockedId, blockedId, blockerId]
    );
    if (friendDel.affectedRows > 0) {
      await conn.query('UPDATE users SET friend_count = GREATEST(friend_count - 1, 0) WHERE id IN (?, ?)', [blockerId, blockedId]);
    }

    // Remove follows (with counter fix)
    const [fol1] = await conn.query('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [blockerId, blockedId]);
    if (fol1.affectedRows > 0) {
      await conn.query('UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = ?', [blockerId]);
      await conn.query('UPDATE users SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = ?', [blockedId]);
    }
    const [fol2] = await conn.query('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [blockedId, blockerId]);
    if (fol2.affectedRows > 0) {
      await conn.query('UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = ?', [blockedId]);
      await conn.query('UPDATE users SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = ?', [blockerId]);
    }

    await conn.query(
      'DELETE FROM friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',
      [blockerId, blockedId, blockedId, blockerId]
    );
  });
}

async function unblockUser(blockerId, blockedId) {
  await db.query(
    'DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?',
    [blockerId, blockedId]
  );
}

async function getBlockedUsers(blockerId, cursor, limit) {
  const [rows] = await db.query(
    `SELECT b.id, u.id AS user_id, u.username, u.display_name, u.avatar_url, b.created_at
     FROM blocks b
     JOIN users u ON u.id = b.blocked_id
     WHERE b.blocker_id = ? AND b.id < ?
     ORDER BY b.id DESC
     LIMIT ?`,
    [blockerId, cursor, limit]
  );

  return rows.map(r => ({
    id: r.id,
    user: { id: r.user_id, username: r.username, display_name: r.display_name, avatar_url: r.avatar_url || '' },
    created_at: r.created_at,
  }));
}

async function isBlocked(blockerId, blockedId) {
  const [[row]] = await db.query(
    'SELECT COUNT(*) AS c FROM blocks WHERE blocker_id = ? AND blocked_id = ?',
    [blockerId, blockedId]
  );
  return row.c > 0;
}

async function isBlockedEitherWay(userA, userB) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS c FROM blocks
     WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`,
    [userA, userB, userB, userA]
  );
  return row.c > 0;
}

module.exports = { blockUser, unblockUser, getBlockedUsers, isBlocked, isBlockedEitherWay };
