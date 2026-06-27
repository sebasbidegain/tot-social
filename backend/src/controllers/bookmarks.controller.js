const bookmarksService = require('../services/bookmarks.service');
const { parseCursor, buildCursorResponse } = require('../utils/pagination');

async function toggle(req, res, next) {
  try {
    const thoughtId = parseInt(req.params.thoughtId, 10);
    const result = await bookmarksService.toggle(req.userId, thoughtId);
    res.json(result);
  } catch (err) { next(err); }
}

async function getBookmarks(req, res, next) {
  try {
    const { cursor, limit } = parseCursor(req);
    const items = await bookmarksService.getBookmarks(req.userId, cursor, limit);
    res.json(buildCursorResponse(items, limit));
  } catch (err) { next(err); }
}

module.exports = { toggle, getBookmarks };
