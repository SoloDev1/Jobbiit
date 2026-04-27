import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { authorize }    from '../middleware/authorize'
import { validate } from '../middleware/validate'
import { uploadPostFiles } from '../middleware/upload'
import {
  createPostSchema,
  createCommentSchema,
} from '../schemas/post.schema'
import * as PostController from '../controllers/post.controller'

const router = Router()

router.use(authenticate)

router.get('/feed', PostController.getFeed)
router.post('/media/upload', authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), uploadPostFiles, PostController.uploadPostMedia)
router.post('/', authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), validate(createPostSchema), PostController.createPost)
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
