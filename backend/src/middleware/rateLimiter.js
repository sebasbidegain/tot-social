const rateLimit = require('express-rate-limit');

const rateLimiter = {
  global: rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later', code: 'RATE_LIMITED' },
  }),

  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth attempts, try again later', code: 'AUTH_RATE_LIMITED' },
  }),

  upload: rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Upload limit reached, try again later', code: 'UPLOAD_RATE_LIMITED' },
  }),

  messaging: rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Sending too fast, slow down', code: 'MESSAGE_RATE_LIMITED' },
  }),

  reporting: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many reports, try again later', code: 'REPORT_RATE_LIMITED' },
  }),
};

module.exports = { rateLimiter };
