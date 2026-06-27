import { useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Conversation, Message, PaginatedResponse } from '../types';
import { getConversations, getMessages, sendMessage } from '../api/messages';
import { useAuth } from '../contexts/AuthContext';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { timeAgo } from '../utils/formatDate';

export default function MessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const { data: convData, isLoading: convsLoading } = useInfiniteQuery<PaginatedResponse<Conversation>>({
    queryKey: ['conversations'],
    queryFn: ({ pageParam }) => getConversations(pageParam as number | undefined),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.pagination.has_more ? (last.pagination.next_cursor ?? undefined) : undefined,
  });

  const conversations = convData?.pages.flatMap(p => p.data) ?? [];
  const activeConv = conversations.find(c => c.id === activeConvId);

  const { data: messagesData, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery<PaginatedResponse<Message>>({
    queryKey: ['messages', activeConvId],
    queryFn: ({ pageParam }) => getMessages(activeConvId!, pageParam as number | undefined),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.pagination.has_more ? (last.pagination.next_cursor ?? undefined) : undefined,
    enabled: !!activeConvId,
    refetchInterval: 5000,
  });

  const messages = (messagesData?.pages.flatMap(p => p.data) ?? []).slice().reverse();

  const sentinelRef = useInfiniteScroll(
    () => { if (hasNextPage) fetchNextPage(); },
    !!hasNextPage,
    isFetchingNextPage
  );

  async function handleSend() {
    if (!newMessage.trim() || !activeConv || sending) return;
    setSending(true);
    try {
      await sendMessage(activeConv.other_user.id, newMessage.trim());
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['messages', activeConvId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } finally { setSending(false); }
  }

  if (convsLoading) return <div className="animate-pulse space-y-3">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />)}</div>;

  if (!activeConvId) {
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Messages</h1>
        {conversations.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No conversations yet</p>
        ) : (
          <div className="space-y-2">
            {conversations.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveConvId(c.id)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {c.other_user.avatar_url ? (
                    <img src={c.other_user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                      {c.other_user.display_name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">{c.other_user.display_name}</span>
                      {c.last_message_at && <span className="text-xs text-gray-500">{timeAgo(c.last_message_at)}</span>}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{c.last_message || 'No messages yet'}</p>
                  </div>
                  {c.unread_count > 0 && (
                    <span className="bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {c.unread_count > 9 ? '9+' : c.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setActiveConvId(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          ← Back
        </button>
        <span className="font-medium text-gray-900 dark:text-white">{activeConv?.other_user.display_name}</span>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3 flex flex-col-reverse">
        {messages.length === 0 && <p className="text-center text-gray-500 py-8">Send a message to start the conversation</p>}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${
              m.sender_id === user?.id
                ? 'bg-indigo-600 text-white rounded-br-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
            }`}>
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              <p className={`text-xs mt-1 ${m.sender_id === user?.id ? 'text-indigo-200' : 'text-gray-500'}`}>{timeAgo(m.created_at)}</p>
            </div>
          </div>
        ))}
        <div ref={sentinelRef} />
      </div>

      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
        <input
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          className="bg-indigo-600 text-white rounded-full px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
