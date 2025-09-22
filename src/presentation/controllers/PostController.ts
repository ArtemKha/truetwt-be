import { PostService } from '@application/services/PostService';
import { UnauthorizedError } from '@domain/errors/DomainError';
import { logger } from '@shared/utils/logger';
import { Request, Response } from 'express';
import {
  CreatePostRequest,
  GetPostsQuery,
  PostParams,
  UserPostsParams,
} from '../schemas/post.schemas';

export class PostController {
  constructor(private postService: PostService) {}

  async createPost(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { content }: CreatePostRequest = req.body;

    const post = await this.postService.createPost(req.user.userId, content);

    logger.info('Post created', { postId: post.id, userId: req.user.userId });

    res.status(201).json({
      success: true,
      data: { post },
    });
  }

  async getPost(req: Request, res: Response) {
    const { id }: PostParams = req.params as any;

    const post = await this.postService.getPost(id);

    res.json({
      success: true,
      data: { post },
    });
  }

  async getUserPosts(req: Request, res: Response) {
    const { userId }: UserPostsParams = req.params as any;
    const { page, limit }: GetPostsQuery = req.query as any;

    const result = await this.postService.getUserPosts(userId, page, limit);

    res.json({
      success: true,
      data: {
        posts: result.posts,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          hasNext: result.hasNext,
          hasPrev: result.hasPrev,
        },
      },
    });
  }

  async deletePost(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { id }: PostParams = req.params as any;

    await this.postService.deletePost(id, req.user.userId);

    logger.info('Post deleted', { postId: id, userId: req.user.userId });

    res.json({
      success: true,
      message: 'Post deleted successfully',
    });
  }

  async getPostStats(req: Request, res: Response) {
    const stats = await this.postService.getPostStats();

    res.json({
      success: true,
      data: { stats },
    });
  }
}
