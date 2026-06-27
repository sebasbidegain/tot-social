import client from './client';

export async function muteUser(userId: number) {
  const { data } = await client.post(`/mutes/${userId}`);
  return data;
}

export async function unmuteUser(userId: number) {
  const { data } = await client.delete(`/mutes/${userId}`);
  return data;
}

export async function getMuted(cursor?: number) {
  const params: Record<string, string | number> = { limit: 20 };
  if (cursor) params.cursor = cursor;
  const { data } = await client.get('/mutes', { params });
  return data;
}
