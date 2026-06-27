function parseCursor(req) {
  const cursor = parseInt(req.query.cursor, 10);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

  return {
    cursor: Number.isFinite(cursor) ? cursor : Number.MAX_SAFE_INTEGER,
    limit,
  };
}

function buildCursorResponse(items, limit) {
  const hasMore = items.length === limit;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return {
    data: items,
    pagination: { next_cursor: nextCursor, has_more: hasMore },
  };
}

module.exports = { parseCursor, buildCursorResponse };
