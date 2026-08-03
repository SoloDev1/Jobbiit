/**
 * OpporHub OS — Profile V2 Express Routes
 * Mounted at /api/v2/profile/*
 */

import { Router } from 'express';
import { getProfileV2 } from '../controllers/profile-v2.controller';

const router = Router();

router.get('/get', getProfileV2);

export default router;
