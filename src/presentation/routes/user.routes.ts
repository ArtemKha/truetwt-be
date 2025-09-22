import { IAuthService } from '@application/ports/external/IAuthService';
import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { createAuthMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { getUsersQuerySchema, updateUserSchema, userParamsSchema } from '../schemas/user.schemas';

export function createUserRoutes(
  userController: UserController,
  authService: IAuthService
): Router {
  const router = Router();
  const requireAuth = createAuthMiddleware(authService);

  /**
   * @swagger
   * /api/users:
   *   get:
   *     summary: Get list of users
   *     tags: [Users]
   *     parameters:
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
   *       - in: query
   *         name: q
   *         schema:
   *           type: string
   *         description: Search query for username
   *     responses:
   *       200:
   *         description: Users retrieved successfully
   */
  router.get(
    '/',
    validateQuery(getUsersQuerySchema),
    asyncHandler(userController.getUsers.bind(userController))
  );

  /**
   * @swagger
   * /api/users/search:
   *   get:
   *     summary: Search users by username
   *     tags: [Users]
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *         description: Search query
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *     responses:
   *       200:
   *         description: Search results
   *       400:
   *         description: Search query required
   */
  router.get('/search', asyncHandler(userController.searchUsers.bind(userController)));

  /**
   * @swagger
   * /api/users/{id}:
   *   get:
   *     summary: Get user by ID
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: User retrieved successfully
   *       404:
   *         description: User not found
   */
  router.get(
    '/:id',
    validateParams(userParamsSchema),
    asyncHandler(userController.getUserById.bind(userController))
  );

  /**
   * @swagger
   * /api/users/{id}:
   *   put:
   *     summary: Update user profile
   *     tags: [Users]
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
   *             properties:
   *               username:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 50
   *               email:
   *                 type: string
   *                 format: email
   *     responses:
   *       200:
   *         description: User updated successfully
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Can only update own profile
   *       404:
   *         description: User not found
   */
  router.put(
    '/:id',
    requireAuth,
    validateParams(userParamsSchema),
    validateBody(updateUserSchema),
    asyncHandler(userController.updateUser.bind(userController))
  );

  /**
   * @swagger
   * /api/users/{id}/stats:
   *   get:
   *     summary: Get user statistics
   *     tags: [Users]
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
   *         description: User stats retrieved successfully
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Can only view own stats
   */
  router.get(
    '/:id/stats',
    requireAuth,
    validateParams(userParamsSchema),
    asyncHandler(userController.getUserStats.bind(userController))
  );

  return router;
}
