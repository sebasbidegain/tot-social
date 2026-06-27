const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const hpp = require('hpp');
const path = require('path');
const fs = require('fs');
const env = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');

const app = express();

// 0. Trust proxy (nginx on VPS)
app.set('trust proxy', 1);

// 1. Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// 2. CORS
app.use(cors({
  origin: env.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 3. Request logging
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 4. Compression
app.use(compression());

// 5. Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// 6. HTTP parameter pollution
app.use(hpp());

// 7. Global rate limiter
app.use('/api', rateLimiter.global);

// 8. Static uploads with security headers
const uploadsDir = path.resolve(env.UPLOAD_DIR);
['images', 'videos', 'thumbnails'].forEach(dir => {
  fs.mkdirSync(path.join(uploadsDir, dir), { recursive: true });
});

app.use('/uploads', express.static(uploadsDir, {
  maxAge: '7d',
  etag: true,
  dotfiles: 'deny',
  index: false,
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Security-Policy', "default-src 'none'");
    res.set('Cache-Control', 'public, max-age=604800, immutable');
  },
}));

// 9. API routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/thoughts', require('./routes/thoughts.routes'));
app.use('/api/feed', require('./routes/feed.routes'));
app.use('/api/comments', require('./routes/comments.routes'));
app.use('/api/likes', require('./routes/likes.routes'));
app.use('/api/friends', require('./routes/friends.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/messages', require('./routes/messages.routes'));
app.use('/api/bookmarks', require('./routes/bookmarks.routes'));
app.use('/api/reposts', require('./routes/reposts.routes'));
app.use('/api/blocks', require('./routes/blocks.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/mutes', require('./routes/mutes.routes'));
app.use('/api/hashtags', require('./routes/hashtags.routes'));
app.use('/api/push', require('./routes/push.routes'));

// 10. Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 11. Serve frontend in production
if (env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist, { maxAge: '1d' }));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND' });
  });
}

// 12. Global error handler
app.use(errorHandler);

const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`ToT API listening on :${PORT} [${env.NODE_ENV}]`);
});

module.exports = app;
