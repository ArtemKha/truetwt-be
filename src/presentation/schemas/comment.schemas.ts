import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Content cannot be empty')
    .max(500, 'Content cannot exceed 500 characters')
    .transform((str) => str.trim()),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Content cannot be empty')
    .max(500, 'Content cannot exceed 500 characters')
    .transform((str) => str.trim()),
});

export const getCommentsQuerySchema = z.object({
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

export const commentParamsSchema = z.object({
  id: z
    .string()
    .transform(Number)
    .refine((val) => val > 0, 'Comment ID must be a positive number'),
});

export const postCommentsParamsSchema = z.object({
  id: z
    .string()
    .transform(Number)
    .refine((val) => val > 0, 'Post ID must be a positive number'),
});

export type CreateCommentRequest = z.infer<typeof createCommentSchema>;
export type UpdateCommentRequest = z.infer<typeof updateCommentSchema>;
export type GetCommentsQuery = z.infer<typeof getCommentsQuerySchema>;
export type CommentParams = z.infer<typeof commentParamsSchema>;
export type PostCommentsParams = z.infer<typeof postCommentsParamsSchema>;
