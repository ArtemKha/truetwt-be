import { UserSummary } from './User';

export interface Post {
  id: number;
  userId: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface CreatePostData {
  userId: number;
  content: string;
}

export interface PostWithUser extends Post {
  user: UserSummary;
}

export interface PostWithUserAndMentions extends PostWithUser {
  mentions: UserSummary[];
}

export interface TimelinePost {
  id: number;
  userId: number;
  username: string;
  content: string;
  createdAt: Date;
  mentions: UserSummary[];
}

export interface PaginatedPosts {
  posts: PostWithUserAndMentions[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}
