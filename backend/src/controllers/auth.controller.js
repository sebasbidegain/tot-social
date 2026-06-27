const authService = require('../services/auth.service');
const tokenService = require('../services/token.service');
const usersService = require('../services/users.service');

async function register(req, res, next) {
  try {
    const { username, email, password, display_name } = req.body;
    const result = await authService.register({ username, email, password, display_name });
    res.status(201).json(result);
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) { next(err); }
}

async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
    const tokens = await tokenService.refresh(refreshToken);
    res.json(tokens);
  } catch (err) { next(err); }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await tokenService.revokeToken(refreshToken);
    res.json({ message: 'Logged out' });
  } catch (err) { next(err); }
}

async function logoutAll(req, res, next) {
  try {
    await tokenService.revokeAllForUser(req.userId);
    res.json({ message: 'All sessions revoked' });
  } catch (err) { next(err); }
}

async function getMe(req, res, next) {
  try {
    const user = await usersService.getMe(req.userId);
    res.json({ user });
  } catch (err) { next(err); }
}

async function changePassword(req, res, next) {
  try {
    await authService.changePassword(req.userId, req.body.current_password, req.body.new_password);
    res.json({ message: 'Password changed. All sessions revoked.' });
  } catch (err) { next(err); }
}

module.exports = { register, login, refreshToken, logout, logoutAll, getMe, changePassword };
