const router = require('express').Router();
const ctrl = require('../controllers/likes.controller');
const { auth } = require('../middleware/auth');

router.post('/thoughts/:thoughtId/toggle', auth, ctrl.toggleLike);

module.exports = router;
