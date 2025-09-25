import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { logger } from '@shared/utils/logger';
import Database from 'better-sqlite3';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private db: Database.Database;

  private constructor(databasePath: string, isMemory = false) {
    try {
      if (!isMemory) {
        this.ensureDatabaseDirectoryExists(databasePath);
      }

      this.db = new Database(isMemory ? ':memory:' : databasePath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      this.initializeSchema();
      logger.info('Database connection established', { path: databasePath, isMemory });
    } catch (error) {
      logger.error('Failed to connect to database', { error, path: databasePath });
      throw error;
    }
  }

  public static getInstance(databasePath?: string, isMemory = false): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      if (!databasePath) {
        throw new Error('Database path must be provided on first initialization');
      }
      DatabaseConnection.instance = new DatabaseConnection(databasePath, isMemory);
    }
    return DatabaseConnection.instance;
  }

  public getDatabase(): Database.Database {
    return this.db;
  }

  private ensureDatabaseDirectoryExists(databasePath: string): void {
    try {
      const directory = dirname(databasePath);

      if (!existsSync(directory)) {
        mkdirSync(directory, { recursive: true });
        logger.info('Created database directory', { directory });
      }
    } catch (error) {
      logger.error('Failed to create database directory', { error, path: databasePath });
      throw error;
    }
  }

  private initializeSchema(): void {
    try {
      // Try to find schema.sql in multiple locations for dev/prod compatibility
      const possiblePaths = [
        // Development: source directory
        join(process.cwd(), 'src', 'infrastructure', 'database', 'schema.sql'),
        // Production: dist directory (if copied)
        join(process.cwd(), 'dist', 'infrastructure', 'database', 'schema.sql'),
        // Docker/Production: root level
        join(process.cwd(), 'schema.sql'),
        // Alternative: check if we're running from dist
        join(__dirname, 'schema.sql'),
      ];

      let schema: string = '';
      let usedPath: string | null = null;

      for (const schemaPath of possiblePaths) {
        try {
          if (existsSync(schemaPath)) {
            schema = readFileSync(schemaPath, 'utf-8');
            usedPath = schemaPath;
            break;
          }
        } catch {}
      }

      if (!usedPath || !schema) {
        throw new Error(
          `Schema file not found in any of the expected locations: ${possiblePaths.join(', ')}`
        );
      }

      this.db.exec(schema);
      logger.info('Database schema initialized successfully', { schemaPath: usedPath });
    } catch (error) {
      logger.error('Failed to initialize database schema', { error });
      throw error;
    }
  }

  public async close(): Promise<void> {
    try {
      this.db.close();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection', { error });
      throw error;
    }
  }

  public beginTransaction(): Database.Transaction {
    return this.db.transaction(() => {});
  }

  public isOpen(): boolean {
    return this.db.open;
  }
}
