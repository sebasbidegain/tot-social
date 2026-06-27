const { db } = require('../config/db');
const pushService = require('./push.service');

const PUSH_MESSAGES = {
  like: (actor) => `${actor} liked your thought`,
  comment: (actor) => `${actor} commented on your thought`,
  follow: (actor) => `${actor} started following you`,
  friend_request: (actor) => `${actor} sent you a friend request`,
  friend_accept: (actor) => `${actor} accepted your friend request`,
  repost: (actor) => `${actor} reposted your thought`,
  mention: (actor) => `${actor} mentioned you`,
  quote: (actor) => `${actor} quoted your thought`,
};

async function create(userId, actorId, type, entityType = null, entityId = null) {
  if (userId === actorId) return;
  await db.query(
    `INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, actorId, type, entityType, entityId]
  );

  const [[actor]] = await db.query('SELECT display_name FROM users WHERE id = ?', [actorId]);
  if (actor && PUSH_MESSAGES[type]) {
    pushService.sendToUser(userId, {
      title: 'ToT',
      body: PUSH_MESSAGES[type](actor.display_name),
      data: { type, entityType, entityId },
    }).catch(() => {});
  }
}

async function getNotifications(userId, cursor, limit) {
  const [rows] = await db.query(
    `SELECT n.id, n.type, n.entity_type, n.entity_id, n.is_read, n.created_at,
            u.id AS actor_id, u.username AS actor_username,
            u.display_name AS actor_display_name, u.avatar_url AS actor_avatar_url
     FROM notifications n
     JOIN users u ON u.id = n.actor_id
     WHERE n.user_id = ? AND n.id < ?
     ORDER BY n.id DESC
     LIMIT ?`,
    [userId, cursor, limit]
  );

  return rows.map(r => ({
    id: r.id,
    type: r.type,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    is_read: !!r.is_read,
    created_at: r.created_at,
    actor: {
      id: r.actor_id,
      username: r.actor_username,
      display_name: r.actor_display_name,
      avatar_url: r.actor_avatar_url || '',
    },
  }));
}

async function getUnreadCount(userId) {
  const [[row]] = await db.query(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  return row.count;
}

async function markAsRead(userId, notificationId) {
  await db.query(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
}

async function markAllRead(userId) {
  await db.query(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
    [userId]
  );
}

module.exports = { create, getNotifications, getUnreadCount, markAsRead, markAllRead };
