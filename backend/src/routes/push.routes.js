const router = require('express').Router();
const ctrl = require('../controllers/push.controller');
const { auth } = require('../middleware/auth');

router.post('/subscribe', auth, ctrl.subscribe);
router.post('/unsubscribe', auth, ctrl.unsubscribe);
router.get('/vapid-key', ctrl.getVapidKey);

module.exports = router;
