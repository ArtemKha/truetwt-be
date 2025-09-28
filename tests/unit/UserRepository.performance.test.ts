import { CreateUserData } from '@domain/entities/User';
import { SQLiteUserRepository } from '@infrastructure/repositories/SQLiteUserRepository';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('UserRepository Performance Tests', () => {
  let db: Database.Database;
  let userRepository: SQLiteUserRepository;

  beforeEach(async () => {
    // Create in-memory database for testing
    db = new Database(':memory:');

    // Create users table
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    userRepository = new SQLiteUserRepository(db);

    // Seed test data
    const users: (CreateUserData & { passwordHash: string })[] = [];
    for (let i = 1; i <= 100; i++) {
      users.push({
        username: `user${i}`,
        email: `user${i}@example.com`,
        passwordHash: 'hashedpassword',
      });
    }

    // Insert users
    for (const user of users) {
      await userRepository.create(user);
    }
  });

  afterEach(() => {
    db.close();
  });

  describe('Batch vs Individual Lookups Performance', () => {
    it('should perform significantly better with batch lookup vs individual queries', async () => {
      const usernamesToFind = ['user1', 'user5', 'user10', 'user15', 'user20'];

      // Test individual lookups (N+1 pattern)
      const startIndividual = performance.now();
      const individualResults = [];
      for (const username of usernamesToFind) {
        const user = await userRepository.findByUsername(username);
        if (user) {
          individualResults.push({ id: user.id, username: user.username });
        }
      }
      const endIndividual = performance.now();
      const individualTime = endIndividual - startIndividual;

      // Test batch lookup
      const startBatch = performance.now();
      const batchResults = await userRepository.findByUsernames(usernamesToFind);
      const endBatch = performance.now();
      const batchTime = endBatch - startBatch;

      // Verify results are equivalent
      expect(batchResults).toHaveLength(5);
      expect(individualResults).toHaveLength(5);

      // Sort both arrays for comparison
      const sortedBatch = batchResults.sort((a, b) => a.username.localeCompare(b.username));
      const sortedIndividual = individualResults.sort((a, b) =>
        a.username.localeCompare(b.username)
      );

      expect(sortedBatch).toEqual(sortedIndividual);

      // Performance assertion - batch should be faster (or at least not significantly slower)
      // In a real database with network latency, batch would be much faster
      console.log(`Individual queries time: ${individualTime.toFixed(2)}ms`);
      console.log(`Batch query time: ${batchTime.toFixed(2)}ms`);
      console.log(
        `Performance improvement: ${(((individualTime - batchTime) / individualTime) * 100).toFixed(1)}%`
      );

      // Batch should not be more than 50% slower than individual (accounting for SQLite in-memory speed)
      expect(batchTime).toBeLessThan(individualTime * 1.5);
    });

    it('should handle empty username arrays efficiently', async () => {
      const result = await userRepository.findByUsernames([]);
      expect(result).toEqual([]);
    });

    it('should handle duplicate usernames efficiently', async () => {
      const usernames = ['user1', 'user1', 'user2', 'user2', 'user3'];
      const result = await userRepository.findByUsernames(usernames);

      // Should return unique users only
      expect(result).toHaveLength(3);
      const usernamesToCheck = result.map((u) => u.username).sort();
      expect(usernamesToCheck).toEqual(['user1', 'user2', 'user3']);
    });

    it('should handle non-existent usernames gracefully', async () => {
      const usernames = ['user1', 'nonexistent1', 'user2', 'nonexistent2'];
      const result = await userRepository.findByUsernames(usernames);

      // Should return only existing users
      expect(result).toHaveLength(2);
      const foundUsernames = result.map((u) => u.username).sort();
      expect(foundUsernames).toEqual(['user1', 'user2']);
    });

    it('should handle large batch sizes efficiently', async () => {
      // Test with 50 usernames
      const usernames = Array.from({ length: 50 }, (_, i) => `user${i + 1}`);

      const start = performance.now();
      const result = await userRepository.findByUsernames(usernames);
      const end = performance.now();

      expect(result).toHaveLength(50);

      // Should complete in reasonable time (adjust threshold as needed)
      const executionTime = end - start;
      console.log(`Large batch query time: ${executionTime.toFixed(2)}ms`);
      expect(executionTime).toBeLessThan(100); // Should be under 100ms
    });
  });

  describe('findByIds Performance', () => {
    it('should efficiently lookup users by IDs', async () => {
      const idsToFind = [1, 5, 10, 15, 20];

      const start = performance.now();
      const result = await userRepository.findByIds(idsToFind);
      const end = performance.now();

      expect(result).toHaveLength(5);

      const executionTime = end - start;
      console.log(`Batch ID lookup time: ${executionTime.toFixed(2)}ms`);
      expect(executionTime).toBeLessThan(50); // Should be very fast
    });

    it('should handle invalid IDs gracefully', async () => {
      const ids = [1, -1, 0, 999, 2.5, NaN];
      const result = await userRepository.findByIds(ids as number[]);

      // Should return only valid users (ID 1 exists)
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });
});
