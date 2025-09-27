#!/usr/bin/env node

import { Container } from '@shared/container/Container';
import { logger } from '@shared/utils/logger';
import Database from 'better-sqlite3';

interface SeedUser {
  username: string;
  email: string;
  password: string;
}

interface SeedPost {
  content: string;
  authorIndex: number;
}

interface SeedComment {
  content: string;
  postIndex: number;
  authorIndex: number;
}

class DatabaseSeeder {
  private container: Container;
  private database!: Database.Database;
  private createdUsers: Array<{ id: number; username: string; email: string }> = [];
  private createdPosts: Array<{ id: number; userId: number; content: string }> = [];

  constructor() {
    this.container = Container.getInstance();
  }

  async initialize(): Promise<void> {
    await this.container.initialize();
    this.database = this.container.get('database');
  }

  private getSeedUsers(): SeedUser[] {
    return [
      {
        username: 'alice_dev',
        email: 'alice@example.com',
        password: 'SecurePass123!',
      },
      {
        username: 'bob_designer',
        email: 'bob@example.com',
        password: 'SecurePass123!',
      },
      {
        username: 'charlie_pm',
        email: 'charlie@example.com',
        password: 'SecurePass123!',
      },
      {
        username: 'diana_qa',
        email: 'diana@example.com',
        password: 'SecurePass123!',
      },
      {
        username: 'eve_marketing',
        email: 'eve@example.com',
        password: 'SecurePass123!',
      },
      {
        username: 'frank_cto',
        email: 'frank@example.com',
        password: 'SecurePass123!',
      },
      {
        username: 'grace_hr',
        email: 'grace@example.com',
        password: 'SecurePass123!',
      },
      {
        username: 'henry_sales',
        email: 'henry@example.com',
        password: 'SecurePass123!',
      },
    ];
  }

  private getSeedPosts(): SeedPost[] {
    return [
      {
        content:
          'Welcome to TrueTweet! Excited to be part of this amazing platform. Looking forward to connecting with everyone! 🚀',
        authorIndex: 0,
      },
      {
        content:
          'Just finished designing the new user interface mockups. The dark mode is going to look incredible! @alice_dev what do you think?',
        authorIndex: 1,
      },
      {
        content:
          'Sprint planning meeting went great today. We have some exciting features coming up in the next release. Stay tuned! 📈',
        authorIndex: 2,
      },
      {
        content:
          'Found an interesting bug in the timeline cache. @alice_dev @bob_designer might want to take a look at this edge case.',
        authorIndex: 3,
      },
      {
        content:
          'Our user engagement metrics are through the roof! The community is really loving the new features. Great work team! 🎉',
        authorIndex: 4,
      },
      {
        content:
          'Thinking about implementing real-time notifications. What are your thoughts on WebSocket vs Server-Sent Events? @alice_dev',
        authorIndex: 5,
      },
      {
        content:
          'Just onboarded 5 new team members this week. The team is growing fast! Welcome to everyone joining us. 👋',
        authorIndex: 6,
      },
      {
        content:
          'Closed 3 major deals this quarter! Our platform is really resonating with enterprise clients. @eve_marketing great campaigns!',
        authorIndex: 7,
      },
      {
        content:
          'Working on some performance optimizations for the database queries. Should see significant improvements in response times soon.',
        authorIndex: 0,
      },
      {
        content:
          'The new color palette is ready for review. I think it strikes the perfect balance between modern and accessible design.',
        authorIndex: 1,
      },
      {
        content:
          'User story mapping session scheduled for tomorrow. @diana_qa @alice_dev please join us to discuss the testing strategy.',
        authorIndex: 2,
      },
      {
        content:
          'Automated test coverage is now at 85%! Getting closer to our 90% target. @charlie_pm the quality metrics look great.',
        authorIndex: 3,
      },
      {
        content:
          'Social media engagement is up 150% this month. The community-driven content strategy is working perfectly! 📊',
        authorIndex: 4,
      },
      {
        content:
          'Code review culture is really improving. Seeing much better collaboration and knowledge sharing across the team.',
        authorIndex: 5,
      },
      {
        content:
          'Employee satisfaction survey results are in - 95% positive feedback! Proud of the culture we are building together.',
        authorIndex: 6,
      },
      {
        content:
          'Demo day preparations are going well. @bob_designer the presentation slides look fantastic! Ready to showcase our progress.',
        authorIndex: 7,
      },
      {
        content:
          'Implemented the mention system! Now you can tag other users in your posts. Try it out: @bob_designer @charlie_pm',
        authorIndex: 0,
      },
      {
        content:
          'The mobile responsive design is complete. Testing across different devices and screen sizes. Looking smooth! 📱',
        authorIndex: 1,
      },
      {
        content:
          'Roadmap for Q2 is finalized. Focus areas: performance, mobile experience, and advanced analytics. Exciting times ahead!',
        authorIndex: 2,
      },
      {
        content:
          'Security audit completed successfully. No critical vulnerabilities found. Our security practices are solid! 🔒',
        authorIndex: 3,
      },
    ];
  }

  private getSeedComments(): SeedComment[] {
    return [
      {
        content: 'Welcome to the team! Looking forward to working together.',
        postIndex: 0,
        authorIndex: 1,
      },
      {
        content: 'The mockups look amazing! Love the attention to detail.',
        postIndex: 1,
        authorIndex: 0,
      },
      {
        content: 'Great planning session! The priorities are crystal clear now.',
        postIndex: 2,
        authorIndex: 3,
      },
      {
        content: 'I can help investigate that cache issue. Let me know the details.',
        postIndex: 3,
        authorIndex: 0,
      },
      {
        content: 'Fantastic numbers! The team effort is really paying off.',
        postIndex: 4,
        authorIndex: 2,
      },
      {
        content:
          'WebSockets would be great for real-time features. Happy to discuss the implementation.',
        postIndex: 5,
        authorIndex: 0,
      },
      {
        content: 'Welcome everyone! Excited to have such talented people joining us.',
        postIndex: 6,
        authorIndex: 4,
      },
      {
        content: 'Awesome sales results! The marketing campaigns are definitely working.',
        postIndex: 7,
        authorIndex: 4,
      },
      {
        content: 'Performance improvements are always welcome. Great work on the optimization!',
        postIndex: 8,
        authorIndex: 2,
      },
      {
        content: 'The color palette is perfect! It maintains our brand identity beautifully.',
        postIndex: 9,
        authorIndex: 4,
      },
      {
        content: 'Count me in for the mapping session. Testing strategy alignment is crucial.',
        postIndex: 10,
        authorIndex: 3,
      },
      {
        content: '85% coverage is impressive! Almost at our target. Keep up the great work.',
        postIndex: 11,
        authorIndex: 2,
      },
      {
        content: 'The engagement numbers are incredible! Community building is paying off.',
        postIndex: 12,
        authorIndex: 6,
      },
      {
        content: 'Code reviews have definitely improved our code quality. Great initiative!',
        postIndex: 13,
        authorIndex: 1,
      },
      {
        content: '95% satisfaction is outstanding! Proud to be part of this team.',
        postIndex: 14,
        authorIndex: 5,
      },
      {
        content: 'Demo day will be amazing! The slides perfectly capture our progress.',
        postIndex: 15,
        authorIndex: 2,
      },
      {
        content: 'Mention system works perfectly! @alice_dev this is a game changer.',
        postIndex: 16,
        authorIndex: 1,
      },
      {
        content: 'Mobile design is flawless! Tested on my devices and it looks great.',
        postIndex: 17,
        authorIndex: 3,
      },
      {
        content: 'Q2 roadmap looks solid. Performance and mobile focus is exactly what we need.',
        postIndex: 18,
        authorIndex: 0,
      },
      {
        content: 'Security audit results are reassuring. Our practices are definitely working.',
        postIndex: 19,
        authorIndex: 5,
      },
      {
        content: 'Thanks for the warm welcome! Excited to contribute to this project.',
        postIndex: 0,
        authorIndex: 2,
      },
      {
        content: 'Dark mode is going to be a hit! Can not wait to see it in production.',
        postIndex: 1,
        authorIndex: 3,
      },
      {
        content: 'The sprint goals are ambitious but achievable. Let us make it happen!',
        postIndex: 2,
        authorIndex: 0,
      },
      {
        content: 'I will help with the cache investigation too. More eyes on the problem!',
        postIndex: 3,
        authorIndex: 2,
      },
      {
        content: 'These metrics show our users really love what we are building!',
        postIndex: 4,
        authorIndex: 6,
      },
    ];
  }

  private seedUsersSync(): void {
    logger.info('Seeding users...');
    const users = this.getSeedUsers();

    for (const userData of users) {
      try {
        // Direct database operations for transaction compatibility
        const passwordHash = this.hashPasswordSync(userData.password);

        const insertQuery = `
          INSERT INTO users (username, email, password_hash, created_at, updated_at)
          VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `;

        const result = this.database
          .prepare(insertQuery)
          .run(userData.username, userData.email, passwordHash);

        const user = this.database
          .prepare('SELECT * FROM users WHERE id = ?')
          .get(result.lastInsertRowid) as {
          id: number;
          username: string;
          email: string;
          // eslint-disable-next-line @typescript-eslint/naming-convention
          password_hash: string;
          // eslint-disable-next-line @typescript-eslint/naming-convention
          created_at: string;
          // eslint-disable-next-line @typescript-eslint/naming-convention
          updated_at: string;
        };

        this.createdUsers.push({
          id: user.id,
          username: user.username,
          email: user.email,
        });

        logger.info(`Created user: ${user.username} (${user.email})`);
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'SQLITE_CONSTRAINT_UNIQUE'
        ) {
          throw new Error(`Username or email already exists: ${userData.username}`);
        }
        throw error;
      }
    }

    logger.info(`Successfully created ${this.createdUsers.length} users`);
  }

  private hashPasswordSync(password: string): string {
    // Simple synchronous hash for seeding - in production this should use bcrypt
    // For seeding purposes, we'll use a simple hash
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(password + 'seed_salt')
      .digest('hex');
  }

  private seedPostsSync(): void {
    logger.info('Seeding posts...');
    const posts = this.getSeedPosts();

    for (const postData of posts) {
      const user = this.createdUsers[postData.authorIndex];
      if (!user) {
        throw new Error(`User at index ${postData.authorIndex} not found for post creation`);
      }

      // Direct database operations for transaction compatibility
      const insertQuery = `
        INSERT INTO posts (user_id, content, created_at, updated_at, is_deleted)
        VALUES (?, ?, datetime('now'), datetime('now'), 0)
      `;

      const result = this.database.prepare(insertQuery).run(user.id, postData.content);

      const post = this.database
        .prepare('SELECT * FROM posts WHERE id = ?')
        .get(result.lastInsertRowid) as {
        id: number;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        user_id: number;
        content: string;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        created_at: string;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        updated_at: string;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        is_deleted: number;
      };

      this.createdPosts.push({
        id: post.id,
        userId: post.user_id,
        content: post.content,
      });

      // Handle mentions in the post content
      this.processMentionsSync(post.id, postData.content);

      logger.info(`Created post by ${user.username}: "${postData.content.substring(0, 50)}..."`);
    }

    logger.info(`Successfully created ${this.createdPosts.length} posts`);
  }

  private processMentionsSync(postId: number, content: string): void {
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex);

    if (!mentions) return;

    for (const mention of mentions) {
      const username = mention.substring(1); // Remove @ symbol
      const mentionedUser = this.createdUsers.find((u) => u.username === username);

      if (mentionedUser) {
        try {
          const insertQuery = `
            INSERT INTO mentions (post_id, mentioned_user_id, created_at)
            VALUES (?, ?, datetime('now'))
          `;

          this.database.prepare(insertQuery).run(postId, mentionedUser.id);
        } catch (error: unknown) {
          // Skip duplicate mentions (UNIQUE constraint violation)
          if (
            !(
              error instanceof Error &&
              'code' in error &&
              error.code === 'SQLITE_CONSTRAINT_UNIQUE'
            )
          ) {
            throw error;
          }
        }
      }
    }
  }

  private seedCommentsSync(): void {
    logger.info('Seeding comments...');
    const comments = this.getSeedComments();

    for (const commentData of comments) {
      const user = this.createdUsers[commentData.authorIndex];
      const post = this.createdPosts[commentData.postIndex];

      if (!user) {
        throw new Error(`User at index ${commentData.authorIndex} not found for comment creation`);
      }

      if (!post) {
        throw new Error(`Post at index ${commentData.postIndex} not found for comment creation`);
      }

      // Direct database operations for transaction compatibility
      const insertQuery = `
        INSERT INTO comments (post_id, user_id, content, created_at, updated_at, is_deleted)
        VALUES (?, ?, ?, datetime('now'), datetime('now'), 0)
      `;

      this.database.prepare(insertQuery).run(post.id, user.id, commentData.content);

      logger.info(`Created comment by ${user.username} on post ${post.id}`);
    }

    logger.info('Comments seeding completed');
  }

  async seed(): Promise<void> {
    try {
      logger.info('Starting database seeding with transaction...');

      await this.initialize();

      // Wrap all seeding operations in a transaction for atomicity
      const seedTransaction = this.database.transaction(() => {
        this.seedUsersSync();
        this.seedPostsSync();
        this.seedCommentsSync();
      });

      // Execute the transaction - will rollback automatically on any error
      seedTransaction();

      logger.info('Database seeding completed successfully!');
      logger.info(`Summary:
        - Users created: ${this.createdUsers.length}
        - Posts created: ${this.createdPosts.length}
        - Comments created: ${this.getSeedComments().length}`);
    } catch (error) {
      logger.error('Database seeding failed - all changes have been rolled back:', error);
      throw error;
    } finally {
      await this.container.cleanup();
    }
  }
}

// Run the seeder if this file is executed directly
if (require.main === module) {
  const seeder = new DatabaseSeeder();

  seeder
    .seed()
    .then(() => {
      logger.info('Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding process failed:', error);
      process.exit(1);
    });
}

export { DatabaseSeeder };
