import client from './client';
import type { User } from '../types';

export async function getProfile(username: string) {
  const { data } = await client.get<User>(`/users/${username}`);
  return data;
}

export async function updateProfile(updates: { display_name?: string; bio?: string }) {
  await client.put('/users/profile', updates);
}

export async function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append('avatar', file);
  const { data } = await client.put<{ avatar_url: string }>('/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.avatar_url;
}

export async function followUser(id: number) {
  await client.post(`/users/${id}/follow`);
}

export async function unfollowUser(id: number) {
  await client.delete(`/users/${id}/follow`);
}

export async function searchUsers(q: string) {
  const { data } = await client.get<User[]>('/users/search', { params: { q } });
  return data;
}
