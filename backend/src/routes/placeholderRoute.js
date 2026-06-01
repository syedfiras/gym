import { Router } from 'express';
import { placeholderHandler } from '../controllers/placeholderController.js';

const router = Router();

router.get('/', placeholderHandler);

export default router;
// This is a placeholder route to verify folder wiring