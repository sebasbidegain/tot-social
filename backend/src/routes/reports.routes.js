const router = require('express').Router();
const ctrl = require('../controllers/reports.controller');
const { auth } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');

router.post('/', auth, rateLimiter.reporting, validate('createReport'), ctrl.createReport);

module.exports = router;
