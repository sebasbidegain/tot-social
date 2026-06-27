const friendsService = require('../services/friends.service');
const { parseCursor, buildCursorResponse } = require('../utils/pagination');
const { ValidationError } = require('../utils/errors');

function parseId(value, name = 'id') {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) throw new ValidationError(`Invalid ${name}`);
  return n;
}

async function sendRequest(req, res, next) {
  try {
    const result = await friendsService.sendRequest(req.userId, parseId(req.params.userId));
    res.status(201).json(result);
  } catch (err) { next(err); }
}

async function acceptRequest(req, res, next) {
  try {
    const result = await friendsService.acceptRequest(parseId(req.params.senderId), req.userId);
    res.json(result);
  } catch (err) { next(err); }
}

async function rejectRequest(req, res, next) {
  try {
    const result = await friendsService.rejectRequest(parseId(req.params.senderId), req.userId);
    res.json(result);
  } catch (err) { next(err); }
}

async function cancelRequest(req, res, next) {
  try {
    const result = await friendsService.cancelRequest(req.userId, parseId(req.params.receiverId));
    res.json(result);
  } catch (err) { next(err); }
}

async function unfriend(req, res, next) {
  try {
    const result = await friendsService.unfriend(req.userId, parseId(req.params.userId));
    res.json(result);
  } catch (err) { next(err); }
}

async function getPendingReceived(req, res, next) {
  try {
    const { cursor, limit } = parseCursor(req);
    const items = await friendsService.getPendingReceived(req.userId, cursor, limit);
    res.json(buildCursorResponse(items, limit));
  } catch (err) { next(err); }
}

async function getPendingSent(req, res, next) {
  try {
    const { cursor, limit } = parseCursor(req);
    const items = await friendsService.getPendingSent(req.userId, cursor, limit);
    res.json(buildCursorResponse(items, limit));
  } catch (err) { next(err); }
}

async function getFriends(req, res, next) {
  try {
    const { cursor, limit } = parseCursor(req);
    const userId = req.userId;
    const items = await friendsService.getFriends(userId, cursor, limit);
    res.json(buildCursorResponse(items, limit));
  } catch (err) { next(err); }
}

async function getFriendshipStatus(req, res, next) {
  try {
    const result = await friendsService.getFriendshipStatus(req.userId, parseId(req.params.userId));
    res.json(result);
  } catch (err) { next(err); }
}

async function getPendingCount(req, res, next) {
  try {
    const count = await friendsService.getPendingCount(req.userId);
    res.json({ count });
  } catch (err) { next(err); }
}

module.exports = {
  sendRequest, acceptRequest, rejectRequest, cancelRequest,
  unfriend, getPendingReceived, getPendingSent, getFriends,
  getFriendshipStatus, getPendingCount,
};
