const reportsService = require('../services/reports.service');

async function createReport(req, res, next) {
  try {
    const { type, id, reason } = req.body;
    await reportsService.createReport(req.userId, type, parseInt(id, 10), reason);
    res.status(201).json({ message: 'Report submitted' });
  } catch (err) { next(err); }
}

module.exports = { createReport };
