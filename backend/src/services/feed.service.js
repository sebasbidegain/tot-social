const { db } = require('../config/db');
const thoughtsService = require('./thoughts.service');

function muteFilter(currentUserId) {
  return currentUserId ? 'AND t.user_id NOT IN (SELECT muted_id FROM mutes WHERE muter_id = ?)' : '';
}

async function getFeed(userId, cursor, limit) {
  const [rows] = await db.query(
    `SELECT ${thoughtsService.buildThoughtSelect(userId)}
     FROM thoughts t
     JOIN users u ON u.id = t.user_id
     WHERE (t.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?) OR t.user_id = ?)
       AND t.is_deleted = 0
       AND t.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ? UNION SELECT blocker_id FROM blocks WHERE blocked_id = ?)
       ${muteFilter(userId)}
       AND t.id < ?
     ORDER BY t.id DESC
     LIMIT ?`,
    [userId, userId, userId, userId, userId, userId, userId, cursor, limit]
  );

  await thoughtsService.attachMedia(rows);
  await thoughtsService.attachLinkPreviews(rows);
  await thoughtsService.attachQuotedThoughts(rows, userId);
  return rows.map(thoughtsService.serializeThought);
}

async function getExploreFeed(cursor, limit, currentUserId = null) {
  const [rows] = await db.query(
    `SELECT ${thoughtsService.buildThoughtSelect(currentUserId)}
     FROM thoughts t
     JOIN users u ON u.id = t.user_id
     WHERE t.is_deleted = 0
       ${currentUserId ? 'AND t.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ? UNION SELECT blocker_id FROM blocks WHERE blocked_id = ?)' : ''}
       ${muteFilter(currentUserId)}
       AND t.id < ?
     ORDER BY t.id DESC
     LIMIT ?`,
    currentUserId
      ? [currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, cursor, limit]
      : [cursor, limit]
  );

  await thoughtsService.attachMedia(rows);
  await thoughtsService.attachLinkPreviews(rows);
  await thoughtsService.attachQuotedThoughts(rows, currentUserId);
  return rows.map(thoughtsService.serializeThought);
}

async function searchThoughts(query, cursor, limit, currentUserId = null) {
  query = query.replace(/[+\-<>()~*"@]/g, ' ').trim();
  if (!query) return [];
  const [rows] = await db.query(
    `SELECT ${thoughtsService.buildThoughtSelect(currentUserId)}
     FROM thoughts t
     JOIN users u ON u.id = t.user_id
     WHERE MATCH(t.content) AGAINST(? IN BOOLEAN MODE)
       AND t.is_deleted = 0
       ${currentUserId ? 'AND t.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ? UNION SELECT blocker_id FROM blocks WHERE blocked_id = ?)' : ''}
       ${muteFilter(currentUserId)}
       AND t.id < ?
     ORDER BY t.id DESC
     LIMIT ?`,
    currentUserId
      ? [currentUserId, currentUserId, currentUserId, query, currentUserId, currentUserId, currentUserId, cursor, limit]
      : [query, cursor, limit]
  );

  await thoughtsService.attachMedia(rows);
  await thoughtsService.attachLinkPreviews(rows);
  return rows.map(thoughtsService.serializeThought);
}

module.exports = { getFeed, getExploreFeed, searchThoughts };
