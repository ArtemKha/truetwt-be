import { ICacheService } from '@application/ports/external/ICacheService';
import { IMentionRepository } from '@application/ports/repositories/IMentionRepository';
import { IPostRepository } from '@application/ports/repositories/IPostRepository';
import { IUserRepository } from '@application/ports/repositories/IUserRepository';
import { PaginatedPosts, PostWithUserAndMentions, TimelinePost } from '@domain/entities/Post';
import { ForbiddenError, NotFoundError } from '@domain/errors/DomainError';
import { ContentValidation } from '@domain/value-objects/ContentValidation';
import { Pagination } from '@domain/value-objects/Pagination';
import { logger } from '@shared/utils/logger';

export class PostService {
  constructor(
    private postRepository: IPostRepository,
    private userRepository: IUserRepository,
    private mentionRepository: IMentionRepository,
    private cacheService: ICacheService
  ) {}

  async createPost(userId: number, content: string): Promise<PostWithUserAndMentions> {
    // Validate content
    ContentValidation.validatePostContent(content);

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Create post
    const post = await this.postRepository.create({ userId, content });

    // Extract and process mentions efficiently with batch operations
    const mentionUsernames = ContentValidation.extractMentions(content);
    const mentions = [];

    if (mentionUsernames.length > 0) {
      logger.debug('Processing mentions with batch lookup', {
        mentionCount: mentionUsernames.length,
        usernames: mentionUsernames,
      });

      // Batch lookup all mentioned users in a single query (prevents N+1 queries)
      const mentionedUsers = await this.userRepository.findByUsernames(mentionUsernames);

      if (mentionedUsers.length > 0) {
        // Prepare mentions for response
        mentions.push(...mentionedUsers);

        // Batch create mention records (single transaction)
        const mentionData = mentionedUsers.map((user) => ({
          postId: post.id,
          mentionedUserId: user.id,
        }));

        await this.mentionRepository.createBatch(mentionData);

        logger.debug('Mentions processed successfully', {
          foundUsers: mentionedUsers.length,
          requestedUsers: mentionUsernames.length,
        });
      } else {
        logger.debug('No valid users found for mentions', {
          requestedUsernames: mentionUsernames,
        });
      }
    }

    // Add to timeline cache
    const timelinePost: TimelinePost = {
      id: post.id,
      userId: post.userId,
      username: user.username,
      content: post.content,
      createdAt: post.createdAt,
      mentions: mentions || [],
    };

    try {
      await this.cacheService.addToTimeline(timelinePost);
    } catch (error) {
      logger.warn('Failed to add post to timeline cache', { error, postId: post.id });
      // Continue without cache - fallback to database
    }

    logger.info('Post created successfully', {
      postId: post.id,
      userId,
      mentionsCount: mentions.length,
    });

    return {
      id: post.id,
      userId: post.userId,
      content: post.content,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      isDeleted: post.isDeleted,
      user: {
        id: user.id,
        username: user.username,
      },
      mentions,
    };
  }

  async getPost(postId: number): Promise<PostWithUserAndMentions> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post not found');
    }

    return post;
  }

  async getUserPosts(userId: number, page = 1, limit = 20): Promise<PaginatedPosts> {
    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const pagination = new Pagination(page, limit);
    return await this.postRepository.findByUserId(userId, pagination);
  }

  async deletePost(postId: number, userId: number): Promise<void> {
    // Verify post exists and user is owner
    const isOwner = await this.postRepository.isOwner(postId, userId);
    if (!isOwner) {
      const postExists = await this.postRepository.exists(postId);
      if (!postExists) {
        throw new NotFoundError('Post not found');
      }
      throw new ForbiddenError('You can only delete your own posts');
    }

    // Get post data for cache removal
    const post = await this.postRepository.findByIdWithUser(postId);

    // Soft delete the post
    await this.postRepository.softDelete(postId);

    // Remove mentions
    await this.mentionRepository.deleteByPostId(postId);

    // Remove from timeline cache
    if (post) {
      try {
        await this.cacheService.removeFromTimeline(postId, post.createdAt.getTime());
      } catch (error) {
        logger.warn('Failed to remove post from timeline cache', { error, postId });
        // Continue without cache error - data is already deleted from database
      }
    }

    logger.info('Post deleted successfully', { postId, userId });
  }

  async getTimeline(
    page = 1,
    limit = 20
  ): Promise<{ posts: TimelinePost[]; total: number; hasMore: boolean }> {
    const offset = (page - 1) * limit;

    try {
      // Try to get from cache first
      const cachedPosts = await this.cacheService.getTimeline(offset, offset + limit - 1);

      if (cachedPosts.length > 0) {
        const totalCached = await this.cacheService.getTimelineCount();

        logger.debug('Timeline served from cache', {
          postsCount: cachedPosts.length,
          page,
          totalCached,
        });

        return {
          posts: cachedPosts,
          total: totalCached,
          hasMore: offset + limit < totalCached,
        };
      }
    } catch (error) {
      logger.warn('Failed to get timeline from cache, falling back to database', { error });
    }

    // Fallback to database
    const pagination = new Pagination(page, limit);
    const { posts, total } = await this.postRepository.findAll(pagination);

    // Convert to timeline format
    const timelinePosts: TimelinePost[] = posts.map((post) => ({
      id: post.id,
      userId: post.userId,
      username: post.user.username,
      content: post.content,
      createdAt: post.createdAt,
      mentions: post.mentions || [],
    }));

    logger.debug('Timeline served from database', {
      postsCount: timelinePosts.length,
      page,
      total,
    });

    return {
      posts: timelinePosts,
      total,
      hasMore: page * limit < total,
    };
  }

  async refreshTimelineCache(): Promise<{ processed: number; errors: number }> {
    try {
      // Clear existing cache
      await this.cacheService.clearTimeline();

      // Get recent posts from database
      const pagination = new Pagination(1, 1000); // Get last 1000 posts
      const { posts } = await this.postRepository.findAll(pagination);

      let processed = 0;
      let errors = 0;

      // Add posts to cache
      for (const post of posts) {
        try {
          const timelinePost: TimelinePost = {
            id: post.id,
            userId: post.userId,
            username: post.user.username,
            content: post.content,
            createdAt: post.createdAt,
            mentions: post.mentions || [],
          };

          await this.cacheService.addToTimeline(timelinePost);
          processed++;
        } catch (error) {
          logger.error('Failed to add post to cache during refresh', { error, postId: post.id });
          errors++;
        }
      }

      logger.info('Timeline cache refreshed', { processed, errors });

      return { processed, errors };
    } catch (error) {
      logger.error('Failed to refresh timeline cache', { error });
      throw error;
    }
  }

  async getPostStats(): Promise<{ totalPosts: number; postsToday: number }> {
    const totalPosts = await this.postRepository.count();

    // For postsToday, we'd need a method to count posts created today
    // This would require additional repository methods or a raw query
    // For now, returning 0 as placeholder
    const postsToday = 0;

    return { totalPosts, postsToday };
  }
}
