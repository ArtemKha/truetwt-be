import { IAuthService } from '@application/ports/external/IAuthService';
import { Router } from 'express';
import { CommentController } from '../controllers/CommentController';
import { createAuthMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import {
  commentParamsSchema,
  createCommentSchema,
  getCommentsQuerySchema,
  postCommentsParamsSchema,
  updateCommentSchema,
} from '../schemas/comment.schemas';

export function createCommentRoutes(
  commentController: CommentController,
  authService: IAuthService
): Router {
  const router = Router();
  const requireAuth = createAuthMiddleware(authService);

  /**
   * @swagger
   * /api/posts/{id}/comments:
   *   post:
   *     summary: Create a comment on a post
   *     tags: [Comments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Post ID
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
   *                 maxLength: 500
   *     responses:
   *       201:
   *         description: Comment created successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Authentication required
   *       404:
   *         description: Post not found
   */
  router.post(
    '/:id/comments',
    requireAuth,
    validateParams(postCommentsParamsSchema),
    validateBody(createCommentSchema),
    asyncHandler(commentController.createComment.bind(commentController))
  );

  /**
   * @swagger
   * /api/posts/{id}/comments:
   *   get:
   *     summary: Get comments for a post
   *     tags: [Comments]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Post ID
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
   *         description: Comments retrieved successfully
   *       404:
   *         description: Post not found
   */
  router.get(
    '/:id/comments',
    validateParams(postCommentsParamsSchema),
    validateQuery(getCommentsQuerySchema),
    asyncHandler(commentController.getPostComments.bind(commentController))
  );

  return router;
}

export function createCommentManagementRoutes(
  commentController: CommentController,
  authService: IAuthService
): Router {
  const router = Router();
  const requireAuth = createAuthMiddleware(authService);

  /**
   * @swagger
   * /api/comments/stats:
   *   get:
   *     summary: Get comment statistics
   *     tags: [Comments]
   *     parameters:
   *       - in: query
   *         name: postId
   *         schema:
   *           type: integer
   *         description: Filter stats by post ID
   *     responses:
   *       200:
   *         description: Comment stats retrieved successfully
   */
  router.get('/stats', asyncHandler(commentController.getCommentStats.bind(commentController)));

  /**
   * @swagger
   * /api/comments/{id}:
   *   get:
   *     summary: Get comment by ID
   *     tags: [Comments]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Comment retrieved successfully
   *       404:
   *         description: Comment not found
   */
  router.get(
    '/:id',
    validateParams(commentParamsSchema),
    asyncHandler(commentController.getComment.bind(commentController))
  );

  /**
   * @swagger
   * /api/comments/{id}:
   *   put:
   *     summary: Update a comment
   *     tags: [Comments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
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
   *                 maxLength: 500
   *     responses:
   *       200:
   *         description: Comment updated successfully
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Can only edit own comments
   *       404:
   *         description: Comment not found
   */
  router.put(
    '/:id',
    requireAuth,
    validateParams(commentParamsSchema),
    validateBody(updateCommentSchema),
    asyncHandler(commentController.updateComment.bind(commentController))
  );

  /**
   * @swagger
   * /api/comments/{id}:
   *   delete:
   *     summary: Delete a comment
   *     tags: [Comments]
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
   *         description: Comment deleted successfully
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Can only delete own comments
   *       404:
   *         description: Comment not found
   */
  router.delete(
    '/:id',
    requireAuth,
    validateParams(commentParamsSchema),
    asyncHandler(commentController.deleteComment.bind(commentController))
  );

  return router;
}
