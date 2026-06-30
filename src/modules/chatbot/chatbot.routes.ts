import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import * as Controller from './chatbot.controller';

const router = Router();

// Secure all chatbot endpoints
router.use(authenticate);

router.post('/session', Controller.createOrGetSession);
router.get('/sessions', Controller.listUserSessions);
router.get('/session/:sessionId/history', Controller.getSessionHistory);
router.post('/message', Controller.sendMessage);

export default router;
