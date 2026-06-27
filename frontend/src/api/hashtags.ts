import client from './client';
import type { HashtagTrending, Thought, PaginatedResponse } from '../types';
import { FEED_PAGE_SIZE } from '../utils/constants';

export async function getTrendingHashtags(limit = 10) {
  const { data } = await client.get<HashtagTrending[]>('/hashtags/trending', { params: { limit } });
  return data;
}

export async function getThoughtsByHashtag(tag: string, cursor?: number) {
  const params: Record<string, string | number> = { limit: FEED_PAGE_SIZE };
  if (cursor) params.cursor = cursor;
  const { data } = await client.get<PaginatedResponse<Thought>>(`/hashtags/${encodeURIComponent(tag)}`, { params });
  return data;
}
