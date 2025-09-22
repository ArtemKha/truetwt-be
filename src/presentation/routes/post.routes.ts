import { IAuthService } from '@application/ports/external/IAuthService';
import { Router } from 'express';
import { PostController } from '../controllers/PostController';
import { createAuthMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import {
  createPostSchema,
  getPostsQuerySchema,
  postParamsSchema,
  userPostsParamsSchema,
} from '../schemas/post.schemas';

export function createPostRoutes(
  postController: PostController,
  authService: IAuthService
): Router {
  const router = Router();
  const requireAuth = createAuthMiddleware(authService);

  /**
   * @swagger
   * /api/posts:
   *   post:
   *     summary: Create a new post
   *     tags: [Posts]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - content
   *             properties:
   *               content:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 280
   *     responses:
   *       201:
   *         description: Post created successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Authentication required
   */
  router.post(
    '/',
    requireAuth,
    validateBody(createPostSchema),
    asyncHandler(postController.createPost.bind(postController))
  );

  /**
   * @swagger
   * /api/posts/stats:
   *   get:
   *     summary: Get post statistics
   *     tags: [Posts]
   *     responses:
   *       200:
   *         description: Post stats retrieved successfully
   */
  router.get('/stats', asyncHandler(postController.getPostStats.bind(postController)));

  /**
   * @swagger
   * /api/posts/user/{userId}:
   *   get:
   *     summary: Get posts by user
   *     tags: [Posts]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: integer
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *     responses:
   *       200:
   *         description: User posts retrieved successfully
   *       404:
   *         description: User not found
   */
  router.get(
    '/user/:userId',
    validateParams(userPostsParamsSchema),
    validateQuery(getPostsQuerySchema),
    asyncHandler(postController.getUserPosts.bind(postController))
  );

  /**
   * @swagger
   * /api/posts/{id}:
   *   get:
   *     summary: Get post by ID
   *     tags: [Posts]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Post retrieved successfully
   *       404:
   *         description: Post not found
   */
  router.get(
    '/:id',
    validateParams(postParamsSchema),
    asyncHandler(postController.getPost.bind(postController))
  );

  /**
   * @swagger
   * /api/posts/{id}:
   *   delete:
   *     summary: Delete a post
   *     tags: [Posts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Post deleted successfully
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Can only delete own posts
   *       404:
   *         description: Post not found
   */
  router.delete(
    '/:id',
    requireAuth,
    validateParams(postParamsSchema),
    asyncHandler(postController.deletePost.bind(postController))
  );

  return router;
}
