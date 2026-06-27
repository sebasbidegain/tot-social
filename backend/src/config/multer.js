const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const env = require('./env');

const UPLOAD_ROOT = path.resolve(env.UPLOAD_DIR);

function generateFilename(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  return `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`;
}

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(UPLOAD_ROOT, 'images');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, generateFilename(file)),
});

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(UPLOAD_ROOT, 'videos');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, generateFilename(file)),
});

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_MIMES = ['video/mp4', 'video/webm'];

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_MIMES.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: env.MAX_IMAGE_SIZE, files: 4 },
});

const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: (_req, file, cb) => {
    if (!VIDEO_MIMES.includes(file.mimetype)) {
      return cb(new Error('Only MP4 and WebM videos are allowed'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: env.MAX_VIDEO_SIZE, files: 1 },
});

const uploadAvatar = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(UPLOAD_ROOT, 'images');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `avatar-${req.userId}-${Date.now()}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_MIMES.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});

module.exports = { uploadImage, uploadVideo, uploadAvatar, UPLOAD_ROOT, IMAGE_MIMES, VIDEO_MIMES };
