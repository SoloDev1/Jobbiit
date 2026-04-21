import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import * as NotificationController from '../controllers/notification.controller'

const router = Router()

router.use(authenticate)

// Static paths before dynamic segments
router.get('/unread-count', NotificationController.getUnreadCount)
router.post('/read-all',     NotificationController.markAllAsRead)
router.post('/read/:id',     NotificationController.markAsRead)
router.get('/',              NotificationController.getNotifications)

export default router
