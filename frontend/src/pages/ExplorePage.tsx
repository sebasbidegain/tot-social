import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { Thought, PaginatedResponse, HashtagTrending } from '../types';
import { getExplore, getTrending } from '../api/thoughts';
import { getTrendingHashtags } from '../api/hashtags';
import { useAuth } from '../contexts/AuthContext';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import ThoughtCard from '../components/thought/ThoughtCard';
import { FeedSkeleton } from '../components/ui/Skeleton';

type Tab = 'explore' | 'trending';

export default function ExplorePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('explore');
  const [trendingTags, setTrendingTags] = useState<HashtagTrending[]>([]);

  useEffect(() => {
    getTrendingHashtags(10).then(setTrendingTags).catch(() => {});
  }, []);

  const explore = useInfiniteQuery<PaginatedResponse<Thought>>({
    queryKey: ['explore'],
    queryFn: ({ pageParam }) => getExplore(pageParam as number | undefined),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? (lastPage.pagination.next_cursor ?? undefined) : undefined,
    enabled: tab === 'explore',
  });

  const trending = useInfiniteQuery<PaginatedResponse<Thought>>({
    queryKey: ['trending'],
    queryFn: ({ pageParam }) => getTrending(pageParam as number | undefined),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? (lastPage.pagination.next_cursor ?? undefined) : undefined,
    enabled: tab === 'trending',
  });

  const current = tab === 'explore' ? explore : trending;
  const thoughts = current.data?.pages.flatMap(p => p.data) ?? [];

  const sentinelRef = useInfiniteScroll(
    () => { if (current.hasNextPage) current.fetchNextPage(); },
    !!current.hasNextPage,
    current.isFetchingNextPage
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Explore</h1>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {(['explore', 'trending'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded text-sm capitalize ${tab === t ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Trending hashtags sidebar */}
      {trendingTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {trendingTags.map(h => (
            <Link key={h.id} to={`/hashtag/${h.name}`} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
              #{h.name} <span className="text-xs text-indigo-400">({h.recent_count})</span>
            </Link>
          ))}
        </div>
      )}

      {current.isError ? (
        <div className="text-center py-12">
          <p className="text-red-500 mb-2">Failed to load content</p>
          <button onClick={() => current.refetch()} className="text-indigo-600 hover:underline text-sm">Try again</button>
        </div>
      ) : current.isLoading ? (
        <FeedSkeleton count={4} />
      ) : (
        <>
          <div className="space-y-4">
            {thoughts.map(t => (
              <ThoughtCard key={t.id} thought={t} currentUserId={user?.id} />
            ))}
          </div>
          <div ref={sentinelRef} className="py-4 text-center">
            {current.isFetchingNextPage && <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto" />}
            {!current.hasNextPage && thoughts.length > 0 && <p className="text-gray-400 text-sm">No more thoughts</p>}
            {!current.isLoading && thoughts.length === 0 && <p className="text-gray-400 text-sm py-8">Nothing here yet</p>}
          </div>
        </>
      )}
    </div>
  );
}
