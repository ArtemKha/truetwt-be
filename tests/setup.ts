import { beforeAll, afterAll, beforeEach } from 'vitest';
import { DatabaseConnection } from '@infrastructure/database/connection';

let testDb: any;

beforeAll(async () => {
  // Initialize in-memory test database
  const dbConnection = DatabaseConnection.getInstance(':memory:', true);
  testDb = dbConnection.getDatabase();
});

beforeEach(async () => {
  // Clean up tables before each test
  if (testDb) {
    testDb.exec(`
      DELETE FROM mentions;
      DELETE FROM comments;
      DELETE FROM posts;
      DELETE FROM users;
    `);
  }
});

afterAll(async () => {
  if (testDb) {
    const dbConnection = DatabaseConnection.getInstance();
    await dbConnection.close();
  }
});
