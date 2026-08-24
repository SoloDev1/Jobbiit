import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { readTierLimiter, writeTierLimiter, aiRateLimiter, criticalMutationLimiter } from '../middleware/rateLimiter';
import { aiGuardrails } from '../middleware/aiGuardrails';
import * as DocumentStudioController from '../controllers/document-studio.controller';

const router = Router();

router.use(authenticate);

// AI-heavy generation & section actions
router.post('/generate', aiRateLimiter, aiGuardrails, DocumentStudioController.generateDocument);
router.post('/:id/section-ai', aiRateLimiter, aiGuardrails, DocumentStudioController.executeSectionAiAction);
router.post('/:id/revert-ai', writeTierLimiter, DocumentStudioController.revertSectionAiAction);

// Standard document CRUD & export
router.get('/', readTierLimiter, DocumentStudioController.getUserDocuments);
router.get('/:id', readTierLimiter, DocumentStudioController.getDocumentById);
router.put('/:id', writeTierLimiter, DocumentStudioController.updateDocument);
router.post('/:id/duplicate', writeTierLimiter, DocumentStudioController.duplicateDocument);
router.get('/:id/export', writeTierLimiter, DocumentStudioController.exportDocument);
router.delete('/:id', criticalMutationLimiter, DocumentStudioController.deleteDocument);

export default router;
