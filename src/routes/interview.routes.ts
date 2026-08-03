import { Router } from 'express';
import { getBriefing, createSession, evaluateAnswer, getFlashcards } from '../controllers/interview.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/briefing', getBriefing);
router.post('/session', createSession);
router.post('/evaluate', evaluateAnswer);
router.get('/flashcards', getFlashcards);

export default router;
