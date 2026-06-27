const HASHTAG_RE = /#([a-zA-Z0-9_À-ɏ]+)/g;
const MENTION_RE = /@([a-zA-Z0-9_]+)/g;
const URL_RE = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

function extractHashtags(content) {
  const matches = content.match(HASHTAG_RE);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
}

function extractMentions(content) {
  const matches = content.match(MENTION_RE);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
}

function extractUrls(content) {
  const matches = content.match(URL_RE);
  if (!matches) return [];
  return [...new Set(matches)];
}

module.exports = { extractHashtags, extractMentions, extractUrls };
