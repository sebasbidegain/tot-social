import client from './client';
import type { PaginatedResponse } from '../types';

export interface FriendRequestItem {
  id: number;
  created_at: string;
  user: {
    id: number;
    username: string;
    display_name: string;
    avatar_url: string;
    bio: string;
  };
}

export interface FriendItem {
  id: number;
  created_at: string;
  user: {
    id: number;
    username: string;
    display_name: string;
    avatar_url: string;
    bio: string;
    follower_count: number;
  };
}

export interface FriendshipStatus {
  status: 'self' | 'friends' | 'request_sent' | 'request_received' | 'none';
  request_id?: number;
}

export async function sendFriendRequest(userId: number) {
  const { data } = await client.post(`/friends/request/${userId}`);
  return data;
}

export async function acceptFriendRequest(senderId: number) {
  const { data } = await client.post(`/friends/accept/${senderId}`);
  return data;
}

export async function rejectFriendRequest(senderId: number) {
  const { data } = await client.post(`/friends/reject/${senderId}`);
  return data;
}

export async function cancelFriendRequest(receiverId: number) {
  const { data } = await client.delete(`/friends/request/${receiverId}`);
  return data;
}

export async function unfriend(userId: number) {
  const { data } = await client.delete(`/friends/${userId}`);
  return data;
}

export async function getPendingReceived(cursor?: number) {
  const params: Record<string, string | number> = { limit: 20 };
  if (cursor) params.cursor = cursor;
  const { data } = await client.get<PaginatedResponse<FriendRequestItem>>('/friends/pending/received', { params });
  return data;
}

export async function getPendingSent(cursor?: number) {
  const params: Record<string, string | number> = { limit: 20 };
  if (cursor) params.cursor = cursor;
  const { data } = await client.get<PaginatedResponse<FriendRequestItem>>('/friends/pending/sent', { params });
  return data;
}

export async function getPendingCount() {
  const { data } = await client.get<{ count: number }>('/friends/pending/count');
  return data.count;
}

export async function getFriends(userId?: number, cursor?: number) {
  const params: Record<string, string | number> = { limit: 20 };
  if (cursor) params.cursor = cursor;
  const url = userId ? `/friends/list/${userId}` : '/friends/list';
  const { data } = await client.get<PaginatedResponse<FriendItem>>(url, { params });
  return data;
}

export async function getFriendshipStatus(userId: number) {
  const { data } = await client.get<FriendshipStatus>(`/friends/status/${userId}`);
  return data;
}
