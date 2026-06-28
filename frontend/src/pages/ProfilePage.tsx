import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { User, Thought, PaginatedResponse } from '../types';
import { getProfile, followUser, unfollowUser } from '../api/users';
import { getUserThoughts } from '../api/thoughts';
import { muteUser, unmuteUser } from '../api/mutes';
import { useAuth } from '../contexts/AuthContext';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import ThoughtCard from '../components/thought/ThoughtCard';
import { ProfileSkeleton } from '../components/ui/Skeleton';
import FriendButton from '../components/FriendButton';
import { formatDate } from '../utils/formatDate';
import AdBanner from '../components/AdBanner';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [followLoading, setFollowLoading] = useState(false);
  const [muted, setMuted] = useState(false);
  const [muteLoading, setMuteLoading] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery<User>({
    queryKey: ['profile', username],
    queryFn: () => getProfile(username!),
    enabled: !!username,
  });

  const {
    data: thoughtsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: thoughtsLoading,
  } = useInfiniteQuery<PaginatedResponse<Thought>>({
    queryKey: ['userThoughts', profile?.id],
    queryFn: ({ pageParam }) => getUserThoughts(profile!.id, pageParam as number | undefined),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? (lastPage.pagination.next_cursor ?? undefined) : undefined,
    enabled: !!profile?.id,
  });

  const thoughts = thoughtsData?.pages.flatMap(p => p.data) ?? [];

  const sentinelRef = useInfiniteScroll(
    () => { if (hasNextPage) fetchNextPage(); },
    !!hasNextPage,
    isFetchingNextPage
  );

  async function handleFollowToggle() {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    const wasFollowing = !!profile.is_following;
    try {
      // Optimistic update
      queryClient.setQueryData<User>(['profile', username], (old) =>
        old ? {
          ...old,
          is_following: !wasFollowing,
          follower_count: old.follower_count + (wasFollowing ? -1 : 1),
        } : old
      );

      if (wasFollowing) {
        await unfollowUser(profile.id);
      } else {
        await followUser(profile.id);
      }
    } catch {
      // Rollback on error
      queryClient.setQueryData<User>(['profile', username], (old) =>
        old ? {
          ...old,
          is_following: wasFollowing,
          follower_count: old.follower_count + (wasFollowing ? 1 : -1),
        } : old
      );
    } finally {
      setFollowLoading(false);
    }
  }

  if (profileLoading || thoughtsLoading) return <ProfileSkeleton />;

  if (!profile) {
    return <p className="text-center text-gray-500 py-12">User not found</p>;
  }

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start gap-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" loading="lazy" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl">
              {(profile.display_name || profile.username)[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{profile.display_name}</h1>
            <p className="text-gray-500">@{profile.username}</p>
            {profile.bio && <p className="text-gray-700 dark:text-gray-300 mt-2">{profile.bio}</p>}
            <p className="text-xs text-gray-400 mt-1">Joined {formatDate(profile.created_at)}</p>
          </div>
          {!isOwnProfile && currentUser && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => navigate(`/messages?user=${profile.username}`)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Message
              </button>
              <FriendButton userId={profile.id} />
              <button
                onClick={handleFollowToggle}
                disabled={followLoading}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  profile.is_following
                    ? 'bg-gray-200 text-gray-700 hover:bg-red-100 hover:text-red-600'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {profile.is_following ? 'Unfollow' : 'Follow'}
              </button>
              <button
                onClick={async () => {
                  setMuteLoading(true);
                  try {
                    if (muted) { await unmuteUser(profile.id); setMuted(false); }
                    else { await muteUser(profile.id); setMuted(true); }
                  } catch { /* */ }
                  finally { setMuteLoading(false); }
                }}
                disabled={muteLoading}
                className="px-3 py-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full text-xs"
              >
                {muted ? 'Unmute' : 'Mute'}
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-6 mt-4 text-sm">
          <span><strong>{profile.thought_count}</strong> thoughts</span>
          <span><strong>{profile.friend_count}</strong> friends</span>
          <span><strong>{profile.follower_count}</strong> followers</span>
          <span><strong>{profile.following_count}</strong> following</span>
        </div>
      </div>

      <AdBanner slot="PROFILE_SLOT_1" format="horizontal" className="mb-4" />

      <div className="space-y-4">
        {thoughts.map((t, i) => (
          <div key={t.id}>
            <ThoughtCard thought={t} currentUserId={currentUser?.id} />
            {(i + 1) % 5 === 0 && <AdBanner slot="PROFILE_SLOT_2" className="my-4" />}
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="py-4 text-center">
        {isFetchingNextPage && <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto" />}
        {!hasNextPage && thoughts.length > 0 && <p className="text-gray-400 text-sm">No more thoughts</p>}
        {!isFetchingNextPage && thoughts.length === 0 && <p className="text-gray-400 text-sm">No thoughts yet</p>}
      </div>
    </div>
  );
}
