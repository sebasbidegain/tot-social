const { db } = require('../config/db');
const { NotFoundError, ForbiddenError, ValidationError } = require('../utils/errors');
const { parseCursor, buildCursorResponse } = require('../utils/pagination');
const notificationsService = require('../services/notifications.service');
const blocksService = require('../services/blocks.service');

async function getComments(req, res, next) {
  try {
    const thoughtId = parseInt(req.params.thoughtId, 10);
    if (!Number.isFinite(thoughtId) || thoughtId <= 0) throw new ValidationError('Invalid thought ID');
    const { cursor, limit } = parseCursor(req);

    const [rows] = await db.query(
      `SELECT c.id, c.content, c.parent_id, c.created_at,
              u.id AS author_id, u.username, u.display_name, u.avatar_url
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.thought_id = ? AND c.is_deleted = 0 AND c.id < ?
       ORDER BY c.id DESC
       LIMIT ?`,
      [thoughtId, cursor, limit]
    );

    res.json(buildCursorResponse(rows.map(r => ({
      id: r.id,
      content: r.content,
      parent_id: r.parent_id,
      created_at: r.created_at,
      author: { id: r.author_id, username: r.username, display_name: r.display_name, avatar_url: r.avatar_url || '' },
    })), limit));
  } catch (err) { next(err); }
}

async function createComment(req, res, next) {
  try {
    const thoughtId = parseInt(req.params.thoughtId, 10);
    if (!Number.isFinite(thoughtId) || thoughtId <= 0) throw new ValidationError('Invalid thought ID');
    const { content, parent_id } = req.body;

    const [thought] = await db.query('SELECT id, user_id FROM thoughts WHERE id = ? AND is_deleted = 0', [thoughtId]);
    if (thought.length === 0) throw new NotFoundError('Thought');

    const blocked = await blocksService.isBlockedEitherWay(req.userId, thought[0].user_id);
    if (blocked) throw new ForbiddenError('Cannot interact with this user');

    if (parent_id) {
      const n = parseInt(parent_id, 10);
      if (!Number.isFinite(n) || n <= 0) throw new ValidationError('Invalid parent_id');
      const [parent] = await db.query(
        'SELECT id FROM comments WHERE id = ? AND thought_id = ? AND is_deleted = 0',
        [n, thoughtId]
      );
      if (parent.length === 0) throw new ValidationError('Parent comment not found');
    }

    const [result] = await db.query(
      'INSERT INTO comments (thought_id, user_id, parent_id, content, created_at) VALUES (?, ?, ?, ?, NOW())',
      [thoughtId, req.userId, parent_id || null, content]
    );

    await db.query('UPDATE thoughts SET comment_count = comment_count + 1 WHERE id = ?', [thoughtId]);

    const [[thoughtOwner]] = await db.query('SELECT user_id FROM thoughts WHERE id = ?', [thoughtId]);
    if (thoughtOwner) notificationsService.create(thoughtOwner.user_id, req.userId, 'comment', 'thought', thoughtId).catch(() => {});

    res.status(201).json({ id: result.insertId });
  } catch (err) { next(err); }
}

async function deleteComment(req, res, next) {
  try {
    const commentId = parseInt(req.params.id, 10);

    const [rows] = await db.query(
      'SELECT user_id, thought_id FROM comments WHERE id = ? AND is_deleted = 0',
      [commentId]
    );
    if (rows.length === 0) throw new NotFoundError('Comment');
    if (rows[0].user_id !== req.userId) throw new ForbiddenError('You can only delete your own comments');

    await db.query('UPDATE comments SET is_deleted = 1 WHERE id = ?', [commentId]);
    await db.query('UPDATE thoughts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?', [rows[0].thought_id]);

    res.json({ message: 'Comment deleted' });
  } catch (err) { next(err); }
}

module.exports = { getComments, createComment, deleteComment };
