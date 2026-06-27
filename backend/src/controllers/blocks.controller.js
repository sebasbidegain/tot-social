const blocksService = require('../services/blocks.service');
const { parseCursor, buildCursorResponse } = require('../utils/pagination');

async function blockUser(req, res, next) {
  try {
    await blocksService.blockUser(req.userId, parseInt(req.params.userId, 10));
    res.json({ message: 'User blocked' });
  } catch (err) { next(err); }
}

async function unblockUser(req, res, next) {
  try {
    await blocksService.unblockUser(req.userId, parseInt(req.params.userId, 10));
    res.json({ message: 'User unblocked' });
  } catch (err) { next(err); }
}

async function getBlockedUsers(req, res, next) {
  try {
    const { cursor, limit } = parseCursor(req);
    const items = await blocksService.getBlockedUsers(req.userId, cursor, limit);
    res.json(buildCursorResponse(items, limit));
  } catch (err) { next(err); }
}

module.exports = { blockUser, unblockUser, getBlockedUsers };
