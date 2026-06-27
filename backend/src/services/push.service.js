const webpush = require('web-push');
const { db } = require('../config/db');

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_MAILTO || 'mailto:no-reply@tot-social.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

async function subscribe(userId, subscription) {
  const { endpoint, keys } = subscription;
  try {
    await db.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE user_id = ?, p256dh = ?, auth = ?`,
      [userId, endpoint, keys.p256dh, keys.auth, userId, keys.p256dh, keys.auth]
    );
  } catch (err) {
    if (err.code !== 'ER_DUP_ENTRY') throw err;
  }
}

async function unsubscribe(userId, endpoint) {
  await db.query('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?', [userId, endpoint]);
}

async function sendToUser(userId, payload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const [subs] = await db.query(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
    [userId]
  );

  const body = JSON.stringify(payload);
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body
      );
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db.query('DELETE FROM push_subscriptions WHERE endpoint = ?', [sub.endpoint]);
      }
    }
  }
}

function getVapidPublicKey() {
  return VAPID_PUBLIC || null;
}

module.exports = { subscribe, unsubscribe, sendToUser, getVapidPublicKey };
