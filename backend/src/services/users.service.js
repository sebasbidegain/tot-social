const { db, withTransaction } = require('../config/db');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const blocksService = require('./blocks.service');

function serializeUser(user, currentUserId = null) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    bio: user.bio || '',
    avatar_url: user.avatar_url || '',
    follower_count: user.follower_count,
    following_count: user.following_count,
    thought_count: user.thought_count,
    friend_count: user.friend_count,
    is_following: currentUserId ? !!user.is_following : undefined,
    created_at: user.created_at,
  };
}

async function getProfile(username, currentUserId = null) {
  const [rows] = await db.query(
    `SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url,
            u.follower_count, u.following_count, u.thought_count, u.friend_count, u.created_at,
            ${currentUserId
              ? 'EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id) AS is_following'
              : '0 AS is_following'}
     FROM users u
     WHERE u.username = ? AND u.is_active = 1`,
    currentUserId ? [currentUserId, username] : [username]
  );

  if (rows.length === 0) throw new NotFoundError('User');
  return serializeUser(rows[0], currentUserId);
}

async function getMe(userId) {
  const [rows] = await db.query(
    `SELECT id, username, email, display_name, bio, avatar_url,
            follower_count, following_count, thought_count, email_verified, theme, created_at
     FROM users WHERE id = ? AND is_active = 1`,
    [userId]
  );
  if (rows.length === 0) throw new NotFoundError('User');
  return { ...rows[0], bio: rows[0].bio || '', avatar_url: rows[0].avatar_url || '', email_verified: !!rows[0].email_verified, theme: rows[0].theme || 'light' };
}

async function updateProfile(userId, { display_name, bio }) {
  const updates = [];
  const values = [];

  if (display_name !== undefined) { updates.push('display_name = ?'); values.push(display_name); }
  if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }

  if (updates.length === 0) return;

  values.push(userId);
  await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
}

async function updateAvatar(userId, avatarUrl) {
  await db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId]);
}

async function follow(followerId, followingId) {
  if (followerId === followingId) {
    throw new Error('Cannot follow yourself');
  }

  const blocked = await blocksService.isBlockedEitherWay(followerId, followingId);
  if (blocked) throw new ForbiddenError('Cannot interact with this user');

  return withTransaction(async (conn) => {
    try {
      await conn.query(
        'INSERT INTO follows (follower_id, following_id, created_at) VALUES (?, ?, NOW())',
        [followerId, followingId]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return { already_following: true };
      throw err;
    }
    await conn.query('UPDATE users SET following_count = following_count + 1 WHERE id = ?', [followerId]);
    await conn.query('UPDATE users SET follower_count = follower_count + 1 WHERE id = ?', [followingId]);
    return { followed: true };
  });
}

async function unfollow(followerId, followingId) {
  return withTransaction(async (conn) => {
    const [result] = await conn.query(
      'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );

    if (result.affectedRows > 0) {
      await conn.query('UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = ?', [followerId]);
      await conn.query('UPDATE users SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = ?', [followingId]);
    }

    return { unfollowed: true };
  });
}

async function getFollowers(userId, cursor, limit) {
  const [rows] = await db.query(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, f.created_at
     FROM follows f
     JOIN users u ON u.id = f.follower_id
     WHERE f.following_id = ? AND f.id < ?
     ORDER BY f.id DESC
     LIMIT ?`,
    [userId, cursor, limit]
  );
  return rows;
}

async function getFollowing(userId, cursor, limit) {
  const [rows] = await db.query(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, f.created_at
     FROM follows f
     JOIN users u ON u.id = f.following_id
     WHERE f.follower_id = ? AND f.id < ?
     ORDER BY f.id DESC
     LIMIT ?`,
    [userId, cursor, limit]
  );
  return rows;
}

async function searchUsers(query, limit = 10) {
  const [rows] = await db.query(
    `SELECT id, username, display_name, avatar_url, bio, follower_count
     FROM users
     WHERE (username LIKE CONCAT(?, '%') OR display_name LIKE CONCAT('%', ?, '%'))
       AND is_active = 1
     ORDER BY follower_count DESC
     LIMIT ?`,
    [query, query, limit]
  );
  return rows;
}

async function updateTheme(userId, theme) {
  if (!['light', 'dark', 'system'].includes(theme)) theme = 'light';
  await db.query('UPDATE users SET theme = ? WHERE id = ?', [theme, userId]);
}

module.exports = { getProfile, getMe, updateProfile, updateAvatar, follow, unfollow, getFollowers, getFollowing, searchUsers, updateTheme };
