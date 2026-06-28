const crypto = require('crypto');
const argon2 = require('argon2');
const { db } = require('../config/db');
const { sendEmail } = require('../utils/email');
const tokenService = require('./token.service');
const { NotFoundError, ValidationError } = require('../utils/errors');

const RESET_EXPIRY_HOURS = 1;

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function requestReset(email) {
  const [rows] = await db.query('SELECT id, username FROM users WHERE email = ? AND is_active = 1', [email]);
  if (rows.length === 0) return;

  const user = rows[0];
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_EXPIRY_HOURS * 60 * 60 * 1000);

  await db.query('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0', [user.id]);

  await db.query(
    'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [user.id, tokenHash, expiresAt]
  );

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  await sendEmail({
    to: email,
    subject: 'ToT - Reset Your Password',
    html: `
      <h2>Password Reset</h2>
      <p>Hi ${escapeHtml(user.username)},</p>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in ${RESET_EXPIRY_HOURS} hour(s).</p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });
}

async function resetPassword(token, newPassword) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const [rows] = await db.query(
    'SELECT id, user_id, expires_at FROM password_resets WHERE token_hash = ? AND used = 0',
    [tokenHash]
  );

  if (rows.length === 0) throw new ValidationError('Invalid or expired reset token');

  const reset = rows[0];
  if (new Date(reset.expires_at) < new Date()) {
    await db.query('UPDATE password_resets SET used = 1 WHERE id = ?', [reset.id]);
    throw new ValidationError('Reset token has expired');
  }

  const newHash = await argon2.hash(newPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, reset.user_id]);
  await db.query('UPDATE password_resets SET used = 1 WHERE id = ?', [reset.id]);
  await tokenService.revokeAllForUser(reset.user_id);
}

async function sendVerificationEmail(userId) {
  const [[user]] = await db.query('SELECT id, username, email, email_verified FROM users WHERE id = ?', [userId]);
  if (!user) throw new NotFoundError('User');
  if (user.email_verified) return;

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.query('DELETE FROM email_verifications WHERE user_id = ?', [userId]);
  await db.query(
    'INSERT INTO email_verifications (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, tokenHash, expiresAt]
  );

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: 'ToT - Verify Your Email',
    html: `
      <h2>Email Verification</h2>
      <p>Hi ${escapeHtml(user.username)},</p>
      <p>Click the link below to verify your email address:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
}

async function verifyEmail(token) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const [rows] = await db.query(
    'SELECT id, user_id, expires_at FROM email_verifications WHERE token_hash = ?',
    [tokenHash]
  );

  if (rows.length === 0) throw new ValidationError('Invalid verification token');

  const verification = rows[0];
  if (new Date(verification.expires_at) < new Date()) {
    throw new ValidationError('Verification link has expired');
  }

  await db.query('UPDATE users SET email_verified = 1 WHERE id = ?', [verification.user_id]);
  await db.query('DELETE FROM email_verifications WHERE id = ?', [verification.id]);
}

module.exports = { requestReset, resetPassword, sendVerificationEmail, verifyEmail };
