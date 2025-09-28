import { afterAll, beforeAll, beforeEach } from 'vitest';
import { Container } from '../src/shared/container/Container';

// Set up environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-key-that-is-at-least-32-characters-long';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

beforeAll(async () => {
  // Initialize the container once for all tests
  const container = Container.getInstance();
  await container.initialize();
});

beforeEach(async () => {
  // Clean up database before each test using the container's database
  try {
    const container = Container.getInstance();
    const db = container.get('database');
    db.exec(`
      DELETE FROM mentions;
      DELETE FROM comments;
      DELETE FROM posts;
      DELETE FROM users;
    `);
  } catch (error) {
    // Container might not be initialized yet for some tests
    console.warn('Could not clean database in beforeEach:', error);
  }
});

afterAll(async () => {
  try {
    const container = Container.getInstance();
    await container.cleanup();
  } catch (error) {
    console.warn('Could not cleanup container:', error);
  }
});
