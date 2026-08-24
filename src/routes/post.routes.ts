import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import {
  readTierLimiter,
  writeTierLimiter,
  criticalMutationLimiter,
} from '../middleware/rateLimiter'
import {
  createPostSchema,
  createCommentSchema,
} from '../schemas/post.schema'
import * as PostController from '../controllers/post.controller'

const router = Router()

router.use(authenticate)

router.get('/feed', readTierLimiter, PostController.getFeed)
router.post('/', criticalMutationLimiter, validate(createPostSchema), PostController.createPost)
router.get('/:id', readTierLimiter, PostController.getPostById)
router.delete('/:id', criticalMutationLimiter, PostController.deletePost)
router.post('/:id/like', writeTierLimiter, PostController.toggleLike)
router.post(
  '/:id/comments',
  writeTierLimiter,
  validate(createCommentSchema),
  PostController.addComment,
)
router.delete(
  '/:postId/comments/:commentId',
  writeTierLimiter,
  PostController.deleteComment,
)

export default router
