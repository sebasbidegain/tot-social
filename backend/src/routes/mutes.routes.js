const router = require('express').Router();
const ctrl = require('../controllers/mutes.controller');
const { auth } = require('../middleware/auth');

router.post('/:userId', auth, ctrl.mute);
router.delete('/:userId', auth, ctrl.unmute);
router.get('/', auth, ctrl.getMuted);

module.exports = router;
