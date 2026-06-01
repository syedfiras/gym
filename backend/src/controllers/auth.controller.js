import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../models/index.js';
import { generateRandomCode } from '../utils/helpers.js';
import { body, validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import { sendResetPasswordEmail } from '../utils/email.js';

const { User, Gym, Member } = db;

export const registerOwner = [
  // Validation chain
  body('first_name').trim().notEmpty().withMessage('First name is required.'),
  body('last_name').trim().notEmpty().withMessage('Last name is required.'),
  body('email').isEmail().withMessage('Invalid email address.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
  body('gym_name').trim().notEmpty().withMessage('Gym name is required.'),
  body('contact_email').isEmail().withMessage('Invalid contact email address.'),
  body('address').trim().notEmpty().withMessage('Address is required.'),
  body('city').trim().notEmpty().withMessage('City is required.'),
  body('state').trim().notEmpty().withMessage('State is required.'),
  body('contact_phone').trim().notEmpty().withMessage('Contact phone is required.'),

  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { first_name, last_name, email, password, phone, gym_name, contact_email, address, city, state, contact_phone } = req.body;

      // Check if email exists
      const emailExists = await User.findOne({ where: { email } });
      if (emailExists) return res.status(409).json({ error: 'Email already registered' });

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // Create gym
      const unique_join_code = generateRandomCode();
      const gym = await Gym.create({
        gym_name,
        contact_email,
        address,
        city,
        state,
        contact_phone,
        unique_join_code
      });

      // Create user
      const user = await User.create({
        email,
        password_hash,
        phone,
        role: 'owner',
        first_name,
        last_name,
        gym_id: gym.gym_id,
        status: 'pending' // EXPLICITLY PENDING
      });

      // No token sent - waiting for approval
      res.status(201).json({
        success: true,
        message: 'Registration successful. Your account is pending admin approval.',
        gym_join_code: unique_join_code
      });
    } catch (error) {
      logger.error('Error during owner registration:', error);
      res.status(500).json({ error: error.message });
    }
  }
];

export const login = [
  // Validation chain
  body('email').isEmail().withMessage('Invalid email address.'),
  body('password').notEmpty().withMessage('Password is required.'),

  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ where: { email } });
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      // Check status
      if (user.status === 'pending') {
        return res.status(403).json({ error: 'Your account is pending admin approval.' });
      }
      if (user.status === 'rejected') {
        return res.status(403).json({ error: 'Your account has been rejected. Please contact support.' });
      }

      // Validate password
      if (!user.password_hash) {
        return res.status(401).json({
          error: 'Account password is not set. Please reset your password.'
        });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

      // Update FCM token if provided
      if (req.body.fcm_token) {
        user.fcm_token = req.body.fcm_token;
        await user.save();
      }

      const token = jwt.sign(
        { user_id: user.user_id, role: user.role, gym_id: user.gym_id },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({ token, role: user.role, gym_id: user.gym_id });
    } catch (error) {
      logger.error('Error during login:', error);
      res.status(500).json({ error: error.message });
    }
  }
];

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check against env variables
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      // Generate admin token
      const token = jwt.sign(
        { user_id: 'admin', role: 'admin' }, // specific admin payload
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      return res.json({ token, role: 'admin' });
    }

    return res.status(401).json({ error: 'Invalid admin credentials' });
  } catch (error) {
    logger.error('Error during admin login:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password for logged-in user (owner/staff/member)
 * @access  Private (requires authentication)
 */
export const changePassword = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const user = await db.User.findByPk(user_id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Check current password
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect.' });

    // Update password
    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    logger.error('Error changing password:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @route   PUT /api/auth/fcm-token
 * @desc    Update FCM token for logged-in user
 * @access  Private (requires authentication)
 */
export const updateFcmToken = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { fcm_token } = req.body;

    if (!fcm_token) {
      return res.status(400).json({ error: 'FCM token is required.' });
    }

    const user = await db.User.findByPk(user_id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.fcm_token = fcm_token;
    await user.save();

    res.json({ success: true, message: 'FCM token updated successfully.' });
  } catch (error) {
    logger.error('Error updating FCM token:', error);
    res.status(500).json({ error: error.message });
  }
};

import crypto from 'crypto';
import { triggerMakeWebhook } from '../utils/makeWebhook.js';
import { Op } from 'sequelize';

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: 'User with this email does not exist.' });
    }

    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to reset_password_token field
    user.reset_password_token = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire to 1 hour from now
    user.reset_password_expires = Date.now() + 3600000;

    await user.save();

    await sendResetPasswordEmail({
      to: user.email,
      name: user.first_name,
      resetToken
    });

    res.json({ success: true, message: 'Password reset email sent.' });
  } catch (error) {
    logger.error('Error in forgot password:', error);
    res.status(500).json({ error: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash the token from the URL to match DB
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token and not expired
    const user = await User.findOne({
      where: {
        reset_password_token: hashedToken,
        reset_password_expires: { [Op.gt]: Date.now() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }

    // Update password
    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(password, salt);

    // Clear reset fields
    user.reset_password_token = null;
    user.reset_password_expires = null;

    await user.save();

    res.json({ success: true, message: 'Password updated successfully. Please login.' });
  } catch (error) {
    logger.error('Error in reset password:', error);
    res.status(500).json({ error: error.message });
  }
};