import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import {
  createPostSchema,
  createCommentSchema,
} from '../schemas/post.schema'
import * as PostController from '../controllers/post.controller'

const router = Router()

router.use(authenticate)

router.get('/feed', PostController.getFeed)
router.post('/', validate(createPostSchema), PostController.createPost)
router.get('/:id', PostController.getPostById)
router.delete('/:id', PostController.deletePost)
router.post('/:id/like', PostController.toggleLike)
router.post(
  '/:id/comments',
  validate(createCommentSchema),
  PostController.addComment,
)
router.delete(
  '/:postId/comments/:commentId',
  PostController.deleteComment,
)

export default router
