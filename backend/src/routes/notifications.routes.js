const router = require('express').Router();
const ctrl = require('../controllers/notifications.controller');
const { auth } = require('../middleware/auth');

router.get('/', auth, ctrl.getNotifications);
router.get('/unread-count', auth, ctrl.getUnreadCount);
router.post('/:id/read', auth, ctrl.markAsRead);
router.post('/read-all', auth, ctrl.markAllRead);

module.exports = router;
