#!/usr/bin/env tsx

import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(__dirname, '../data/database.sqlite');
const db = new Database(dbPath, { readonly: true });

console.log('🔍 TrueTweet Database Inspection\n');

// Get all tables
console.log('📋 Tables:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
tables.forEach((table: any) => {
  console.log(`  - ${table.name}`);
});

console.log('\n📊 Table Statistics:');

// Count records in each table
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
const postCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE is_deleted = 0').get() as any;
const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments WHERE is_deleted = 0').get() as any;
const mentionCount = db.prepare('SELECT COUNT(*) as count FROM mentions').get() as any;

console.log(`  Users: ${userCount.count}`);
console.log(`  Posts: ${postCount.count}`);
console.log(`  Comments: ${commentCount.count}`);
console.log(`  Mentions: ${mentionCount.count}`);

// Show table schemas
console.log('\n🏗️  Table Schemas:');
tables.forEach((table: any) => {
  console.log(`\n${table.name.toUpperCase()}:`);
  const schema = db.prepare(`PRAGMA table_info(${table.name})`).all();
  schema.forEach((column: any) => {
    const nullable = column.notnull ? 'NOT NULL' : 'NULL';
    const pk = column.pk ? ' PRIMARY KEY' : '';
    const defaultVal = column.dflt_value ? ` DEFAULT ${column.dflt_value}` : '';
    console.log(`  ${column.name}: ${column.type}${pk} ${nullable}${defaultVal}`);
  });
});

// Show recent activity
console.log('\n📈 Recent Activity:');

const recentPosts = db.prepare(`
  SELECT p.id, u.username, p.content, p.created_at
  FROM posts p
  JOIN users u ON p.user_id = u.id
  WHERE p.is_deleted = 0
  ORDER BY p.created_at DESC
  LIMIT 5
`).all();

if (recentPosts.length > 0) {
  console.log('\nRecent Posts:');
  recentPosts.forEach((post: any) => {
    const content = post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content;
    console.log(`  [${post.id}] @${post.username}: ${content}`);
  });
} else {
  console.log('  No posts found');
}

// Show indexes
console.log('\n🔍 Indexes:');
const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'").all();
indexes.forEach((index: any) => {
  console.log(`  - ${index.name}`);
});

db.close();
console.log('\n✅ Database inspection complete');
