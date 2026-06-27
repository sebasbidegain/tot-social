const router = require('express').Router();
const ctrl = require('../controllers/messages.controller');
const { auth } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');

router.get('/conversations', auth, ctrl.getConversations);
router.get('/conversations/:conversationId', auth, ctrl.getMessages);
router.get('/unread-count', auth, ctrl.getUnreadCount);
router.post('/send/:userId', auth, rateLimiter.messaging, ctrl.sendMessage);

module.exports = router;
