import { IAuthService } from '@application/ports/external/IAuthService';
import { Router } from 'express';

// Controllers
import { AuthController } from '../controllers/AuthController';
import { CommentController } from '../controllers/CommentController';
import { PostController } from '../controllers/PostController';
import { TimelineController } from '../controllers/TimelineController';
import { UserController } from '../controllers/UserController';

// Routes
import { createAuthRoutes } from './auth.routes';
import { createCommentManagementRoutes, createCommentRoutes } from './comment.routes';
import { createPostRoutes } from './post.routes';
import { createTimelineRoutes } from './timeline.routes';
import { createUserRoutes } from './user.routes';

export interface RoutesDependencies {
  authController: AuthController;
  userController: UserController;
  postController: PostController;
  timelineController: TimelineController;
  commentController: CommentController;
  authService: IAuthService;
}

export function createRoutes(dependencies: RoutesDependencies): Router {
  const router = Router();

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'TrueTweet API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // API routes
  router.use('/auth', createAuthRoutes(dependencies.authController, dependencies.authService));
  router.use('/users', createUserRoutes(dependencies.userController, dependencies.authService));
  router.use('/posts', createPostRoutes(dependencies.postController, dependencies.authService));
  router.use(
    '/posts',
    createCommentRoutes(dependencies.commentController, dependencies.authService)
  );
  router.use(
    '/comments',
    createCommentManagementRoutes(dependencies.commentController, dependencies.authService)
  );
  router.use(
    '/timeline',
    createTimelineRoutes(dependencies.timelineController, dependencies.authService)
  );

  return router;
}
