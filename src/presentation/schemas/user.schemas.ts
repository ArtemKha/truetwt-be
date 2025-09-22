import { z } from 'zod';

export const updateUserSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username cannot exceed 50 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
      .optional(),
    email: z
      .string()
      .email('Invalid email format')
      .max(255, 'Email cannot exceed 255 characters')
      .optional(),
  })
  .refine((data) => data.username !== undefined || data.email !== undefined, {
    message: 'At least one field (username or email) must be provided',
  });

export const getUsersQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .refine((val) => val > 0, 'Page must be greater than 0'),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
});

export const userParamsSchema = z.object({
  id: z
    .string()
    .transform(Number)
    .refine((val) => val > 0, 'User ID must be a positive number'),
});

export type UpdateUserRequest = z.infer<typeof updateUserSchema>;
export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;
export type UserParams = z.infer<typeof userParamsSchema>;
