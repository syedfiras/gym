import express from 'express';
import { 
  getGymByJoinCode, 
  checkMemberEmail 
} from '../controllers/public.controller.js';

const router = express.Router();

router.get('/gyms/:join_code', getGymByJoinCode);
router.get('/members/:email/check', checkMemberEmail);

export default router;