import client from './client';
import type { Thought, PaginatedResponse, EditHistoryEntry, UserListItem } from '../types';
import { FEED_PAGE_SIZE } from '../utils/constants';

export async function getFeed(cursor?: number) {
  const params: Record<string, string | number> = { limit: FEED_PAGE_SIZE };
  if (cursor) params.cursor = cursor;
  const { data } = await client.get<PaginatedResponse<Thought>>('/feed', { params });
  return data;
}

export async function getExplore(cursor?: number) {
  const params: Record<string, string | number> = { limit: FEED_PAGE_SIZE };
  if (cursor) params.cursor = cursor;
  const { data } = await client.get<PaginatedResponse<Thought>>('/feed/explore', { params });
  return data;
}

export async function getThought(id: number) {
  const { data } = await client.get<Thought>(`/thoughts/${id}`);
  return data;
}

export async function createThought(content: string, files?: File[], opts?: { parentThoughtId?: number; quotedThoughtId?: number }) {
  if (!files || files.length === 0) {
    const body: Record<string, unknown> = { content };
    if (opts?.parentThoughtId) body.parent_thought_id = opts.parentThoughtId;
    if (opts?.quotedThoughtId) body.quoted_thought_id = opts.quotedThoughtId;
    const { data } = await client.post('/thoughts', body);
    return data;
  }

  const formData = new FormData();
  formData.append('content', content);
  if (opts?.parentThoughtId) formData.append('parent_thought_id', String(opts.parentThoughtId));
  if (opts?.quotedThoughtId) formData.append('quoted_thought_id', String(opts.quotedThoughtId));

  const isVideo = files[0].type.startsWith('video/');
  const endpoint = isVideo ? '/thoughts/with-video' : '/thoughts/with-images';
  const fieldName = isVideo ? 'video' : 'images';

  for (const file of files) {
    formData.append(fieldName, file);
  }

  const { data } = await client.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteThought(id: number) {
  await client.delete(`/thoughts/${id}`);
}

export async function editThought(id: number, content: string) {
  const { data } = await client.put(`/thoughts/${id}`, { content });
  return data;
}

export async function getEditHistory(id: number) {
  const { data } = await client.get<EditHistoryEntry[]>(`/thoughts/${id}/history`);
  return data;
}

export async function toggleLike(thoughtId: number) {
  const { data } = await client.post<{ liked: boolean }>(`/likes/thoughts/${thoughtId}/toggle`);
  return data;
}

export async function getUserThoughts(userId: number, cursor?: number) {
  const params: Record<string, string | number> = { limit: FEED_PAGE_SIZE };
  if (cursor) params.cursor = cursor;
  const { data } = await client.get<PaginatedResponse<Thought>>(`/thoughts/user/${userId}`, { params });
  return data;
}

export async function getReplies(thoughtId: number, cursor?: number) {
  const params: Record<string, string | number> = { limit: FEED_PAGE_SIZE };
  if (cursor) params.cursor = cursor;
  const { data } = await client.get<PaginatedResponse<Thought>>(`/thoughts/${thoughtId}/replies`, { params });
  return data;
}

export async function getThread(thoughtId: number) {
  const { data } = await client.get<Thought[]>(`/thoughts/${thoughtId}/thread`);
  return data;
}

export async function getLikedBy(thoughtId: number, cursor?: number) {
  const params: Record<string, string | number> = { limit: 20 };
  if (cursor) params.cursor = cursor;
  const { data } = await client.get<PaginatedResponse<UserListItem>>(`/thoughts/${thoughtId}/liked-by`, { params });
  return data;
}

export async function getRepostedBy(thoughtId: number, cursor?: number) {
  const params: Record<string, string | number> = { limit: 20 };
  if (cursor) params.cursor = cursor;
  const { data } = await client.get<PaginatedResponse<UserListItem>>(`/thoughts/${thoughtId}/reposted-by`, { params });
  return data;
}

export async function getTrending(cursor?: number) {
  const params: Record<string, string | number> = { limit: FEED_PAGE_SIZE };
  if (cursor) params.cursor = cursor;
  const { data } = await client.get<PaginatedResponse<Thought>>('/thoughts/trending', { params });
  return data;
}
