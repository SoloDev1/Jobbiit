import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { authenticate } from '../../middleware/authenticate';
import * as Controller from './document-generator.controller';
import * as AiCvController from './controllers/ai-cv.controller';

const router = Router();

// Public share route (unauthenticated)
router.get('/cv/share/:id', AiCvController.getPublicCv);

// Apply authentication to all remaining document routes
router.use(authenticate);

// Rate limiter: Max 5 requests per hour per user
const docGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip ?? '') || '',
  message: {
    success: false,
    message: 'Rate limit exceeded. You can only generate 5 documents per hour.',
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// Endpoints
router.post('/generate', docGenerationLimiter, Controller.generateDocument);
router.get('/status/:jobId', Controller.getStatus);
router.get('/history', Controller.getHistory);
router.delete('/:id', Controller.deleteGeneratedDocument);

// AI CV Dedicated Endpoints
router.post('/cv/ai-create', AiCvController.createAiCv);
router.get('/cv/versions', AiCvController.getCvVersions);
router.post('/cv/score', AiCvController.scoreCv);

export default router;
