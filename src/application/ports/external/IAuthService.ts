export interface TokenPayload {
  userId: number;
  username: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthService {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  generateTokens(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<TokenPair>;
  verifyAccessToken(token: string): Promise<TokenPayload>;
  verifyRefreshToken(token: string): Promise<TokenPayload>;
  generateAccessToken(
    payload: Omit<TokenPayload, 'iat' | 'exp'>,
    customExpiry?: string
  ): Promise<string>;
  extractTokenFromHeader(authHeader: string): string | null;
}
