import { z } from 'zod';

// Mention pattern detection using latest Zod features
const mentionPattern = /@[a-zA-Z0-9_]+/g;

// Enhanced content validation with mention detection
const contentSchema = z
  .string()
  .min(1, 'Content cannot be empty')
  .max(280, 'Content cannot exceed 280 characters')
  .transform((str) => str.trim())
  .refine((content) => content.length > 0, {
    message: 'Content cannot be empty after trimming',
  })
  .refine(
    (content) => {
      const mentions = [...(content.match(mentionPattern) || [])].map((m) => m.substring(1));
      const uniqueMentions = [...new Set(mentions)];
      return uniqueMentions.length <= 10;
    },
    {
      message: 'Post cannot contain more than 10 mentions',
    }
  );

export const createPostSchema = z
  .object({
    content: contentSchema,
  })
  .transform((data) => ({
    ...data,
    mentions: [...(data.content.match(mentionPattern) || [])].map((m) => m.substring(1)),
  }));

// TODO: CACHE STALENESS FIX - Missing updatePostSchema for PUT endpoint
// Need to create schema for post updates that validates:
// - Content with same rules as createPostSchema
// - Optional fields for partial updates
// - Mention detection and validation
// export const updatePostSchema = z.object({ content: contentSchema });

// Enhanced pagination with better validation
const paginationSchema = z.object({
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

export const getPostsQuerySchema = paginationSchema;

// Enhanced ID validation using coercion
export const postParamsSchema = z.object({
  id: z
    .string()
    .transform(Number)
    .refine((val) => val > 0, 'Post ID must be a positive number'),
});

export const userPostsParamsSchema = z.object({
  userId: z
    .string()
    .transform(Number)
    .refine((val) => val > 0, 'User ID must be a positive number'),
});

// Timeline query with additional filters
export const timelineQuerySchema = z
  .object({
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
      .refine((val) => val > 0 && val <= 50, 'Limit must be between 1 and 50'),
    // New filter options
    since: z.string().datetime({ message: 'Invalid datetime format' }).optional(),
    until: z.string().datetime({ message: 'Invalid datetime format' }).optional(),
  })
  .refine(
    (data) => {
      if (data.since && data.until) {
        return new Date(data.since) < new Date(data.until);
      }
      return true;
    },
    {
      message: 'Since date must be before until date',
      path: ['since'],
    }
  );

// Search schema with enhanced validation
export const searchPostsSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query cannot be empty')
    .max(100, 'Search query cannot exceed 100 characters')
    .transform((str) => str.trim()),
  ...paginationSchema.shape,
});

export type CreatePostRequest = z.infer<typeof createPostSchema>;
export type GetPostsQuery = z.infer<typeof getPostsQuerySchema>;
export type PostParams = z.infer<typeof postParamsSchema>;
export type UserPostsParams = z.infer<typeof userPostsParamsSchema>;
export type TimelineQuery = z.infer<typeof timelineQuerySchema>;
export type SearchPostsQuery = z.infer<typeof searchPostsSchema>;
