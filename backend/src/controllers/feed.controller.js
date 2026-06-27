const feedService = require('../services/feed.service');
const { parseCursor, buildCursorResponse } = require('../utils/pagination');

async function getFeed(req, res, next) {
  try {
    const { cursor, limit } = parseCursor(req);
    const thoughts = await feedService.getFeed(req.userId, cursor, limit);
    res.json(buildCursorResponse(thoughts, limit));
  } catch (err) { next(err); }
}

async function getExplore(req, res, next) {
  try {
    const { cursor, limit } = parseCursor(req);
    const thoughts = await feedService.getExploreFeed(cursor, limit, req.userId || null);
    res.json(buildCursorResponse(thoughts, limit));
  } catch (err) { next(err); }
}

async function searchContent(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ data: [], pagination: { next_cursor: null, has_more: false } });
    const { cursor, limit } = parseCursor(req);
    const thoughts = await feedService.searchThoughts(q, cursor, limit, req.userId || null);
    res.json(buildCursorResponse(thoughts, limit));
  } catch (err) { next(err); }
}

module.exports = { getFeed, getExplore, searchContent };
