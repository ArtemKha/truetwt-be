import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryCacheService } from '../../../src/infrastructure/cache/InMemoryCacheService';

describe('InMemoryCacheService Integration Tests', () => {
  let cacheService: InMemoryCacheService;

  beforeEach(() => {
    cacheService = new InMemoryCacheService();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get cache values successfully', async () => {
      const key = 'test-key';
      const value = { message: 'Hello, World!', timestamp: Date.now() };

      await cacheService.set(key, JSON.stringify(value));
      const retrievedValue = await cacheService.get(key);

      expect(JSON.parse(retrievedValue!)).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should delete cache entries successfully', async () => {
      const key = 'delete-test';
      const value = 'test-value';

      await cacheService.set(key, value);
      expect(await cacheService.get(key)).toBe(value);

      await cacheService.delete(key);
      expect(await cacheService.get(key)).toBeNull();
    });

    it('should handle multiple keys independently', async () => {
      const key1 = 'key1';
      const key2 = 'key2';
      const value1 = 'value1';
      const value2 = { data: 'value2' };

      await cacheService.set(key1, value1);
      await cacheService.set(key2, JSON.stringify(value2));

      expect(await cacheService.get(key1)).toBe(value1);
      expect(JSON.parse((await cacheService.get(key2))!)).toEqual(value2);

      await cacheService.delete(key1);
      expect(await cacheService.get(key1)).toBeNull();
      expect(JSON.parse((await cacheService.get(key2))!)).toEqual(value2);
    });
  });

  describe('Data Type Handling', () => {
    it('should handle string values', async () => {
      const key = 'string-test';
      const value = 'Hello, World!';

      await cacheService.set(key, value);
      const result = await cacheService.get(key);

      expect(result).toBe(value);
      expect(typeof result).toBe('string');
    });

    it('should handle number values', async () => {
      const key = 'number-test';
      const value = 42;

      await cacheService.set(key, String(value));
      const result = await cacheService.get(key);

      expect(result).toBe(String(value));
      expect(typeof result).toBe('string');
    });

    it('should handle boolean values', async () => {
      const key = 'boolean-test';
      const value = true;

      await cacheService.set(key, String(value));
      const result = await cacheService.get(key);

      expect(result).toBe(String(value));
      expect(typeof result).toBe('string');
    });

    it('should handle object values', async () => {
      const key = 'object-test';
      const value = {
        id: 1,
        name: 'Test Object',
        nested: {
          property: 'nested value',
        },
        array: [1, 2, 3],
      };

      await cacheService.set(key, JSON.stringify(value));
      const result = await cacheService.get(key);

      expect(JSON.parse(result!)).toEqual(value);
      expect(typeof JSON.parse(result!)).toBe('object');
    });

    it('should handle array values', async () => {
      const key = 'array-test';
      const value = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
      ];

      await cacheService.set(key, JSON.stringify(value));
      const result = await cacheService.get(key);

      expect(JSON.parse(result!)).toEqual(value);
      expect(Array.isArray(JSON.parse(result!))).toBe(true);
    });

    it('should handle null values', async () => {
      const key = 'null-test';
      const value = null;

      await cacheService.set(key, String(value));
      const result = await cacheService.get(key);

      expect(result).toBe('null');
    });

    it('should handle undefined values by not storing them', async () => {
      const key = 'undefined-test';
      const value = undefined;

      // @ts-expect-error - value is undefined
      await cacheService.set(key, value);
      const result = await cacheService.get(key);

      // Undefined values get converted to string "undefined"
      expect(result).toBe('undefined');
    });
  });

  describe('Cache Expiration', () => {
    it('should handle TTL expiration correctly', async () => {
      const key = 'ttl-test';
      const value = 'expires soon';
      const ttlSeconds = 1; // 1 second

      await cacheService.set(key, value, ttlSeconds);

      // Should be available immediately
      expect(await cacheService.get(key)).toBe(value);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be expired
      expect(await cacheService.get(key)).toBeNull();
    });

    it('should handle very short TTL correctly', async () => {
      const key = 'short-ttl-test';
      const value = 'expires very soon';
      const ttlSeconds = 0.1; // 100ms

      await cacheService.set(key, value, ttlSeconds);

      // Should be available immediately
      expect(await cacheService.get(key)).toBe(value);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be expired
      expect(await cacheService.get(key)).toBeNull();
    });

    it('should not expire entries without TTL', async () => {
      const key = 'no-ttl-test';
      const value = 'never expires';

      await cacheService.set(key, value);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should still be available
      expect(await cacheService.get(key)).toBe(value);
    });

    it('should update TTL when setting existing key', async () => {
      const key = 'update-ttl-test';
      const value1 = 'first value';
      const value2 = 'second value';

      // Set with short TTL
      await cacheService.set(key, value1, 0.1);

      // Immediately update with longer TTL
      await cacheService.set(key, value2, 2);

      // Wait for original TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should still be available with new value
      expect(await cacheService.get(key)).toBe(value2);
    });
  });

  describe('Timeline Cache Operations', () => {
    it('should add posts to timeline cache', async () => {
      const posts = [
        {
          id: 'post-1',
          content: 'First post',
          userId: 'user-1',
          username: 'john_doe',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'post-2',
          content: 'Second post',
          userId: 'user-2',
          username: 'jane_smith',
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
      ];

      await cacheService.addToTimeline(posts[0]);
      await cacheService.addToTimeline(posts[1]);

      const timeline = await cacheService.getTimeline(0, 9);

      expect(timeline).toHaveLength(2);

      // Should be ordered by creation date (newest first)
      expect(timeline[0].id).toBe('post-2');
      expect(timeline[1].id).toBe('post-1');
    });

    it('should handle timeline pagination correctly', async () => {
      // Add multiple posts
      for (let i = 1; i <= 5; i++) {
        await cacheService.addToTimeline({
          id: `post-${i}`,
          content: `Post ${i}`,
          userId: `user-${i}`,
          username: `user${i}`,
          createdAt: new Date(`2024-01-01T${10 + i}:00:00Z`),
        });
      }

      // Get first 2 posts
      const firstTwo = await cacheService.getTimeline(0, 1);
      expect(firstTwo).toHaveLength(2);
      expect(firstTwo[0].id).toBe('post-5'); // Newest first

      // Get next 2 posts
      const nextTwo = await cacheService.getTimeline(2, 3);
      expect(nextTwo).toHaveLength(2);
      expect(nextTwo[0].id).toBe('post-3');
      expect(nextTwo[1].id).toBe('post-2');
    });

    it('should remove posts from timeline cache', async () => {
      const post = {
        id: 1,
        content: 'This will be removed',
        userId: 'user-1',
        username: 'john_doe',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      };

      await cacheService.addToTimeline(post);

      let timeline = await cacheService.getTimeline(0, 9);
      expect(timeline).toHaveLength(1);
      expect(timeline[0].id).toBe(post.id);

      await cacheService.removeFromTimeline(post.id, post.createdAt.getTime());

      timeline = await cacheService.getTimeline(0, 9);
      expect(timeline).toHaveLength(0);
    });

    it('should handle empty timeline gracefully', async () => {
      const timeline = await cacheService.getTimeline(0, 9);

      expect(timeline).toEqual([]);
    });

    it('should clear entire timeline cache', async () => {
      // Add some posts
      for (let i = 1; i <= 3; i++) {
        await cacheService.addToTimeline({
          id: `post-${i}`,
          content: `Post ${i}`,
          userId: `user-${i}`,
          username: `user${i}`,
          createdAt: new Date(`2024-01-01T${10 + i}:00:00Z`),
        });
      }

      let timeline = await cacheService.getTimeline(0, 9);
      expect(timeline).toHaveLength(3);

      await cacheService.clearTimeline();

      timeline = await cacheService.getTimeline(0, 9);
      expect(timeline).toEqual([]);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent set operations', async () => {
      const operations: Promise<void>[] = [];

      for (let i = 0; i < 10; i++) {
        operations.push(cacheService.set(`concurrent-key-${i}`, `value-${i}`));
      }

      await Promise.all(operations);

      // Verify all values were set correctly
      for (let i = 0; i < 10; i++) {
        const value = await cacheService.get(`concurrent-key-${i}`);
        expect(value).toBe(`value-${i}`);
      }
    });

    it('should handle concurrent timeline operations', async () => {
      const operations: Promise<void>[] = [];

      for (let i = 0; i < 10; i++) {
        operations.push(
          cacheService.addToTimeline({
            id: `concurrent-post-${i}`,
            content: `Concurrent post ${i}`,
            userId: `user-${i}`,
            username: `user${i}`,
            createdAt: new Date(`2024-01-01T${10 + i}:00:00Z`),
          })
        );
      }

      await Promise.all(operations);

      const timeline = await cacheService.getTimeline(0, 19);
      expect(timeline).toHaveLength(10);
    });
  });

  describe('Memory Management', () => {
    it('should handle large objects without issues', async () => {
      const largeObject = {
        id: 'large-object',
        data: Array.from({ length: 1000 }, (_, i) => ({
          index: i,
          value: `item-${i}`,
          nested: {
            property: `nested-${i}`,
            array: Array.from({ length: 10 }, (_, j) => j),
          },
        })),
      };

      await cacheService.set('large-object-key', JSON.stringify(largeObject));
      const retrieved = await cacheService.get('large-object-key');

      const parsedRetrieved = JSON.parse(retrieved!);
      expect(parsedRetrieved).toEqual(largeObject);
      expect(parsedRetrieved.data).toHaveLength(1000);
    });

    it('should handle many cache entries', async () => {
      const entryCount = 1000;

      // Set many entries
      const setOperations: Promise<void>[] = [];
      for (let i = 0; i < entryCount; i++) {
        setOperations.push(
          cacheService.set(`entry-${i}`, JSON.stringify({ index: i, data: `data-${i}` }))
        );
      }
      await Promise.all(setOperations);

      // Verify random entries
      const randomIndices = [0, 100, 500, 999];
      for (const index of randomIndices) {
        const value = await cacheService.get(`entry-${index}`);
        const parsedValue = JSON.parse(value!);
        expect(parsedValue).toEqual({ index, data: `data-${index}` });
      }
    });
  });
});
