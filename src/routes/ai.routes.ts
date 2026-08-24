import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { aiRateLimiter } from '../middleware/rateLimiter';
import { aiGuardrails } from '../middleware/aiGuardrails';
import * as AIController from '../controllers/ai.controller';

const router = Router();

router.use(authenticate);
router.use(aiRateLimiter);
router.use(aiGuardrails);

router.post('/refine', AIController.refineDocument);
router.post('/tailor', AIController.tailorDocument);
router.post('/chat', AIController.chat);

export default router;
