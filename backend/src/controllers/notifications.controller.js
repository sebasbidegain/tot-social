const notificationsService = require('../services/notifications.service');
const { parseCursor, buildCursorResponse } = require('../utils/pagination');

async function getNotifications(req, res, next) {
  try {
    const { cursor, limit } = parseCursor(req);
    const items = await notificationsService.getNotifications(req.userId, cursor, limit);
    res.json(buildCursorResponse(items, limit));
  } catch (err) { next(err); }
}

async function getUnreadCount(req, res, next) {
  try {
    const count = await notificationsService.getUnreadCount(req.userId);
    res.json({ count });
  } catch (err) { next(err); }
}

async function markAsRead(req, res, next) {
  try {
    await notificationsService.markAsRead(req.userId, parseInt(req.params.id, 10));
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
}

async function markAllRead(req, res, next) {
  try {
    await notificationsService.markAllRead(req.userId);
    res.json({ message: 'All marked as read' });
  } catch (err) { next(err); }
}

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllRead };
