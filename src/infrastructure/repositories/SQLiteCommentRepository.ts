import { ICommentRepository } from '@application/ports/repositories/ICommentRepository';
import {
  Comment,
  CommentWithUser,
  CreateCommentData,
  PaginatedComments,
} from '@domain/entities/Comment';
import { NotFoundError } from '@domain/errors/DomainError';
import { Pagination } from '@domain/value-objects/Pagination';
import Database from 'better-sqlite3';

export class SQLiteCommentRepository implements ICommentRepository {
  constructor(private db: Database.Database) {}

  async create(commentData: CreateCommentData): Promise<Comment> {
    const query = `
      INSERT INTO comments (post_id, user_id, content, created_at, updated_at, is_deleted)
      VALUES (?, ?, ?, datetime('now'), datetime('now'), 0)
    `;

    const result = this.db
      .prepare(query)
      .run(commentData.postId, commentData.userId, commentData.content);

    const comment = this.db
      .prepare('SELECT * FROM comments WHERE id = ?')
      .get(result.lastInsertRowid) as any;

    return {
      id: comment.id,
      postId: comment.post_id,
      userId: comment.user_id,
      content: comment.content,
      createdAt: new Date(comment.created_at),
      updatedAt: new Date(comment.updated_at),
      isDeleted: Boolean(comment.is_deleted),
    };
  }

  async findById(id: number): Promise<CommentWithUser | null> {
    const query = `
      SELECT 
        c.id, c.post_id, c.user_id, c.content, c.created_at, c.updated_at, c.is_deleted,
        u.username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ? AND c.is_deleted = 0
    `;

    const comment = this.db.prepare(query).get(id) as any;
    if (!comment) return null;

    return {
      id: comment.id,
      postId: comment.post_id,
      userId: comment.user_id,
      content: comment.content,
      createdAt: new Date(comment.created_at),
      updatedAt: new Date(comment.updated_at),
      isDeleted: Boolean(comment.is_deleted),
      user: {
        id: comment.user_id,
        username: comment.username,
      },
    };
  }

  async findByPostId(postId: number, pagination: Pagination): Promise<PaginatedComments> {
    const countQuery =
      'SELECT COUNT(*) as count FROM comments WHERE post_id = ? AND is_deleted = 0';
    const total = (this.db.prepare(countQuery).get(postId) as any).count;

    const query = `
      SELECT 
        c.id, c.post_id, c.user_id, c.content, c.created_at, c.updated_at, c.is_deleted,
        u.username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ? AND c.is_deleted = 0
      ORDER BY c.created_at ASC
      LIMIT ? OFFSET ?
    `;

    const comments = this.db
      .prepare(query)
      .all(postId, pagination.limit, pagination.offset) as any[];

    const commentsWithUser: CommentWithUser[] = comments.map((comment) => ({
      id: comment.id,
      postId: comment.post_id,
      userId: comment.user_id,
      content: comment.content,
      createdAt: new Date(comment.created_at),
      updatedAt: new Date(comment.updated_at),
      isDeleted: Boolean(comment.is_deleted),
      user: {
        id: comment.user_id,
        username: comment.username,
      },
    }));

    return {
      comments: commentsWithUser,
      total,
      page: pagination.page,
      limit: pagination.limit,
      hasNext: pagination.page * pagination.limit < total,
      hasPrev: pagination.page > 1,
    };
  }

  async findByUserId(userId: number, pagination: Pagination): Promise<PaginatedComments> {
    const countQuery =
      'SELECT COUNT(*) as count FROM comments WHERE user_id = ? AND is_deleted = 0';
    const total = (this.db.prepare(countQuery).get(userId) as any).count;

    const query = `
      SELECT 
        c.id, c.post_id, c.user_id, c.content, c.created_at, c.updated_at, c.is_deleted,
        u.username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.user_id = ? AND c.is_deleted = 0
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const comments = this.db
      .prepare(query)
      .all(userId, pagination.limit, pagination.offset) as any[];

    const commentsWithUser: CommentWithUser[] = comments.map((comment) => ({
      id: comment.id,
      postId: comment.post_id,
      userId: comment.user_id,
      content: comment.content,
      createdAt: new Date(comment.created_at),
      updatedAt: new Date(comment.updated_at),
      isDeleted: Boolean(comment.is_deleted),
      user: {
        id: comment.user_id,
        username: comment.username,
      },
    }));

    return {
      comments: commentsWithUser,
      total,
      page: pagination.page,
      limit: pagination.limit,
      hasNext: pagination.page * pagination.limit < total,
      hasPrev: pagination.page > 1,
    };
  }

  async update(id: number, content: string): Promise<Comment> {
    const query = `
      UPDATE comments 
      SET content = ?, updated_at = datetime('now') 
      WHERE id = ? AND is_deleted = 0
    `;

    const result = this.db.prepare(query).run(content, id);

    if (result.changes === 0) {
      throw new NotFoundError('Comment not found');
    }

    const updatedComment = this.db.prepare('SELECT * FROM comments WHERE id = ?').get(id) as any;

    return {
      id: updatedComment.id,
      postId: updatedComment.post_id,
      userId: updatedComment.user_id,
      content: updatedComment.content,
      createdAt: new Date(updatedComment.created_at),
      updatedAt: new Date(updatedComment.updated_at),
      isDeleted: Boolean(updatedComment.is_deleted),
    };
  }

  async softDelete(id: number): Promise<void> {
    const query = `
      UPDATE comments 
      SET is_deleted = 1, updated_at = datetime('now') 
      WHERE id = ? AND is_deleted = 0
    `;

    const result = this.db.prepare(query).run(id);

    if (result.changes === 0) {
      throw new NotFoundError('Comment not found');
    }
  }

  async hardDelete(id: number): Promise<void> {
    const query = 'DELETE FROM comments WHERE id = ?';
    const result = this.db.prepare(query).run(id);

    if (result.changes === 0) {
      throw new NotFoundError('Comment not found');
    }
  }

  async exists(id: number): Promise<boolean> {
    const query = 'SELECT COUNT(*) as count FROM comments WHERE id = ? AND is_deleted = 0';
    const result = this.db.prepare(query).get(id) as any;
    return result.count > 0;
  }

  async isOwner(commentId: number, userId: number): Promise<boolean> {
    const query =
      'SELECT COUNT(*) as count FROM comments WHERE id = ? AND user_id = ? AND is_deleted = 0';
    const result = this.db.prepare(query).get(commentId, userId) as any;
    return result.count > 0;
  }

  async count(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM comments WHERE is_deleted = 0';
    const result = this.db.prepare(query).get() as any;
    return result.count;
  }

  async countByPost(postId: number): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM comments WHERE post_id = ? AND is_deleted = 0';
    const result = this.db.prepare(query).get(postId) as any;
    return result.count;
  }

  async countByUser(userId: number): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM comments WHERE user_id = ? AND is_deleted = 0';
    const result = this.db.prepare(query).get(userId) as any;
    return result.count;
  }
}
