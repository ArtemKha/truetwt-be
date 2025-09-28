import { describe, expect, it } from 'vitest';
import { ContentValidation } from '../../src/domain/value-objects/ContentValidation';

describe('ContentValidation', () => {
  describe('validatePostContent', () => {
    it('should accept valid post content', () => {
      expect(() => ContentValidation.validatePostContent('Hello world!')).not.toThrow();
    });

    it('should reject empty content', () => {
      expect(() => ContentValidation.validatePostContent('')).toThrow(
        'Post content cannot be empty'
      );
      expect(() => ContentValidation.validatePostContent('   ')).toThrow(
        'Post content cannot be empty'
      );
    });

    it('should reject content exceeding 280 characters', () => {
      const longContent = 'a'.repeat(281);
      expect(() => ContentValidation.validatePostContent(longContent)).toThrow(
        'Post content cannot exceed 280 characters'
      );
    });

    it('should accept content at exactly 280 characters', () => {
      const exactContent = 'a'.repeat(280);
      expect(() => ContentValidation.validatePostContent(exactContent)).not.toThrow();
    });

    it('should reject posts with too many mentions', () => {
      const tooManyMentions = Array.from({ length: 11 }, (_, i) => `@user${i + 1}`).join(' ');
      const content = `Hello ${tooManyMentions}!`;
      expect(() => ContentValidation.validatePostContent(content)).toThrow(
        'Post cannot contain more than 10 mentions'
      );
    });

    it('should accept posts with exactly 10 mentions', () => {
      const exactMentions = Array.from({ length: 10 }, (_, i) => `@user${i + 1}`).join(' ');
      const content = `Hello ${exactMentions}!`;
      expect(() => ContentValidation.validatePostContent(content)).not.toThrow();
    });
  });

  describe('validateCommentContent', () => {
    it('should accept valid comment content', () => {
      expect(() => ContentValidation.validateCommentContent('Nice post!')).not.toThrow();
    });

    it('should reject empty content', () => {
      expect(() => ContentValidation.validateCommentContent('')).toThrow(
        'Comment content cannot be empty'
      );
    });

    it('should reject content exceeding 500 characters', () => {
      const longContent = 'a'.repeat(501);
      expect(() => ContentValidation.validateCommentContent(longContent)).toThrow(
        'Comment content cannot exceed 500 characters'
      );
    });
  });

  describe('extractMentions', () => {
    it('should extract single mention', () => {
      const mentions = ContentValidation.extractMentions('Hello @john_doe!');
      expect(mentions).toEqual(['john_doe']);
    });

    it('should extract multiple mentions', () => {
      const mentions = ContentValidation.extractMentions('Hello @john_doe and @jane_smith!');
      expect(mentions).toEqual(['john_doe', 'jane_smith']);
    });

    it('should return empty array when no mentions', () => {
      const mentions = ContentValidation.extractMentions('Hello world!');
      expect(mentions).toEqual([]);
    });

    it('should handle duplicate mentions', () => {
      const mentions = ContentValidation.extractMentions('Hello @john_doe and @john_doe again!');
      expect(mentions).toEqual(['john_doe']);
    });

    it('should extract mentions with underscores and numbers', () => {
      const mentions = ContentValidation.extractMentions('Hello @user_123 and @test2user!');
      expect(mentions).toEqual(['user_123', 'test2user']);
    });
  });

  describe('validateMentions', () => {
    it('should accept posts with no mentions', () => {
      expect(() => ContentValidation.validateMentions('Hello world!')).not.toThrow();
    });

    it('should accept posts with few mentions', () => {
      expect(() => ContentValidation.validateMentions('Hello @user1 and @user2!')).not.toThrow();
    });

    it('should accept posts with exactly 10 mentions', () => {
      const exactMentions = Array.from({ length: 10 }, (_, i) => `@user${i + 1}`).join(' ');
      const content = `Hello ${exactMentions}!`;
      expect(() => ContentValidation.validateMentions(content)).not.toThrow();
    });

    it('should reject posts with more than 10 mentions', () => {
      const tooManyMentions = Array.from({ length: 11 }, (_, i) => `@user${i + 1}`).join(' ');
      const content = `Hello ${tooManyMentions}!`;
      expect(() => ContentValidation.validateMentions(content)).toThrow(
        'Post cannot contain more than 10 mentions'
      );
    });

    it('should handle duplicate mentions correctly', () => {
      // 11 @user1 mentions, but only counts as 1 unique mention
      const duplicateMentions = Array.from({ length: 11 }, () => '@user1').join(' ');
      const content = `Hello ${duplicateMentions}!`;
      expect(() => ContentValidation.validateMentions(content)).not.toThrow();
    });

    it('should reject posts with 11 unique mentions', () => {
      const uniqueMentions = Array.from({ length: 11 }, (_, i) => `@user${i + 1}`).join(' ');
      const content = `Hello ${uniqueMentions}!`;
      expect(() => ContentValidation.validateMentions(content)).toThrow(
        'Post cannot contain more than 10 mentions'
      );
    });
  });

  describe('validateUsername', () => {
    it('should accept valid usernames', () => {
      expect(() => ContentValidation.validateUsername('john_doe')).not.toThrow();
      expect(() => ContentValidation.validateUsername('user123')).not.toThrow();
      expect(() => ContentValidation.validateUsername('test_user_123')).not.toThrow();
    });

    it('should reject short usernames', () => {
      expect(() => ContentValidation.validateUsername('ab')).toThrow(
        'Username must be between 3 and 50 characters'
      );
    });

    it('should reject long usernames', () => {
      const longUsername = 'a'.repeat(51);
      expect(() => ContentValidation.validateUsername(longUsername)).toThrow(
        'Username must be between 3 and 50 characters'
      );
    });

    it('should reject usernames with invalid characters', () => {
      expect(() => ContentValidation.validateUsername('user-name')).toThrow(
        'Username can only contain letters, numbers, and underscores'
      );
      expect(() => ContentValidation.validateUsername('user.name')).toThrow(
        'Username can only contain letters, numbers, and underscores'
      );
      expect(() => ContentValidation.validateUsername('user@name')).toThrow(
        'Username can only contain letters, numbers, and underscores'
      );
    });

    it('should reject empty usernames', () => {
      expect(() => ContentValidation.validateUsername('')).toThrow('Username cannot be empty');
      expect(() => ContentValidation.validateUsername('   ')).toThrow('Username cannot be empty');
    });
  });

  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(() => ContentValidation.validateEmail('user@example.com')).not.toThrow();
      expect(() => ContentValidation.validateEmail('test.email+tag@example.co.uk')).not.toThrow();
    });

    it('should reject invalid emails', () => {
      expect(() => ContentValidation.validateEmail('invalid-email')).toThrow(
        'Invalid email format'
      );
      expect(() => ContentValidation.validateEmail('user@')).toThrow('Invalid email format');
      expect(() => ContentValidation.validateEmail('@example.com')).toThrow('Invalid email format');
    });

    it('should reject empty emails', () => {
      expect(() => ContentValidation.validateEmail('')).toThrow('Email cannot be empty');
    });
  });
});
