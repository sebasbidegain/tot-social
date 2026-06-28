const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { rateLimiter } = require('../middleware/rateLimiter');
const passwordResetService = require('../services/passwordReset.service');

router.post('/register', rateLimiter.auth, validate('register'), ctrl.register);
router.post('/login', rateLimiter.auth, validate('login'), ctrl.login);
router.post('/refresh', rateLimiter.auth, ctrl.refreshToken);
router.post('/logout', auth, ctrl.logout);
router.post('/logout-all', auth, ctrl.logoutAll);
router.get('/me', auth, ctrl.getMe);
router.put('/change-password', auth, validate('changePassword'), ctrl.changePassword);

router.post('/forgot-password', rateLimiter.auth, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    await passwordResetService.requestReset(email);
    res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
  } catch (err) { next(err); }
});

router.post('/reset-password', rateLimiter.auth, async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be 8-128 characters' });
    if (!/[a-z]/.test(password)) return res.status(400).json({ error: 'Password must contain a lowercase letter' });
    if (!/[A-Z]/.test(password)) return res.status(400).json({ error: 'Password must contain an uppercase letter' });
    if (!/\d/.test(password)) return res.status(400).json({ error: 'Password must contain a digit' });
    await passwordResetService.resetPassword(token, password);
    res.json({ message: 'Password has been reset. Please log in.' });
  } catch (err) { next(err); }
});

router.post('/send-verification', auth, rateLimiter.auth, async (req, res, next) => {
  try {
    await passwordResetService.sendVerificationEmail(req.userId);
    res.json({ message: 'Verification email sent.' });
  } catch (err) { next(err); }
});

router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    await passwordResetService.verifyEmail(token);
    res.json({ message: 'Email verified successfully.' });
  } catch (err) { next(err); }
});

module.exports = router;
