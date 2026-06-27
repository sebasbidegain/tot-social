const router = require('express').Router();
const ctrl = require('../controllers/blocks.controller');
const { auth } = require('../middleware/auth');

router.post('/:userId', auth, ctrl.blockUser);
router.delete('/:userId', auth, ctrl.unblockUser);
router.get('/', auth, ctrl.getBlockedUsers);

module.exports = router;
