import client from './client';
import type { User } from '../types';

export async function login(login: string, password: string) {
  const { data } = await client.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', { login, password });
  return data;
}

export async function register(username: string, email: string, password: string, display_name?: string) {
  const { data } = await client.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', { username, email, password, display_name });
  return data;
}

export async function getMe() {
  const { data } = await client.get<{ user: User }>('/auth/me');
  return data.user;
}

export async function changePassword(current_password: string, new_password: string) {
  await client.put('/auth/change-password', { current_password, new_password });
}

export async function logout(refreshToken: string) {
  await client.post('/auth/logout', { refreshToken });
}
