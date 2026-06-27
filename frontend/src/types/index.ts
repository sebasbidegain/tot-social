export interface User {
  id: number;
  username: string;
  display_name: string;
  email?: string;
  bio: string;
  avatar_url: string;
  follower_count: number;
  following_count: number;
  thought_count: number;
  friend_count: number;
  is_following?: boolean;
  email_verified?: boolean;
  created_at: string;
}

export interface QuotedThought {
  id: number;
  content: string;
  created_at: string;
  author: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  media: Media[];
}

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
}

export interface Thought {
  id: number;
  content: string;
  author: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  media: Media[];
  like_count: number;
  comment_count: number;
  repost_count: number;
  reply_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  is_reposted: boolean;
  is_edited: boolean;
  parent_thought_id: number | null;
  quoted_thought_id: number | null;
  quoted_thought: QuotedThought | null;
  link_preview: LinkPreview | null;
  created_at: string;
}

export interface Media {
  id: number;
  type: 'image' | 'video';
  url: string;
  thumbnail_url?: string;
}

export interface Comment {
  id: number;
  content: string;
  parent_id: number | null;
  author: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    next_cursor: number | null;
    has_more: boolean;
  };
}

export interface Notification {
  id: number;
  type: 'like' | 'comment' | 'follow' | 'friend_request' | 'friend_accept' | 'repost' | 'mention' | 'quote';
  entity_type: 'thought' | 'comment' | 'user' | null;
  entity_id: number | null;
  is_read: boolean;
  actor: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  created_at: string;
}

export interface Conversation {
  id: number;
  last_message: string;
  last_message_at: string | null;
  unread_count: number;
  other_user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>;
}

export interface Message {
  id: number;
  sender_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface EditHistoryEntry {
  id: number;
  old_content: string;
  edited_at: string;
}

export interface HashtagTrending {
  id: number;
  name: string;
  thought_count: number;
  recent_count: number;
}

export interface UserListItem {
  id: number;
  user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>;
}
