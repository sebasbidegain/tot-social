const router = require('express').Router();
const ctrl = require('../controllers/feed.controller');
const { auth, optionalAuth } = require('../middleware/auth');

router.get('/', auth, ctrl.getFeed);
router.get('/explore', optionalAuth, ctrl.getExplore);
router.get('/search', optionalAuth, ctrl.searchContent);

module.exports = router;
