import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthHelper } from '../helpers/auth-helper';
import { TestApp } from '../helpers/test-app';
import { testUsers } from '../helpers/test-data';

describe('Authentication Flow Integration Tests', () => {
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

  describe('Complete Authentication Flow', () => {
    it('should complete full registration -> login -> access protected resource flow', async () => {
      // Register user
      const registerResponse = await request(testApp.getApp())
        .post('/api/auth/register')
        .send(testUsers.validUser1)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.tokens.accessToken).toBeDefined();

      // Login with registered user
      const loginResponse = await request(testApp.getApp())
        .post('/api/auth/login')
        .send({
          username: testUsers.validUser1.username,
          password: testUsers.validUser1.password,
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      const accessToken = loginResponse.body.data.tokens.accessToken;

      // Access protected resource
      const protectedResponse = await request(testApp.getApp())
        .get('/api/auth/me')
        .set(authHelper.getAuthHeader(accessToken))
        .expect(200);

      expect(protectedResponse.body.success).toBe(true);
      expect(protectedResponse.body.data.user.username).toBe(testUsers.validUser1.username);
    });

    // TODO: should prevent access with invalid tokens after logout
    // TODO: should handle token refresh flow correctly
  });

  describe('Multi-user Authentication Flow', () => {
    it('should handle multiple users with separate sessions', async () => {
      const user1 = await authHelper.registerUser(testUsers.validUser1);
      const user2 = await authHelper.registerUser(testUsers.validUser2);

      // Both users should be able to access their own profiles
      const user1Response = await request(testApp.getApp())
        .get('/api/auth/me')
        .set(authHelper.getAuthHeader(user1.tokens.accessToken))
        .expect(200);

      const user2Response = await request(testApp.getApp())
        .get('/api/auth/me')
        .set(authHelper.getAuthHeader(user2.tokens.accessToken))
        .expect(200);

      // Verify tokens are different
      expect(user1.tokens.accessToken).not.toBe(user2.tokens.accessToken);

      expect(user1Response.body.data.user.username).toBe(testUsers.validUser1.username);
      expect(user2Response.body.data.user.username).toBe(testUsers.validUser2.username);
    });

    it('should allow concurrent operations by different users', async () => {
      const user1 = await authHelper.registerUser(testUsers.validUser1);
      const user2 = await authHelper.registerUser(testUsers.validUser2);

      // Both users create posts simultaneously
      const [post1Response, post2Response] = await Promise.all([
        request(testApp.getApp())
          .post('/api/posts')
          .set(authHelper.getAuthHeader(user1.tokens.accessToken))
          .send({ content: 'Post by user 1' }),
        request(testApp.getApp())
          .post('/api/posts')
          .set(authHelper.getAuthHeader(user2.tokens.accessToken))
          .send({ content: 'Post by user 2' }),
      ]);

      expect(post1Response.status).toBe(201);
      expect(post2Response.status).toBe(201);
      expect(post1Response.body.data.post.userId).toBe(user1.id);
      expect(post2Response.body.data.post.userId).toBe(user2.id);
    });
  });

  describe('Authentication Error Scenarios', () => {
    it('should handle protected routes without authentication', async () => {
      await request(testApp.getApp()).get('/api/auth/me').expect(401);
    });

    it('should handle protected routes with malformed token', async () => {
      await request(testApp.getApp())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
