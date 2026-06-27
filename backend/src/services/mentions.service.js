const { db } = require('../config/db');
const notificationsService = require('./notifications.service');

async function processMentions(conn, thoughtId, authorId, mentionedUsernames) {
  if (!mentionedUsernames.length) return;

  const placeholders = mentionedUsernames.map(() => '?').join(',');
  const [users] = await conn.query(
    `SELECT id, username FROM users WHERE LOWER(username) IN (${placeholders}) AND is_active = 1`,
    mentionedUsernames
  );

  for (const user of users) {
    if (user.id === authorId) continue;
    try {
      await conn.query(
        'INSERT INTO thought_mentions (thought_id, mentioned_user_id) VALUES (?, ?)',
        [thoughtId, user.id]
      );
      notificationsService.create(user.id, authorId, 'mention', 'thought', thoughtId).catch(() => {});
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
    }
  }
}

async function removeMentions(conn, thoughtId) {
  await conn.query('DELETE FROM thought_mentions WHERE thought_id = ?', [thoughtId]);
}

module.exports = { processMentions, removeMentions };
