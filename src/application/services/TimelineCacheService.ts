import { ICacheService } from '@application/ports/external/ICacheService';
import { IPostRepository } from '@application/ports/repositories/IPostRepository';
import { TimelinePost } from '@domain/entities/Post';
import { Pagination } from '@domain/value-objects/Pagination';
import { logger } from '@shared/utils/logger';

export class TimelineCacheService {
  constructor(
    private cacheService: ICacheService,
    private postRepository: IPostRepository
  ) {}

  async warmupCache(maxPosts = 100): Promise<{ processed: number; errors: number }> {
    logger.info('Starting timeline cache warmup', { maxPosts });

    try {
      // Clear existing cache
      await this.cacheService.clearTimeline();

      // Get recent posts from database
      const pagination = new Pagination(1, maxPosts);
      const { posts } = await this.postRepository.findAll(pagination);

      let processed = 0;
      let errors = 0;

      // Add posts to cache in reverse order (oldest first) to maintain chronological order
      const reversedPosts = [...posts].reverse();

      for (const post of reversedPosts) {
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
          logger.error('Failed to add post to cache during warmup', {
            error,
            postId: post.id,
          });
          errors++;
        }
      }

      logger.info('Timeline cache warmup completed', { processed, errors, maxPosts });

      return { processed, errors };
    } catch (error) {
      logger.error('Timeline cache warmup failed', { error });
      throw error;
    }
  }

  async addPost(post: TimelinePost): Promise<void> {
    try {
      await this.cacheService.addToTimeline(post);
      logger.debug('Post added to timeline cache', { postId: post.id });
    } catch (error) {
      logger.error('Failed to add post to timeline cache', { error, postId: post.id });
      throw error;
    }
  }

  async removePost(postId: number, timestamp: number): Promise<void> {
    try {
      await this.cacheService.removeFromTimeline(postId, timestamp);
      logger.debug('Post removed from timeline cache', { postId });
    } catch (error) {
      logger.error('Failed to remove post from timeline cache', {
        error,
        postId,
        timestamp,
      });
      throw error;
    }
  }

  async getTimeline(start: number, stop: number): Promise<TimelinePost[]> {
    try {
      return await this.cacheService.getTimeline(start, stop);
    } catch (error) {
      logger.error('Failed to get timeline from cache', { error, start, stop });
      return [];
    }
  }

  async getTimelineCount(): Promise<number> {
    try {
      return await this.cacheService.getTimelineCount();
    } catch (error) {
      logger.error('Failed to get timeline count from cache', { error });
      return 0;
    }
  }

  async clearCache(): Promise<void> {
    try {
      await this.cacheService.clearTimeline();
      logger.info('Timeline cache cleared');
    } catch (error) {
      logger.error('Failed to clear timeline cache', { error });
      throw error;
    }
  }

  async healthCheck(): Promise<{ isConnected: boolean; cacheSize: number }> {
    try {
      const isConnected = await this.cacheService.isConnected();
      const cacheSize = isConnected ? await this.cacheService.getTimelineCount() : 0;

      return { isConnected, cacheSize };
    } catch (error) {
      logger.error('Timeline cache health check failed', { error });
      return { isConnected: false, cacheSize: 0 };
    }
  }

  async validateCacheConsistency(sampleSize = 10): Promise<{
    consistent: boolean;
    totalCached: number;
    totalDatabase: number;
    discrepancies: number;
  }> {
    try {
      const totalCached = await this.cacheService.getTimelineCount();
      const totalDatabase = await this.postRepository.count();

      // Get a sample of posts from cache
      const cachedPosts = await this.cacheService.getTimeline(0, sampleSize - 1);

      let discrepancies = 0;

      // Check if cached posts exist in database
      for (const cachedPost of cachedPosts) {
        const existsInDb = await this.postRepository.exists(cachedPost.id);
        if (!existsInDb) {
          discrepancies++;
          logger.warn('Post exists in cache but not in database', {
            postId: cachedPost.id,
          });
        }
      }

      const consistent = discrepancies === 0 && Math.abs(totalCached - totalDatabase) < 10;

      logger.info('Cache consistency check completed', {
        consistent,
        totalCached,
        totalDatabase,
        discrepancies,
        sampleSize,
      });

      return {
        consistent,
        totalCached,
        totalDatabase,
        discrepancies,
      };
    } catch (error) {
      logger.error('Cache consistency validation failed', { error });
      return {
        consistent: false,
        totalCached: 0,
        totalDatabase: 0,
        discrepancies: -1,
      };
    }
  }

  // TODO: CACHE STALENESS FIX - Add proactive cache monitoring
  // Implement methods to detect and prevent cache staleness:
  // 1. Periodic consistency checks between cache and database
  // 2. Automatic cache repair when inconsistencies detected
  // 3. Cache warming strategies for high-traffic periods
  // 4. Metrics collection for cache hit/miss rates
  // 5. Alerting when cache becomes significantly stale
  // async scheduleConsistencyChecks(intervalMinutes: number): Promise<void>
  // async repairInconsistencies(): Promise<{ fixed: number; errors: number }>
}
