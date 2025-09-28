import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthHelper } from '../helpers/auth-helper';
import { TestApp } from '../helpers/test-app';
import { testUsers } from '../helpers/test-data';

describe('Users API Integration Tests', () => {
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

  describe('GET /api/users', () => {
    it('should return paginated list of users', async () => {
      // Create multiple users
      await authHelper.registerUser(testUsers.validUser1);
      await authHelper.registerUser(testUsers.validUser2);
      const currentUser = await authHelper.registerUser(testUsers.validUser3);

      const response = await request(testApp.getApp())
        .get('/api/users')
        .set(authHelper.getAuthHeader(currentUser.tokens.accessToken))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          users: expect.arrayContaining([
            expect.objectContaining({
              username: expect.any(String),
              email: expect.any(String),
              createdAt: expect.any(String),
            }),
          ]),
          pagination: {
            page: 1,
            limit: 20,
            total: 3,
            totalPages: 1,
          },
        },
      });

      expect(response.body.data.users).toHaveLength(3);
    });

    it('should support pagination parameters', async () => {
      // Create multiple users
      await authHelper.registerUser(testUsers.validUser1);
      await authHelper.registerUser(testUsers.validUser2);
      const currentUser = await authHelper.registerUser(testUsers.validUser3);

      const response = await request(testApp.getApp())
        .get('/api/users')
        .query({ page: 1, limit: 2 })
        .set(authHelper.getAuthHeader(currentUser.tokens.accessToken))
        .expect(200);

      expect(response.body.data.users).toHaveLength(2);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
    });

    it('should not include password fields in user data', async () => {
      const currentUser = await authHelper.registerUser(testUsers.validUser1);

      const response = await request(testApp.getApp())
        .get('/api/users')
        .set(authHelper.getAuthHeader(currentUser.tokens.accessToken))
        .expect(200);

      const user = response.body.data.users[0];
      expect(user.password).toBeUndefined();
      expect(user.passwordHash).toBeUndefined();
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return specific user profile', async () => {
      const user1 = await authHelper.registerUser(testUsers.validUser1);
      const user2 = await authHelper.registerUser(testUsers.validUser2);

      const response = await request(testApp.getApp())
        .get(`/api/users/${user1.id}`)
        .set(authHelper.getAuthHeader(user2.tokens.accessToken))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: user1.id,
            username: user1.username,
            email: user1.email,
            createdAt: expect.any(String),
          },
        },
      });
    });

    it('should allow user to view their own profile', async () => {
      const user = await authHelper.registerUser(testUsers.validUser1);

      const response = await request(testApp.getApp())
        .get(`/api/users/${user.id}`)
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .expect(200);

      expect(response.body.data.user.id).toBe(user.id);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user profile successfully', async () => {
      const user = await authHelper.registerUser(testUsers.validUser1);

      const updateData = {
        username: 'updated_username',
        email: 'updated@example.com',
      };

      const response = await request(testApp.getApp())
        .put(`/api/users/${user.id}`)
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User profile updated successfully',
        data: {
          user: {
            id: user.id,
            username: updateData.username,
            email: updateData.email,
          },
        },
      });
    });

    it('should allow partial updates', async () => {
      const user = await authHelper.registerUser(testUsers.validUser1);

      const updateData = {
        username: 'new_username_only',
      };

      const response = await request(testApp.getApp())
        .put(`/api/users/${user.id}`)
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .send(updateData)
        .expect(200);

      expect(response.body.data.user.username).toBe(updateData.username);
      expect(response.body.data.user.email).toBe(user.email); // Should remain unchanged
    });
  });
});
