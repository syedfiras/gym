import db from '../models/index.js';
import { getGymNotifications, markNotificationAsRead, deleteNotificationRecord } from '../utils/notificationService.js';

const { Notification } = db;

/**
 * Get notifications for a gym
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getNotifications = async (req, res) => {
  try {
    const { gym_id } = req.user;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const result = await getGymNotifications(gym_id, parseInt(limit));
    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: result.error });
    }
    const totalCount = await Notification.count({ where: { gym_id } });
    res.json({
      success: true,
      notifications: result.notifications,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(totalCount / limit),
        total_count: totalCount,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * Mark notification as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const markAsRead = async (req, res) => {
  try {
    const { notification_id } = req.params;
    const { gym_id } = req.user;
    const notification = await Notification.findOne({ where: { notification_id, gym_id } });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    const result = await markNotificationAsRead(notification_id);
    if (result.success) {
      res.json({ success: true, message: 'Notification marked as read' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to mark notification as read', error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * Mark all notifications as read for a gym
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const markAllAsRead = async (req, res) => {
  try {
    const { gym_id } = req.user;
    const [updatedCount] = await Notification.update(
      { status: 'read' },
      { where: { gym_id, status: 'sent' } }
    );
    res.json({ success: true, message: `${updatedCount} notifications marked as read` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * Get unread notification count
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUnreadCount = async (req, res) => {
  try {
    const { gym_id } = req.user;
    const unreadCount = await Notification.count({ where: { gym_id, status: 'sent' } });
    res.json({ success: true, unread_count: unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * Delete a notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteNotification = async (req, res) => {
  try {
    const { notification_id } = req.params;
    const { gym_id } = req.user;
    const notification = await Notification.findOne({ where: { notification_id, gym_id } });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    const result = await deleteNotificationRecord(notification_id);
    if (result.success) {
      res.json({ success: true, message: 'Notification deleted successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to delete notification', error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
}; 