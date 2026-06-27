const { db } = require('../config/db');
const notificationsService = require('../services/notifications.service');
const blocksService = require('../services/blocks.service');
const { ForbiddenError, ValidationError } = require('../utils/errors');

function parseId(value, name = 'id') {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) throw new ValidationError(`Invalid ${name}`);
  return n;
}

async function toggleLike(req, res, next) {
  try {
    const thoughtId = parseId(req.params.thoughtId, 'thoughtId');
    const userId = req.userId;

    const [[thought]] = await db.query('SELECT user_id FROM thoughts WHERE id = ? AND is_deleted = 0', [thoughtId]);
    if (!thought) throw new ValidationError('Thought not found');

    const blocked = await blocksService.isBlockedEitherWay(userId, thought.user_id);
    if (blocked) throw new ForbiddenError('Cannot interact with this user');

    const [delResult] = await db.query(
      'DELETE FROM likes WHERE thought_id = ? AND user_id = ?',
      [thoughtId, userId]
    );

    if (delResult.affectedRows > 0) {
      await db.query('UPDATE thoughts SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?', [thoughtId]);
      return res.json({ liked: false });
    }

    try {
      await db.query('INSERT INTO likes (thought_id, user_id, created_at) VALUES (?, ?, NOW())', [thoughtId, userId]);
      await db.query('UPDATE thoughts SET like_count = like_count + 1 WHERE id = ?', [thoughtId]);
      notificationsService.create(thought.user_id, userId, 'like', 'thought', thoughtId).catch(() => {});
      res.json({ liked: true });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.json({ liked: true });
      throw err;
    }
  } catch (err) { next(err); }
}

module.exports = { toggleLike };
