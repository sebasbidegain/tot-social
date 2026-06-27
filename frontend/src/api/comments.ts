import client from './client';
import type { Comment, PaginatedResponse } from '../types';

export async function getComments(thoughtId: number, cursor?: number) {
  const params: Record<string, string | number> = { limit: 20 };
  if (cursor) params.cursor = cursor;
  const { data } = await client.get<PaginatedResponse<Comment>>(`/comments/thoughts/${thoughtId}`, { params });
  return data;
}

export async function createComment(thoughtId: number, content: string, parentId?: number) {
  const { data } = await client.post(`/comments/thoughts/${thoughtId}`, { content, parent_id: parentId });
  return data;
}

export async function deleteComment(id: number) {
  await client.delete(`/comments/${id}`);
}
