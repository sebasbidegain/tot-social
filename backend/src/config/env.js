require('dotenv').config();

const env = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()).filter(Boolean),

  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 3306,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASS,
  DB_NAME: process.env.DB_NAME,

  JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY,
  JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY,
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_DAYS: parseInt(process.env.JWT_REFRESH_DAYS, 10) || 30,

  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_IMAGE_SIZE: (parseInt(process.env.MAX_IMAGE_SIZE_MB, 10) || 10) * 1024 * 1024,
  MAX_VIDEO_SIZE: (parseInt(process.env.MAX_VIDEO_SIZE_MB, 10) || 100) * 1024 * 1024,

  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || process.env.SMTP_USER || '',
};

const required = ['DB_USER', 'DB_NAME', 'JWT_PRIVATE_KEY', 'JWT_PUBLIC_KEY'];
for (const key of required) {
  if (env[key] == null || env[key] === '') {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}
if (env.DB_PASS == null) env.DB_PASS = '';

module.exports = env;
