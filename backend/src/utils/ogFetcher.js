const dns = require('dns/promises');
const net = require('net');

const OG_TIMEOUT = 5000;

const BLOCKED_RANGES = [
  /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
  /^0\./, /^169\.254\./, /^::1$/, /^fc00/i, /^fe80/i, /^fd/i,
];

function isPrivateIP(ip) {
  return BLOCKED_RANGES.some(r => r.test(ip));
}

async function isSafeUrl(urlStr) {
  let parsed;
  try { parsed = new URL(urlStr); } catch { return false; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  if (['localhost', '0.0.0.0', '[::1]'].includes(parsed.hostname)) return false;
  if (net.isIP(parsed.hostname)) return !isPrivateIP(parsed.hostname);
  try {
    const { address } = await dns.lookup(parsed.hostname);
    return !isPrivateIP(address);
  } catch { return false; }
}

async function fetchOgData(url) {
  try {
    if (!await isSafeUrl(url)) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OG_TIMEOUT);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ToT-Bot/1.0 (link preview)' },
      redirect: 'manual',
    });
    clearTimeout(timer);

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get('location');
      if (!location || !await isSafeUrl(location)) return null;
      return fetchOgData(location);
    }

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;

    const html = await res.text();
    const head = html.substring(0, 20000);

    const title = extractMeta(head, 'og:title') || extractTag(head, 'title');
    const description = extractMeta(head, 'og:description') || extractMeta(head, 'description');
    const image_url = extractMeta(head, 'og:image');
    const site_name = extractMeta(head, 'og:site_name');

    if (!title && !description) return null;

    return { url, title, description, image_url, site_name };
  } catch {
    return null;
  }
}

function extractMeta(html, property) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
  const match = html.match(re);
  if (match) return decodeEntities(match[1]);

  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i');
  const match2 = html.match(re2);
  if (match2) return decodeEntities(match2[1]);

  return null;
}

function extractTag(html, tag) {
  const re = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i');
  const match = html.match(re);
  return match ? decodeEntities(match[1].trim()) : null;
}

function decodeEntities(str) {
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

module.exports = { fetchOgData };
