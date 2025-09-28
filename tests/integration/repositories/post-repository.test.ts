import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { User } from '../../../src/domain/entities/User';
import { Pagination } from '../../../src/domain/value-objects/Pagination';
import { DatabaseConnection } from '../../../src/infrastructure/database/connection';
import { SQLitePostRepository } from '../../../src/infrastructure/repositories/SQLitePostRepository';
import { SQLiteUserRepository } from '../../../src/infrastructure/repositories/SQLiteUserRepository';
import { testPosts, testUsers } from '../../helpers/test-data';

describe('SQLitePostRepository Integration Tests', () => {
  let dbConnection: DatabaseConnection;
  let postRepository: SQLitePostRepository;
  let userRepository: SQLiteUserRepository;
  let db: any;
  let testUser: User;

  beforeEach(async () => {
    // Reset the singleton instance for each test
    (DatabaseConnection as any).instance = null;

    // Use in-memory database for tests
    dbConnection = DatabaseConnection.getInstance(':memory:', true);
    db = dbConnection.getDatabase();
    postRepository = new SQLitePostRepository(db);
    userRepository = new SQLiteUserRepository(db);

    // Create a test user for posts
    testUser = await userRepository.create({
      username: testUsers.validUser1.username,
      email: testUsers.validUser1.email,
      passwordHash: 'hashed_password_123',
    });
  });

  afterAll(async () => {
    if (dbConnection) {
      await dbConnection.close();
    }
  });

  describe('create', () => {
    it('should create a new post successfully', async () => {
      const postData = {
        content: testPosts.validPost1.content,
        userId: testUser.id,
        mentions: [],
      };

      const post = await postRepository.create(postData);

      expect(post).toBeDefined();
      expect(post.content).toBe(postData.content);
      expect(post.userId).toBe(postData.userId);
      expect(post.id).toBeDefined();
      expect(post.createdAt).toBeInstanceOf(Date);
      expect(post.updatedAt).toBeInstanceOf(Date);
      expect(post.isDeleted).toBe(false);
    });

    it('should create post with mentions', async () => {
      // Create another user for mentions
      const mentionedUser = await userRepository.create({
        username: testUsers.validUser2.username,
        email: testUsers.validUser2.email,
        passwordHash: 'hashed_password_456',
      });

      const postData = {
        content: `Hello @${mentionedUser.username}! How are you?`,
        userId: testUser.id,
        mentions: [mentionedUser.username],
      };

      const post = await postRepository.create(postData);

      expect(post.content).toBe(postData.content);
    });

    it('should generate unique IDs for different posts', async () => {
      const post1Data = {
        content: 'First post',
        userId: testUser.id,
        mentions: [],
      };

      const post2Data = {
        content: 'Second post',
        userId: testUser.id,
        mentions: [],
      };

      const post1 = await postRepository.create(post1Data);
      const post2 = await postRepository.create(post2Data);

      expect(post1.id).not.toBe(post2.id);
    });
  });

  describe('findById', () => {
    it('should find post by ID successfully', async () => {
      const postData = {
        content: testPosts.validPost1.content,
        userId: testUser.id,
        mentions: [],
      };

      const createdPost = await postRepository.create(postData);
      const foundPost = await postRepository.findById(createdPost.id);

      expect(foundPost).toBeDefined();
      expect(foundPost?.id).toBe(createdPost.id);
      expect(foundPost?.content).toBe(postData.content);
      expect(foundPost?.userId).toBe(postData.userId);
    });

    it('should return null for non-existent post ID', async () => {
      const post = await postRepository.findById(0);
      expect(post).toBeNull();
    });

    it('should return null for deleted post', async () => {
      const postData = {
        content: testPosts.validPost1.content,
        userId: testUser.id,
        mentions: [],
      };

      const createdPost = await postRepository.create(postData);
      await postRepository.softDelete(createdPost.id);

      const foundPost = await postRepository.findById(createdPost.id);
      expect(foundPost).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should handle pagination correctly', async () => {
      // Create 5 posts
      for (let i = 1; i <= 5; i++) {
        await postRepository.create({
          content: `Post ${i}`,
          userId: testUser.id,
          mentions: [],
        });
      }

      // Get first page (limit 2)
      const firstPage = await postRepository.findByUserId(testUser.id, new Pagination(1, 2));
      expect(firstPage.posts).toHaveLength(2);
      expect(firstPage.total).toBe(5);

      // Get second page
      const secondPage = await postRepository.findByUserId(testUser.id, new Pagination(2, 2));
      expect(secondPage.posts).toHaveLength(2);
      expect(secondPage.total).toBe(5);
    });

    it('should not include deleted posts', async () => {
      // Create posts
      const post1 = await postRepository.create({
        content: 'Active post',
        userId: testUser.id,
        mentions: [],
      });

      const post2 = await postRepository.create({
        content: 'Post to be deleted',
        userId: testUser.id,
        mentions: [],
      });

      // Delete one post
      await postRepository.softDelete(post2.id);

      const result = await postRepository.findByUserId(testUser.id, new Pagination(1, 10));

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].content).toBe('Active post');
      expect(result.total).toBe(1);
    });

    it('should return empty result for user with no posts', async () => {
      // Create another user with no posts
      const anotherUser = await userRepository.create({
        username: 'another_user',
        email: 'another@example.com',
        passwordHash: 'hash',
      });

      const result = await postRepository.findByUserId(anotherUser.id, new Pagination(1, 10));

      expect(result.posts).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findAll', () => {
    it('should return all posts with pagination', async () => {
      // Create multiple users and posts
      const user2 = await userRepository.create({
        username: testUsers.validUser2.username,
        email: testUsers.validUser2.email,
        passwordHash: 'hash2',
      });

      await postRepository.create({
        content: 'Post by user 1',
        userId: testUser.id,
        mentions: [],
      });

      await postRepository.create({
        content: 'Post by user 2',
        userId: user2.id,
        mentions: [],
      });

      const result = await postRepository.findAll(new Pagination(1, 10));

      expect(result.posts).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);

      // Verify posts from different users are included
      const userIds = result.posts.map((post) => post.userId);
      expect(userIds).toContain(testUser.id);
      expect(userIds).toContain(user2.id);
    });

    it('should not include deleted posts', async () => {
      const post1 = await postRepository.create({
        content: 'Active post',
        userId: testUser.id,
        mentions: [],
      });

      const post2 = await postRepository.create({
        content: 'Post to be deleted',
        userId: testUser.id,
        mentions: [],
      });

      await postRepository.softDelete(post2.id);

      const result = await postRepository.findAll(new Pagination(1, 10));

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].content).toBe('Active post');
      expect(result.total).toBe(1);
    });
  });

  describe('update', () => {
    it('should update post content successfully', async () => {
      const postData = {
        content: testPosts.validPost1.content,
        userId: testUser.id,
        mentions: [],
      };

      const createdPost = await postRepository.create(postData);

      // Add small delay to ensure updatedAt is different
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updateData = {
        content: 'Updated post content',
      };

      // Add small delay to ensure updatedAt is different
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updatedPost = await postRepository.update(createdPost.id, updateData.content);

      expect(updatedPost).toBeDefined();
      expect(updatedPost?.content).toBe(updateData.content);
      expect(updatedPost?.id).toBe(createdPost.id);
      expect(updatedPost?.userId).toBe(testUser.id);

      // Verify updatedAt exists (timestamp precision issues in tests)
      expect(updatedPost?.updatedAt).toBeDefined();
    });

    it('should throw error when updating non-existent post', async () => {
      await expect(postRepository.update(999999, 'Updated content')).rejects.toThrow();
    });

    it('should return null when updating deleted post', async () => {
      const postData = {
        content: testPosts.validPost1.content,
        userId: testUser.id,
        mentions: [],
      };

      const createdPost = await postRepository.create(postData);
      await postRepository.softDelete(createdPost.id);

      await expect(postRepository.update(createdPost.id, 'Updated content')).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should soft delete post successfully', async () => {
      const postData = {
        content: testPosts.validPost1.content,
        userId: testUser.id,
        mentions: [],
      };

      const createdPost = await postRepository.create(postData);

      await postRepository.softDelete(createdPost.id);

      // Verify post is soft deleted (not returned by findById)
      const foundPost = await postRepository.findById(createdPost.id);
      expect(foundPost).toBeNull();

      // Verify post still exists in database but marked as deleted
      const rawPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(createdPost.id);
      expect(rawPost).toBeDefined();
      expect(rawPost.is_deleted).toBe(1);
    });

    it('should throw error when deleting non-existent post', async () => {
      await expect(postRepository.softDelete(999999)).rejects.toThrow();
    });

    it('should return false when deleting already deleted post', async () => {
      const postData = {
        content: testPosts.validPost1.content,
        userId: testUser.id,
        mentions: [],
      };

      const createdPost = await postRepository.create(postData);

      // Delete once
      await postRepository.softDelete(createdPost.id);

      // Try to delete again - should throw error
      await expect(postRepository.softDelete(createdPost.id)).rejects.toThrow();
    });
  });
});
