const router = require('express').Router();
const ctrl = require('../controllers/users.controller');
const { auth, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadAvatar } = require('../config/multer');

router.get('/search', optionalAuth, ctrl.search);
router.get('/:username', optionalAuth, ctrl.getProfile);
router.put('/profile', auth, validate('updateProfile'), ctrl.updateProfile);
router.put('/theme', auth, validate('updateTheme'), ctrl.updateTheme);
router.put('/avatar', auth, uploadAvatar.single('avatar'), ctrl.uploadAvatar);
router.post('/:id/follow', auth, ctrl.follow);
router.delete('/:id/follow', auth, ctrl.unfollow);
router.get('/:id/followers', optionalAuth, ctrl.getFollowers);
router.get('/:id/following', optionalAuth, ctrl.getFollowing);

module.exports = router;
