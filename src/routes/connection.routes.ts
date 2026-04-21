import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import * as ConnectionController from '../controllers/connection.controller'

const router = Router()

router.use(authenticate)

// ─── Specific paths before param routes ──────────────────────────────────────
router.get('/pending',     ConnectionController.getPendingRequests)
router.get('/suggestions', ConnectionController.getSuggestions)
router.get('/',            ConnectionController.getConnections)

router.post('/request/:userId',       ConnectionController.sendRequest)
router.post('/accept/:connectionId',  ConnectionController.acceptConnection)
router.post('/decline/:connectionId', ConnectionController.declineConnection)
router.delete('/:connectionId',       ConnectionController.removeConnection)

export default router
