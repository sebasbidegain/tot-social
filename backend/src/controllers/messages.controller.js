const messagesService = require('../services/messages.service');
const { parseCursor, buildCursorResponse } = require('../utils/pagination');
const { ValidationError } = require('../utils/errors');

async function sendMessage(req, res, next) {
  try {
    const receiverId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(receiverId) || receiverId <= 0) throw new ValidationError('Invalid user ID');
    const { content } = req.body;
    if (!content || !content.trim()) throw new ValidationError('Message content is required');
    const trimmed = content.trim();
    if (trimmed.length > 5000) throw new ValidationError('Message must be under 5000 characters');
    const DOMPurify = require('isomorphic-dompurify');
    const clean = DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [] });
    if (!clean) throw new ValidationError('Message content is required');
    const message = await messagesService.sendMessage(req.userId, receiverId, clean);
    res.status(201).json(message);
  } catch (err) { next(err); }
}

async function getConversations(req, res, next) {
  try {
    const { cursor, limit } = parseCursor(req);
    const items = await messagesService.getConversations(req.userId, cursor, limit);
    res.json(buildCursorResponse(items, limit));
  } catch (err) { next(err); }
}

async function getMessages(req, res, next) {
  try {
    const conversationId = parseInt(req.params.conversationId, 10);
    const { cursor, limit } = parseCursor(req);
    const items = await messagesService.getMessages(req.userId, conversationId, cursor, limit);
    res.json(buildCursorResponse(items, limit));
  } catch (err) { next(err); }
}

async function getUnreadCount(req, res, next) {
  try {
    const count = await messagesService.getTotalUnreadCount(req.userId);
    res.json({ count });
  } catch (err) { next(err); }
}

module.exports = { sendMessage, getConversations, getMessages, getUnreadCount };
