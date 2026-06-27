import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { Notification, PaginatedResponse } from '../types';
import { getNotifications, markAsRead, markAllRead } from '../api/notifications';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { timeAgo } from '../utils/formatDate';

function notifText(n: Notification) {
  switch (n.type) {
    case 'like': return 'liked your thought';
    case 'comment': return 'commented on your thought';
    case 'follow': return 'started following you';
    case 'friend_request': return 'sent you a friend request';
    case 'friend_accept': return 'accepted your friend request';
    case 'repost': return 'reposted your thought';
    default: return 'interacted with you';
  }
}

function notifLink(n: Notification) {
  if (n.entity_type === 'thought' && n.entity_id) return `/thought/${n.entity_id}`;
  if (n.type === 'follow' || n.type === 'friend_request' || n.type === 'friend_accept') return `/profile/${n.actor.username}`;
  return '#';
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery<PaginatedResponse<Notification>>({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) => getNotifications(pageParam as number | undefined),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.pagination.has_more ? (last.pagination.next_cursor ?? undefined) : undefined,
  });

  const notifications = data?.pages.flatMap(p => p.data) ?? [];

  const sentinelRef = useInfiniteScroll(
    () => { if (hasNextPage) fetchNextPage(); },
    !!hasNextPage,
    isFetchingNextPage
  );

  async function handleMarkAllRead() {
    await markAllRead();
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notificationsUnread'] });
  }

  async function handleClick(n: Notification) {
    if (!n.is_read) {
      await markAsRead(n.id);
      queryClient.invalidateQueries({ queryKey: ['notificationsUnread'] });
    }
  }

  if (isLoading) return <div className="animate-pulse space-y-3">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />)}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h1>
        {notifications.some(n => !n.is_read) && (
          <button onClick={handleMarkAllRead} className="text-sm text-indigo-600 hover:text-indigo-700">
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No notifications yet</p>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <Link
              key={n.id}
              to={notifLink(n)}
              onClick={() => handleClick(n)}
              className={`block p-3 rounded-lg border transition-colors ${
                n.is_read
                  ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {n.actor.avatar_url ? (
                  <img src={n.actor.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                    {n.actor.display_name[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">{n.actor.display_name}</span>{' '}
                    {notifText(n)}
                  </p>
                  <p className="text-xs text-gray-500">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && <div className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0" />}
              </div>
            </Link>
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="py-4 text-center">
        {isFetchingNextPage && <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto" />}
      </div>
    </div>
  );
}
