const { db, withTransaction } = require('../config/db');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const { extractHashtags, extractMentions, extractUrls } = require('../utils/contentParser');
const hashtagsService = require('./hashtags.service');
const mentionsService = require('./mentions.service');
const linkPreviewsService = require('./linkPreviews.service');

async function create(userId, content, files = [], { parentThoughtId = null, quotedThoughtId = null } = {}) {
  const thoughtId = await withTransaction(async (conn) => {
    if (parentThoughtId) {
      const [[parent]] = await conn.query(
        'SELECT id FROM thoughts WHERE id = ? AND is_deleted = 0', [parentThoughtId]
      );
      if (!parent) throw new NotFoundError('Parent thought');
    }

    if (quotedThoughtId) {
      const [[quoted]] = await conn.query(
        'SELECT id FROM thoughts WHERE id = ? AND is_deleted = 0', [quotedThoughtId]
      );
      if (!quoted) throw new NotFoundError('Quoted thought');
    }

    const [result] = await conn.query(
      `INSERT INTO thoughts (user_id, content, parent_thought_id, quoted_thought_id, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, content, parentThoughtId, quotedThoughtId]
    );
    const id = result.insertId;

    for (const file of files) {
      const mediaType = file.mimetype.startsWith('video') ? 'video' : 'image';
      const url = `/uploads/${mediaType === 'video' ? 'videos' : 'images'}/${file.filename}`;
      await conn.query(
        'INSERT INTO thought_media (thought_id, media_type, url, created_at) VALUES (?, ?, ?, NOW())',
        [id, mediaType, url]
      );
    }

    await conn.query('UPDATE users SET thought_count = thought_count + 1 WHERE id = ?', [userId]);

    if (parentThoughtId) {
      await conn.query('UPDATE thoughts SET reply_count = reply_count + 1 WHERE id = ?', [parentThoughtId]);
    }

    const hashtags = extractHashtags(content);
    await hashtagsService.upsertHashtags(conn, id, hashtags);

    const mentions = extractMentions(content);
    await mentionsService.processMentions(conn, id, userId, mentions);

    return id;
  });

  const urls = extractUrls(content);
  linkPreviewsService.processLinks(thoughtId, urls).catch(() => {});

  return { id: thoughtId };
}

function buildThoughtSelect(currentUserId) {
  return `t.id, t.content, t.like_count, t.comment_count, t.repost_count, t.reply_count,
          t.is_edited, t.parent_thought_id, t.quoted_thought_id, t.created_at,
          u.id AS author_id, u.username, u.display_name, u.avatar_url,
          ${currentUserId
            ? `EXISTS(SELECT 1 FROM likes l WHERE l.thought_id = t.id AND l.user_id = ?) AS is_liked,
               EXISTS(SELECT 1 FROM bookmarks bm WHERE bm.thought_id = t.id AND bm.user_id = ?) AS is_bookmarked,
               EXISTS(SELECT 1 FROM reposts rp WHERE rp.thought_id = t.id AND rp.user_id = ?) AS is_reposted`
            : '0 AS is_liked, 0 AS is_bookmarked, 0 AS is_reposted'}`;
}

function userParams(currentUserId) {
  return currentUserId ? [currentUserId, currentUserId, currentUserId] : [];
}

function serializeThought(r) {
  return {
    id: r.id,
    content: r.content,
    like_count: r.like_count,
    comment_count: r.comment_count,
    repost_count: r.repost_count,
    reply_count: r.reply_count || 0,
    is_edited: !!r.is_edited,
    is_liked: !!r.is_liked,
    is_bookmarked: !!r.is_bookmarked,
    is_reposted: !!r.is_reposted,
    parent_thought_id: r.parent_thought_id || null,
    quoted_thought_id: r.quoted_thought_id || null,
    created_at: r.created_at,
    author: { id: r.author_id, username: r.username, display_name: r.display_name, avatar_url: r.avatar_url || '' },
    media: r.media || [],
    link_preview: r.link_preview || null,
    quoted_thought: r.quoted_thought || null,
  };
}

async function attachMedia(rows) {
  if (!rows.length) return;
  const ids = rows.map(r => r.id);
  const [media] = await db.query(
    'SELECT thought_id, id, media_type, url, thumbnail_url FROM thought_media WHERE thought_id IN (?)',
    [ids]
  );
  const mediaMap = {};
  for (const m of media) {
    (mediaMap[m.thought_id] ||= []).push({ id: m.id, type: m.media_type, url: m.url, thumbnail_url: m.thumbnail_url });
  }
  for (const row of rows) {
    row.media = mediaMap[row.id] || [];
  }
}

async function attachLinkPreviews(rows) {
  if (!rows.length) return;
  const ids = rows.map(r => r.id);
  const map = await linkPreviewsService.getForThoughts(ids);
  for (const row of rows) {
    row.link_preview = map[row.id] || null;
  }
}

async function attachQuotedThoughts(rows, currentUserId) {
  const quotedIds = rows.filter(r => r.quoted_thought_id).map(r => r.quoted_thought_id);
  if (!quotedIds.length) return;

  const uniqueIds = [...new Set(quotedIds)];
  const [quoted] = await db.query(
    `SELECT ${buildThoughtSelect(currentUserId)}
     FROM thoughts t JOIN users u ON u.id = t.user_id
     WHERE t.id IN (?) AND t.is_deleted = 0`,
    [...userParams(currentUserId), uniqueIds]
  );

  await attachMedia(quoted);

  const map = {};
  for (const q of quoted) {
    map[q.id] = { id: q.id, content: q.content, created_at: q.created_at,
      author: { id: q.author_id, username: q.username, display_name: q.display_name, avatar_url: q.avatar_url || '' },
      media: q.media || [] };
  }

  for (const row of rows) {
    row.quoted_thought = row.quoted_thought_id ? (map[row.quoted_thought_id] || null) : null;
  }
}

async function getById(thoughtId, currentUserId = null) {
  const [rows] = await db.query(
    `SELECT ${buildThoughtSelect(currentUserId)}
     FROM thoughts t JOIN users u ON u.id = t.user_id
     WHERE t.id = ? AND t.is_deleted = 0`,
    [...userParams(currentUserId), thoughtId]
  );

  if (rows.length === 0) throw new NotFoundError('Thought');
  await attachMedia(rows);
  await attachLinkPreviews(rows);
  await attachQuotedThoughts(rows, currentUserId);
  return serializeThought(rows[0]);
}

async function deleteThought(thoughtId, userId) {
  const [rows] = await db.query(
    'SELECT user_id, parent_thought_id FROM thoughts WHERE id = ? AND is_deleted = 0', [thoughtId]
  );
  if (rows.length === 0) throw new NotFoundError('Thought');
  if (rows[0].user_id !== userId) throw new ForbiddenError('You can only delete your own thoughts');

  await db.query('UPDATE thoughts SET is_deleted = 1 WHERE id = ?', [thoughtId]);
  await db.query('UPDATE users SET thought_count = GREATEST(thought_count - 1, 0) WHERE id = ?', [userId]);

  if (rows[0].parent_thought_id) {
    await db.query('UPDATE thoughts SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = ?', [rows[0].parent_thought_id]);
  }
}

async function editThought(thoughtId, userId, newContent) {
  const [[thought]] = await db.query(
    'SELECT id, user_id, content FROM thoughts WHERE id = ? AND is_deleted = 0', [thoughtId]
  );
  if (!thought) throw new NotFoundError('Thought');
  if (thought.user_id !== userId) throw new ForbiddenError('You can only edit your own thoughts');

  await withTransaction(async (conn) => {
    await conn.query(
      'INSERT INTO thought_edits (thought_id, old_content) VALUES (?, ?)',
      [thoughtId, thought.content]
    );
    await conn.query(
      'UPDATE thoughts SET content = ?, is_edited = 1 WHERE id = ?',
      [newContent, thoughtId]
    );

    await hashtagsService.removeHashtags(conn, thoughtId);
    const hashtags = extractHashtags(newContent);
    await hashtagsService.upsertHashtags(conn, thoughtId, hashtags);

    await mentionsService.removeMentions(conn, thoughtId);
    const mentions = extractMentions(newContent);
    await mentionsService.processMentions(conn, thoughtId, userId, mentions);
  });

  const urls = extractUrls(newContent);
  if (urls.length) {
    await db.query('DELETE FROM link_previews WHERE thought_id = ?', [thoughtId]);
    linkPreviewsService.processLinks(thoughtId, urls).catch(() => {});
  }

  return { edited: true };
}

async function getEditHistory(thoughtId) {
  const [rows] = await db.query(
    'SELECT id, old_content, edited_at FROM thought_edits WHERE thought_id = ? ORDER BY id DESC',
    [thoughtId]
  );
  return rows;
}

async function getReplies(thoughtId, cursor, limit, currentUserId = null) {
  const [rows] = await db.query(
    `SELECT ${buildThoughtSelect(currentUserId)}
     FROM thoughts t JOIN users u ON u.id = t.user_id
     WHERE t.parent_thought_id = ? AND t.is_deleted = 0 AND t.id < ?
     ORDER BY t.id DESC LIMIT ?`,
    [...userParams(currentUserId), thoughtId, cursor, limit]
  );

  await attachMedia(rows);
  await attachLinkPreviews(rows);
  await attachQuotedThoughts(rows, currentUserId);
  return rows.map(serializeThought);
}

async function getThread(thoughtId, currentUserId = null) {
  const chain = [];
  let currentId = thoughtId;
  let depth = 0;
  while (currentId && depth < 20) {
    const [[t]] = await db.query(
      `SELECT ${buildThoughtSelect(currentUserId)}
       FROM thoughts t JOIN users u ON u.id = t.user_id
       WHERE t.id = ? AND t.is_deleted = 0`,
      [...userParams(currentUserId), currentId]
    );
    if (!t) break;
    chain.unshift(t);
    currentId = t.parent_thought_id;
    depth++;
  }

  await attachMedia(chain);
  await attachLinkPreviews(chain);
  return chain.map(serializeThought);
}

async function getUserThoughts(userId, cursor, limit, currentUserId = null) {
  const [rows] = await db.query(
    `SELECT ${buildThoughtSelect(currentUserId)}
     FROM thoughts t JOIN users u ON u.id = t.user_id
     WHERE t.user_id = ? AND t.is_deleted = 0 AND t.id < ?
     ORDER BY t.id DESC LIMIT ?`,
    [...userParams(currentUserId), userId, cursor, limit]
  );

  await attachMedia(rows);
  await attachLinkPreviews(rows);
  await attachQuotedThoughts(rows, currentUserId);
  return rows.map(serializeThought);
}

async function getLikedBy(thoughtId, cursor, limit) {
  const [rows] = await db.query(
    `SELECT l.id, u.id AS user_id, u.username, u.display_name, u.avatar_url
     FROM likes l JOIN users u ON u.id = l.user_id
     WHERE l.thought_id = ? AND l.id < ?
     ORDER BY l.id DESC LIMIT ?`,
    [thoughtId, cursor, limit]
  );
  return rows.map(r => ({
    id: r.id,
    user: { id: r.user_id, username: r.username, display_name: r.display_name, avatar_url: r.avatar_url || '' },
  }));
}

async function getRepostedBy(thoughtId, cursor, limit) {
  const [rows] = await db.query(
    `SELECT rp.id, u.id AS user_id, u.username, u.display_name, u.avatar_url
     FROM reposts rp JOIN users u ON u.id = rp.user_id
     WHERE rp.thought_id = ? AND rp.id < ?
     ORDER BY rp.id DESC LIMIT ?`,
    [thoughtId, cursor, limit]
  );
  return rows.map(r => ({
    id: r.id,
    user: { id: r.user_id, username: r.username, display_name: r.display_name, avatar_url: r.avatar_url || '' },
  }));
}

async function getTrending(cursor, limit, currentUserId = null) {
  const [rows] = await db.query(
    `SELECT ${buildThoughtSelect(currentUserId)},
            (t.like_count + t.repost_count * 2 + t.comment_count) AS score
     FROM thoughts t JOIN users u ON u.id = t.user_id
     WHERE t.is_deleted = 0 AND t.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
       ${currentUserId ? 'AND t.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ? UNION SELECT blocker_id FROM blocks WHERE blocked_id = ?)' : ''}
       ${currentUserId ? 'AND t.user_id NOT IN (SELECT muted_id FROM mutes WHERE muter_id = ?)' : ''}
       AND t.id < ?
     ORDER BY score DESC, t.id DESC LIMIT ?`,
    [...userParams(currentUserId), ...(currentUserId ? [currentUserId, currentUserId, currentUserId] : []), cursor, limit]
  );

  await attachMedia(rows);
  await attachLinkPreviews(rows);
  await attachQuotedThoughts(rows, currentUserId);
  return rows.map(serializeThought);
}

module.exports = {
  create, getById, deleteThought, editThought, getEditHistory,
  getUserThoughts, getReplies, getThread, getTrending,
  getLikedBy, getRepostedBy,
  attachMedia, attachLinkPreviews, attachQuotedThoughts, serializeThought,
  buildThoughtSelect, userParams,
};
