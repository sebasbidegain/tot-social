const { db } = require('../config/db');
const blocksService = require('./blocks.service');
const { ForbiddenError } = require('../utils/errors');

async function toggle(userId, thoughtId) {
  const [[thought]] = await db.query('SELECT user_id FROM thoughts WHERE id = ? AND is_deleted = 0', [thoughtId]);
  if (!thought) return { bookmarked: false };

  const blocked = await blocksService.isBlockedEitherWay(userId, thought.user_id);
  if (blocked) throw new ForbiddenError('Cannot interact with this user');

  const [delResult] = await db.query(
    'DELETE FROM bookmarks WHERE user_id = ? AND thought_id = ?',
    [userId, thoughtId]
  );

  if (delResult.affectedRows > 0) return { bookmarked: false };

  try {
    await db.query(
      'INSERT INTO bookmarks (user_id, thought_id) VALUES (?, ?)',
      [userId, thoughtId]
    );
    return { bookmarked: true };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return { bookmarked: true };
    throw err;
  }
}

async function getBookmarks(userId, cursor, limit) {
  const [rows] = await db.query(
    `SELECT b.id, b.created_at AS bookmarked_at,
            t.id AS thought_id, t.content, t.like_count, t.comment_count, t.repost_count, t.created_at,
            u.id AS author_id, u.username, u.display_name, u.avatar_url,
            EXISTS(SELECT 1 FROM likes l WHERE l.thought_id = t.id AND l.user_id = ?) AS is_liked,
            1 AS is_bookmarked,
            EXISTS(SELECT 1 FROM reposts r WHERE r.thought_id = t.id AND r.user_id = ?) AS is_reposted
     FROM bookmarks b
     JOIN thoughts t ON t.id = b.thought_id AND t.is_deleted = 0
     JOIN users u ON u.id = t.user_id
     WHERE b.user_id = ? AND b.id < ?
       AND t.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ? UNION SELECT blocker_id FROM blocks WHERE blocked_id = ?)
     ORDER BY b.id DESC
     LIMIT ?`,
    [userId, userId, userId, cursor, userId, userId, limit]
  );

  return rows.map(r => ({
    id: r.id,
    bookmarked_at: r.bookmarked_at,
    thought: {
      id: r.thought_id,
      content: r.content,
      like_count: r.like_count,
      comment_count: r.comment_count,
      repost_count: r.repost_count,
      is_liked: !!r.is_liked,
      is_bookmarked: true,
      is_reposted: !!r.is_reposted,
      created_at: r.created_at,
      author: { id: r.author_id, username: r.username, display_name: r.display_name, avatar_url: r.avatar_url || '' },
      media: [],
    },
  }));
}

async function isBookmarked(userId, thoughtId) {
  const [[row]] = await db.query(
    'SELECT COUNT(*) AS c FROM bookmarks WHERE user_id = ? AND thought_id = ?',
    [userId, thoughtId]
  );
  return row.c > 0;
}

module.exports = { toggle, getBookmarks, isBookmarked };
