import { CommentService } from '@application/services/CommentService';
import { UnauthorizedError } from '@domain/errors/DomainError';
import { logger } from '@shared/utils/logger';
import { Request, Response } from 'express';
import {
  CommentParams,
  CreateCommentRequest,
  GetCommentsQuery,
  PostCommentsParams,
  UpdateCommentRequest,
} from '../schemas/comment.schemas';

export class CommentController {
  constructor(private commentService: CommentService) {}

  async createComment(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { id: postId }: PostCommentsParams = req.params as any;
    const { content }: CreateCommentRequest = req.body;

    const comment = await this.commentService.createComment(req.user.userId, postId, content);

    logger.info('Comment created', {
      commentId: comment.id,
      postId,
      userId: req.user.userId,
    });

    res.status(201).json({
      success: true,
      data: { comment },
    });
  }

  async getComment(req: Request, res: Response) {
    const { id }: CommentParams = req.params as any;

    const comment = await this.commentService.getComment(id);

    res.json({
      success: true,
      data: { comment },
    });
  }

  async getPostComments(req: Request, res: Response) {
    const { id: postId }: PostCommentsParams = req.params as any;
    const { page, limit }: GetCommentsQuery = req.query as any;

    const result = await this.commentService.getPostComments(postId, page, limit);

    res.json({
      success: true,
      data: {
        comments: result.comments,
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

  async updateComment(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { id }: CommentParams = req.params as any;
    const { content }: UpdateCommentRequest = req.body;

    const comment = await this.commentService.updateComment(id, req.user.userId, content);

    logger.info('Comment updated', {
      commentId: id,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      data: { comment },
    });
  }

  async deleteComment(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { id }: CommentParams = req.params as any;

    await this.commentService.deleteComment(id, req.user.userId);

    logger.info('Comment deleted', {
      commentId: id,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  }

  async getCommentStats(req: Request, res: Response) {
    const { postId } = req.query;

    const stats = await this.commentService.getCommentStats(postId ? Number(postId) : undefined);

    res.json({
      success: true,
      data: { stats },
    });
  }
}
