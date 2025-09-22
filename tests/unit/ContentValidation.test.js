"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ContentValidation_1 = require("@domain/value-objects/ContentValidation");
(0, vitest_1.describe)('ContentValidation', () => {
    (0, vitest_1.describe)('validatePostContent', () => {
        (0, vitest_1.it)('should accept valid post content', () => {
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validatePostContent('Hello world!')).not.toThrow();
        });
        (0, vitest_1.it)('should reject empty content', () => {
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validatePostContent('')).toThrow('Post content cannot be empty');
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validatePostContent('   ')).toThrow('Post content cannot be empty');
        });
        (0, vitest_1.it)('should reject content exceeding 280 characters', () => {
            const longContent = 'a'.repeat(281);
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validatePostContent(longContent)).toThrow('Post content cannot exceed 280 characters');
        });
        (0, vitest_1.it)('should accept content at exactly 280 characters', () => {
            const exactContent = 'a'.repeat(280);
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validatePostContent(exactContent)).not.toThrow();
        });
    });
    (0, vitest_1.describe)('validateCommentContent', () => {
        (0, vitest_1.it)('should accept valid comment content', () => {
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateCommentContent('Nice post!')).not.toThrow();
        });
        (0, vitest_1.it)('should reject empty content', () => {
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateCommentContent('')).toThrow('Comment content cannot be empty');
        });
        (0, vitest_1.it)('should reject content exceeding 500 characters', () => {
            const longContent = 'a'.repeat(501);
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateCommentContent(longContent)).toThrow('Comment content cannot exceed 500 characters');
        });
    });
    (0, vitest_1.describe)('extractMentions', () => {
        (0, vitest_1.it)('should extract single mention', () => {
            const mentions = ContentValidation_1.ContentValidation.extractMentions('Hello @john_doe!');
            (0, vitest_1.expect)(mentions).toEqual(['john_doe']);
        });
        (0, vitest_1.it)('should extract multiple mentions', () => {
            const mentions = ContentValidation_1.ContentValidation.extractMentions('Hello @john_doe and @jane_smith!');
            (0, vitest_1.expect)(mentions).toEqual(['john_doe', 'jane_smith']);
        });
        (0, vitest_1.it)('should return empty array when no mentions', () => {
            const mentions = ContentValidation_1.ContentValidation.extractMentions('Hello world!');
            (0, vitest_1.expect)(mentions).toEqual([]);
        });
        (0, vitest_1.it)('should handle duplicate mentions', () => {
            const mentions = ContentValidation_1.ContentValidation.extractMentions('Hello @john_doe and @john_doe again!');
            (0, vitest_1.expect)(mentions).toEqual(['john_doe']);
        });
        (0, vitest_1.it)('should extract mentions with underscores and numbers', () => {
            const mentions = ContentValidation_1.ContentValidation.extractMentions('Hello @user_123 and @test2user!');
            (0, vitest_1.expect)(mentions).toEqual(['user_123', 'test2user']);
        });
    });
    (0, vitest_1.describe)('validateUsername', () => {
        (0, vitest_1.it)('should accept valid usernames', () => {
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateUsername('john_doe')).not.toThrow();
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateUsername('user123')).not.toThrow();
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateUsername('test_user_123')).not.toThrow();
        });
        (0, vitest_1.it)('should reject short usernames', () => {
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateUsername('ab')).toThrow('Username must be between 3 and 50 characters');
        });
        (0, vitest_1.it)('should reject long usernames', () => {
            const longUsername = 'a'.repeat(51);
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateUsername(longUsername)).toThrow('Username must be between 3 and 50 characters');
        });
        (0, vitest_1.it)('should reject usernames with invalid characters', () => {
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateUsername('user-name')).toThrow('Username can only contain letters, numbers, and underscores');
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateUsername('user.name')).toThrow('Username can only contain letters, numbers, and underscores');
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateUsername('user@name')).toThrow('Username can only contain letters, numbers, and underscores');
        });
        (0, vitest_1.it)('should reject empty usernames', () => {
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateUsername('')).toThrow('Username cannot be empty');
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateUsername('   ')).toThrow('Username cannot be empty');
        });
    });
    (0, vitest_1.describe)('validateEmail', () => {
        (0, vitest_1.it)('should accept valid emails', () => {
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateEmail('user@example.com')).not.toThrow();
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateEmail('test.email+tag@example.co.uk')).not.toThrow();
        });
        (0, vitest_1.it)('should reject invalid emails', () => {
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateEmail('invalid-email')).toThrow('Invalid email format');
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateEmail('user@')).toThrow('Invalid email format');
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateEmail('@example.com')).toThrow('Invalid email format');
        });
        (0, vitest_1.it)('should reject empty emails', () => {
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validateEmail('')).toThrow('Email cannot be empty');
        });
    });
    (0, vitest_1.describe)('validatePassword', () => {
        (0, vitest_1.it)('should accept valid passwords', () => {
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validatePassword('password123')).not.toThrow();
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validatePassword('mySecureP@ssw0rd!')).not.toThrow();
        });
        (0, vitest_1.it)('should reject short passwords', () => {
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validatePassword('12345')).toThrow('Password must be at least 6 characters long');
        });
        (0, vitest_1.it)('should reject very long passwords', () => {
            const longPassword = 'a'.repeat(129);
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validatePassword(longPassword)).toThrow('Password cannot exceed 128 characters');
        });
        (0, vitest_1.it)('should reject empty passwords', () => {
            (0, vitest_1.expect)(() => ContentValidation_1.ContentValidation.validatePassword('')).toThrow('Password cannot be empty');
        });
    });
});
//# sourceMappingURL=ContentValidation.test.js.map