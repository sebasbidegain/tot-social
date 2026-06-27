const usersService = require('../services/users.service');
const { parseCursor, buildCursorResponse } = require('../utils/pagination');
const notificationsService = require('../services/notifications.service');
const { ValidationError } = require('../utils/errors');

function parseId(value, name = 'id') {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) throw new ValidationError(`Invalid ${name}`);
  return n;
}

async function getProfile(req, res, next) {
  try {
    const user = await usersService.getProfile(req.params.username, req.userId || null);
    res.json(user);
  } catch (err) { next(err); }
}

async function updateProfile(req, res, next) {
  try {
    const { display_name, bio } = req.body;
    await usersService.updateProfile(req.userId, { display_name, bio });
    res.json({ message: 'Profile updated' });
  } catch (err) { next(err); }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const avatarUrl = `/uploads/images/${req.file.filename}`;
    await usersService.updateAvatar(req.userId, avatarUrl);
    res.json({ avatar_url: avatarUrl });
  } catch (err) { next(err); }
}

async function follow(req, res, next) {
  try {
    const followingId = parseId(req.params.id);
    const result = await usersService.follow(req.userId, followingId);
    notificationsService.create(followingId, req.userId, 'follow', 'user', req.userId).catch(() => {});
    res.json(result);
  } catch (err) { next(err); }
}

async function unfollow(req, res, next) {
  try {
    const result = await usersService.unfollow(req.userId, parseId(req.params.id));
    res.json(result);
  } catch (err) { next(err); }
}

async function getFollowers(req, res, next) {
  try {
    const { cursor, limit } = parseCursor(req);
    const users = await usersService.getFollowers(parseId(req.params.id), cursor, limit);
    res.json(buildCursorResponse(users, limit));
  } catch (err) { next(err); }
}

async function getFollowing(req, res, next) {
  try {
    const { cursor, limit } = parseCursor(req);
    const users = await usersService.getFollowing(parseId(req.params.id), cursor, limit);
    res.json(buildCursorResponse(users, limit));
  } catch (err) { next(err); }
}

async function search(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const users = await usersService.searchUsers(q);
    res.json(users);
  } catch (err) { next(err); }
}

async function updateTheme(req, res, next) {
  try {
    await usersService.updateTheme(req.userId, req.body.theme);
    res.json({ message: 'Theme updated' });
  } catch (err) { next(err); }
}

module.exports = { getProfile, updateProfile, uploadAvatar, follow, unfollow, getFollowers, getFollowing, search, updateTheme };
