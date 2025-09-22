import { z } from 'zod';

// Enhanced username validation with better patterns
const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username cannot exceed 50 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  .refine((val) => !val.startsWith('_') && !val.endsWith('_'), {
    message: 'Username cannot start or end with underscore',
  });

// Enhanced email validation using latest Zod features
const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email cannot exceed 255 characters')
  .toLowerCase()
  .transform((email) => email.trim());

// Enhanced password validation with better security patterns
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  });

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  usernameOrEmail: z
    .string()
    .min(1, 'Username or email is required')
    .max(255, 'Username or email cannot exceed 255 characters')
    .transform((val) => val.trim().toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Export types with better naming
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;

// Enhanced validation helpers
export const validateEmail = (email: string) => emailSchema.safeParse(email);
export const validateUsername = (username: string) => usernameSchema.safeParse(username);
export const validatePassword = (password: string) => passwordSchema.safeParse(password);
