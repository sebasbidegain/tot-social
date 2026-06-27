const { db } = require('../config/db');

async function upsertHashtags(conn, thoughtId, tagNames) {
  if (!tagNames.length) return;

  for (const name of tagNames) {
    await conn.query(
      'INSERT INTO hashtags (name) VALUES (?) ON DUPLICATE KEY UPDATE id = id',
      [name]
    );
    const [[tag]] = await conn.query('SELECT id FROM hashtags WHERE name = ?', [name]);
    try {
      await conn.query('INSERT INTO thought_hashtags (thought_id, hashtag_id) VALUES (?, ?)', [thoughtId, tag.id]);
      await conn.query('UPDATE hashtags SET thought_count = thought_count + 1 WHERE id = ?', [tag.id]);
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
    }
  }
}

async function removeHashtags(conn, thoughtId) {
  const [existing] = await conn.query('SELECT hashtag_id FROM thought_hashtags WHERE thought_id = ?', [thoughtId]);
  if (existing.length > 0) {
    const ids = existing.map(r => r.hashtag_id);
    await conn.query('DELETE FROM thought_hashtags WHERE thought_id = ?', [thoughtId]);
    await conn.query(
      `UPDATE hashtags SET thought_count = GREATEST(thought_count - 1, 0) WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
  }
}

async function getThoughtsByHashtag(tagName, cursor, limit, currentUserId = null) {
  const [rows] = await db.query(
    `SELECT t.id, t.content, t.like_count, t.comment_count, t.repost_count, t.is_edited,
            t.parent_thought_id, t.quoted_thought_id, t.reply_count, t.created_at,
            u.id AS author_id, u.username, u.display_name, u.avatar_url,
            ${currentUserId
              ? `EXISTS(SELECT 1 FROM likes l WHERE l.thought_id = t.id AND l.user_id = ?) AS is_liked,
                 EXISTS(SELECT 1 FROM bookmarks bm WHERE bm.thought_id = t.id AND bm.user_id = ?) AS is_bookmarked,
                 EXISTS(SELECT 1 FROM reposts rp WHERE rp.thought_id = t.id AND rp.user_id = ?) AS is_reposted`
              : '0 AS is_liked, 0 AS is_bookmarked, 0 AS is_reposted'}
     FROM thoughts t
     JOIN users u ON u.id = t.user_id
     JOIN thought_hashtags th ON th.thought_id = t.id
     JOIN hashtags h ON h.id = th.hashtag_id
     WHERE h.name = ? AND t.is_deleted = 0
       ${currentUserId ? 'AND t.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ? UNION SELECT blocker_id FROM blocks WHERE blocked_id = ?)' : ''}
       AND t.id < ?
     ORDER BY t.id DESC
     LIMIT ?`,
    currentUserId
      ? [currentUserId, currentUserId, currentUserId, tagName.toLowerCase(), currentUserId, currentUserId, cursor, limit]
      : [tagName.toLowerCase(), cursor, limit]
  );
  return rows;
}

async function getTrending(limit = 10) {
  const [rows] = await db.query(
    `SELECT h.id, h.name, h.thought_count,
            COUNT(th.thought_id) AS recent_count
     FROM hashtags h
     JOIN thought_hashtags th ON th.hashtag_id = h.id
     JOIN thoughts t ON t.id = th.thought_id AND t.is_deleted = 0
     WHERE t.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
     GROUP BY h.id
     ORDER BY recent_count DESC, h.thought_count DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

module.exports = { upsertHashtags, removeHashtags, getThoughtsByHashtag, getTrending };
