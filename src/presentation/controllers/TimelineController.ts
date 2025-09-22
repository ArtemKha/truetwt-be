import { PostService } from '@application/services/PostService';
import { TimelineCacheService } from '@application/services/TimelineCacheService';
import { logger } from '@shared/utils/logger';
import { Request, Response } from 'express';
import { TimelineQuery } from '../schemas/post.schemas';

export class TimelineController {
  constructor(
    private postService: PostService,
    private timelineCacheService: TimelineCacheService
  ) {}

  async getTimeline(req: Request, res: Response) {
    const { page, limit }: TimelineQuery = req.query as any;

    const result = await this.postService.getTimeline(page, limit);

    res.json({
      success: true,
      data: {
        posts: result.posts,
        pagination: {
          total: result.total,
          page,
          limit,
          hasNext: result.hasMore,
          hasPrev: page > 1,
        },
      },
    });
  }

  async refreshCache(req: Request, res: Response) {
    // This endpoint could be protected to admin users only
    logger.info('Timeline cache refresh requested', { userId: req.user?.userId });

    const result = await this.postService.refreshTimelineCache();

    res.json({
      success: true,
      data: {
        message: 'Timeline cache refreshed successfully',
        processed: result.processed,
        errors: result.errors,
      },
    });
  }

  async getCacheStats(req: Request, res: Response) {
    const healthCheck = await this.timelineCacheService.healthCheck();
    const consistency = await this.timelineCacheService.validateCacheConsistency(20);

    res.json({
      success: true,
      data: {
        cache: {
          isConnected: healthCheck.isConnected,
          size: healthCheck.cacheSize,
          consistency: {
            isConsistent: consistency.consistent,
            totalCached: consistency.totalCached,
            totalDatabase: consistency.totalDatabase,
            discrepancies: consistency.discrepancies,
          },
        },
      },
    });
  }

  async clearCache(req: Request, res: Response) {
    // This endpoint should be protected to admin users only
    logger.warn('Timeline cache clear requested', { userId: req.user?.userId });

    await this.timelineCacheService.clearCache();

    res.json({
      success: true,
      message: 'Timeline cache cleared successfully',
    });
  }
}
