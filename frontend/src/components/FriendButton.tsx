import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getFriendshipStatus, sendFriendRequest, cancelFriendRequest,
  acceptFriendRequest, unfriend,
  type FriendshipStatus,
} from '../api/friends';

interface Props {
  userId: number;
}

export default function FriendButton({ userId }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data: status, isLoading } = useQuery<FriendshipStatus>({
    queryKey: ['friendshipStatus', userId],
    queryFn: () => getFriendshipStatus(userId),
  });

  if (isLoading || !status || status.status === 'self') return null;

  async function handleAction() {
    setLoading(true);
    try {
      switch (status!.status) {
        case 'none':
          await sendFriendRequest(userId);
          break;
        case 'request_sent':
          await cancelFriendRequest(userId);
          break;
        case 'request_received':
          await acceptFriendRequest(userId);
          break;
        case 'friends':
          await unfriend(userId);
          break;
      }
      queryClient.invalidateQueries({ queryKey: ['friendshipStatus', userId] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friendsPendingCount'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } finally {
      setLoading(false);
    }
  }

  const config = {
    none: { label: 'Add Friend', className: 'bg-green-600 text-white hover:bg-green-700' },
    request_sent: { label: 'Cancel Request', className: 'bg-gray-200 text-gray-700 hover:bg-gray-300' },
    request_received: { label: 'Accept Request', className: 'bg-indigo-600 text-white hover:bg-indigo-700' },
    friends: { label: 'Friends', className: 'bg-gray-200 text-gray-700 hover:bg-red-100 hover:text-red-600' },
  }[status.status];

  return (
    <button
      onClick={handleAction}
      disabled={loading}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${config.className}`}
    >
      {loading ? '...' : config.label}
    </button>
  );
}
