import client from './client';
import type { PaginatedResponse, User } from '../types';

export async function blockUser(userId: number) {
  await client.post(`/blocks/${userId}`);
}

export async function unblockUser(userId: number) {
  await client.delete(`/blocks/${userId}`);
}

export async function getBlockedUsers(cursor?: number) {
  const params: Record<string, string | number> = { limit: 20 };
  if (cursor) params.cursor = cursor;
  const { data } = await client.get<PaginatedResponse<{ id: number; user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'> }>>('/blocks', { params });
  return data;
}

export async function reportContent(type: string, id: number, reason: string) {
  await client.post('/reports', { type, id, reason });
}
