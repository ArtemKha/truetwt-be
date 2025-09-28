import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthHelper } from '../helpers/auth-helper';
import { TestApp } from '../helpers/test-app';
import { testPosts, testUsers } from '../helpers/test-data';

describe('Posts API Integration Tests', () => {
  let testApp: TestApp;
  let authHelper: AuthHelper;

  beforeEach(async () => {
    testApp = new TestApp();
    await testApp.initialize();
    authHelper = new AuthHelper(testApp.getApp());
    await testApp.resetDatabase();
  });

  afterAll(async () => {
    if (testApp) {
      await testApp.cleanup();
    }
  });

  describe('POST /api/posts', () => {
    it('should create a new post successfully', async () => {
      const user = await authHelper.registerUser(testUsers.validUser1);

      const response = await request(testApp.getApp())
        .post('/api/posts')
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .send(testPosts.validPost1)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          post: {
            content: testPosts.validPost1.content,
            userId: user.id,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            isDeleted: false,
          },
        },
      });
    });

    it('should create post with mentions successfully', async () => {
      // Create users for mentions
      const user1 = await authHelper.registerUser(testUsers.validUser1);
      await authHelper.registerUser(testUsers.validUser2);

      const postWithMentions = {
        content: `Hello @${testUsers.validUser2.username}! How are you doing?`,
      };

      const response = await request(testApp.getApp())
        .post('/api/posts')
        .set(authHelper.getAuthHeader(user1.tokens.accessToken))
        .send(postWithMentions)
        .expect(201);

      expect(response.body.data.post.content).toBe(postWithMentions.content);
      expect(response.body.data.post.mentions).toEqual([
        expect.objectContaining({
          username: testUsers.validUser2.username,
        }),
      ]);
    });

    it('should handle posts at character limit', async () => {
      const user = await authHelper.registerUser(testUsers.validUser1);
      const maxLengthPost = {
        content: 'a'.repeat(280), // Exactly 280 characters
      };

      const response = await request(testApp.getApp())
        .post('/api/posts')
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .send(maxLengthPost)
        .expect(201);

      expect(response.body.data.post.content).toBe(maxLengthPost.content);
    });
  });

  describe('GET /api/posts/:id', () => {
    it('should retrieve specific post successfully', async () => {
      const user = await authHelper.registerUser(testUsers.validUser1);

      // Create a post first
      const createResponse = await request(testApp.getApp())
        .post('/api/posts')
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .send(testPosts.validPost1)
        .expect(201);

      const postId = createResponse.body.data.post.id;

      // Retrieve the post
      const response = await request(testApp.getApp())
        .get(`/api/posts/${postId}`)
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          post: {
            id: postId,
            content: testPosts.validPost1.content,
            userId: user.id,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            isDeleted: false,
          },
        },
      });
    });
  });

  describe('GET /api/posts/user/:userId', () => {
    it('should retrieve posts by specific user', async () => {
      const user1 = await authHelper.registerUser(testUsers.validUser1);
      const user2 = await authHelper.registerUser(testUsers.validUser2);

      // Create posts for user1
      await request(testApp.getApp())
        .post('/api/posts')
        .set(authHelper.getAuthHeader(user1.tokens.accessToken))
        .send(testPosts.validPost1);

      await request(testApp.getApp())
        .post('/api/posts')
        .set(authHelper.getAuthHeader(user1.tokens.accessToken))
        .send(testPosts.validPost2);

      // Create one post for user2
      await request(testApp.getApp())
        .post('/api/posts')
        .set(authHelper.getAuthHeader(user2.tokens.accessToken))
        .send(testPosts.validPost3);

      // Retrieve posts by user1
      const response = await request(testApp.getApp())
        .get(`/api/posts/user/${user1.id}`)
        .set(authHelper.getAuthHeader(user2.tokens.accessToken))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          posts: expect.arrayContaining([
            expect.objectContaining({
              userId: user1.id,
              user: expect.objectContaining({
                username: user1.username,
              }),
            }),
          ]),
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
          },
        },
      });

      expect(response.body.data.posts).toHaveLength(2);
    });

    it('should support pagination for user posts', async () => {
      const user = await authHelper.registerUser(testUsers.validUser1);

      // Create multiple posts
      for (let i = 0; i < 3; i++) {
        await request(testApp.getApp())
          .post('/api/posts')
          .set(authHelper.getAuthHeader(user.tokens.accessToken))
          .send({ content: `Post number ${i + 1}` });
      }

      const response = await request(testApp.getApp())
        .get(`/api/posts/user/${user.id}`)
        .query({ page: 1, limit: 2 })
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .expect(200);

      expect(response.body.data.posts).toHaveLength(2);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
      });
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('should delete own post successfully', async () => {
      const user = await authHelper.registerUser(testUsers.validUser1);

      // Create a post
      const createResponse = await request(testApp.getApp())
        .post('/api/posts')
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .send(testPosts.validPost1)
        .expect(201);

      const postId = createResponse.body.data.post.id;

      // Delete the post
      const response = await request(testApp.getApp())
        .delete(`/api/posts/${postId}`)
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Post deleted successfully',
      });
    });

    it('should soft delete post (mark as deleted)', async () => {
      const user = await authHelper.registerUser(testUsers.validUser1);

      // Create a post
      const createResponse = await request(testApp.getApp())
        .post('/api/posts')
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .send(testPosts.validPost1)
        .expect(201);

      const postId = createResponse.body.data.post.id;

      // Delete the post
      await request(testApp.getApp())
        .delete(`/api/posts/${postId}`)
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .expect(200);

      // Verify post is marked as deleted but still exists in database
      const getResponse = await request(testApp.getApp())
        .get(`/api/posts/${postId}`)
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .expect(404); // Should return 404 for deleted posts

      expect(getResponse.body.success).toBe(false);
    });
  });
});
