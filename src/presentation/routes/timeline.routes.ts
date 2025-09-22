import { IAuthService } from '@application/ports/external/IAuthService';
import { Router } from 'express';
import { TimelineController } from '../controllers/TimelineController';
import { createAuthMiddleware, createOptionalAuthMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateQuery } from '../middleware/validation.middleware';
import { timelineQuerySchema } from '../schemas/post.schemas';

export function createTimelineRoutes(
  timelineController: TimelineController,
  authService: IAuthService
): Router {
  const router = Router();
  const requireAuth = createAuthMiddleware(authService);
  const optionalAuth = createOptionalAuthMiddleware(authService);

  /**
   * @swagger
   * /api/timeline:
   *   get:
   *     summary: Get global timeline
   *     tags: [Timeline]
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
   *           maximum: 50
   *           default: 20
   *     responses:
   *       200:
   *         description: Timeline retrieved successfully
   */
  router.get(
    '/',
    optionalAuth,
    validateQuery(timelineQuerySchema),
    asyncHandler(timelineController.getTimeline.bind(timelineController))
  );

  /**
   * @swagger
   * /api/timeline/refresh:
   *   post:
   *     summary: Refresh timeline cache
   *     tags: [Timeline]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Cache refreshed successfully
   *       401:
   *         description: Authentication required
   */
  router.post(
    '/refresh',
    requireAuth,
    asyncHandler(timelineController.refreshCache.bind(timelineController))
  );

  /**
   * @swagger
   * /api/timeline/stats:
   *   get:
   *     summary: Get timeline cache statistics
   *     tags: [Timeline]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Cache stats retrieved successfully
   *       401:
   *         description: Authentication required
   */
  router.get(
    '/stats',
    requireAuth,
    asyncHandler(timelineController.getCacheStats.bind(timelineController))
  );

  /**
   * @swagger
   * /api/timeline/clear:
   *   delete:
   *     summary: Clear timeline cache
   *     tags: [Timeline]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Cache cleared successfully
   *       401:
   *         description: Authentication required
   */
  router.delete(
    '/clear',
    requireAuth,
    asyncHandler(timelineController.clearCache.bind(timelineController))
  );

  return router;
}
