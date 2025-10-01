import { IPostRepository } from '@application/ports/repositories/IPostRepository';
import {
  CreatePostData,
  PaginatedPosts,
  Post,
  PostWithUser,
  PostWithUserAndMentions,
} from '@domain/entities/Post';
import { UserSummary } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/DomainError';
import { Pagination } from '@domain/value-objects/Pagination';
import Database from 'better-sqlite3';
import {
  CountResult,
  convertDbBooleanToBoolean,
  convertDbRowToDate,
  DatabaseRunResult,
  isCountResult,
  isMentionUserDbRow,
  isPostDbRow,
  isPostWithUserAndEmailDbRow,
  isPostWithUserDbRow,
  MentionUserDbRow,
  PostDbRow,
  PostWithUserAndEmailDbRow,
  PostWithUserDbRow,
} from '../database/types';

export class SQLitePostRepository implements IPostRepository {
  constructor(private db: Database.Database) {}

  async create(postData: CreatePostData): Promise<Post> {
    const query = `
      INSERT INTO posts (user_id, content, created_at, updated_at, is_deleted)
      VALUES (?, ?, datetime('now'), datetime('now'), 0)
    `;

    const result = this.db
      .prepare(query)
      .run(postData.userId, postData.content) as DatabaseRunResult;

    const postRow = this.db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid);

    if (!isPostDbRow(postRow)) {
      throw new Error('Failed to retrieve created post');
    }

    return {
      id: postRow.id,
      userId: postRow.user_id,
      content: postRow.content,
      createdAt: convertDbRowToDate(postRow.created_at),
      updatedAt: convertDbRowToDate(postRow.updated_at),
      isDeleted: convertDbBooleanToBoolean(postRow.is_deleted),
    };
  }

  async findById(id: number): Promise<PostWithUserAndMentions | null> {
    const query = `
      SELECT 
        p.id, p.user_id, p.content, p.created_at, p.updated_at, p.is_deleted,
        u.username, u.email
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ? AND p.is_deleted = 0
    `;

    const postRow = this.db.prepare(query).get(id);
    if (!postRow) return null;

    if (!isPostWithUserAndEmailDbRow(postRow)) {
      throw new Error('Invalid post data retrieved from database');
    }

    // Get mentions for this post
    const mentionsQuery = `
      SELECT u.id, u.username
      FROM mentions m
      JOIN users u ON m.mentioned_user_id = u.id
      WHERE m.post_id = ?
    `;

    const mentionRows = this.db.prepare(mentionsQuery).all(id);

    const mentions: UserSummary[] = mentionRows.map((row) => {
      if (!isMentionUserDbRow(row)) {
        throw new Error('Invalid mention data retrieved from database');
      }
      return {
        id: row.id,
        username: row.username,
      };
    });

    return {
      id: postRow.id,
      userId: postRow.user_id,
      content: postRow.content,
      createdAt: convertDbRowToDate(postRow.created_at),
      updatedAt: convertDbRowToDate(postRow.updated_at),
      isDeleted: convertDbBooleanToBoolean(postRow.is_deleted),
      user: {
        id: postRow.user_id,
        username: postRow.username,
      },
      mentions,
    };
  }

  async findByIdWithUser(id: number): Promise<PostWithUser | null> {
    const query = `
      SELECT 
        p.id, p.user_id, p.content, p.created_at, p.updated_at, p.is_deleted,
        u.username
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ? AND p.is_deleted = 0
    `;

    const postRow = this.db.prepare(query).get(id);
    if (!postRow) return null;

    if (!isPostWithUserDbRow(postRow)) {
      throw new Error('Invalid post data retrieved from database');
    }

    return {
      id: postRow.id,
      userId: postRow.user_id,
      content: postRow.content,
      createdAt: convertDbRowToDate(postRow.created_at),
      updatedAt: convertDbRowToDate(postRow.updated_at),
      isDeleted: convertDbBooleanToBoolean(postRow.is_deleted),
      user: {
        id: postRow.user_id,
        username: postRow.username,
      },
    };
  }

  async findByUserId(userId: number, pagination: Pagination): Promise<PaginatedPosts> {
    const countQuery = 'SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND is_deleted = 0';
    const countResult = this.db.prepare(countQuery).get(userId);

    if (!isCountResult(countResult)) {
      throw new Error('Failed to get post count');
    }

    const total = countResult.count;

    const query = `
      SELECT 
        p.id, p.user_id, p.content, p.created_at, p.updated_at, p.is_deleted,
        u.username
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ? AND p.is_deleted = 0
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const postRows = this.db.prepare(query).all(userId, pagination.limit, pagination.offset);

    // Validate all rows are PostWithUserDbRow
    const validatedPosts = postRows.map((row) => {
      if (!isPostWithUserDbRow(row)) {
        throw new Error('Invalid post data retrieved from database');
      }
      return row;
    });

    const postsWithMentions = await this.addMentionsToPosts(validatedPosts);

    const paginationResult = pagination.createResult(total);
    return {
      posts: postsWithMentions,
      ...paginationResult,
    };
  }

  async findAll(pagination: Pagination): Promise<PaginatedPosts> {
    const countQuery = 'SELECT COUNT(*) as count FROM posts WHERE is_deleted = 0';
    const countResult = this.db.prepare(countQuery).get();

    if (!isCountResult(countResult)) {
      throw new Error('Failed to get post count');
    }

    const total = countResult.count;

    const query = `
      SELECT 
        p.id, p.user_id, p.content, p.created_at, p.updated_at, p.is_deleted,
        u.username
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.is_deleted = 0
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const postRows = this.db.prepare(query).all(pagination.limit, pagination.offset);

    // Validate all rows are PostWithUserDbRow
    const validatedPosts = postRows.map((row) => {
      if (!isPostWithUserDbRow(row)) {
        throw new Error('Invalid post data retrieved from database');
      }
      return row;
    });

    const postsWithMentions = await this.addMentionsToPosts(validatedPosts);

    const paginationResult = pagination.createResult(total);
    return {
      posts: postsWithMentions,
      ...paginationResult,
    };
  }

  private async addMentionsToPosts(posts: PostWithUserDbRow[]): Promise<PostWithUserAndMentions[]> {
    if (posts.length === 0) return [];

    const postIds = posts.map((p) => p.id);
    const placeholders = postIds.map(() => '?').join(',');

    const mentionsQuery = `
      SELECT m.post_id, u.id, u.username
      FROM mentions m
      JOIN users u ON m.mentioned_user_id = u.id
      WHERE m.post_id IN (${placeholders})
    `;

    const mentionRows = this.db.prepare(mentionsQuery).all(...postIds);

    // Validate mention rows and build mentions map
    const mentionsByPost: Record<number, UserSummary[]> = {};

    mentionRows.forEach((row) => {
      // Validate mention row structure
      if (
        !row ||
        typeof row !== 'object' ||
        !('post_id' in row) ||
        !('id' in row) ||
        !('username' in row)
      ) {
        throw new Error('Invalid mention data retrieved from database');
      }

      const mentionRow = row as { post_id: number; id: number; username: string };

      if (!mentionsByPost[mentionRow.post_id]) {
        mentionsByPost[mentionRow.post_id] = [];
      }

      mentionsByPost[mentionRow.post_id].push({
        id: mentionRow.id,
        username: mentionRow.username,
      });
    });

    return posts.map((post) => ({
      id: post.id,
      userId: post.user_id,
      content: post.content,
      createdAt: convertDbRowToDate(post.created_at),
      updatedAt: convertDbRowToDate(post.updated_at),
      isDeleted: convertDbBooleanToBoolean(post.is_deleted),
      user: {
        id: post.user_id,
        username: post.username,
      },
      mentions: mentionsByPost[post.id] || [],
    }));
  }

  async update(id: number, content: string): Promise<Post> {
    // TODO: CACHE STALENESS FIX - This method updates posts but doesn't invalidate cache
    // Need to:
    // 1. Get old post data before update (for cache removal by timestamp)
    // 2. Update database
    // 3. Remove old version from timeline cache
    // 4. Add updated version to timeline cache
    // 5. Handle cache operation failures gracefully

    const query = `
      UPDATE posts 
      SET content = ?, updated_at = datetime('now') 
      WHERE id = ? AND is_deleted = 0
    `;

    const result = this.db.prepare(query).run(content, id);

    if (result.changes === 0) {
      throw new NotFoundError('Post not found');
    }

    const updatedPost = this.db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any;

    return {
      id: updatedPost.id,
      userId: updatedPost.user_id,
      content: updatedPost.content,
      createdAt: new Date(updatedPost.created_at),
      updatedAt: new Date(updatedPost.updated_at),
      isDeleted: Boolean(updatedPost.is_deleted),
    };
  }

  async softDelete(id: number): Promise<void> {
    const query = `
      UPDATE posts 
      SET is_deleted = 1, updated_at = datetime('now') 
      WHERE id = ? AND is_deleted = 0
    `;

    const result = this.db.prepare(query).run(id);

    if (result.changes === 0) {
      throw new NotFoundError('Post not found');
    }
  }

  async hardDelete(id: number): Promise<void> {
    const query = 'DELETE FROM posts WHERE id = ?';
    const result = this.db.prepare(query).run(id);

    if (result.changes === 0) {
      throw new NotFoundError('Post not found');
    }
  }

  async exists(id: number): Promise<boolean> {
    const query = 'SELECT COUNT(*) as count FROM posts WHERE id = ? AND is_deleted = 0';
    const result = this.db.prepare(query).get(id) as any;
    return result.count > 0;
  }

  async isOwner(postId: number, userId: number): Promise<boolean> {
    const query =
      'SELECT COUNT(*) as count FROM posts WHERE id = ? AND user_id = ? AND is_deleted = 0';
    const result = this.db.prepare(query).get(postId, userId) as any;
    return result.count > 0;
  }

  async count(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM posts WHERE is_deleted = 0';
    const result = this.db.prepare(query).get() as any;
    return result.count;
  }

  async countByUser(userId: number): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND is_deleted = 0';
    const result = this.db.prepare(query).get(userId) as any;
    return result.count;
  }
}
