import { UserSummary } from './User';

export interface Comment {
  id: number;
  postId: number;
  userId: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface CreateCommentData {
  postId: number;
  userId: number;
  content: string;
}

export interface CommentWithUser extends Comment {
  user: UserSummary;
}

export interface PaginatedComments {
  comments: CommentWithUser[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}
