import { Application } from 'express';
import request from 'supertest';
import { testUsers } from './test-data';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  tokens: AuthTokens;
}

export class AuthHelper {
  constructor(private app: Application) {}

  async registerUser(userData = testUsers.validUser1): Promise<AuthenticatedUser> {
    const response = await request(this.app).post('/api/auth/register').send(userData).expect(201);

    return {
      id: response.body.data.user.id,
      username: response.body.data.user.username,
      email: response.body.data.user.email,
      tokens: response.body.data.tokens,
    };
  }

  async loginUser(
    credentials = {
      username: testUsers.validUser1.username,
      password: testUsers.validUser1.password,
    }
  ): Promise<AuthenticatedUser> {
    const response = await request(this.app).post('/api/auth/login').send(credentials).expect(200);

    return {
      id: response.body.data.user.id,
      username: response.body.data.user.username,
      email: response.body.data.user.email,
      tokens: response.body.data.tokens,
    };
  }

  async createAuthenticatedUser(userData = testUsers.validUser1): Promise<AuthenticatedUser> {
    return await this.registerUser(userData);
  }

  getAuthHeader(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await request(this.app)
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    return response.body.data.tokens;
  }
}
