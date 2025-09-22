"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const connection_1 = require("@infrastructure/database/connection");
let testDb;
(0, vitest_1.beforeAll)(async () => {
    // Initialize in-memory test database
    const dbConnection = connection_1.DatabaseConnection.getInstance(':memory:', true);
    testDb = dbConnection.getDatabase();
});
(0, vitest_1.beforeEach)(async () => {
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
(0, vitest_1.afterAll)(async () => {
    if (testDb) {
        const dbConnection = connection_1.DatabaseConnection.getInstance();
        await dbConnection.close();
    }
});
//# sourceMappingURL=setup.js.map