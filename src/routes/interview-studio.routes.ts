import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import * as InterviewStudioController from '../controllers/interview-studio.controller';

const router = Router();

router.use(authenticate);

router.post('/start', InterviewStudioController.startInterviewSession);
router.get('/:id', InterviewStudioController.getInterviewSession);
router.post('/:id/respond', InterviewStudioController.respondToInterviewTurn);

export default router;
