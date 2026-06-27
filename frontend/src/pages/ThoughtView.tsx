import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Thought, Comment, PaginatedResponse } from '../types';
import { getThought, getReplies, getThread } from '../api/thoughts';
import { getComments, createComment } from '../api/comments';
import { useAuth } from '../contexts/AuthContext';
import ThoughtCard from '../components/thought/ThoughtCard';
import ComposeForm from '../components/thought/ComposeForm';
import { Skeleton, ThoughtCardSkeleton } from '../components/ui/Skeleton';
import { timeAgo } from '../utils/formatDate';

export default function ThoughtView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  const thoughtId = id ? parseInt(id, 10) : 0;

  const { data: thought, isLoading: loadingThought } = useQuery<Thought>({
    queryKey: ['thought', thoughtId],
    queryFn: () => getThought(thoughtId),
    enabled: thoughtId > 0,
  });

  const { data: threadChain } = useQuery<Thought[]>({
    queryKey: ['thread', thoughtId],
    queryFn: () => getThread(thoughtId),
    enabled: thoughtId > 0 && !!thought?.parent_thought_id,
  });

  const { data: repliesData } = useQuery<PaginatedResponse<Thought>>({
    queryKey: ['replies', thoughtId],
    queryFn: () => getReplies(thoughtId),
    enabled: thoughtId > 0,
  });

  const { data: commentsData, isLoading: loadingComments } = useQuery<PaginatedResponse<Comment>>({
    queryKey: ['comments', thoughtId],
    queryFn: () => getComments(thoughtId),
    enabled: thoughtId > 0,
  });

  const comments = commentsData?.data ?? [];
  const replies = repliesData?.data ?? [];

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !thoughtId) return;
    setPosting(true);
    try {
      await createComment(thoughtId, newComment.trim());
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['comments', thoughtId] });
      queryClient.setQueryData<Thought>(['thought', thoughtId], (old) =>
        old ? { ...old, comment_count: old.comment_count + 1 } : old
      );
    } finally {
      setPosting(false);
    }
  }

  function handleReplyCreated() {
    queryClient.invalidateQueries({ queryKey: ['replies', thoughtId] });
    queryClient.invalidateQueries({ queryKey: ['thought', thoughtId] });
  }

  if (loadingThought) {
    return (
      <div>
        <ThoughtCardSkeleton />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="w-6 h-6 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!thought) {
    return <p className="text-center text-gray-500 py-12">Thought not found</p>;
  }

  return (
    <div>
      {/* Thread chain (parent thoughts) */}
      {threadChain && threadChain.length > 0 && (
        <div className="space-y-2 mb-2">
          {threadChain.map(t => (
            <ThoughtCard key={t.id} thought={t} currentUserId={user?.id} isThreadItem />
          ))}
          <div className="flex justify-center">
            <div className="w-0.5 h-4 bg-indigo-300 dark:bg-indigo-600" />
          </div>
        </div>
      )}

      {/* Main thought */}
      <ThoughtCard thought={thought} currentUserId={user?.id} />

      {/* Reply compose */}
      {user && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-2">Replying to @{thought.author.username}</p>
          <ComposeForm onCreated={handleReplyCreated} parentThoughtId={thoughtId} />
        </div>
      )}

      {/* Replies (threaded thoughts) */}
      {replies.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="font-medium text-gray-900 dark:text-white">Replies ({replies.length})</h3>
          {replies.map(r => (
            <ThoughtCard key={r.id} thought={r} currentUserId={user?.id} />
          ))}
        </div>
      )}

      {/* Legacy comments */}
      {user && (
        <form onSubmit={handleComment} className="mt-4 flex gap-2">
          <input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={posting || !newComment.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {posting ? '...' : 'Comment'}
          </button>
        </form>
      )}

      <div className="mt-6 space-y-3">
        <h3 className="font-medium text-gray-900 dark:text-white">Comments ({thought.comment_count})</h3>
        {loadingComments ? (
          Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="w-6 h-6 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          ))
        ) : (
          <>
            {comments.map(c => (
              <div key={c.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="flex items-center gap-2 mb-1">
                  {c.author.avatar_url ? (
                    <img src={c.author.avatar_url} alt="" className="w-6 h-6 rounded-full" loading="lazy" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-600">
                      {c.author.display_name[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{c.author.display_name}</span>
                  <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{c.content}</p>
              </div>
            ))}
            {comments.length === 0 && <p className="text-gray-400 text-sm">No comments yet</p>}
          </>
        )}
      </div>
    </div>
  );
}
