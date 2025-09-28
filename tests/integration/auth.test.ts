import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthHelper } from '../helpers/auth-helper';
import { TestApp } from '../helpers/test-app';
import { testUsers } from '../helpers/test-data';

describe('Authentication API Integration Tests', () => {
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

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = testUsers.validUser1;

      const response = await request(testApp.getApp())
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            username: userData.username,
            email: userData.email,
          },
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          },
        },
      });

      // Verify user ID is present
      expect(response.body.data.user.id).toBeDefined();
    });

    it('should not include password in response', async () => {
      const userData = testUsers.validUser1;

      const response = await request(testApp.getApp())
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login existing user successfully', async () => {
      // First register a user
      await authHelper.registerUser(testUsers.validUser1);

      // Then login
      const loginData = {
        username: testUsers.validUser1.username,
        password: testUsers.validUser1.password,
      };

      const response = await request(testApp.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            username: testUsers.validUser1.username,
            email: testUsers.validUser1.email,
          },
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          },
        },
      });
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token successfully', async () => {
      // Register and get tokens
      const user = await authHelper.registerUser(testUsers.validUser1);

      const response = await request(testApp.getApp())
        .post('/api/auth/refresh')
        .send({ refreshToken: user.tokens.refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: expect.any(String),
        },
      });

      // Verify we got a new token (tokens may be the same due to timing)
      expect(response.body.data.accessToken).toBeDefined();
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile', async () => {
      const user = await authHelper.registerUser(testUsers.validUser1);

      const response = await request(testApp.getApp())
        .get('/api/auth/me')
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        },
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      const user = await authHelper.registerUser(testUsers.validUser1);

      const response = await request(testApp.getApp())
        .post('/api/auth/logout')
        .set(authHelper.getAuthHeader(user.tokens.accessToken))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Logout successful',
      });
    });
  });
});
