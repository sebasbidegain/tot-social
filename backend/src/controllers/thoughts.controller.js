const thoughtsService = require('../services/thoughts.service');
const uploadService = require('../services/upload.service');
const notificationsService = require('../services/notifications.service');
const { parseCursor, buildCursorResponse } = require('../utils/pagination');
const { ValidationError } = require('../utils/errors');

function parseId(value, name = 'id') {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) throw new ValidationError(`Invalid ${name}`);
  return n;
}

async function create(req, res, next) {
  try {
    const parentThoughtId = req.body.parent_thought_id ? parseId(req.body.parent_thought_id, 'parent_thought_id') : null;
    const quotedThoughtId = req.body.quoted_thought_id ? parseId(req.body.quoted_thought_id, 'quoted_thought_id') : null;

    const result = await thoughtsService.create(req.userId, req.body.content, [], { parentThoughtId, quotedThoughtId });

    if (quotedThoughtId) {
      const { db } = require('../config/db');
      const [[quoted]] = await db.query('SELECT user_id FROM thoughts WHERE id = ?', [quotedThoughtId]);
      if (quoted && quoted.user_id !== req.userId) {
        notificationsService.create(quoted.user_id, req.userId, 'quote', 'thought', result.id).catch(() => {});
      }
    }

    if (parentThoughtId) {
      const { db } = require('../config/db');
      const [[parent]] = await db.query('SELECT user_id FROM thoughts WHERE id = ?', [parentThoughtId]);
      if (parent && parent.user_id !== req.userId) {
        notificationsService.create(parent.user_id, req.userId, 'comment', 'thought', parentThoughtId).catch(() => {});
      }
    }

    res.status(201).json(result);
  } catch (err) { next(err); }
}

async function createWithMedia(req, res, next) {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    const processed = await uploadService.processUploadedFiles(files);
    const parentThoughtId = req.body.parent_thought_id ? parseId(req.body.parent_thought_id, 'parent_thought_id') : null;
    const quotedThoughtId = req.body.quoted_thought_id ? parseId(req.body.quoted_thought_id, 'quoted_thought_id') : null;
    const result = await thoughtsService.create(req.userId, req.body.content, processed, { parentThoughtId, quotedThoughtId });
    res.status(201).json(result);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const thought = await thoughtsService.getById(parseId(req.params.id), req.userId || null);
    res.json(thought);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await thoughtsService.deleteThought(parseId(req.params.id), req.userId);
    res.json({ message: 'Thought deleted' });
  } catch (err) { next(err); }
}

async function edit(req, res, next) {
  try {
    const result = await thoughtsService.editThought(parseId(req.params.id), req.userId, req.body.content);
    res.json(result);
  } catch (err) { next(err); }
}

async function getEditHistory(req, res, next) {
  try {
    const history = await thoughtsService.getEditHistory(parseId(req.params.id));
    res.json(history);
  } catch (err) { next(err); }
}

async function getUserThoughts(req, res, next) {
  try {
    const { cursor, limit } = parseCursor(req);
    const userId = parseId(req.params.userId);
    const thoughts = await thoughtsService.getUserThoughts(userId, cursor, limit, req.userId || null);
    res.json(buildCursorResponse(thoughts, limit));
  } catch (err) { next(err); }
}

async function getReplies(req, res, next) {
  try {
    const { cursor, limit } = parseCursor(req);
    const replies = await thoughtsService.getReplies(parseId(req.params.id), cursor, limit, req.userId || null);
    res.json(buildCursorResponse(replies, limit));
  } catch (err) { next(err); }
}

async function getThread(req, res, next) {
  try {
    const chain = await thoughtsService.getThread(parseId(req.params.id), req.userId || null);
    res.json(chain);
  } catch (err) { next(err); }
}

async function getLikedBy(req, res, next) {
  try {
    const { cursor, limit } = parseCursor(req);
    const users = await thoughtsService.getLikedBy(parseId(req.params.id), cursor, limit);
    res.json(buildCursorResponse(users, limit));
  } catch (err) { next(err); }
}

async function getRepostedBy(req, res, next) {
  try {
    const { cursor, limit } = parseCursor(req);
    const users = await thoughtsService.getRepostedBy(parseId(req.params.id), cursor, limit);
    res.json(buildCursorResponse(users, limit));
  } catch (err) { next(err); }
}

async function getTrending(req, res, next) {
  try {
    const { cursor, limit } = parseCursor(req);
    const thoughts = await thoughtsService.getTrending(cursor, limit, req.userId || null);
    res.json(buildCursorResponse(thoughts, limit));
  } catch (err) { next(err); }
}

module.exports = {
  create, createWithMedia, getById, remove, edit, getEditHistory,
  getUserThoughts, getReplies, getThread,
  getLikedBy, getRepostedBy, getTrending,
};
