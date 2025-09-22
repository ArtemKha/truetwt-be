import { describe, it, expect } from 'vitest';
import { ContentValidation } from '@domain/value-objects/ContentValidation';

describe('ContentValidation', () => {
  describe('validatePostContent', () => {
    it('should accept valid post content', () => {
      expect(() => ContentValidation.validatePostContent('Hello world!')).not.toThrow();
    });

    it('should reject empty content', () => {
      expect(() => ContentValidation.validatePostContent('')).toThrow('Post content cannot be empty');
      expect(() => ContentValidation.validatePostContent('   ')).toThrow('Post content cannot be empty');
    });

    it('should reject content exceeding 280 characters', () => {
      const longContent = 'a'.repeat(281);
      expect(() => ContentValidation.validatePostContent(longContent)).toThrow('Post content cannot exceed 280 characters');
    });

    it('should accept content at exactly 280 characters', () => {
      const exactContent = 'a'.repeat(280);
      expect(() => ContentValidation.validatePostContent(exactContent)).not.toThrow();
    });
  });

  describe('validateCommentContent', () => {
    it('should accept valid comment content', () => {
      expect(() => ContentValidation.validateCommentContent('Nice post!')).not.toThrow();
    });

    it('should reject empty content', () => {
      expect(() => ContentValidation.validateCommentContent('')).toThrow('Comment content cannot be empty');
    });

    it('should reject content exceeding 500 characters', () => {
      const longContent = 'a'.repeat(501);
      expect(() => ContentValidation.validateCommentContent(longContent)).toThrow('Comment content cannot exceed 500 characters');
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

  describe('validateUsername', () => {
    it('should accept valid usernames', () => {
      expect(() => ContentValidation.validateUsername('john_doe')).not.toThrow();
      expect(() => ContentValidation.validateUsername('user123')).not.toThrow();
      expect(() => ContentValidation.validateUsername('test_user_123')).not.toThrow();
    });

    it('should reject short usernames', () => {
      expect(() => ContentValidation.validateUsername('ab')).toThrow('Username must be between 3 and 50 characters');
    });

    it('should reject long usernames', () => {
      const longUsername = 'a'.repeat(51);
      expect(() => ContentValidation.validateUsername(longUsername)).toThrow('Username must be between 3 and 50 characters');
    });

    it('should reject usernames with invalid characters', () => {
      expect(() => ContentValidation.validateUsername('user-name')).toThrow('Username can only contain letters, numbers, and underscores');
      expect(() => ContentValidation.validateUsername('user.name')).toThrow('Username can only contain letters, numbers, and underscores');
      expect(() => ContentValidation.validateUsername('user@name')).toThrow('Username can only contain letters, numbers, and underscores');
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
      expect(() => ContentValidation.validateEmail('invalid-email')).toThrow('Invalid email format');
      expect(() => ContentValidation.validateEmail('user@')).toThrow('Invalid email format');
      expect(() => ContentValidation.validateEmail('@example.com')).toThrow('Invalid email format');
    });

    it('should reject empty emails', () => {
      expect(() => ContentValidation.validateEmail('')).toThrow('Email cannot be empty');
    });
  });

  describe('validatePassword', () => {
    it('should accept valid passwords', () => {
      expect(() => ContentValidation.validatePassword('password123')).not.toThrow();
      expect(() => ContentValidation.validatePassword('mySecureP@ssw0rd!')).not.toThrow();
    });

    it('should reject short passwords', () => {
      expect(() => ContentValidation.validatePassword('12345')).toThrow('Password must be at least 6 characters long');
    });

    it('should reject very long passwords', () => {
      const longPassword = 'a'.repeat(129);
      expect(() => ContentValidation.validatePassword(longPassword)).toThrow('Password cannot exceed 128 characters');
    });

    it('should reject empty passwords', () => {
      expect(() => ContentValidation.validatePassword('')).toThrow('Password cannot be empty');
    });
  });
});
