const repostsService = require('../services/reposts.service');
const notificationsService = require('../services/notifications.service');
const { db } = require('../config/db');
const { ValidationError } = require('../utils/errors');

async function toggle(req, res, next) {
  try {
    const thoughtId = parseInt(req.params.thoughtId, 10);
    if (!Number.isFinite(thoughtId) || thoughtId <= 0) throw new ValidationError('Invalid thought ID');
    const result = await repostsService.toggle(req.userId, thoughtId);
    if (result.reposted) {
      const [[thought]] = await db.query('SELECT user_id FROM thoughts WHERE id = ?', [thoughtId]);
      if (thought) notificationsService.create(thought.user_id, req.userId, 'repost', 'thought', thoughtId).catch(() => {});
    }
    res.json(result);
  } catch (err) { next(err); }
}

module.exports = { toggle };
