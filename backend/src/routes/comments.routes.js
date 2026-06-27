const router = require('express').Router();
const ctrl = require('../controllers/comments.controller');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.get('/thoughts/:thoughtId', ctrl.getComments);
router.post('/thoughts/:thoughtId', auth, validate('createComment'), ctrl.createComment);
router.delete('/:id', auth, ctrl.deleteComment);

module.exports = router;
