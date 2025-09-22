import { ICacheService } from '@application/ports/external/ICacheService';
import { TimelinePost } from '@domain/entities/Post';
import { logger } from '@shared/utils/logger';
import { createClient, RedisClientType } from 'redis';

export class RedisCacheService implements ICacheService {
  private client: RedisClientType;
  private readonly TIMELINE_KEY = 'timeline:global';

  constructor(redisUrl: string, password?: string, db = 0) {
    this.client = createClient({
      url: redisUrl,
      password,
      database: db,
      // Enhanced Redis v5 configuration
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
        connectTimeout: 5000,
      },
    });

    this.client.on('error', (error) => {
      logger.error('Redis connection error', { error });
    });

    this.client.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Redis cache service initialized');
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      logger.info('Redis disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Redis', { error });
      throw error;
    }
  }

  async addToTimeline(post: TimelinePost): Promise<void> {
    try {
      const score = post.createdAt.getTime();
      const value = JSON.stringify(post);
      await this.client.zAdd(this.TIMELINE_KEY, { score, value });
      logger.debug('Post added to timeline cache', { postId: post.id });
    } catch (error) {
      logger.error('Failed to add post to timeline cache', { error, postId: post.id });
      throw error;
    }
  }

  async getTimeline(start: number, stop: number): Promise<TimelinePost[]> {
    try {
      // Use latest Redis v5 syntax with proper typing
      const posts = await this.client.zRange(this.TIMELINE_KEY, start, stop, { REV: true });
      return posts.map((post: string) => JSON.parse(post) as TimelinePost);
    } catch (error) {
      logger.error('Failed to get timeline from cache', { error, start, stop });
      return [];
    }
  }

  // New method using Redis v5 scan iterators for large datasets
  async *scanTimelineKeys(pattern = '*'): AsyncGenerator<string[], void, unknown> {
    try {
      for await (const keys of this.client.scanIterator({
        MATCH: pattern,
        COUNT: 100,
      })) {
        yield keys;
      }
    } catch (error) {
      logger.error('Failed to scan timeline keys', { error, pattern });
    }
  }

  async removeFromTimeline(postId: number, timestamp: number): Promise<void> {
    try {
      // Find and remove the specific post by score range
      const posts = await this.client.zRangeByScore(this.TIMELINE_KEY, timestamp, timestamp);

      for (const postJson of posts) {
        const post = JSON.parse(postJson);
        if (post.id === postId) {
          await this.client.zRem(this.TIMELINE_KEY, postJson);
          logger.debug('Post removed from timeline cache', { postId });
          break;
        }
      }
    } catch (error) {
      logger.error('Failed to remove post from timeline cache', { error, postId, timestamp });
      throw error;
    }
  }

  async getTimelineCount(): Promise<number> {
    try {
      return await this.client.zCard(this.TIMELINE_KEY);
    } catch (error) {
      logger.error('Failed to get timeline count from cache', { error });
      return 0;
    }
  }

  async clearTimeline(): Promise<void> {
    try {
      await this.client.del(this.TIMELINE_KEY);
      logger.info('Timeline cache cleared');
    } catch (error) {
      logger.error('Failed to clear timeline cache', { error });
      throw error;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Failed to set cache value', { error, key });
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Failed to get cache value', { error, key });
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Failed to delete cache value', { error, key });
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Failed to check cache key existence', { error, key });
      return false;
    }
  }

  async flush(): Promise<void> {
    try {
      await this.client.flushDb();
      logger.info('Cache flushed');
    } catch (error) {
      logger.error('Failed to flush cache', { error });
      throw error;
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed', { error });
      return false;
    }
  }
}
