import client from './client';
import type { Notification, PaginatedResponse } from '../types';

export async function getNotifications(cursor?: number) {
  const params: Record<string, string | number> = { limit: 20 };
  if (cursor) params.cursor = cursor;
  const { data } = await client.get<PaginatedResponse<Notification>>('/notifications', { params });
  return data;
}

export async function getUnreadCount() {
  const { data } = await client.get<{ count: number }>('/notifications/unread-count');
  return data.count;
}

export async function markAsRead(id: number) {
  await client.post(`/notifications/${id}/read`);
}

export async function markAllRead() {
  await client.post('/notifications/read-all');
}
