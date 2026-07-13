import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { uploadSingleFile } from '../middleware/upload';
import * as TemplateController from '../controllers/template.controller';

const router = Router();

// Publicly accessible template listing (requires user authentication)
router.get('/', authenticate, TemplateController.getTemplates);
router.get('/:id', authenticate, TemplateController.getTemplateById);

// Admin-only template management endpoints
router.get('/admin/all', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), TemplateController.adminGetAllTemplates);
router.post('/admin/create', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), TemplateController.adminCreateTemplate);
router.put('/admin/update/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), TemplateController.adminUpdateTemplate);
router.delete('/admin/delete/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), TemplateController.adminDeleteTemplate);
router.post('/admin/upload-thumbnail/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), uploadSingleFile, TemplateController.adminUploadThumbnail);

export default router;
