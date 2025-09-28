/**
 * Database row types for type-safe SQLite operations
 * These interfaces represent the exact structure of data as stored in SQLite
 */

// Base database row interface with common SQLite characteristics
interface BaseDbRow {
  id: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  created_at: string; // SQLite stores datetime as string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  updated_at: string;
}

// User table row type
export interface UserDbRow extends BaseDbRow {
  username: string;
  email: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  password_hash: string;
}

// Post table row type
export interface PostDbRow extends BaseDbRow {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  user_id: number;
  content: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  is_deleted: number; // SQLite stores boolean as 0/1
}

// Comment table row type
export interface CommentDbRow extends BaseDbRow {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  post_id: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  user_id: number;
  content: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  is_deleted: number; // SQLite stores boolean as 0/1
}

// Mention table row type
export interface MentionDbRow {
  id: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  post_id: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  mentioned_user_id: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  created_at: string;
}

// Joined query result types
export interface PostWithUserDbRow extends PostDbRow {
  username: string; // From joined users table
}

export interface PostWithUserAndEmailDbRow extends PostDbRow {
  username: string; // From joined users table
  email: string; // From joined users table
}

export interface CommentWithUserDbRow extends CommentDbRow {
  username: string; // From joined users table
}

// Mention query result types
export interface MentionUserDbRow {
  id: number;
  username: string;
}

// Count query result type
export interface CountResult {
  count: number;
}

// Generic database result types for better-sqlite3
export interface DatabaseRunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

// Type guards for runtime type checking
export function isUserDbRow(row: unknown): row is UserDbRow {
  return (
    typeof row === 'object' &&
    row !== null &&
    'id' in row &&
    'username' in row &&
    'email' in row &&
    'password_hash' in row &&
    'created_at' in row &&
    'updated_at' in row
  );
}

export function isPostDbRow(row: unknown): row is PostDbRow {
  return (
    typeof row === 'object' &&
    row !== null &&
    'id' in row &&
    'user_id' in row &&
    'content' in row &&
    'created_at' in row &&
    'updated_at' in row &&
    'is_deleted' in row
  );
}

export function isCommentDbRow(row: unknown): row is CommentDbRow {
  return (
    typeof row === 'object' &&
    row !== null &&
    'id' in row &&
    'post_id' in row &&
    'user_id' in row &&
    'content' in row &&
    'created_at' in row &&
    'updated_at' in row &&
    'is_deleted' in row
  );
}

export function isMentionDbRow(row: unknown): row is MentionDbRow {
  return (
    typeof row === 'object' &&
    row !== null &&
    'id' in row &&
    'post_id' in row &&
    'mentioned_user_id' in row &&
    'created_at' in row
  );
}

export function isCountResult(row: unknown): row is CountResult {
  return (
    typeof row === 'object' &&
    row !== null &&
    'count' in row &&
    typeof (row as Record<string, unknown>).count === 'number'
  );
}

export function isPostWithUserDbRow(row: unknown): row is PostWithUserDbRow {
  return (
    isPostDbRow(row) &&
    'username' in row &&
    typeof (row as Record<string, unknown>).username === 'string'
  );
}

export function isPostWithUserAndEmailDbRow(row: unknown): row is PostWithUserAndEmailDbRow {
  return (
    isPostDbRow(row) &&
    'username' in row &&
    'email' in row &&
    typeof (row as Record<string, unknown>).username === 'string' &&
    typeof (row as Record<string, unknown>).email === 'string'
  );
}

export function isMentionUserDbRow(row: unknown): row is MentionUserDbRow {
  return (
    typeof row === 'object' &&
    row !== null &&
    'id' in row &&
    'username' in row &&
    typeof (row as Record<string, unknown>).id === 'number' &&
    typeof (row as Record<string, unknown>).username === 'string'
  );
}

export function isCommentWithUserDbRow(row: unknown): row is CommentWithUserDbRow {
  return (
    isCommentDbRow(row) &&
    'username' in row &&
    typeof (row as Record<string, unknown>).username === 'string'
  );
}

// Utility functions for type conversion
export function convertDbRowToDate(dateString: string): Date {
  return new Date(dateString);
}

export function convertDbBooleanToBoolean(dbBoolean: number): boolean {
  return Boolean(dbBoolean);
}
