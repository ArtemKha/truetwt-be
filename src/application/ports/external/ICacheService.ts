import { TimelinePost } from '@domain/entities/Post';

export interface ICacheService {
  // Timeline operations
  addToTimeline(post: TimelinePost): Promise<void>;
  getTimeline(start: number, stop: number): Promise<TimelinePost[]>;
  removeFromTimeline(postId: number, timestamp: number): Promise<void>;
  getTimelineCount(): Promise<number>;
  clearTimeline(): Promise<void>;

  // Generic cache operations
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  flush(): Promise<void>;

  // Health check
  isConnected(): Promise<boolean>;
}
