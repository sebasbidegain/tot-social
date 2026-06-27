const router = require('express').Router();
const ctrl = require('../controllers/friends.controller');
const { auth } = require('../middleware/auth');

router.post('/request/:userId', auth, ctrl.sendRequest);
router.post('/accept/:senderId', auth, ctrl.acceptRequest);
router.post('/reject/:senderId', auth, ctrl.rejectRequest);
router.delete('/request/:receiverId', auth, ctrl.cancelRequest);
router.delete('/:userId', auth, ctrl.unfriend);

router.get('/pending/received', auth, ctrl.getPendingReceived);
router.get('/pending/sent', auth, ctrl.getPendingSent);
router.get('/pending/count', auth, ctrl.getPendingCount);
router.get('/list/:userId?', auth, ctrl.getFriends);
router.get('/status/:userId', auth, ctrl.getFriendshipStatus);

module.exports = router;
