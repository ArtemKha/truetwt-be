import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthHelper } from '../helpers/auth-helper';
import { TestApp } from '../helpers/test-app';
import { testPosts, testUsers } from '../helpers/test-data';

describe('Timeline API Integration Tests', () => {
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

  describe('GET /api/timeline', () => {
    it('should return timeline endpoint successfully', async () => {
      const user = await authHelper.registerUser(testUsers.validUser1);

      const response = await request(testApp.getApp())
        .get('/api/timeline')
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.posts).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });
  });
});
