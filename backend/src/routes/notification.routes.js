import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification
} from '../controllers/notification.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get notifications for the gym
router.get('/', getNotifications);

// Get unread notification count
router.get('/unread-count', getUnreadCount);

// Mark a specific notification as read
router.put('/:notification_id/read', markAsRead);

// Mark all notifications as read
router.put('/mark-all-read', markAllAsRead);

// Delete a notification
router.delete('/:notification_id', deleteNotification);

export default router; 