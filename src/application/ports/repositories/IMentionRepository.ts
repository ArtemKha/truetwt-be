import { CreateMentionData, Mention } from '@domain/entities/Mention';
import { UserSummary } from '@domain/entities/User';

export interface IMentionRepository {
  create(mentionData: CreateMentionData): Promise<Mention>;
  createBatch(mentionsData: CreateMentionData[]): Promise<Mention[]>;
  findByPostId(postId: number): Promise<UserSummary[]>;
  findByUserId(userId: number): Promise<Mention[]>;
  deleteByPostId(postId: number): Promise<void>;
  exists(postId: number, mentionedUserId: number): Promise<boolean>;
}
