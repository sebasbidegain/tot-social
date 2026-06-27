import client from './client';
import type { PaginatedResponse, Thought } from '../types';

export async function toggleBookmark(thoughtId: number) {
  const { data } = await client.post<{ bookmarked: boolean }>(`/bookmarks/toggle/${thoughtId}`);
  return data;
}

export async function getBookmarks(cursor?: number) {
  const params: Record<string, string | number> = { limit: 20 };
  if (cursor) params.cursor = cursor;
  const { data } = await client.get<PaginatedResponse<{ id: number; thought: Thought }>>('/bookmarks', { params });
  return data;
}
