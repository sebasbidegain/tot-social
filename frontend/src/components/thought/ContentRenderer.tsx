import { Link } from 'react-router-dom';

const HASHTAG_RE = /#([a-zA-Z0-9_À-ɏ]+)/g;
const MENTION_RE = /@([a-zA-Z0-9_]+)/g;
const URL_RE = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;

function tokenize(content: string) {
  const combined = new RegExp(`(${HASHTAG_RE.source})|(${MENTION_RE.source})|(${URL_RE.source})`, 'gi');
  const tokens: { type: 'text' | 'hashtag' | 'mention' | 'url'; value: string; match?: string }[] = [];
  let lastIndex = 0;

  for (const m of content.matchAll(combined)) {
    if (m.index! > lastIndex) {
      tokens.push({ type: 'text', value: content.slice(lastIndex, m.index!) });
    }
    if (m[0].startsWith('#')) {
      tokens.push({ type: 'hashtag', value: m[0], match: m[0].slice(1) });
    } else if (m[0].startsWith('@')) {
      tokens.push({ type: 'mention', value: m[0], match: m[0].slice(1) });
    } else {
      tokens.push({ type: 'url', value: m[0] });
    }
    lastIndex = m.index! + m[0].length;
  }

  if (lastIndex < content.length) {
    tokens.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return tokens;
}

export default function ContentRenderer({ content }: { content: string }) {
  const tokens = tokenize(content);

  return (
    <>
      {tokens.map((t, i) => {
        switch (t.type) {
          case 'hashtag':
            return (
              <Link key={i} to={`/hashtag/${t.match}`} className="text-indigo-500 hover:underline" onClick={e => e.stopPropagation()}>
                {t.value}
              </Link>
            );
          case 'mention':
            return (
              <Link key={i} to={`/profile/${t.match}`} className="text-indigo-500 hover:underline" onClick={e => e.stopPropagation()}>
                {t.value}
              </Link>
            );
          case 'url':
            return (
              <a key={i} href={t.value} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline break-all" onClick={e => e.stopPropagation()}>
                {t.value.length > 50 ? t.value.slice(0, 47) + '...' : t.value}
              </a>
            );
          default:
            return <span key={i}>{t.value}</span>;
        }
      })}
    </>
  );
}
