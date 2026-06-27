const { db, withTransaction } = require('../config/db');
const { NotFoundError, ForbiddenError, ValidationError } = require('../utils/errors');
const blocksService = require('./blocks.service');

function normalizeIds(a, b) {
  return a < b ? [a, b] : [b, a];
}

async function getOrCreateConversation(userId, otherUserId) {
  const [aId, bId] = normalizeIds(userId, otherUserId);

  const [existing] = await db.query(
    'SELECT id FROM conversations WHERE user_a_id = ? AND user_b_id = ?',
    [aId, bId]
  );

  if (existing.length > 0) return existing[0].id;

  const [result] = await db.query(
    'INSERT INTO conversations (user_a_id, user_b_id) VALUES (?, ?)',
    [aId, bId]
  );
  return result.insertId;
}

async function sendMessage(senderId, receiverId, content) {
  if (senderId === receiverId) throw new ValidationError('Cannot message yourself');
  const blocked = await blocksService.isBlockedEitherWay(senderId, receiverId);
  if (blocked) throw new ForbiddenError('Cannot message this user');

  return withTransaction(async (conn) => {
    const [aId, bId] = normalizeIds(senderId, receiverId);

    let [existing] = await conn.query(
      'SELECT id FROM conversations WHERE user_a_id = ? AND user_b_id = ?',
      [aId, bId]
    );

    let conversationId;
    if (existing.length > 0) {
      conversationId = existing[0].id;
    } else {
      const [result] = await conn.query(
        'INSERT INTO conversations (user_a_id, user_b_id) VALUES (?, ?)',
        [aId, bId]
      );
      conversationId = result.insertId;
    }

    const [msgResult] = await conn.query(
      'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)',
      [conversationId, senderId, content]
    );

    await conn.query(
      'UPDATE conversations SET last_message_at = NOW() WHERE id = ?',
      [conversationId]
    );

    return {
      id: msgResult.insertId,
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
    };
  });
}

async function getConversations(userId, cursor, limit) {
  const [rows] = await db.query(
    `SELECT c.id, c.last_message_at, c.created_at,
            u.id AS other_id, u.username AS other_username,
            u.display_name AS other_display_name, u.avatar_url AS other_avatar_url,
            (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_message,
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != ? AND is_read = 0) AS unread_count
     FROM conversations c
     JOIN users u ON u.id = IF(c.user_a_id = ?, c.user_b_id, c.user_a_id)
     WHERE (c.user_a_id = ? OR c.user_b_id = ?) AND c.id < ?
     ORDER BY COALESCE(c.last_message_at, c.created_at) DESC, c.id DESC
     LIMIT ?`,
    [userId, userId, userId, userId, cursor, limit]
  );

  return rows.map(r => ({
    id: r.id,
    last_message: r.last_message || '',
    last_message_at: r.last_message_at,
    unread_count: r.unread_count,
    other_user: {
      id: r.other_id,
      username: r.other_username,
      display_name: r.other_display_name,
      avatar_url: r.other_avatar_url || '',
    },
  }));
}

async function getMessages(userId, conversationId, cursor, limit) {
  const [conv] = await db.query(
    'SELECT id FROM conversations WHERE id = ? AND (user_a_id = ? OR user_b_id = ?)',
    [conversationId, userId, userId]
  );
  if (conv.length === 0) throw new ForbiddenError('Not a participant');

  const [rows] = await db.query(
    `SELECT m.id, m.sender_id, m.content, m.is_read, m.created_at
     FROM messages m
     WHERE m.conversation_id = ? AND m.id < ?
     ORDER BY m.id DESC
     LIMIT ?`,
    [conversationId, cursor, limit]
  );

  await db.query(
    'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ? AND is_read = 0',
    [conversationId, userId]
  );

  return rows;
}

async function getTotalUnreadCount(userId) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS count FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE (c.user_a_id = ? OR c.user_b_id = ?) AND m.sender_id != ? AND m.is_read = 0`,
    [userId, userId, userId]
  );
  return row.count;
}

module.exports = { sendMessage, getConversations, getMessages, getOrCreateConversation, getTotalUnreadCount };
