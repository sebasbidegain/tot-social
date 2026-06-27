const router = require('express').Router();
const ctrl = require('../controllers/hashtags.controller');
const { optionalAuth } = require('../middleware/auth');

router.get('/trending', ctrl.getTrending);
router.get('/:tag', optionalAuth, ctrl.getByTag);

module.exports = router;
