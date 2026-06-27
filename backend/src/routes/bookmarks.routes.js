const router = require('express').Router();
const ctrl = require('../controllers/bookmarks.controller');
const { auth } = require('../middleware/auth');

router.post('/toggle/:thoughtId', auth, ctrl.toggle);
router.get('/', auth, ctrl.getBookmarks);

module.exports = router;
