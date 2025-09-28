import { ICommentRepository } from '@application/ports/repositories/ICommentRepository';
import { IPostRepository } from '@application/ports/repositories/IPostRepository';
import { IUserRepository } from '@application/ports/repositories/IUserRepository';
import { CommentWithUser, PaginatedComments } from '@domain/entities/Comment';
import { ForbiddenError, NotFoundError } from '@domain/errors/DomainError';
import { ContentValidation } from '@domain/value-objects/ContentValidation';
import { Pagination } from '@domain/value-objects/Pagination';
import { logger } from '@shared/utils/logger';

// TODO: Add mentions
export class CommentService {
  constructor(
    private commentRepository: ICommentRepository,
    private postRepository: IPostRepository,
    private userRepository: IUserRepository
  ) {}

  async createComment(userId: number, postId: number, content: string): Promise<CommentWithUser> {
    // Validate content
    ContentValidation.validateCommentContent(content);

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify post exists
    const postExists = await this.postRepository.exists(postId);
    if (!postExists) {
      throw new NotFoundError('Post not found');
    }

    // Create comment
    const comment = await this.commentRepository.create({
      userId,
      postId,
      content,
    });

    logger.info('Comment created successfully', {
      commentId: comment.id,
      postId,
      userId,
    });

    return {
      id: comment.id,
      postId: comment.postId,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      isDeleted: comment.isDeleted,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  }

  async getComment(commentId: number): Promise<CommentWithUser> {
    const comment = await this.commentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    return comment;
  }

  async getPostComments(postId: number, page = 1, limit = 20): Promise<PaginatedComments> {
    // Verify post exists
    const postExists = await this.postRepository.exists(postId);
    if (!postExists) {
      throw new NotFoundError('Post not found');
    }

    const pagination = new Pagination(page, limit);
    return await this.commentRepository.findByPostId(postId, pagination);
  }

  async getUserComments(userId: number, page = 1, limit = 20): Promise<PaginatedComments> {
    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const pagination = new Pagination(page, limit);
    return await this.commentRepository.findByUserId(userId, pagination);
  }

  async updateComment(
    commentId: number,
    userId: number,
    content: string
  ): Promise<CommentWithUser> {
    // Validate content
    ContentValidation.validateCommentContent(content);

    // Verify comment exists and user is owner
    const isOwner = await this.commentRepository.isOwner(commentId, userId);
    if (!isOwner) {
      const commentExists = await this.commentRepository.exists(commentId);
      if (!commentExists) {
        throw new NotFoundError('Comment not found');
      }
      throw new ForbiddenError('You can only edit your own comments');
    }

    // Update comment
    const updatedComment = await this.commentRepository.update(commentId, content);

    // Get comment with user info
    const commentWithUser = await this.commentRepository.findById(commentId);
    if (!commentWithUser) {
      throw new NotFoundError('Comment not found after update');
    }

    logger.info('Comment updated successfully', {
      commentId,
      userId,
    });

    return commentWithUser;
  }

  async deleteComment(commentId: number, userId: number): Promise<void> {
    // Verify comment exists and user is owner
    const isOwner = await this.commentRepository.isOwner(commentId, userId);
    if (!isOwner) {
      const commentExists = await this.commentRepository.exists(commentId);
      if (!commentExists) {
        throw new NotFoundError('Comment not found');
      }
      throw new ForbiddenError('You can only delete your own comments');
    }

    // Soft delete the comment
    await this.commentRepository.softDelete(commentId);

    logger.info('Comment deleted successfully', { commentId, userId });
  }

  async getCommentStats(
    postId?: number
  ): Promise<{ totalComments: number; commentsToday: number }> {
    let totalComments: number;

    if (postId) {
      // Get comments count for specific post
      totalComments = await this.commentRepository.countByPost(postId);
    } else {
      // Get total comments count
      totalComments = await this.commentRepository.count();
    }

    // For commentsToday, we'd need a method to count comments created today
    // This would require additional repository methods or a raw query
    // For now, returning 0 as placeholder
    const commentsToday = 0;

    return { totalComments, commentsToday };
  }
}
