import client from './client';
import type { Thought, PaginatedResponse } from '../types';

export async function searchContent(query: string, cursor?: number) {
  const params: Record<string, string | number> = { q: query, limit: 20 };
  if (cursor) params.cursor = cursor;
  const { data } = await client.get<PaginatedResponse<Thought>>('/feed/search', { params });
  return data;
}
