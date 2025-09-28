import {
  CreateUserData,
  UpdateUserData,
  User,
  UserProfile,
  UserSummary,
} from '@domain/entities/User';
import { Pagination, PaginationResult } from '@domain/value-objects/Pagination';

export interface IUserRepository {
  create(userData: CreateUserData & { passwordHash: string }): Promise<User>;
  findById(id: number): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: number, userData: UpdateUserData): Promise<User>;
  delete(id: number): Promise<void>;
  findAll(pagination: Pagination): Promise<{ users: UserProfile[]; pagination: PaginationResult }>;
  exists(username: string, email: string): Promise<boolean>;
  count(): Promise<number>;

  // Batch operations for performance optimization
  findByUsernames(usernames: string[]): Promise<UserSummary[]>;
  findByIds(ids: number[]): Promise<UserSummary[]>;
}
