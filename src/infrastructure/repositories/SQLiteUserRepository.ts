import { IUserRepository } from '@application/ports/repositories/IUserRepository';
import { CreateUserData, UpdateUserData, User, UserProfile } from '@domain/entities/User';
import { ConflictError, NotFoundError } from '@domain/errors/DomainError';
import { Pagination, PaginationResult } from '@domain/value-objects/Pagination';
import Database from 'better-sqlite3';
import {
  CountResult,
  convertDbRowToDate,
  DatabaseRunResult,
  isCountResult,
  isUserDbRow,
  UserDbRow,
} from '../database/types';

export class SQLiteUserRepository implements IUserRepository {
  constructor(private db: Database.Database) {}

  async create(userData: CreateUserData & { passwordHash: string }): Promise<User> {
    const query = `
      INSERT INTO users (username, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `;

    try {
      const result = this.db
        .prepare(query)
        .run(userData.username, userData.email, userData.passwordHash) as DatabaseRunResult;

      const userRow = this.db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(result.lastInsertRowid);

      if (!isUserDbRow(userRow)) {
        throw new Error('Failed to retrieve created user');
      }

      return {
        id: userRow.id,
        username: userRow.username,
        email: userRow.email,
        passwordHash: userRow.password_hash,
        createdAt: convertDbRowToDate(userRow.created_at),
        updatedAt: convertDbRowToDate(userRow.updated_at),
      };
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new ConflictError('Username or email already exists');
      }
      throw error;
    }
  }

  async findById(id: number): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = ?';
    const userRow = this.db.prepare(query).get(id);

    if (!userRow) return null;

    if (!isUserDbRow(userRow)) {
      throw new Error('Invalid user data retrieved from database');
    }

    return {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      passwordHash: userRow.password_hash,
      createdAt: convertDbRowToDate(userRow.created_at),
      updatedAt: convertDbRowToDate(userRow.updated_at),
    };
  }

  async findByUsername(username: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE username = ?';
    const userRow = this.db.prepare(query).get(username);

    if (!userRow) return null;

    if (!isUserDbRow(userRow)) {
      throw new Error('Invalid user data retrieved from database');
    }

    return {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      passwordHash: userRow.password_hash,
      createdAt: convertDbRowToDate(userRow.created_at),
      updatedAt: convertDbRowToDate(userRow.updated_at),
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = ?';
    const userRow = this.db.prepare(query).get(email);

    if (!userRow) return null;

    if (!isUserDbRow(userRow)) {
      throw new Error('Invalid user data retrieved from database');
    }

    return {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      passwordHash: userRow.password_hash,
      createdAt: convertDbRowToDate(userRow.created_at),
      updatedAt: convertDbRowToDate(userRow.updated_at),
    };
  }

  async update(id: number, userData: UpdateUserData): Promise<User> {
    const setClause = [];
    const values = [];

    if (userData.username !== undefined) {
      setClause.push('username = ?');
      values.push(userData.username);
    }
    if (userData.email !== undefined) {
      setClause.push('email = ?');
      values.push(userData.email);
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    setClause.push("updated_at = datetime('now')");
    values.push(id);

    const query = `UPDATE users SET ${setClause.join(', ')} WHERE id = ?`;

    try {
      const result = this.db.prepare(query).run(...values) as DatabaseRunResult;

      if (result.changes === 0) {
        throw new NotFoundError('User not found');
      }

      const updatedUser = await this.findById(id);
      if (!updatedUser) {
        throw new NotFoundError('User not found after update');
      }

      return updatedUser;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new ConflictError('Username or email already exists');
      }
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    const query = 'DELETE FROM users WHERE id = ?';
    const result = this.db.prepare(query).run(id) as DatabaseRunResult;

    if (result.changes === 0) {
      throw new NotFoundError('User not found');
    }
  }

  async findAll(
    pagination: Pagination
  ): Promise<{ users: UserProfile[]; pagination: PaginationResult }> {
    const countQuery = 'SELECT COUNT(*) as count FROM users';
    const countResult = this.db.prepare(countQuery).get();

    if (!isCountResult(countResult)) {
      throw new Error('Failed to get user count');
    }

    const total = countResult.count;

    const query = `
      SELECT id, username, email, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;

    const userRows = this.db.prepare(query).all(pagination.limit, pagination.offset);

    const userProfiles: UserProfile[] = userRows.map((row) => {
      // Validate that this is a partial user row (without password_hash)
      if (
        !row ||
        typeof row !== 'object' ||
        !('id' in row) ||
        !('username' in row) ||
        !('email' in row) ||
        !('created_at' in row) ||
        !('updated_at' in row)
      ) {
        throw new Error('Invalid user profile data retrieved from database');
      }

      const userRow = row as Pick<
        UserDbRow,
        'id' | 'username' | 'email' | 'created_at' | 'updated_at'
      >;

      return {
        id: userRow.id,
        username: userRow.username,
        email: userRow.email,
        createdAt: convertDbRowToDate(userRow.created_at),
        updatedAt: convertDbRowToDate(userRow.updated_at),
      };
    });

    return {
      users: userProfiles,
      pagination: pagination.createResult(total),
    };
  }

  async exists(username: string, email: string): Promise<boolean> {
    const query = 'SELECT COUNT(*) as count FROM users WHERE username = ? OR email = ?';
    const result = this.db.prepare(query).get(username, email) as any;
    return result.count > 0;
  }

  async count(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM users';
    const result = this.db.prepare(query).get() as any;
    return result.count;
  }
}
