import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/authenticate';
import * as Controller from './document-generator.controller';

const router = Router();

// Apply authentication to all document routes
router.use(authenticate);

// Rate limiter: Max 5 requests per hour per user
const docGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
  keyGenerator: (req) => req.user?.id || req.ip || '',
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

export default router;
