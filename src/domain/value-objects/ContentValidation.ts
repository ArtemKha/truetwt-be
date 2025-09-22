export class ContentValidation {
  private static readonly MAX_POST_LENGTH = 280;
  private static readonly MAX_COMMENT_LENGTH = 500;
  private static readonly USERNAME_REGEX = /@[a-zA-Z0-9_]+/g;

  public static validatePostContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new Error('Post content cannot be empty');
    }
    if (content.length > ContentValidation.MAX_POST_LENGTH) {
      throw new Error(`Post content cannot exceed ${ContentValidation.MAX_POST_LENGTH} characters`);
    }
  }

  public static validateCommentContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new Error('Comment content cannot be empty');
    }
    if (content.length > ContentValidation.MAX_COMMENT_LENGTH) {
      throw new Error(
        `Comment content cannot exceed ${ContentValidation.MAX_COMMENT_LENGTH} characters`
      );
    }
  }

  public static extractMentions(content: string): string[] {
    const matches = content.match(ContentValidation.USERNAME_REGEX);
    if (!matches) return [];

    // Remove @ symbol and ensure uniqueness
    return [...new Set(matches.map((match) => match.substring(1)))];
  }

  public static validateUsername(username: string): void {
    if (!username || username.trim().length === 0) {
      throw new Error('Username cannot be empty');
    }
    if (username.length < 3 || username.length > 50) {
      throw new Error('Username must be between 3 and 50 characters');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }
  }

  public static validateEmail(email: string): void {
    if (!email || email.trim().length === 0) {
      throw new Error('Email cannot be empty');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  public static validatePassword(password: string): void {
    if (!password || password.length === 0) {
      throw new Error('Password cannot be empty');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    if (password.length > 128) {
      throw new Error('Password cannot exceed 128 characters');
    }
  }
}
