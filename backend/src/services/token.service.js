const { SignJWT, jwtVerify } = require('jose');
const crypto = require('crypto');
const env = require('../config/env');
const { db } = require('../config/db');
const { UnauthorizedError } = require('../utils/errors');

let privateKey, publicKey;

function getPrivateKey() {
  if (!privateKey) {
    const pem = Buffer.from(env.JWT_PRIVATE_KEY, 'base64').toString('utf8');
    privateKey = crypto.createPrivateKey(pem);
  }
  return privateKey;
}

function getPublicKey() {
  if (!publicKey) {
    const pem = Buffer.from(env.JWT_PUBLIC_KEY, 'base64').toString('utf8');
    publicKey = crypto.createPublicKey(pem);
  }
  return publicKey;
}

async function signAccessToken(userId) {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRY)
    .setIssuer('tot-api')
    .setAudience('tot-client')
    .sign(getPrivateKey());
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function generatePair(userId) {
  const accessToken = await signAccessToken(userId);
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), NOW())`,
    [userId, tokenHash, env.JWT_REFRESH_DAYS]
  );

  return { accessToken, refreshToken };
}

async function refresh(oldRefreshToken) {
  const tokenHash = hashToken(oldRefreshToken);

  const [rows] = await db.query(
    'SELECT id, user_id FROM refresh_tokens WHERE token_hash = ? AND expires_at > NOW() AND is_revoked = 0',
    [tokenHash]
  );

  if (rows.length === 0) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  await db.query('UPDATE refresh_tokens SET is_revoked = 1 WHERE id = ?', [rows[0].id]);

  return generatePair(rows[0].user_id);
}

async function revokeAllForUser(userId) {
  await db.query('UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?', [userId]);
}

async function revokeToken(refreshToken) {
  const tokenHash = hashToken(refreshToken);
  await db.query('UPDATE refresh_tokens SET is_revoked = 1 WHERE token_hash = ?', [tokenHash]);
}

module.exports = { generatePair, refresh, revokeAllForUser, revokeToken };
