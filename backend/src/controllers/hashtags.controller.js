const hashtagsService = require('../services/hashtags.service');
const { parseCursor, buildCursorResponse } = require('../utils/pagination');

async function getTrending(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const tags = await hashtagsService.getTrending(limit);
    res.json(tags);
  } catch (err) { next(err); }
}

async function getByTag(req, res, next) {
  try {
    const { cursor, limit } = parseCursor(req);
    const tag = req.params.tag;
    const thoughts = await hashtagsService.getThoughtsByHashtag(tag, cursor, limit, req.userId || null);
    res.json(buildCursorResponse(thoughts, limit));
  } catch (err) { next(err); }
}

module.exports = { getTrending, getByTag };
