const router = require('express').Router();
const ctrl = require('../controllers/reposts.controller');
const { auth } = require('../middleware/auth');

router.post('/toggle/:thoughtId', auth, ctrl.toggle);

module.exports = router;
