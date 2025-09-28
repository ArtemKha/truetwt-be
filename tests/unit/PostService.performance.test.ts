import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PostService } from '../../src/application/services/PostService';
import { CreateUserData } from '../../src/domain/entities/User';
import { InMemoryCacheService } from '../../src/infrastructure/cache/InMemoryCacheService';
import { SQLiteMentionRepository } from '../../src/infrastructure/repositories/SQLiteMentionRepository';
import { SQLitePostRepository } from '../../src/infrastructure/repositories/SQLitePostRepository';
import { SQLiteUserRepository } from '../../src/infrastructure/repositories/SQLiteUserRepository';

describe('PostService Performance Tests', () => {
  let db: Database.Database;
  let postService: PostService;
  let userRepository: SQLiteUserRepository;

  beforeEach(async () => {
    // Create in-memory database for testing
    db = new Database(':memory:');

    // Create tables
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL CHECK(length(content) <= 280),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE mentions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        mentioned_user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (mentioned_user_id) REFERENCES users(id)
      );
    `);

    // Initialize repositories and service
    userRepository = new SQLiteUserRepository(db);
    const postRepository = new SQLitePostRepository(db);
    const mentionRepository = new SQLiteMentionRepository(db);
    const cacheService = new InMemoryCacheService();

    postService = new PostService(postRepository, userRepository, mentionRepository, cacheService);

    // Create test users
    const users: (CreateUserData & { passwordHash: string })[] = [];
    for (let i = 1; i <= 20; i++) {
      users.push({
        username: `testuser${i}`,
        email: `testuser${i}@example.com`,
        password: 'password',
        passwordHash: 'hashedpassword',
      });
    }

    // Insert users
    for (const user of users) {
      await userRepository.create(user);
    }
  });

  afterEach(() => {
    db.close();
  });

  describe('Mention Processing Performance', () => {
    it('should efficiently process posts with multiple mentions', async () => {
      // Create a post with multiple mentions
      const postContent =
        'Hello @testuser1 @testuser2 @testuser3 @testuser4 @testuser5! How are you all doing?';

      const start = performance.now();
      const result = await postService.createPost(1, postContent);
      const end = performance.now();

      const executionTime = end - start;
      console.log(`Post creation with 5 mentions: ${executionTime.toFixed(2)}ms`);

      // Verify the post was created correctly
      expect(result.content).toBe(postContent);
      expect(result.mentions).toHaveLength(5);

      // Verify all mentioned users were found
      const mentionedUsernames = result.mentions.map((m) => m.username).sort();
      expect(mentionedUsernames).toEqual([
        'testuser1',
        'testuser2',
        'testuser3',
        'testuser4',
        'testuser5',
      ]);

      // Should complete in reasonable time
      expect(executionTime).toBeLessThan(100); // Should be under 100ms
    });

    it('should handle posts with many mentions efficiently', async () => {
      // Create a post with 10 mentions
      const mentions = Array.from({ length: 10 }, (_, i) => `@testuser${i + 1}`).join(' ');
      const postContent = `Big announcement! ${mentions} please check this out!`;

      const start = performance.now();
      const result = await postService.createPost(1, postContent);
      const end = performance.now();

      const executionTime = end - start;
      console.log(`Post creation with 10 mentions: ${executionTime.toFixed(2)}ms`);

      // Verify the post was created correctly
      expect(result.mentions).toHaveLength(10);

      // Should still complete in reasonable time
      expect(executionTime).toBeLessThan(150); // Should be under 150ms
    });

    it('should handle posts with duplicate mentions efficiently', async () => {
      // Create a post with duplicate mentions
      const postContent = 'Hey @testuser1 and @testuser2, also @testuser1 again!';

      const start = performance.now();
      const result = await postService.createPost(1, postContent);
      const end = performance.now();

      const executionTime = end - start;
      console.log(`Post creation with duplicate mentions: ${executionTime.toFixed(2)}ms`);

      // Should handle duplicates correctly (unique users only)
      expect(result.mentions).toHaveLength(2);
      const mentionedUsernames = result.mentions.map((m) => m.username).sort();
      expect(mentionedUsernames).toEqual(['testuser1', 'testuser2']);

      expect(executionTime).toBeLessThan(100);
    });

    it('should handle posts with non-existent mentions gracefully', async () => {
      // Create a post with mix of existing and non-existing mentions
      const postContent = 'Hello @testuser1 @nonexistent @testuser2 @alsononexistent!';

      const start = performance.now();
      const result = await postService.createPost(1, postContent);
      const end = performance.now();

      const executionTime = end - start;
      console.log(`Post creation with mixed mentions: ${executionTime.toFixed(2)}ms`);

      // Should only include existing users
      expect(result.mentions).toHaveLength(2);
      const mentionedUsernames = result.mentions.map((m) => m.username).sort();
      expect(mentionedUsernames).toEqual(['testuser1', 'testuser2']);

      expect(executionTime).toBeLessThan(100);
    });

    it('should handle posts with no mentions efficiently', async () => {
      const postContent = 'This is a regular post without any mentions.';

      const start = performance.now();
      const result = await postService.createPost(1, postContent);
      const end = performance.now();

      const executionTime = end - start;
      console.log(`Post creation with no mentions: ${executionTime.toFixed(2)}ms`);

      expect(result.mentions).toHaveLength(0);
      expect(executionTime).toBeLessThan(50); // Should be very fast
    });
  });

  describe('Database Query Optimization Verification', () => {
    it('should demonstrate the difference between N+1 and batch queries', async () => {
      // Mock the repository methods to count calls
      const originalFindByUsername = userRepository.findByUsername.bind(userRepository);
      const originalFindByUsernames = userRepository.findByUsernames.bind(userRepository);

      let individualCallCount = 0;
      let batchCallCount = 0;

      // Mock individual calls
      const mockFindByUsername = vi.fn(async (username: string) => {
        individualCallCount++;
        return await originalFindByUsername(username);
      });

      // Mock batch calls
      const mockFindByUsernames = vi.fn(async (usernames: string[]) => {
        batchCallCount++;
        return await originalFindByUsernames(usernames);
      });

      userRepository.findByUsername = mockFindByUsername;
      userRepository.findByUsernames = mockFindByUsernames;

      // Create post with mentions
      const postContent = 'Hello @testuser1 @testuser2 @testuser3!';
      await postService.createPost(1, postContent);

      // Verify that batch method was called instead of individual methods
      expect(batchCallCount).toBe(1); // Single batch call
      expect(individualCallCount).toBe(0); // No individual calls

      // Verify the batch call was made with correct usernames
      expect(mockFindByUsernames).toHaveBeenCalledWith(['testuser1', 'testuser2', 'testuser3']);
    });
  });
});
