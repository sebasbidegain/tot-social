import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { Thought, PaginatedResponse } from '../types';
import { getFeed, deleteThought } from '../api/thoughts';
import { useAuth } from '../contexts/AuthContext';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import ThoughtCard from '../components/thought/ThoughtCard';
import ComposeForm from '../components/thought/ComposeForm';
import { FeedSkeleton } from '../components/ui/Skeleton';

export default function HomeFeed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery<PaginatedResponse<Thought>>({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => getFeed(pageParam as number | undefined),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? (lastPage.pagination.next_cursor ?? undefined) : undefined,
  });

  const thoughts = data?.pages.flatMap(p => p.data) ?? [];

  const sentinelRef = useInfiniteScroll(
    () => { if (hasNextPage) fetchNextPage(); },
    !!hasNextPage,
    isFetchingNextPage
  );

  function handleCreated() {
    queryClient.invalidateQueries({ queryKey: ['feed'] });
  }

  async function handleDelete(id: number) {
    queryClient.setQueryData<{ pages: PaginatedResponse<Thought>[]; pageParams: unknown[] }>(
      ['feed'],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            data: page.data.filter(t => t.id !== id),
          })),
        };
      }
    );
    try {
      await deleteThought(id);
    } catch {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    }
  }

  if (isLoading) return <FeedSkeleton count={4} />;
  if (isError) return (
    <div className="text-center py-12">
      <p className="text-red-500 mb-2">Failed to load feed</p>
      <button onClick={() => refetch()} className="text-indigo-600 hover:underline text-sm">Try again</button>
    </div>
  );

  return (
    <div>
      <ComposeForm onCreated={handleCreated} />

      <div className="space-y-4">
        {thoughts.map(t => (
          <ThoughtCard key={t.id} thought={t} currentUserId={user?.id} onDelete={handleDelete} />
        ))}
      </div>

      <div ref={sentinelRef} className="py-4 text-center">
        {isFetchingNextPage && <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto" />}
        {!hasNextPage && thoughts.length > 0 && <p className="text-gray-400 text-sm">You're all caught up</p>}
        {!isLoading && thoughts.length === 0 && (
          <p className="text-gray-500">No thoughts yet. Follow some people or post your first thought!</p>
        )}
      </div>
    </div>
  );
}
