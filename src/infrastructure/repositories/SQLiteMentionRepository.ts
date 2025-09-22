import { IMentionRepository } from '@application/ports/repositories/IMentionRepository';
import { CreateMentionData, Mention } from '@domain/entities/Mention';
import { UserSummary } from '@domain/entities/User';
import Database from 'better-sqlite3';

export class SQLiteMentionRepository implements IMentionRepository {
  constructor(private db: Database.Database) {}

  async create(mentionData: CreateMentionData): Promise<Mention> {
    const query = `
      INSERT INTO mentions (post_id, mentioned_user_id, created_at)
      VALUES (?, ?, datetime('now'))
    `;

    const result = this.db.prepare(query).run(mentionData.postId, mentionData.mentionedUserId);

    const mention = this.db
      .prepare('SELECT * FROM mentions WHERE id = ?')
      .get(result.lastInsertRowid) as any;

    return {
      id: mention.id,
      postId: mention.post_id,
      mentionedUserId: mention.mentioned_user_id,
      createdAt: new Date(mention.created_at),
    };
  }

  async createBatch(mentionsData: CreateMentionData[]): Promise<Mention[]> {
    if (mentionsData.length === 0) return [];

    const query = `
      INSERT INTO mentions (post_id, mentioned_user_id, created_at)
      VALUES (?, ?, datetime('now'))
    `;

    const stmt = this.db.prepare(query);
    const transaction = this.db.transaction(() => {
      const results = [];
      for (const mentionData of mentionsData) {
        try {
          const result = stmt.run(mentionData.postId, mentionData.mentionedUserId);
          const mention = this.db
            .prepare('SELECT * FROM mentions WHERE id = ?')
            .get(result.lastInsertRowid) as any;
          results.push({
            id: mention.id,
            postId: mention.post_id,
            mentionedUserId: mention.mentioned_user_id,
            createdAt: new Date(mention.created_at),
          });
        } catch (error: any) {
          // Skip duplicate mentions (UNIQUE constraint violation)
          if (error.code !== 'SQLITE_CONSTRAINT_UNIQUE') {
            throw error;
          }
        }
      }
      return results;
    });

    return transaction();
  }

  async findByPostId(postId: number): Promise<UserSummary[]> {
    const query = `
      SELECT u.id, u.username
      FROM mentions m
      JOIN users u ON m.mentioned_user_id = u.id
      WHERE m.post_id = ?
      ORDER BY u.username
    `;

    const mentions = this.db.prepare(query).all(postId) as any[];

    return mentions.map((mention) => ({
      id: mention.id,
      username: mention.username,
    }));
  }

  async findByUserId(userId: number): Promise<Mention[]> {
    const query = `
      SELECT id, post_id, mentioned_user_id, created_at
      FROM mentions
      WHERE mentioned_user_id = ?
      ORDER BY created_at DESC
    `;

    const mentions = this.db.prepare(query).all(userId) as any[];

    return mentions.map((mention) => ({
      id: mention.id,
      postId: mention.post_id,
      mentionedUserId: mention.mentioned_user_id,
      createdAt: new Date(mention.created_at),
    }));
  }

  async deleteByPostId(postId: number): Promise<void> {
    const query = 'DELETE FROM mentions WHERE post_id = ?';
    this.db.prepare(query).run(postId);
  }

  async exists(postId: number, mentionedUserId: number): Promise<boolean> {
    const query =
      'SELECT COUNT(*) as count FROM mentions WHERE post_id = ? AND mentioned_user_id = ?';
    const result = this.db.prepare(query).get(postId, mentionedUserId) as any;
    return result.count > 0;
  }
}
