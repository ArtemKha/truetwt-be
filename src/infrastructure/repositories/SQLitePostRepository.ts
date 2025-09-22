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

export class SQLitePostRepository implements IPostRepository {
  constructor(private db: Database.Database) {}

  async create(postData: CreatePostData): Promise<Post> {
    const query = `
      INSERT INTO posts (user_id, content, created_at, updated_at, is_deleted)
      VALUES (?, ?, datetime('now'), datetime('now'), 0)
    `;

    const result = this.db.prepare(query).run(postData.userId, postData.content);

    const post = this.db
      .prepare('SELECT * FROM posts WHERE id = ?')
      .get(result.lastInsertRowid) as any;

    return {
      id: post.id,
      userId: post.user_id,
      content: post.content,
      createdAt: new Date(post.created_at),
      updatedAt: new Date(post.updated_at),
      isDeleted: Boolean(post.is_deleted),
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

    const post = this.db.prepare(query).get(id) as any;
    if (!post) return null;

    // Get mentions for this post
    const mentionsQuery = `
      SELECT u.id, u.username
      FROM mentions m
      JOIN users u ON m.mentioned_user_id = u.id
      WHERE m.post_id = ?
    `;

    const mentions = this.db.prepare(mentionsQuery).all(id) as any[];

    return {
      id: post.id,
      userId: post.user_id,
      content: post.content,
      createdAt: new Date(post.created_at),
      updatedAt: new Date(post.updated_at),
      isDeleted: Boolean(post.is_deleted),
      user: {
        id: post.user_id,
        username: post.username,
      },
      mentions: mentions.map((m) => ({
        id: m.id,
        username: m.username,
      })),
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

    const post = this.db.prepare(query).get(id) as any;
    if (!post) return null;

    return {
      id: post.id,
      userId: post.user_id,
      content: post.content,
      createdAt: new Date(post.created_at),
      updatedAt: new Date(post.updated_at),
      isDeleted: Boolean(post.is_deleted),
      user: {
        id: post.user_id,
        username: post.username,
      },
    };
  }

  async findByUserId(userId: number, pagination: Pagination): Promise<PaginatedPosts> {
    const countQuery = 'SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND is_deleted = 0';
    const total = (this.db.prepare(countQuery).get(userId) as any).count;

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

    const posts = this.db.prepare(query).all(userId, pagination.limit, pagination.offset) as any[];

    const postsWithMentions = await this.addMentionsToPosts(posts);

    return {
      posts: postsWithMentions,
      total,
      page: pagination.page,
      limit: pagination.limit,
      hasNext: pagination.page * pagination.limit < total,
      hasPrev: pagination.page > 1,
    };
  }

  async findAll(pagination: Pagination): Promise<PaginatedPosts> {
    const countQuery = 'SELECT COUNT(*) as count FROM posts WHERE is_deleted = 0';
    const total = (this.db.prepare(countQuery).get() as any).count;

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

    const posts = this.db.prepare(query).all(pagination.limit, pagination.offset) as any[];

    const postsWithMentions = await this.addMentionsToPosts(posts);

    return {
      posts: postsWithMentions,
      total,
      page: pagination.page,
      limit: pagination.limit,
      hasNext: pagination.page * pagination.limit < total,
      hasPrev: pagination.page > 1,
    };
  }

  private async addMentionsToPosts(posts: any[]): Promise<PostWithUserAndMentions[]> {
    if (posts.length === 0) return [];

    const postIds = posts.map((p) => p.id);
    const placeholders = postIds.map(() => '?').join(',');

    const mentionsQuery = `
      SELECT m.post_id, u.id, u.username
      FROM mentions m
      JOIN users u ON m.mentioned_user_id = u.id
      WHERE m.post_id IN (${placeholders})
    `;

    const mentions = this.db.prepare(mentionsQuery).all(...postIds) as any[];
    const mentionsByPost = mentions.reduce(
      (acc, mention) => {
        if (!acc[mention.post_id]) {
          acc[mention.post_id] = [];
        }
        acc[mention.post_id].push({
          id: mention.id,
          username: mention.username,
        });
        return acc;
      },
      {} as Record<number, UserSummary[]>
    );

    return posts.map((post) => ({
      id: post.id,
      userId: post.user_id,
      content: post.content,
      createdAt: new Date(post.created_at),
      updatedAt: new Date(post.updated_at),
      isDeleted: Boolean(post.is_deleted),
      user: {
        id: post.user_id,
        username: post.username,
      },
      mentions: mentionsByPost[post.id] || [],
    }));
  }

  async update(id: number, content: string): Promise<Post> {
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
