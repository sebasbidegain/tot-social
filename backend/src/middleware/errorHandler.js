const multer = require('multer');

function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'File exceeds maximum allowed size',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
      LIMIT_FILE_COUNT: 'Too many files',
    };
    return res.status(400).json({
      error: messages[err.code] || err.message,
      code: err.code,
    });
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code || 'APP_ERROR',
    });
  }

  console.error('[UNHANDLED]', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

module.exports = { errorHandler };
