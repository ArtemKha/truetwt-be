import {
  Comment,
  CommentWithUser,
  CreateCommentData,
  PaginatedComments,
} from '@domain/entities/Comment';
import { Pagination } from '@domain/value-objects/Pagination';

export interface ICommentRepository {
  create(commentData: CreateCommentData): Promise<Comment>;
  findById(id: number): Promise<CommentWithUser | null>;
  findByPostId(postId: number, pagination: Pagination): Promise<PaginatedComments>;
  findByUserId(userId: number, pagination: Pagination): Promise<PaginatedComments>;
  update(id: number, content: string): Promise<Comment>;
  softDelete(id: number): Promise<void>;
  hardDelete(id: number): Promise<void>;
  exists(id: number): Promise<boolean>;
  isOwner(commentId: number, userId: number): Promise<boolean>;
  count(): Promise<number>;
  countByPost(postId: number): Promise<number>;
  countByUser(userId: number): Promise<number>;
}
