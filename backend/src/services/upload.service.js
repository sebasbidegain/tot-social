const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const { IMAGE_MIMES, VIDEO_MIMES } = require('../config/multer');
const { ValidationError } = require('../utils/errors');

async function validateAndProcessImage(filePath) {
  const buffer = await fs.readFile(filePath);

  const { fileTypeFromBuffer } = await import('file-type');
  const type = await fileTypeFromBuffer(buffer);

  if (!type || !IMAGE_MIMES.includes(type.mime)) {
    await fs.unlink(filePath);
    throw new ValidationError('File content does not match an allowed image type');
  }

  const processed = await sharp(buffer)
    .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const newPath = filePath.replace(/\.\w+$/, '.jpg');
  await fs.writeFile(newPath, processed);

  if (newPath !== filePath) {
    await fs.unlink(filePath).catch(() => {});
  }

  return path.basename(newPath);
}

async function validateVideo(filePath) {
  const fh = await fs.open(filePath, 'r');
  const buffer = Buffer.alloc(4100);
  await fh.read(buffer, 0, 4100, 0);
  await fh.close();

  const { fileTypeFromBuffer } = await import('file-type');
  const type = await fileTypeFromBuffer(buffer);

  if (!type || !VIDEO_MIMES.includes(type.mime)) {
    await fs.unlink(filePath);
    throw new ValidationError('File content does not match an allowed video type');
  }

  return path.basename(filePath);
}

async function processUploadedFiles(files) {
  const processed = [];

  for (const file of files) {
    if (file.mimetype.startsWith('image/')) {
      const filename = await validateAndProcessImage(file.path);
      processed.push({ ...file, filename, mimetype: 'image/jpeg' });
    } else if (file.mimetype.startsWith('video/')) {
      const filename = await validateVideo(file.path);
      processed.push({ ...file, filename });
    }
  }

  return processed;
}

module.exports = { validateAndProcessImage, validateVideo, processUploadedFiles };
