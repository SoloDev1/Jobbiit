import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { validate }     from '../middleware/validate'
import { registerTokenSchema } from '../schemas/push.schema'
import * as PushController from '../controllers/push.controller'

const router = Router()

router.use(authenticate)

router.post('/register',   validate(registerTokenSchema), PushController.registerToken)
router.delete('/unregister', PushController.unregisterToken)

export default router
