import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryCacheService } from '../../../src/infrastructure/cache/InMemoryCacheService';

describe('Timeline Cache Integration Tests', () => {
  let cacheService: InMemoryCacheService;

  beforeEach(() => {
    cacheService = new InMemoryCacheService();
  });

  describe('Timeline Post Management', () => {
    it('should add post to timeline successfully', async () => {
      const post = {
        id: 1,
        content: 'Hello, World!',
        userId: 1,
        username: 'john_doe',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        mentions: [],
      };

      await cacheService.addToTimeline(post);

      const timeline = await cacheService.getTimeline(0, 9);
      expect(timeline).toHaveLength(1);
      expect(timeline[0]).toMatchObject({
        id: post.id,
        content: post.content,
        userId: post.userId,
        username: post.username,
      });
    });

    it('should maintain chronological order (newest first)', async () => {
      const posts = [
        {
          id: 1,
          content: 'First post',
          userId: 1,
          username: 'john_doe',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          mentions: [],
        },
        {
          id: 2,
          content: 'Second post',
          userId: 2,
          username: 'jane_smith',
          createdAt: new Date('2024-01-01T11:00:00Z'),
          mentions: [],
        },
        {
          id: 3,
          content: 'Third post',
          userId: 1,
          username: 'john_doe',
          createdAt: new Date('2024-01-01T12:00:00Z'),
          mentions: [],
        },
      ];

      // Add posts in random order
      await cacheService.addToTimeline(posts[1]);
      await cacheService.addToTimeline(posts[0]);
      await cacheService.addToTimeline(posts[2]);

      const timeline = await cacheService.getTimeline(0, 9);
      expect(timeline).toHaveLength(3);

      // Should be ordered by creation time (newest first)
      expect(timeline[0].id).toBe(3);
      expect(timeline[1].id).toBe(2);
      expect(timeline[2].id).toBe(1);
    });

    it('should remove post from timeline successfully', async () => {
      const post1 = {
        id: 1,
        content: 'First post',
        userId: 1,
        username: 'john_doe',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        mentions: [],
      };

      const post2 = {
        id: 2,
        content: 'Second post',
        userId: 2,
        username: 'jane_smith',
        createdAt: new Date('2024-01-01T11:00:00Z'),
        mentions: [],
      };

      // Add posts
      await cacheService.addToTimeline(post1);
      await cacheService.addToTimeline(post2);

      let timeline = await cacheService.getTimeline(0, 9);
      expect(timeline).toHaveLength(2);

      // Remove one post (need timestamp for removal)
      await cacheService.removeFromTimeline(post1.id, post1.createdAt.getTime());

      timeline = await cacheService.getTimeline(0, 9);
      expect(timeline).toHaveLength(1);
      expect(timeline[0].id).toBe(2);
    });

    it('should handle posts with mentions correctly', async () => {
      const postWithMentions = {
        id: 1,
        content: 'Hello @jane_smith and @bob_wilson!',
        userId: 1,
        username: 'john_doe',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        mentions: [
          { id: 2, username: 'jane_smith' },
          { id: 3, username: 'bob_wilson' },
        ],
      };

      await cacheService.addToTimeline(postWithMentions);

      const timeline = await cacheService.getTimeline(0, 9);
      expect(timeline[0].mentions).toEqual([
        { id: 2, username: 'jane_smith' },
        { id: 3, username: 'bob_wilson' },
      ]);
    });

    it('should clear timeline successfully', async () => {
      const post = {
        id: 1,
        content: 'Test post',
        userId: 1,
        username: 'john_doe',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        mentions: [],
      };

      await cacheService.addToTimeline(post);
      let timeline = await cacheService.getTimeline(0, 9);
      expect(timeline).toHaveLength(1);

      await cacheService.clearTimeline();
      timeline = await cacheService.getTimeline(0, 9);
      expect(timeline).toHaveLength(0);
    });

    it('should get timeline count correctly', async () => {
      expect(await cacheService.getTimelineCount()).toBe(0);

      const post = {
        id: 1,
        content: 'Test post',
        userId: 1,
        username: 'john_doe',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        mentions: [],
      };

      await cacheService.addToTimeline(post);
      expect(await cacheService.getTimelineCount()).toBe(1);
    });
  });

  describe('Timeline Pagination', () => {
    it('should handle range queries correctly', async () => {
      // Create 5 posts
      for (let i = 1; i <= 5; i++) {
        await cacheService.addToTimeline({
          id: i,
          content: `Post ${i}`,
          userId: 1,
          username: 'testuser',
          createdAt: new Date(`2024-01-01T${10 + i}:00:00Z`),
          mentions: [],
        });
      }

      // Get first 3 posts (0-2)
      const firstThree = await cacheService.getTimeline(0, 2);
      expect(firstThree).toHaveLength(3);
      expect(firstThree[0].id).toBe(5); // Newest first
      expect(firstThree[2].id).toBe(3);

      // Get next 2 posts (3-4)
      const nextTwo = await cacheService.getTimeline(3, 4);
      expect(nextTwo).toHaveLength(2);
      expect(nextTwo[0].id).toBe(2);
      expect(nextTwo[1].id).toBe(1);
    });

    it('should handle empty timeline', async () => {
      const timeline = await cacheService.getTimeline(0, 9);
      expect(timeline).toEqual([]);
    });

    it('should handle out-of-bounds ranges', async () => {
      const post = {
        id: 1,
        content: 'Single post',
        userId: 1,
        username: 'testuser',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        mentions: [],
      };

      await cacheService.addToTimeline(post);

      // Request beyond available range
      const timeline = await cacheService.getTimeline(5, 10);
      expect(timeline).toEqual([]);
    });
  });
});
