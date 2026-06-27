const { db } = require('../config/db');
const { fetchOgData } = require('../utils/ogFetcher');

async function processLinks(thoughtId, urls) {
  if (!urls.length) return;

  const url = urls[0];
  const og = await fetchOgData(url);
  if (!og) return;

  await db.query(
    `INSERT INTO link_previews (thought_id, url, title, description, image_url, site_name)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [thoughtId, og.url, og.title, og.description, og.image_url, og.site_name]
  );
}

async function getForThoughts(thoughtIds) {
  if (!thoughtIds.length) return {};
  const [rows] = await db.query(
    'SELECT thought_id, url, title, description, image_url, site_name FROM link_previews WHERE thought_id IN (?)',
    [thoughtIds]
  );
  const map = {};
  for (const r of rows) {
    if (!map[r.thought_id]) {
      map[r.thought_id] = { url: r.url, title: r.title, description: r.description, image_url: r.image_url, site_name: r.site_name };
    }
  }
  return map;
}

module.exports = { processLinks, getForThoughts };
