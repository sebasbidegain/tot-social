const pushService = require('../services/push.service');

async function subscribe(req, res, next) {
  try {
    await pushService.subscribe(req.userId, req.body);
    res.status(201).json({ subscribed: true });
  } catch (err) { next(err); }
}

async function unsubscribe(req, res, next) {
  try {
    await pushService.unsubscribe(req.userId, req.body.endpoint);
    res.json({ unsubscribed: true });
  } catch (err) { next(err); }
}

async function getVapidKey(req, res) {
  const key = pushService.getVapidPublicKey();
  res.json({ publicKey: key });
}

module.exports = { subscribe, unsubscribe, getVapidKey };
