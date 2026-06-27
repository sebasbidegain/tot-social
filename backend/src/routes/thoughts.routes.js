const router = require('express').Router();
const ctrl = require('../controllers/thoughts.controller');
const { auth, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { rateLimiter } = require('../middleware/rateLimiter');
const { uploadImage, uploadVideo } = require('../config/multer');

router.post('/', auth, validate('createThought'), ctrl.create);
router.post('/with-images', auth, rateLimiter.upload, uploadImage.array('images', 4), validate('createThought'), ctrl.createWithMedia);
router.post('/with-video', auth, rateLimiter.upload, uploadVideo.single('video'), validate('createThought'), ctrl.createWithMedia);
router.get('/trending', optionalAuth, ctrl.getTrending);
router.get('/:id', optionalAuth, ctrl.getById);
router.delete('/:id', auth, ctrl.remove);
router.put('/:id', auth, validate('createThought'), ctrl.edit);
router.get('/:id/history', optionalAuth, ctrl.getEditHistory);
router.get('/:id/replies', optionalAuth, ctrl.getReplies);
router.get('/:id/thread', optionalAuth, ctrl.getThread);
router.get('/:id/liked-by', optionalAuth, ctrl.getLikedBy);
router.get('/:id/reposted-by', optionalAuth, ctrl.getRepostedBy);
router.get('/user/:userId', optionalAuth, ctrl.getUserThoughts);

module.exports = router;
