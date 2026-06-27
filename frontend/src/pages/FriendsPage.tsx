import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPendingReceived, getPendingSent, getFriends,
  acceptFriendRequest, rejectFriendRequest, cancelFriendRequest, unfriend,
  getPendingCount,
  type FriendRequestItem, type FriendItem,
} from '../api/friends';
import type { PaginatedResponse } from '../types';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { SearchResultSkeleton } from '../components/ui/Skeleton';
import { timeAgo } from '../utils/formatDate';

type Tab = 'friends' | 'received' | 'sent';

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>('friends');
  const queryClient = useQueryClient();

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['friendsPendingCount'],
    queryFn: getPendingCount,
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Friends</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {([
          { key: 'friends' as Tab, label: 'My Friends' },
          { key: 'received' as Tab, label: `Requests${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
          { key: 'sent' as Tab, label: 'Sent' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'friends' && <FriendsList />}
      {tab === 'received' && <ReceivedList queryClient={queryClient} />}
      {tab === 'sent' && <SentList queryClient={queryClient} />}
    </div>
  );
}

function FriendsList() {
  const queryClient = useQueryClient();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<PaginatedResponse<FriendItem>>({
      queryKey: ['friends'],
      queryFn: ({ pageParam }) => getFriends(undefined, pageParam as number | undefined),
      initialPageParam: undefined as number | undefined,
      getNextPageParam: (last) => last.pagination.has_more ? (last.pagination.next_cursor ?? undefined) : undefined,
    });

  const friends = data?.pages.flatMap(p => p.data) ?? [];
  const sentinelRef = useInfiniteScroll(
    () => { if (hasNextPage) fetchNextPage(); },
    !!hasNextPage,
    isFetchingNextPage
  );

  async function handleUnfriend(userId: number) {
    await unfriend(userId);
    queryClient.invalidateQueries({ queryKey: ['friends'] });
  }

  if (isLoading) return <SearchResultSkeleton count={3} />;

  if (friends.length === 0) {
    return <p className="text-center text-gray-400 py-8">No friends yet. Send some friend requests!</p>;
  }

  return (
    <>
      <div className="space-y-2">
        {friends.map(f => (
          <div key={f.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
            <Link to={`/profile/${f.user.username}`}>
              {f.user.avatar_url ? (
                <img src={f.user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" width={40} height={40} />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                  {f.user.display_name[0]?.toUpperCase()}
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/profile/${f.user.username}`} className="font-medium text-gray-900 hover:underline">
                {f.user.display_name}
              </Link>
              <p className="text-sm text-gray-500">@{f.user.username}</p>
            </div>
            <button
              onClick={() => handleUnfriend(f.user.id)}
              className="px-3 py-1 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Unfriend
            </button>
          </div>
        ))}
      </div>
      <div ref={sentinelRef} className="py-4 text-center">
        {isFetchingNextPage && <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto" />}
      </div>
    </>
  );
}

function ReceivedList({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<PaginatedResponse<FriendRequestItem>>({
      queryKey: ['friendRequests', 'received'],
      queryFn: ({ pageParam }) => getPendingReceived(pageParam as number | undefined),
      initialPageParam: undefined as number | undefined,
      getNextPageParam: (last) => last.pagination.has_more ? (last.pagination.next_cursor ?? undefined) : undefined,
    });

  const requests = data?.pages.flatMap(p => p.data) ?? [];
  const sentinelRef = useInfiniteScroll(
    () => { if (hasNextPage) fetchNextPage(); },
    !!hasNextPage,
    isFetchingNextPage
  );

  async function handleAccept(senderId: number) {
    await acceptFriendRequest(senderId);
    queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    queryClient.invalidateQueries({ queryKey: ['friends'] });
    queryClient.invalidateQueries({ queryKey: ['friendsPendingCount'] });
  }

  async function handleReject(senderId: number) {
    await rejectFriendRequest(senderId);
    queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    queryClient.invalidateQueries({ queryKey: ['friendsPendingCount'] });
  }

  if (isLoading) return <SearchResultSkeleton count={3} />;

  if (requests.length === 0) {
    return <p className="text-center text-gray-400 py-8">No pending requests</p>;
  }

  return (
    <>
      <div className="space-y-2">
        {requests.map(r => (
          <div key={r.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
            <Link to={`/profile/${r.user.username}`}>
              {r.user.avatar_url ? (
                <img src={r.user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" width={40} height={40} />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                  {r.user.display_name[0]?.toUpperCase()}
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/profile/${r.user.username}`} className="font-medium text-gray-900 hover:underline">
                {r.user.display_name}
              </Link>
              <p className="text-xs text-gray-400">{timeAgo(r.created_at)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(r.user.id)}
                className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Accept
              </button>
              <button
                onClick={() => handleReject(r.user.id)}
                className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
      <div ref={sentinelRef} className="py-4 text-center">
        {isFetchingNextPage && <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto" />}
      </div>
    </>
  );
}

function SentList({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<PaginatedResponse<FriendRequestItem>>({
      queryKey: ['friendRequests', 'sent'],
      queryFn: ({ pageParam }) => getPendingSent(pageParam as number | undefined),
      initialPageParam: undefined as number | undefined,
      getNextPageParam: (last) => last.pagination.has_more ? (last.pagination.next_cursor ?? undefined) : undefined,
    });

  const requests = data?.pages.flatMap(p => p.data) ?? [];
  const sentinelRef = useInfiniteScroll(
    () => { if (hasNextPage) fetchNextPage(); },
    !!hasNextPage,
    isFetchingNextPage
  );

  async function handleCancel(receiverId: number) {
    await cancelFriendRequest(receiverId);
    queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
  }

  if (isLoading) return <SearchResultSkeleton count={3} />;

  if (requests.length === 0) {
    return <p className="text-center text-gray-400 py-8">No sent requests</p>;
  }

  return (
    <>
      <div className="space-y-2">
        {requests.map(r => (
          <div key={r.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
            <Link to={`/profile/${r.user.username}`}>
              {r.user.avatar_url ? (
                <img src={r.user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" width={40} height={40} />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                  {r.user.display_name[0]?.toUpperCase()}
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/profile/${r.user.username}`} className="font-medium text-gray-900 hover:underline">
                {r.user.display_name}
              </Link>
              <p className="text-xs text-gray-400">Sent {timeAgo(r.created_at)}</p>
            </div>
            <button
              onClick={() => handleCancel(r.user.id)}
              className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        ))}
      </div>
      <div ref={sentinelRef} className="py-4 text-center">
        {isFetchingNextPage && <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto" />}
      </div>
    </>
  );
}
