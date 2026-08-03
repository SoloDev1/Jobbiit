import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import * as AIController from '../controllers/ai.controller';

const router = Router();

router.use(authenticate);

router.post('/refine', AIController.refineDocument);
router.post('/tailor', AIController.tailorDocument);
router.post('/chat', AIController.chat);

export default router;
