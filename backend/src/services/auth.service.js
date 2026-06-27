const argon2 = require('argon2');
const { db } = require('../config/db');
const tokenService = require('./token.service');
const { UnauthorizedError, ConflictError } = require('../utils/errors');

async function register({ username, email, password, display_name }) {
  const [existing] = await db.query(
    'SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
    [username, email]
  );

  if (existing.length > 0) {
    const taken = existing[0].email === email ? 'email' : 'username';
    throw new ConflictError(`This ${taken} is already registered`);
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  const [result] = await db.query(
    `INSERT INTO users (username, email, password_hash, display_name, created_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [username, email, passwordHash, display_name || username]
  );

  const userId = result.insertId;
  const { accessToken, refreshToken } = await tokenService.generatePair(userId);

  return {
    user: { id: userId, username, email, display_name: display_name || username, avatar_url: '', bio: '' },
    accessToken,
    refreshToken,
  };
}

async function login({ login, password }) {
  const [rows] = await db.query(
    `SELECT id, username, email, password_hash, display_name, avatar_url, bio,
            failed_login_attempts, locked_until
     FROM users WHERE (email = ? OR username = ?) AND is_active = 1 LIMIT 1`,
    [login, login]
  );

  if (rows.length === 0) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const user = rows[0];

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new UnauthorizedError('Account temporarily locked. Try again later.');
  }

  const valid = await argon2.verify(user.password_hash, password);

  if (!valid) {
    const attempts = (user.failed_login_attempts || 0) + 1;
    const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

    await db.query(
      'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
      [attempts, lockUntil, user.id]
    );
    throw new UnauthorizedError('Invalid credentials');
  }

  await db.query(
    'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
    [user.id]
  );

  const { accessToken, refreshToken } = await tokenService.generatePair(user.id);

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      avatar_url: user.avatar_url || '',
      bio: user.bio || '',
    },
    accessToken,
    refreshToken,
  };
}

async function changePassword(userId, currentPassword, newPassword) {
  const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
  if (rows.length === 0) throw new UnauthorizedError();

  const valid = await argon2.verify(rows[0].password_hash, currentPassword);
  if (!valid) throw new UnauthorizedError('Current password is incorrect');

  const newHash = await argon2.hash(newPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
  await tokenService.revokeAllForUser(userId);
}

module.exports = { register, login, changePassword };
