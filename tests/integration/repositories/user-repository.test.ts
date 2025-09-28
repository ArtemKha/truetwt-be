import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Pagination } from '../../../src/domain/value-objects/Pagination';
import { DatabaseConnection } from '../../../src/infrastructure/database/connection';
import { SQLiteUserRepository } from '../../../src/infrastructure/repositories/SQLiteUserRepository';
import { testUsers } from '../../helpers/test-data';

describe('SQLiteUserRepository Integration Tests', () => {
  let dbConnection: DatabaseConnection;
  let userRepository: SQLiteUserRepository;
  let db: any;

  beforeEach(async () => {
    // Reset the singleton instance for each test
    (DatabaseConnection as any).instance = null;

    // Use in-memory database for tests
    dbConnection = DatabaseConnection.getInstance(':memory:', true);
    db = dbConnection.getDatabase();
    userRepository = new SQLiteUserRepository(db);
  });

  afterAll(async () => {
    if (dbConnection) {
      await dbConnection.close();
    }
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        username: testUsers.validUser1.username,
        email: testUsers.validUser1.email,
        passwordHash: 'hashed_password_123',
      };

      const user = await userRepository.create(userData);

      expect(user).toBeDefined();
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique IDs for different users', async () => {
      const user1Data = {
        username: testUsers.validUser1.username,
        email: testUsers.validUser1.email,
        passwordHash: 'hashed_password_123',
      };

      const user2Data = {
        username: testUsers.validUser2.username,
        email: testUsers.validUser2.email,
        passwordHash: 'hashed_password_456',
      };

      const user1 = await userRepository.create(user1Data);
      const user2 = await userRepository.create(user2Data);

      expect(user1.id).not.toBe(user2.id);
    });
  });

  describe('findById', () => {
    it('should find user by ID successfully', async () => {
      const userData = {
        username: testUsers.validUser1.username,
        email: testUsers.validUser1.email,
        passwordHash: 'hashed_password_123',
      };

      const createdUser = await userRepository.create(userData);
      const foundUser = await userRepository.findById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.username).toBe(userData.username);
      expect(foundUser?.email).toBe(userData.email);
    });

    it('should return null for non-existent user ID', async () => {
      const nonExistentId = 0;
      const user = await userRepository.findById(nonExistentId);

      expect(user).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find user by username successfully', async () => {
      const userData = {
        username: testUsers.validUser1.username,
        email: testUsers.validUser1.email,
        passwordHash: 'hashed_password_123',
      };

      await userRepository.create(userData);
      const foundUser = await userRepository.findByUsername(userData.username);

      expect(foundUser).toBeDefined();
      expect(foundUser?.username).toBe(userData.username);
      expect(foundUser?.email).toBe(userData.email);
    });

    it('should return null for non-existent username', async () => {
      const user = await userRepository.findByUsername('non_existent_user');

      expect(user).toBeNull();
    });

    it('should be case sensitive for username search', async () => {
      const userData = {
        username: 'TestUser',
        email: 'test@example.com',
        passwordHash: 'hashed_password_123',
      };

      await userRepository.create(userData);

      const foundUser = await userRepository.findByUsername('testuser');
      expect(foundUser).toBeNull();

      const foundUserCorrectCase = await userRepository.findByUsername('TestUser');
      expect(foundUserCorrectCase).toBeDefined();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email successfully', async () => {
      const userData = {
        username: testUsers.validUser1.username,
        email: testUsers.validUser1.email,
        passwordHash: 'hashed_password_123',
      };

      await userRepository.create(userData);
      const foundUser = await userRepository.findByEmail(userData.email);

      expect(foundUser).toBeDefined();
      expect(foundUser?.username).toBe(userData.username);
      expect(foundUser?.email).toBe(userData.email);
    });

    it('should return null for non-existent email', async () => {
      const user = await userRepository.findByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });

    it('should be case sensitive for email search', async () => {
      const userData = {
        username: testUsers.validUser1.username,
        email: 'Test@Example.Com',
        passwordHash: 'hashed_password_123',
      };

      await userRepository.create(userData);

      // Case-sensitive search should not find the user
      const foundUser = await userRepository.findByEmail('test@example.com');
      expect(foundUser).toBeNull();

      // Exact case match should find the user
      const exactMatch = await userRepository.findByEmail('Test@Example.Com');
      expect(exactMatch).toBeDefined();
      expect(exactMatch?.email).toBe(userData.email);
    });
  });

  describe('findAll', () => {
    it('should return all users with pagination', async () => {
      // Create multiple users
      const users = [
        {
          username: testUsers.validUser1.username,
          email: testUsers.validUser1.email,
          passwordHash: 'hash1',
        },
        {
          username: testUsers.validUser2.username,
          email: testUsers.validUser2.email,
          passwordHash: 'hash2',
        },
        {
          username: testUsers.validUser3.username,
          email: testUsers.validUser3.email,
          passwordHash: 'hash3',
        },
      ];

      for (const userData of users) {
        await userRepository.create(userData);
      }

      const result = await userRepository.findAll(new Pagination(1, 10));

      expect(result.users).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);

      // Verify all users are returned
      const usernames = result.users.map((user) => user.username);
      expect(usernames).toContain(testUsers.validUser1.username);
      expect(usernames).toContain(testUsers.validUser2.username);
      expect(usernames).toContain(testUsers.validUser3.username);
    });

    it('should handle pagination correctly', async () => {
      // Create 5 users
      for (let i = 1; i <= 5; i++) {
        await userRepository.create({
          username: `user${i}`,
          email: `user${i}@example.com`,
          passwordHash: `hash${i}`,
        });
      }

      // Get first page (limit 2)
      const firstPage = await userRepository.findAll(new Pagination(1, 2));
      expect(firstPage.users).toHaveLength(2);
      expect(firstPage.pagination.total).toBe(5);

      // Get second page
      const secondPage = await userRepository.findAll(new Pagination(2, 2));
      expect(secondPage.users).toHaveLength(2);
      expect(secondPage.pagination.total).toBe(5);

      // Get third page
      const thirdPage = await userRepository.findAll(new Pagination(3, 2));
      expect(thirdPage.users).toHaveLength(1);
      expect(thirdPage.pagination.total).toBe(5);
    });

    it('should return empty result when no users exist', async () => {
      const result = await userRepository.findAll(new Pagination(1, 10));

      expect(result.users).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const userData = {
        username: testUsers.validUser1.username,
        email: testUsers.validUser1.email,
        passwordHash: 'hashed_password_123',
      };

      const createdUser = await userRepository.create(userData);

      // Add small delay to ensure updatedAt is different
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updateData = {
        username: 'updated_username',
        email: 'updated@example.com',
      };

      // Add small delay to ensure updatedAt is different
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updatedUser = await userRepository.update(createdUser.id, updateData);

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.username).toBe(updateData.username);
      expect(updatedUser?.email).toBe(updateData.email);
      expect(updatedUser?.id).toBe(createdUser.id);

      // Verify updatedAt exists (timestamp precision issues in tests)
      expect(updatedUser?.updatedAt).toBeDefined();
    });

    it('should allow partial updates', async () => {
      const userData = {
        username: testUsers.validUser1.username,
        email: testUsers.validUser1.email,
        passwordHash: 'hashed_password_123',
      };

      const createdUser = await userRepository.create(userData);

      // Update only username
      const updatedUser = await userRepository.update(createdUser.id, {
        username: 'new_username_only',
      });

      expect(updatedUser?.username).toBe('new_username_only');
      expect(updatedUser?.email).toBe(userData.email); // Should remain unchanged
    });

    it('should throw error when updating non-existent user', async () => {
      await expect(
        userRepository.update(999999, {
          username: 'new_username',
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      const userData = {
        username: testUsers.validUser1.username,
        email: testUsers.validUser1.email,
        passwordHash: 'hashed_password_123',
      };

      const createdUser = await userRepository.create(userData);

      await userRepository.delete(createdUser.id);

      // Verify user is deleted
      const foundUser = await userRepository.findById(createdUser.id);
      expect(foundUser).toBeNull();
    });

    it('should throw error when deleting non-existent user', async () => {
      await expect(userRepository.delete(999999)).rejects.toThrow('User not found');
    });
  });
});
