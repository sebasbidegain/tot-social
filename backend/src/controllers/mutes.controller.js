const mutesService = require('../services/mutes.service');
const { parseCursor, buildCursorResponse } = require('../utils/pagination');
const { ValidationError } = require('../utils/errors');

function parseId(value, name = 'id') {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) throw new ValidationError(`Invalid ${name}`);
  return n;
}

async function mute(req, res, next) {
  try {
    await mutesService.muteUser(req.userId, parseId(req.params.userId));
    res.status(201).json({ muted: true });
  } catch (err) { next(err); }
}

async function unmute(req, res, next) {
  try {
    await mutesService.unmuteUser(req.userId, parseId(req.params.userId));
    res.json({ muted: false });
  } catch (err) { next(err); }
}

async function getMuted(req, res, next) {
  try {
    const { cursor, limit } = parseCursor(req);
    const items = await mutesService.getMutedUsers(req.userId, cursor, limit);
    res.json(buildCursorResponse(items, limit));
  } catch (err) { next(err); }
}

module.exports = { mute, unmute, getMuted };
