// backend/src/utils/notificationService.js
import db from '../models/index.js';
const { Notification, Member, Membership } = db;

/**
 * Create notification record
 * @param {Object} notificationData - { gym_id, member_id, membership_id, message, status }
 * @returns {Promise<Object>} - Created notification
 */
export const createNotificationRecord = async (notificationData) => {
  try {
    const notification = await Notification.create(notificationData);
    return { success: true, notification };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get notifications for a gym
 * @param {number} gym_id - Gym ID
 * @param {number} limit - Number of notifications to return
 * @returns {Promise<Array>} - List of notifications
 */
export const getGymNotifications = async (gym_id, limit = 50) => {
  try {
    const notifications = await Notification.findAll({
      where: { gym_id },
      order: [['created_at', 'DESC']],
      limit,
      include: [
        { model: Member, attributes: ['first_name', 'last_name', 'member_id'] },
        { model: Membership, attributes: ['membership_id', 'end_date'] }
      ]
    });
    return { success: true, notifications };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Mark notification as read
 * @param {number} notification_id - Notification ID
 * @returns {Promise<Object>} - Result of the operation
 */
export const markNotificationAsRead = async (notification_id) => {
  try {
    const [updatedCount] = await Notification.update(
      { status: 'read' },
      { where: { notification_id } }
    );
    return { success: updatedCount > 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Delete a notification
 * @param {number} notification_id - Notification ID
 * @returns {Promise<Object>} - Result of the operation
 */
export const deleteNotificationRecord = async (notification_id) => {
  try {
    const deletedCount = await Notification.destroy({ where: { notification_id } });
    return { success: deletedCount > 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
};