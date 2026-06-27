const { db, withTransaction } = require('../config/db');
const { ConflictError, NotFoundError, ForbiddenError, ValidationError } = require('../utils/errors');
const notificationsService = require('./notifications.service');
const blocksService = require('./blocks.service');

async function sendRequest(senderId, receiverId) {
  if (senderId === receiverId) throw new ValidationError('Cannot send friend request to yourself');

  const blocked = await blocksService.isBlockedEitherWay(senderId, receiverId);
  if (blocked) throw new ForbiddenError('Cannot interact with this user');

  // Check receiver exists
  const [users] = await db.query('SELECT id FROM users WHERE id = ? AND is_active = 1', [receiverId]);
  if (users.length === 0) throw new NotFoundError('User');

  // Check if already friends
  const [existing] = await db.query(
    'SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?',
    [senderId, receiverId]
  );
  if (existing.length > 0) throw new ConflictError('Already friends');

  // Check if request already exists in either direction
  const [requests] = await db.query(
    `SELECT id, sender_id, status FROM friend_requests
     WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`,
    [senderId, receiverId, receiverId, senderId]
  );

  if (requests.length > 0) {
    const req = requests[0];
    if (req.status === 'pending' && req.sender_id === receiverId) {
      // They already sent us a request — auto-accept
      return acceptRequest(receiverId, senderId);
    }
    if (req.status === 'pending') {
      throw new ConflictError('Friend request already sent');
    }
    if (req.status === 'accepted') {
      throw new ConflictError('Already friends');
    }
    // If rejected, allow re-sending by updating the existing row
    await db.query(
      `UPDATE friend_requests SET sender_id = ?, receiver_id = ?, status = 'pending', updated_at = NOW()
       WHERE id = ?`,
      [senderId, receiverId, req.id]
    );
    return { status: 'pending' };
  }

  await db.query(
    'INSERT INTO friend_requests (sender_id, receiver_id) VALUES (?, ?)',
    [senderId, receiverId]
  );
  notificationsService.create(receiverId, senderId, 'friend_request', 'user', senderId).catch(() => {});
  return { status: 'pending' };
}

async function acceptRequest(senderId, receiverId) {
  // receiverId is the person accepting (the one who received the request)
  return withTransaction(async (conn) => {
    const [rows] = await conn.query(
      `SELECT id FROM friend_requests
       WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'`,
      [senderId, receiverId]
    );
    if (rows.length === 0) throw new NotFoundError('Friend request');

    await conn.query(
      `UPDATE friend_requests SET status = 'accepted' WHERE id = ?`,
      [rows[0].id]
    );

    // Insert both directions for fast lookups
    await conn.query(
      'INSERT IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?), (?, ?)',
      [senderId, receiverId, receiverId, senderId]
    );

    await conn.query('UPDATE users SET friend_count = friend_count + 1 WHERE id IN (?, ?)', [senderId, receiverId]);

    notificationsService.create(senderId, receiverId, 'friend_accept', 'user', receiverId).catch(() => {});
    return { status: 'accepted' };
  });
}

async function rejectRequest(senderId, receiverId) {
  const [rows] = await db.query(
    `SELECT id FROM friend_requests
     WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'`,
    [senderId, receiverId]
  );
  if (rows.length === 0) throw new NotFoundError('Friend request');

  await db.query(`UPDATE friend_requests SET status = 'rejected' WHERE id = ?`, [rows[0].id]);
  return { status: 'rejected' };
}

async function cancelRequest(senderId, receiverId) {
  const [rows] = await db.query(
    `SELECT id FROM friend_requests
     WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'`,
    [senderId, receiverId]
  );
  if (rows.length === 0) throw new NotFoundError('Friend request');

  await db.query('DELETE FROM friend_requests WHERE id = ?', [rows[0].id]);
  return { cancelled: true };
}

async function unfriend(userId, friendId) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.query(
      'SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?',
      [userId, friendId]
    );
    if (rows.length === 0) throw new NotFoundError('Friendship');

    await conn.query(
      'DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [userId, friendId, friendId, userId]
    );

    // Also clean up the friend_request row
    await conn.query(
      `DELETE FROM friend_requests
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`,
      [userId, friendId, friendId, userId]
    );

    await conn.query(
      'UPDATE users SET friend_count = GREATEST(friend_count - 1, 0) WHERE id IN (?, ?)',
      [userId, friendId]
    );

    return { unfriended: true };
  });
}

async function getPendingReceived(userId, cursor, limit) {
  const [rows] = await db.query(
    `SELECT fr.id, fr.created_at,
            u.id AS user_id, u.username, u.display_name, u.avatar_url, u.bio
     FROM friend_requests fr
     JOIN users u ON u.id = fr.sender_id
     WHERE fr.receiver_id = ? AND fr.status = 'pending' AND fr.id < ?
     ORDER BY fr.id DESC
     LIMIT ?`,
    [userId, cursor, limit]
  );
  return rows.map(r => ({
    id: r.id,
    created_at: r.created_at,
    user: { id: r.user_id, username: r.username, display_name: r.display_name, avatar_url: r.avatar_url, bio: r.bio },
  }));
}

async function getPendingSent(userId, cursor, limit) {
  const [rows] = await db.query(
    `SELECT fr.id, fr.created_at,
            u.id AS user_id, u.username, u.display_name, u.avatar_url, u.bio
     FROM friend_requests fr
     JOIN users u ON u.id = fr.receiver_id
     WHERE fr.sender_id = ? AND fr.status = 'pending' AND fr.id < ?
     ORDER BY fr.id DESC
     LIMIT ?`,
    [userId, cursor, limit]
  );
  return rows.map(r => ({
    id: r.id,
    created_at: r.created_at,
    user: { id: r.user_id, username: r.username, display_name: r.display_name, avatar_url: r.avatar_url, bio: r.bio },
  }));
}

async function getFriends(userId, cursor, limit) {
  const [rows] = await db.query(
    `SELECT fs.id, fs.created_at,
            u.id AS user_id, u.username, u.display_name, u.avatar_url, u.bio, u.follower_count
     FROM friendships fs
     JOIN users u ON u.id = fs.friend_id
     WHERE fs.user_id = ? AND fs.id < ?
     ORDER BY fs.id DESC
     LIMIT ?`,
    [userId, cursor, limit]
  );
  return rows.map(r => ({
    id: r.id,
    created_at: r.created_at,
    user: { id: r.user_id, username: r.username, display_name: r.display_name, avatar_url: r.avatar_url, bio: r.bio, follower_count: r.follower_count },
  }));
}

async function getFriendshipStatus(userId, otherUserId) {
  if (userId === otherUserId) return { status: 'self' };

  const [friendship] = await db.query(
    'SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?',
    [userId, otherUserId]
  );
  if (friendship.length > 0) return { status: 'friends' };

  const [request] = await db.query(
    `SELECT id, sender_id, status FROM friend_requests
     WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       AND status = 'pending'`,
    [userId, otherUserId, otherUserId, userId]
  );
  if (request.length > 0) {
    return {
      status: request[0].sender_id === userId ? 'request_sent' : 'request_received',
      request_id: request[0].id,
    };
  }

  return { status: 'none' };
}

async function getPendingCount(userId) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count FROM friend_requests WHERE receiver_id = ? AND status = 'pending'`,
    [userId]
  );
  return rows[0].count;
}

module.exports = {
  sendRequest, acceptRequest, rejectRequest, cancelRequest,
  unfriend, getPendingReceived, getPendingSent, getFriends,
  getFriendshipStatus, getPendingCount,
};
