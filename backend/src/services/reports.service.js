const { db } = require('../config/db');
const { ValidationError, ConflictError } = require('../utils/errors');

const VALID_TYPES = ['thought', 'comment', 'user'];

async function createReport(reporterId, reportedType, reportedId, reason) {
  if (!VALID_TYPES.includes(reportedType)) {
    throw new ValidationError('Invalid report type');
  }
  if (!reason || reason.trim().length < 5) {
    throw new ValidationError('Reason must be at least 5 characters');
  }
  if (!Number.isFinite(reportedId) || reportedId <= 0) {
    throw new ValidationError('Invalid reported ID');
  }

  if (reportedType === 'user' && reportedId === reporterId) {
    throw new ValidationError('Cannot report yourself');
  }

  const [existing] = await db.query(
    'SELECT id FROM reports WHERE reporter_id = ? AND reported_type = ? AND reported_id = ?',
    [reporterId, reportedType, reportedId]
  );
  if (existing.length > 0) throw new ConflictError('You have already reported this');

  await db.query(
    'INSERT INTO reports (reporter_id, reported_type, reported_id, reason) VALUES (?, ?, ?, ?)',
    [reporterId, reportedType, reportedId, reason.trim()]
  );
}

module.exports = { createReport };
