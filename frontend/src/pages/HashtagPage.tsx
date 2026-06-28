import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getThoughtsByHashtag } from '../api/hashtags';
import ThoughtCard from '../components/thought/ThoughtCard';
import type { Thought } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  const { user } = useAuth();
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadThoughts = useCallback(async (c?: number) => {
    if (!tag) return;
    setLoading(true);
    try {
      const res = await getThoughtsByHashtag(tag, c);
      if (c !== undefined) {
        setThoughts(prev => [...prev, ...res.data]);
      } else {
        setThoughts(res.data);
      }
      setCursor(res.pagination.next_cursor);
      setHasMore(res.pagination.has_more);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [tag]);

  useEffect(() => {
    setThoughts([]);
    setCursor(null);
    setHasMore(true);
    loadThoughts();
  }, [tag, loadThoughts]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">#{tag}</h1>
      <div className="space-y-4">
        {thoughts.map(t => (
          <ThoughtCard key={t.id} thought={t} currentUserId={user?.id} />
        ))}
      </div>
      {loading && <p className="text-center text-gray-400 py-4">Loading...</p>}
      {!loading && hasMore && cursor !== null && (
        <button onClick={() => loadThoughts(cursor)} className="w-full py-3 text-indigo-500 hover:text-indigo-600 mt-4">
          Load more
        </button>
      )}
      {!loading && thoughts.length === 0 && (
        <p className="text-center text-gray-400 py-8">No thoughts with #{tag} yet</p>
      )}
    </div>
  );
}
