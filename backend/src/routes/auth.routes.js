import express from 'express';
import {
  registerOwner,
  // registerMember removed 
  login,
  changePassword,
  updateFcmToken,
  adminLogin,
  forgotPassword,
  resetPassword
} from '../controllers/auth.controller.js';

import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

router.post('/register-owner', registerOwner);
// router.post('/register-member', registerMember); // REMOVED
router.post('/login', login);
router.post('/admin-login', adminLogin);
router.post('/change-password', authenticateToken, changePassword);
router.put('/fcm-token', authenticateToken, updateFcmToken);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

export default router;