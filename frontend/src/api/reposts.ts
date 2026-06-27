import client from './client';

export async function toggleRepost(thoughtId: number) {
  const { data } = await client.post<{ reposted: boolean }>(`/reposts/toggle/${thoughtId}`);
  return data;
}
