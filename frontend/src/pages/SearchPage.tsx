import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import type { User, Thought, PaginatedResponse } from '../types';
import { searchUsers } from '../api/users';
import { searchContent } from '../api/search';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { SearchResultSkeleton } from '../components/ui/Skeleton';
import ThoughtCard from '../components/thought/ThoughtCard';

export default function SearchPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'users' | 'thoughts'>('users');
  const debouncedQuery = useDebounce(query, 300);

  const { data: userResults = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['searchUsers', debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery),
    enabled: debouncedQuery.length >= 2 && tab === 'users',
    staleTime: 1000 * 30,
  });

  const { data: thoughtsData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: thoughtsLoading } = useInfiniteQuery<PaginatedResponse<Thought>>({
    queryKey: ['searchThoughts', debouncedQuery],
    queryFn: ({ pageParam }) => searchContent(debouncedQuery, pageParam as number | undefined),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.pagination.has_more ? (last.pagination.next_cursor ?? undefined) : undefined,
    enabled: debouncedQuery.length >= 2 && tab === 'thoughts',
    staleTime: 1000 * 30,
  });

  const thoughts = thoughtsData?.pages.flatMap(p => p.data) ?? [];
  const sentinelRef = useInfiniteScroll(
    () => { if (hasNextPage) fetchNextPage(); },
    !!hasNextPage,
    isFetchingNextPage
  );

  const isLoading = tab === 'users' ? usersLoading : thoughtsLoading;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Search</h1>

      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={tab === 'users' ? 'Search users...' : 'Search thoughts...'}
        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
      />

      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setTab('users')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'users' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
        >
          Users
        </button>
        <button
          onClick={() => setTab('thoughts')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'thoughts' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
        >
          Thoughts
        </button>
      </div>

      {isLoading && debouncedQuery.length >= 2 && <SearchResultSkeleton count={3} />}

      {!isLoading && tab === 'users' && (
        <div className="space-y-2">
          {userResults.map(u => (
            <Link key={u.id} to={`/profile/${u.username}`} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                  {u.display_name[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{u.display_name}</p>
                <p className="text-sm text-gray-500">@{u.username} · {u.follower_count} followers</p>
              </div>
            </Link>
          ))}
          {debouncedQuery.length >= 2 && userResults.length === 0 && <p className="text-center text-gray-400 py-8">No users found</p>}
        </div>
      )}

      {!isLoading && tab === 'thoughts' && (
        <div className="space-y-4">
          {thoughts.map(t => (
            <ThoughtCard key={t.id} thought={t} currentUserId={user?.id} />
          ))}
          {debouncedQuery.length >= 2 && thoughts.length === 0 && <p className="text-center text-gray-400 py-8">No thoughts found</p>}
          <div ref={sentinelRef} className="py-4 text-center">
            {isFetchingNextPage && <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto" />}
          </div>
        </div>
      )}
    </div>
  );
}
