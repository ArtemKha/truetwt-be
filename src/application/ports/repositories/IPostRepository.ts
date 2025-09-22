import {
  CreatePostData,
  PaginatedPosts,
  Post,
  PostWithUser,
  PostWithUserAndMentions,
} from '@domain/entities/Post';
import { Pagination } from '@domain/value-objects/Pagination';

export interface IPostRepository {
  create(postData: CreatePostData): Promise<Post>;
  findById(id: number): Promise<PostWithUserAndMentions | null>;
  findByIdWithUser(id: number): Promise<PostWithUser | null>;
  findByUserId(userId: number, pagination: Pagination): Promise<PaginatedPosts>;
  findAll(pagination: Pagination): Promise<PaginatedPosts>;
  update(id: number, content: string): Promise<Post>;
  softDelete(id: number): Promise<void>;
  hardDelete(id: number): Promise<void>;
  exists(id: number): Promise<boolean>;
  isOwner(postId: number, userId: number): Promise<boolean>;
  count(): Promise<number>;
  countByUser(userId: number): Promise<number>;
}
