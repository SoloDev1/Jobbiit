import { Router } from 'express';
import {
  getBriefing,
  getPreBriefingPlan,
  getCompetencyGraph,
  ingestJob,
  createSession,
  evaluateAnswer,
  getUserStories,
  getFlashcards,
} from '../controllers/interview.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/briefing', getBriefing);
router.get('/pre-briefing', getPreBriefingPlan);
router.get('/competencies', getCompetencyGraph);
router.post('/ingest', ingestJob);
router.post('/session', createSession);
router.post('/evaluate', evaluateAnswer);
router.get('/stories', getUserStories);
router.get('/flashcards', getFlashcards);

export default router;
