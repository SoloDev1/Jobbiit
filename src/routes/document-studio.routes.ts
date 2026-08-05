import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import * as DocumentStudioController from '../controllers/document-studio.controller';

const router = Router();

router.use(authenticate);

router.post('/generate', DocumentStudioController.generateDocument);
router.get('/', DocumentStudioController.getUserDocuments);
router.get('/:id', DocumentStudioController.getDocumentById);
router.put('/:id', DocumentStudioController.updateDocument);
router.post('/:id/section-ai', DocumentStudioController.executeSectionAiAction);
router.post('/:id/revert-ai', DocumentStudioController.revertSectionAiAction);
router.post('/:id/duplicate', DocumentStudioController.duplicateDocument);
router.get('/:id/export', DocumentStudioController.exportDocument);
router.delete('/:id', DocumentStudioController.deleteDocument);

export default router;
