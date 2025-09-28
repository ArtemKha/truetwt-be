import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthHelper } from '../helpers/auth-helper';
import { TestApp } from '../helpers/test-app';
import { testComments, testPosts, testUsers } from '../helpers/test-data';

describe('Comments API Integration Tests', () => {
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

  describe('POST /api/posts/:postId/comments', () => {
    it('should create a comment on post successfully', async () => {
      const user1 = await authHelper.registerUser(testUsers.validUser1);
      const user2 = await authHelper.registerUser(testUsers.validUser2);

      // Create a post
      const postResponse = await request(testApp.getApp())
        .post('/api/posts')
        .set(authHelper.getAuthHeader(user1.tokens.accessToken))
        .send(testPosts.validPost1)
        .expect(201);

      const postId = postResponse.body.data.post.id;

      // Create a comment
      const response = await request(testApp.getApp())
        .post(`/api/posts/${postId}/comments`)
        .set(authHelper.getAuthHeader(user2.tokens.accessToken))
        .send(testComments.validComment1)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          comment: {
            content: testComments.validComment1.content,
            postId: postId,
            userId: user2.id,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            isDeleted: false,
          },
        },
      });
    });

    it('should allow post author to comment on their own post', async () => {
      const user = await authHelper.registerUser(testUsers.validUser1);

      // Create a post
      const postResponse = await request(testApp.getApp())
        .post('/api/posts')
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .send(testPosts.validPost1)
        .expect(201);

      const postId = postResponse.body.data.post.id;

      // Author comments on their own post
      const response = await request(testApp.getApp())
        .post(`/api/posts/${postId}/comments`)
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .send(testComments.validComment1)
        .expect(201);

      expect(response.body.data.comment.userId).toBe(user.id);
    });

    it('should handle comments at character limit', async () => {
      const user1 = await authHelper.registerUser(testUsers.validUser1);
      const user2 = await authHelper.registerUser(testUsers.validUser2);

      // Create a post
      const postResponse = await request(testApp.getApp())
        .post('/api/posts')
        .set(authHelper.getAuthHeader(user1.tokens.accessToken))
        .send(testPosts.validPost1)
        .expect(201);

      const postId = postResponse.body.data.post.id;

      const maxLengthComment = {
        content: 'a'.repeat(500), // Exactly 500 characters
      };

      const response = await request(testApp.getApp())
        .post(`/api/posts/${postId}/comments`)
        .set(authHelper.getAuthHeader(user2.tokens.accessToken))
        .send(maxLengthComment)
        .expect(201);

      expect(response.body.data.comment.content).toBe(maxLengthComment.content);
    });
  });

  describe('GET /api/posts/:postId/comments', () => {
    it('should retrieve comments for a post', async () => {
      const user1 = await authHelper.registerUser(testUsers.validUser1);
      const user2 = await authHelper.registerUser(testUsers.validUser2);

      // Create a post
      const postResponse = await request(testApp.getApp())
        .post('/api/posts')
        .set(authHelper.getAuthHeader(user1.tokens.accessToken))
        .send(testPosts.validPost1)
        .expect(201);

      const postId = postResponse.body.data.post.id;

      // Create multiple comments
      await request(testApp.getApp())
        .post(`/api/posts/${postId}/comments`)
        .set(authHelper.getAuthHeader(user2.tokens.accessToken))
        .send(testComments.validComment1);

      await request(testApp.getApp())
        .post(`/api/posts/${postId}/comments`)
        .set(authHelper.getAuthHeader(user1.tokens.accessToken))
        .send(testComments.validComment2);

      // Retrieve comments
      const response = await request(testApp.getApp())
        .get(`/api/posts/${postId}/comments`)
        .set(authHelper.getAuthHeader(user1.tokens.accessToken))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          comments: expect.arrayContaining([
            expect.objectContaining({
              content: expect.any(String),
              postId: postId,
              createdAt: expect.any(String),
              isDeleted: false,
              user: expect.objectContaining({
                username: expect.any(String),
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

      expect(response.body.data.comments).toHaveLength(2);
    });

    it('should support pagination for comments', async () => {
      const user1 = await authHelper.registerUser(testUsers.validUser1);
      const user2 = await authHelper.registerUser(testUsers.validUser2);

      // Create a post
      const postResponse = await request(testApp.getApp())
        .post('/api/posts')
        .set(authHelper.getAuthHeader(user1.tokens.accessToken))
        .send(testPosts.validPost1)
        .expect(201);

      const postId = postResponse.body.data.post.id;

      // Create multiple comments
      for (let i = 0; i < 3; i++) {
        await request(testApp.getApp())
          .post(`/api/posts/${postId}/comments`)
          .set(authHelper.getAuthHeader(user2.tokens.accessToken))
          .send({ content: `Comment number ${i + 1}` });
      }

      const response = await request(testApp.getApp())
        .get(`/api/posts/${postId}/comments`)
        .query({ page: 1, limit: 2 })
        .set(authHelper.getAuthHeader(user1.tokens.accessToken))
        .expect(200);

      expect(response.body.data.comments).toHaveLength(2);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
      });
    });

    it('should return empty array for post with no comments', async () => {
      const user = await authHelper.registerUser(testUsers.validUser1);

      // Create a post
      const postResponse = await request(testApp.getApp())
        .post('/api/posts')
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .send(testPosts.validPost1)
        .expect(201);

      const postId = postResponse.body.data.post.id;

      // Retrieve comments (should be empty)
      const response = await request(testApp.getApp())
        .get(`/api/posts/${postId}/comments`)
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .expect(200);

      expect(response.body.data.comments).toEqual([]);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });

  describe('DELETE /api/comments/:id', () => {
    it('should delete own comment successfully', async () => {
      const user1 = await authHelper.registerUser(testUsers.validUser1);
      const user2 = await authHelper.registerUser(testUsers.validUser2);

      // Create a post
      const postResponse = await request(testApp.getApp())
        .post('/api/posts')
        .set(authHelper.getAuthHeader(user1.tokens.accessToken))
        .send(testPosts.validPost1)
        .expect(201);

      const postId = postResponse.body.data.post.id;

      // Create a comment
      const commentResponse = await request(testApp.getApp())
        .post(`/api/posts/${postId}/comments`)
        .set(authHelper.getAuthHeader(user2.tokens.accessToken))
        .send(testComments.validComment1)
        .expect(201);

      const commentId = commentResponse.body.data.comment.id;

      // Delete the comment
      const response = await request(testApp.getApp())
        .delete(`/api/comments/${commentId}`)
        .set(authHelper.getAuthHeader(user2.tokens.accessToken))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Comment deleted successfully',
      });
    });
  });
});
