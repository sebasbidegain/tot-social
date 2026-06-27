import { useInfiniteQuery } from '@tanstack/react-query';
import type { Thought, PaginatedResponse } from '../types';
import { getBookmarks } from '../api/bookmarks';
import { useAuth } from '../contexts/AuthContext';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import ThoughtCard from '../components/thought/ThoughtCard';

export default function BookmarksPage() {
  const { user } = useAuth();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery<PaginatedResponse<{ id: number; thought: Thought }>>({
    queryKey: ['bookmarks'],
    queryFn: ({ pageParam }) => getBookmarks(pageParam as number | undefined),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.pagination.has_more ? (last.pagination.next_cursor ?? undefined) : undefined,
  });

  const bookmarks = data?.pages.flatMap(p => p.data) ?? [];

  const sentinelRef = useInfiniteScroll(
    () => { if (hasNextPage) fetchNextPage(); },
    !!hasNextPage,
    isFetchingNextPage
  );

  if (isLoading) return <div className="animate-pulse space-y-4">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Bookmarks</h1>
      {bookmarks.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No bookmarks yet. Tap the star on any thought to save it here.</p>
      ) : (
        <div className="space-y-4">
          {bookmarks.map(b => (
            <ThoughtCard key={b.id} thought={b.thought} currentUserId={user?.id} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="py-4 text-center">
        {isFetchingNextPage && <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto" />}
        {!hasNextPage && bookmarks.length > 0 && <p className="text-gray-400 text-sm">No more bookmarks</p>}
      </div>
    </div>
  );
}
