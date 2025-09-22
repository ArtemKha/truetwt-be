import { ICacheService } from '@application/ports/external/ICacheService';
import { TimelinePost } from '@domain/entities/Post';
import { logger } from '@shared/utils/logger';

interface CacheItem {
  value: string;
  expiresAt?: number;
}

export class InMemoryCacheService implements ICacheService {
  private cache = new Map<string, CacheItem>();
  private timeline: { post: TimelinePost; score: number }[] = [];
  private readonly maxTimelineSize: number;

  constructor(maxTimelineSize = 1000) {
    this.maxTimelineSize = maxTimelineSize;
    logger.info('In-memory cache service initialized', { maxTimelineSize });

    // Cleanup expired items every 5 minutes
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
  }

  async addToTimeline(post: TimelinePost): Promise<void> {
    try {
      const score = post.createdAt.getTime();
      this.timeline.push({ post, score });

      // Sort by score (timestamp) in descending order
      this.timeline.sort((a, b) => b.score - a.score);

      // Limit timeline size
      if (this.timeline.length > this.maxTimelineSize) {
        this.timeline = this.timeline.slice(0, this.maxTimelineSize);
      }

      logger.debug('Post added to in-memory timeline', { postId: post.id });
    } catch (error) {
      logger.error('Failed to add post to in-memory timeline', { error, postId: post.id });
      throw error;
    }
  }

  async getTimeline(start: number, stop: number): Promise<TimelinePost[]> {
    try {
      const endIndex = Math.min(stop + 1, this.timeline.length);
      const startIndex = Math.min(start, endIndex);

      return this.timeline.slice(startIndex, endIndex).map((item) => item.post);
    } catch (error) {
      logger.error('Failed to get timeline from in-memory cache', { error, start, stop });
      return [];
    }
  }

  async removeFromTimeline(postId: number, timestamp: number): Promise<void> {
    try {
      const index = this.timeline.findIndex(
        (item) => item.post.id === postId && item.score === timestamp
      );

      if (index >= 0) {
        this.timeline.splice(index, 1);
        logger.debug('Post removed from in-memory timeline', { postId });
      }
    } catch (error) {
      logger.error('Failed to remove post from in-memory timeline', { error, postId, timestamp });
      throw error;
    }
  }

  async getTimelineCount(): Promise<number> {
    return this.timeline.length;
  }

  async clearTimeline(): Promise<void> {
    this.timeline = [];
    logger.info('In-memory timeline cleared');
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      const cacheItem: CacheItem = {
        value,
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
      };

      this.cache.set(key, cacheItem);
    } catch (error) {
      logger.error('Failed to set in-memory cache value', { error, key });
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const item = this.cache.get(key);

      if (!item) return null;

      // Check if item has expired
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.cache.delete(key);
        return null;
      }

      return item.value;
    } catch (error) {
      logger.error('Failed to get in-memory cache value', { error, key });
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      this.cache.delete(key);
    } catch (error) {
      logger.error('Failed to delete in-memory cache value', { error, key });
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const item = this.cache.get(key);

      if (!item) return false;

      // Check if item has expired
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.cache.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to check in-memory cache key existence', { error, key });
      return false;
    }
  }

  async flush(): Promise<void> {
    try {
      this.cache.clear();
      this.timeline = [];
      logger.info('In-memory cache flushed');
    } catch (error) {
      logger.error('Failed to flush in-memory cache', { error });
      throw error;
    }
  }

  async isConnected(): Promise<boolean> {
    return true; // In-memory cache is always "connected"
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      logger.debug('Cleaned up expired cache items', { count: keysToDelete.length });
    }
  }
}
