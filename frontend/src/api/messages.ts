import client from './client';
import type { Conversation, Message, PaginatedResponse } from '../types';

export async function getConversations(cursor?: number) {
  const params: Record<string, string | number> = { limit: 20 };
  if (cursor) params.cursor = cursor;
  const { data } = await client.get<PaginatedResponse<Conversation>>('/messages/conversations', { params });
  return data;
}

export async function getMessages(conversationId: number, cursor?: number) {
  const params: Record<string, string | number> = { limit: 30 };
  if (cursor) params.cursor = cursor;
  const { data } = await client.get<PaginatedResponse<Message>>(`/messages/conversations/${conversationId}`, { params });
  return data;
}

export async function sendMessage(userId: number, content: string) {
  const { data } = await client.post<Message>(`/messages/send/${userId}`, { content });
  return data;
}

export async function getUnreadCount() {
  const { data } = await client.get<{ count: number }>('/messages/unread-count');
  return data.count;
}
