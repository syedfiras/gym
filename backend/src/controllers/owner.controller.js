import db from '../models/index.js';
import bcrypt from 'bcrypt';
import multer3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { Op } from 'sequelize';
import multer from 'multer';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import NodeCache from 'node-cache';
import logger from '../utils/logger.js';
import supabase from '../utils/supabaseStorage.js';


/**
 * @section Imports and Multer Setup
 * This section handles all necessary imports and configures Multer for file uploads.
 */

const projectRoot = path.resolve();

const allowedTypes = /jpeg|jpg|png/;
// Configure storage for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create the full path to the members directory
    const uploadPath = path.join(projectRoot, 'uploads', 'members');

    // Ensure the directory exists
    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.test(ext.substring(1))) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed (jpg, jpeg, png).'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

// Multer config for staff photos
const staffStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(projectRoot, 'uploads', 'staff');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const staffFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.test(ext.substring(1))) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed (jpg, jpeg, png).'));
  }
};

export const staffUpload = multer({
  storage: staffStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: staffFileFilter
});

// Multer config for user (owner) profile photos
const userPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(projectRoot, 'uploads', 'users');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const userPhotoFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.test(ext.substring(1))) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed (jpg, jpeg, png).'));
  }
};

export const userPhotoUpload = multer({
  storage: userPhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: userPhotoFileFilter
});

export { upload };

/**
 * @function uploadMemberPhoto
 * @description Uploads a photo for a specific member.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const uploadMemberPhoto = async (req, res) => {
  try {
    const { member_id } = req.params;
    const gym_id = req.user.gym_id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const member = await db.Member.findOne({ where: { member_id, gym_id } });
    if (!member) return res.status(404).json({ error: 'Member not found' });

    // Read file from local temp storage
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileExt = path.extname(req.file.originalname);
    const fileName = `members/${gym_id}/${member_id}-${Date.now()}${fileExt}`;

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('member-photos')
      .upload(fileName, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (error) throw error;

    // Get public URL
    const { data } = supabase.storage
      .from('member-photos')
      .getPublicUrl(fileName);

    // Save URL in DB
    member.photo = data.publicUrl;
    await member.save();

    // Delete temp file
    fs.unlinkSync(req.file.path);

    res.json({ success: true, photo: data.publicUrl });
  } catch (error) {
    logger.error('Error uploading member photo:', error);
    res.status(500).json({ error: error.message });
  }
};


/**
 * @function uploadStaffPhoto
 * @description Uploads a photo for a specific staff member.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const uploadStaffPhoto = async (req, res) => {
  try {
    const { staff_id } = req.params;
    const gym_id = req.user.gym_id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const staff = await db.Staff.findOne({ where: { staff_id, gym_id } });
    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    // Read temp file
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileExt = path.extname(req.file.originalname);

    const fileName = `staff/${gym_id}/${staff_id}-${Date.now()}${fileExt}`;

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('member-photos') // 👈 change to 'staff-photos' if using separate bucket
      .upload(fileName, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (error) throw error;

    // Get public URL
    const { data } = supabase.storage
      .from('member-photos')
      .getPublicUrl(fileName);

    // Save URL in DB
    staff.photo = data.publicUrl;
    await staff.save();

    // Remove temp file
    fs.unlinkSync(req.file.path);

    res.json({ success: true, photo: data.publicUrl });
  } catch (error) {
    logger.error('Error uploading staff photo:', error);
    res.status(500).json({ error: error.message });
  }
};


// const projectRoot = path.resolve();

// const s3 = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
//   }
// });

// const allowedTypes = /jpeg|jpg|png/;
// const fileFilter = (req, file, cb) => {
//   const ext = path.extname(file.originalname).toLowerCase();
//   if (allowedTypes.test(ext.substring(1))) {
//     cb(null, true);
//   } else {
//     cb(new Error('Only images are allowed (jpg, jpeg, png).'));
//   }
// };

// const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

// export const upload = multer({
//   storage: multer3({
//     s3,
//     bucket: process.env.AWS_S3_BUCKET,
//     key: function (req, file, cb) {
//       const ext = path.extname(file.originalname).toLowerCase();
//       cb(null, `members/${uuidv4()}${ext}`);
//     }
//   }),
//   limits: { fileSize: MAX_FILE_SIZE },
//   fileFilter
// });

// export const staffUpload = multer({
//   storage: multer3({
//     s3,
//     bucket: process.env.AWS_S3_BUCKET,
//     key: function (req, file, cb) {
//       const ext = path.extname(file.originalname).toLowerCase();
//       cb(null, `staff/${uuidv4()}${ext}`);
//     }
//   }),
//   limits: { fileSize: MAX_FILE_SIZE },
//   fileFilter
// });

// export const userPhotoUpload = multer({
//   storage: multer3({
//     s3,
//     bucket: process.env.AWS_S3_BUCKET,
//     key: function (req, file, cb) {
//       const ext = path.extname(file.originalname).toLowerCase();
//       cb(null, `users/${uuidv4()}${ext}`);
//     }
//   }),
//   limits: { fileSize: MAX_FILE_SIZE },
//   fileFilter
// });



// /**
//  * @function uploadMemberPhoto
//  * @description Uploads a photo for a specific member.
//  * @param {Object} req - Express request object.
//  * @param {Object} res - Express response object.
//  */
// export const uploadMemberPhoto = async (req, res) => {
//   try {
//     const { member_id } = req.params;
//     if (!req.file) {
//       return res.status(400).json({ error: 'No file uploaded.' });
//     }
//     const gym_id = req.user.gym_id;
//     const member = await db.Member.findOne({ where: { member_id, gym_id } });
//     if (!member) return res.status(404).json({ error: 'Member not found' });
//     member.photo = req.file.location; // S3 URL
//     await member.save();
//     res.json({ success: true, photo: member.photo });
//   } catch (error) {
//     logger.error('Error uploading member photo:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// /**
//  * @function uploadStaffPhoto
//  * @description Uploads a photo for a specific staff member.
//  * @param {Object} req - Express request object.
//  * @param {Object} res - Express response object.
//  */
// export const uploadStaffPhoto = async (req, res) => {
//   try {
//     const { staff_id } = req.params;
//     if (!req.file) {
//       return res.status(400).json({ error: 'No file uploaded.' });
//     }
//     const gym_id = req.user.gym_id;
//     const staff = await db.Staff.findOne({ where: { staff_id, gym_id } });
//     if (!staff) return res.status(404).json({ error: 'Staff not found' });
//     staff.photo = req.file.location; // S3 URL
//     await staff.save();
//     res.json({ success: true, photo: staff.photo });
//   } catch (error) {
//     logger.error('Error uploading staff photo:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

/**
 * @section Model Destructuring & Helper Functions
 * This section destructures all necessary models from the db object
 * and includes helper functions used across the controller.
 */

// Destructure all necessary models from the db object
const { Gym, Member, User, MembershipPlan, Membership, Transaction, Sequelize, Staff, PersonalTraining } = db;

const cache = new NodeCache({ stdTTL: 300 }); // Cache for 5 minutes (300 seconds)

/**
 * @function getOwnerGymId
 * @description Helper to get the gym_id for the authenticated owner.
 * This assumes the owner's gym_id is stored directly on their User record.
 * @param {string} user_id - The ID of the authenticated user.
 * @returns {string|null} The gym ID or null if not found.
 */
const getOwnerGymId = async (user_id) => {
  const user = await User.findByPk(user_id);
  return user?.gym_id; // Owner's gym_id is directly on their User record
};

/**
 * @function getGymInfo
 * @description Returns the gym's information for the authenticated owner.
 */
export const getGymInfo = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    if (!gym_id) return res.status(401).json({ error: 'Owner not associated with a gym.' });

    const gym = await db.Gym.findByPk(gym_id);
    if (!gym) return res.status(404).json({ error: 'Gym not found.' });

    res.json({
      gym_name: gym.gym_name,
      unique_join_code: gym.unique_join_code,
      contact_email: gym.contact_email,
      contact_phone: gym.contact_phone,
      address: gym.address
    });
  } catch (error) {
    logger.error('Error getting gym info:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @function updateGymInfo
 * @description Updates the gym's information for the authenticated owner.
 */
export const updateGymInfo = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    if (!gym_id) return res.status(401).json({ error: 'Owner not associated with a gym.' });

    const gym = await db.Gym.findByPk(gym_id);
    if (!gym) return res.status(404).json({ error: 'Gym not found.' });

    // Only allow updating specific fields
    const allowedFields = ['contact_email', 'contact_phone', 'address'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        gym[field] = req.body[field];
      }
    });

    await gym.save();

    // Invalidate dashboard cache if you cache gym info there
    if (typeof cache !== 'undefined') {
      cache.del(`ownerDashboard_${gym_id}`);
    }

    res.json({ success: true, gym });
  } catch (error) {
    logger.error('Error updating gym info:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @section Dashboard Management
 * This section contains functions related to retrieving and managing owner dashboard data.
 */

/**
 * @function getOwnerDashboard
 * @description Retrieves key metrics and data for the owner's dashboard.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const getOwnerDashboard = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    if (!gym_id) return res.status(401).json({ error: 'Gym ID not found in token. Please log in again.' });

    const cacheKey = `ownerDashboard_${gym_id}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log('Serving owner dashboard from cache.');
      return res.json(cachedData);
    }

    const gym = await Gym.findByPk(gym_id);
    if (!gym) return res.status(404).json({ error: 'Gym details not found.' });

    const total_members = await Member.count({ where: { gym_id } });
    const active_members = await Member.count({ where: { gym_id, member_status: 'active' } });
    const pending_members = await Member.count({ where: { gym_id, member_status: 'pending' } });
    const total_staffs = await Staff.count({ where: { gym_id } }); // Get total staff count

    const today = new Date();
    const active_memberships = await Membership.count({
      where: {
        gym_id,
        status: 'active',
        end_date: { [Op.gte]: today }
      }
    });

    // Total revenue
    const total_revenue = await Transaction.sum('amount', { where: { gym_id } }) || 0;

    // Today's revenue
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
    const todays_revenue = await Transaction.sum('amount', {
      where: {
        gym_id,
        transaction_date: { [Op.between]: [startOfDay, endOfDay] }
      }
    }) || 0;

    // Monthly revenue data for chart (last 6 months)
    const monthly_revenue = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59);
      const sum = await Transaction.sum('amount', {
        where: {
          gym_id,
          transaction_date: { [Op.between]: [monthStart, monthEnd] }
        }
      }) || 0;
      monthly_revenue.push({
        month: monthStart.toLocaleString('default', { month: 'short' }),
        revenue: sum
      });
    }

    // Count expired memberships (memberships themselves, not member status)
    // Updated logic: Count active members who DO NOT have any currently active (future-dated) memberships
    const memberIdsWithActiveMemberships = await Membership.findAll({
      attributes: ['member_id'],
      where: {
        gym_id,
        status: 'active',
        end_date: { [Op.gte]: new Date() }
      },
      group: ['member_id'],
      raw: true
    });
    const activeMemberIdsArray = memberIdsWithActiveMemberships.map(m => m.member_id);

    const currently_expired_members_count = await Member.count({
      where: {
        gym_id,
        member_status: 'active', // Only consider members who are generally active in the gym system
        member_id: { [Op.notIn]: activeMemberIdsArray } // Exclude members who have an active membership
      }
    });

    // Calculate revenue for the current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1); // Set to the 1st of the current month
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1); // Set to the 1st of next month

    const revenue_this_month = await Transaction.sum('amount', {
      where: {
        gym_id,
        transaction_date: {
          [Sequelize.Op.gte]: startOfMonth,
          [Sequelize.Op.lt]: endOfMonth
        },
        // Only sum revenue-generating transactions
        transaction_type: ['membership_payment', 'admission_fee', 'merchandise', 'personal_training', 'other_fee']
      }
    }) || 0; // Default to 0 if no transactions

    const dashboardData = {
      active_memberships,
      total_revenue,
      todays_revenue,
      monthly_revenue,
      gym_info: {
        gym_name: gym.gym_name,
        unique_join_code: gym.unique_join_code,
        contact_email: gym.contact_email,
        contact_phone: gym.contact_phone
      },
      counts: {
        total_members,
        active_members,
        pending_members,
        expired_memberships: currently_expired_members_count,
        revenue_this_month: parseFloat(revenue_this_month).toFixed(2),
        total_staffs
      }
    };

    cache.set(cacheKey, dashboardData); // Cache the data
    res.json(dashboardData);
  } catch (error) {
    logger.error('Error getting owner dashboard:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @section Membership Plan Management
 * This section provides functions for creating, updating, retrieving, and deactivating membership plans.
 */

/**
 * @function createMembershipPlan
 * @description Creates a new membership plan for the gym.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Object} New membership plan details.
 */
export const createMembershipPlan = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    if (!gym_id) return res.status(401).json({ error: 'Owner not associated with a gym.' });

    const { plan_name, description, duration_months, price, plan_type, is_active = true } = req.body;

    if (!plan_name || !duration_months || price === undefined || !plan_type) {
      return res.status(400).json({ error: 'Plan name, duration, price, and type are required.' });
    }
    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return res.status(400).json({ error: 'Price must be a valid non-negative number.' });
    }
    if (isNaN(parseInt(duration_months)) || parseInt(duration_months) <= 0) {
      return res.status(400).json({ error: 'Duration must be a positive integer in months.' });
    }

    const newPlan = await MembershipPlan.create({
      gym_id,
      plan_name,
      description,
      duration_months,
      price: parseFloat(price),
      plan_type,
      is_active
    });

    res.status(201).json({ success: true, plan: newPlan });
  } catch (error) {
    logger.error('Error creating membership plan:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @function updateMembershipPlan
 * @description Updates an existing membership plan for the gym.
 * @param {Object} req - Express request object (includes plan_id in params and updated fields in body).
 * @param {Object} res - Express response object.
 * @returns {Object} Updated membership plan details.
 */
export const updateMembershipPlan = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    const { plan_id } = req.params;
    const { plan_name, description, duration_months, price, plan_type, is_active } = req.body;

    if (!gym_id) return res.status(401).json({ error: 'Owner not associated with a gym.' });

    const plan = await MembershipPlan.findOne({ where: { plan_id, gym_id } });
    if (!plan) return res.status(404).json({ error: 'Membership plan not found or does not belong to your gym.' });

    // Validate input (optional: add more checks)
    if (!plan_name || !duration_months || price === undefined || !plan_type) {
      return res.status(400).json({ error: 'Plan name, duration, price, and type are required.' });
    }

    plan.plan_name = plan_name;
    plan.description = description;
    plan.duration_months = duration_months;
    plan.price = parseFloat(price);
    plan.plan_type = plan_type;
    plan.is_active = is_active;

    await plan.save();

    res.json({ success: true, plan });
  } catch (error) {
    logger.error('Error updating membership plan:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @function getMembershipPlans
 * @description Retrieves all membership plans belonging to the owner's gym.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Array<Object>} List of membership plans.
 */
export const getMembershipPlans = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    if (!gym_id) return res.status(401).json({ error: 'Owner not associated with a gym.' });

    const { page = 1, limit = 10 } = req.query; // Get page and limit parameters
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: plans } = await MembershipPlan.findAndCountAll({
      where: { gym_id },
      order: [['plan_name', 'ASC']],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      total_plans: count,
      current_page: parseInt(page),
      total_pages: Math.ceil(count / parseInt(limit)),
      plans: plans
    });
  } catch (error) {
    logger.error('Error getting membership plans:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @function getMembershipPlan
 * @description Retrieves a single membership plan by its ID.
 * @param {Object} req - Express request object (includes plan_id in params).
 * @param {Object} res - Express response object.
 * @returns {Object} Membership plan details.
 */
export const getMembershipPlan = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    const { plan_id } = req.params;
    const plan = await MembershipPlan.findOne({ where: { plan_id, gym_id } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json(plan);
  } catch (error) {
    logger.error('Error getting membership plan:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @function deactivateMembershipPlan
 * @description Deactivates (soft delete) a membership plan.
 * @param {Object} req - Express request object (includes plan_id in params).
 * @param {Object} res - Express response object.
 */
export const deactivateMembershipPlan = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    const { plan_id } = req.params;
    const plan = await MembershipPlan.findOne({ where: { plan_id, gym_id } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    plan.is_active = false;
    await plan.save();
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deactivating membership plan:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @section Member Management
 * This section contains functions for adding, updating, and retrieving member information.
 */

/**
 * @function addMember
 * @description Adds a new member and optionally creates a new membership and associated transactions.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const addMember = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const gym_id = req.user.gym_id;
    if (!gym_id) {
      await transaction.rollback();
      return res.status(401).json({ error: 'Owner not associated with a gym.' });
    }

    const {
      first_name,
      last_name,
      email,
      phone,
      selected_plan_id,
      paid_amount,
      payment_method,
      admission_fee = parseFloat(req.body.admission_fee) || 0,
      payment_status = 'paid',
      photo
    } = req.body;

    // Basic validation
    if (!first_name || !email || !phone) {
      await transaction.rollback();
      return res.status(400).json({ error: 'First name, email, and password are required.' });
    }
    if (paid_amount !== undefined && isNaN(parseFloat(paid_amount))) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Paid amount must be a valid number.' });
    }
    if (admission_fee !== undefined && isNaN(parseFloat(admission_fee))) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Admission fee must be a valid number.' });
    }

    // Check if user already exists
    const existingMember = await Member.findOne({ where: { email, gym_id }, transaction });
    if (existingMember) {
      await transaction.rollback();
      return res.status(409).json({ error: 'This member already exists.' });
    }

    // Create member (always active)
    const member = await Member.create({
      gym_id,
      first_name,
      last_name,
      email,
      phone,
      member_status: 'active',
      join_date: new Date(),
      photo
    }, { transaction });


    // Membership creation (if selected)
    let newMembership = null;
    let membershipPlan = null;
    if (selected_plan_id) {
      membershipPlan = await MembershipPlan.findByPk(selected_plan_id, { transaction });
      if (!membershipPlan || membershipPlan.gym_id !== gym_id) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Selected membership plan not found or does not belong to your gym.' });
      }
      const startDate = req.body.start_date ? new Date(req.body.start_date) : new Date();
      let endDate;

      if (req.body.end_date) {
        endDate = new Date(req.body.end_date);
      } else {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + membershipPlan.duration_months);
      }

      // Calculate payment status logic
      const totalCost = parseFloat(membershipPlan.price) + parseFloat(admission_fee);
      const amountPaid = parseFloat(paid_amount) || 0;
      let calculatedStatus = 'due';

      if (amountPaid >= totalCost) {
        calculatedStatus = 'paid';
      } else if (amountPaid > 0) {
        calculatedStatus = 'partially_paid';
      }

      newMembership = await Membership.create({
        member_id: member.member_id,
        plan_id: selected_plan_id,
        gym_id,
        start_date: startDate,
        end_date: endDate,
        actual_price_paid: amountPaid,
        payment_status: calculatedStatus,
        status: 'active'
      }, { transaction });
    }

    // --- Record Transactions Separately ---

    // 1. Transaction for Membership Payment (if a membership was created and amount paid)
    if (newMembership && (parseFloat(paid_amount) || 0) > 0) {
      await Transaction.create({
        gym_id,
        member_id: member.member_id,
        membership_id: newMembership.membership_id,
        amount: parseFloat(paid_amount),
        payment_method: payment_method || 'cash', // Use payment method from frontend payload
        transaction_type: 'membership_payment', // Explicitly set for membership
        description: `Membership payment for ${first_name} ${last_name} (Plan: ${membershipPlan?.plan_name || 'N/A'})`,
        transaction_date: new Date()
      }, { transaction });
    }

    // 2. Transaction for Admission Fee (if applicable and > 0)
    if (admission_fee > 0) {
      await Transaction.create({
        gym_id,
        member_id: member.member_id,
        membership_id: null, // Admission fee is not directly tied to a specific membership term
        amount: admission_fee,
        payment_method: payment_method || 'cash', // Can reuse the payment method or set a default
        transaction_type: 'admission_fee', // Explicitly set for admission fee
        description: `Admission fee for new member ${first_name} ${last_name}`,
        transaction_date: new Date()
      }, { transaction });
    }

    await transaction.commit();

    cache.del(`ownerDashboard_${gym_id}`); // Invalidate cache for dashboard data

    res.status(201).json({
      success: true,
      message: `Member ${first_name} ${last_name} and membership added successfully.`,
      member_id: member.member_id,
      membership_id: newMembership ? newMembership.membership_id : null
    });
  } catch (error) {
    logger.error('Error adding member:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @function updateMemberStatus
 * @description Updates the status of an existing member.
 * @param {Object} req - Express request object (includes member_id in params and new_status in body).
 * @param {Object} res - Express response object.
 */
export const updateMemberStatus = async (req, res) => {
  try {
    const { member_id } = req.params;
    const { new_status } = req.body;
    const gym_id = req.user.gym_id;

    const member = await Member.findOne({
      where: { member_id, gym_id }
    });

    if (!member) return res.status(404).json({ error: 'Member not found or does not belong to your gym.' });

    // Update member's primary status (e.g., from pending to active)
    member.member_status = new_status;
    await member.save();

    // Optionally, update the status of their MOST RECENT active membership too
    // This part requires careful logic to identify the 'current' active membership
    // For now, let's assume `member_status` in `Member` table is sufficient
    // for high-level status, and actual `Membership.status` is managed upon creation/renewal.

    res.json({ success: true, message: `Member status updated to ${new_status}` });
  } catch (error) {
    logger.error('Error updating member status:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @function getMembers
 * @description Retrieves a list of all members associated with the owner's gym, including their current membership details.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Array<Object>} List of formatted member objects.
 */
export const getMembers = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    if (!gym_id) return res.status(401).json({ error: 'Owner not associated with a gym.' });

    const { search, filter, page = 1, limit = 10 } = req.query; // Get search, filter, page, and limit parameters
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = { gym_id };

    if (search) {
      const searchQuery = `%${search.toLowerCase()}%`;
      whereClause[Op.or] = [
        { first_name: { [Op.like]: searchQuery } },
        { last_name: { [Op.like]: searchQuery } },
        { email: { [Op.like]: searchQuery } }, // Added email to search
        { phone: { [Op.like]: searchQuery } },
      ];
    }

    // Handle 'expired' filter for members who don't have an active future-dated membership
    if (filter === 'expired') {
      const memberIdsWithActiveMemberships = await Membership.findAll({
        attributes: ['member_id'],
        where: {
          gym_id,
          status: 'active',
          end_date: { [Op.gte]: new Date() }
        },
        group: ['member_id'],
        raw: true
      });
      const activeMemberIdsArray = memberIdsWithActiveMemberships.map(m => m.member_id);

      // Add condition to filter members who are NOT in the activeMemberIdsArray
      whereClause.member_id = { [Op.notIn]: activeMemberIdsArray };
      whereClause.member_status = 'active'; // Only show active members whose membership has expired
    }

    // Handle 'expiring' filter for members whose memberships are expiring within 3 days
    if (filter === 'expiring') {
      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const memberIdsWithExpiringMemberships = await Membership.findAll({
        attributes: ['member_id'],
        where: {
          gym_id,
          status: 'active',
          end_date: {
            [Op.gte]: now,
            [Op.lte]: threeDaysFromNow
          }
        },
        group: ['member_id'],
        raw: true
      });
      const expiringMemberIdsArray = memberIdsWithExpiringMemberships.map(m => m.member_id);

      // Add condition to filter members whose memberships are expiring soon
      whereClause.member_id = { [Op.in]: expiringMemberIdsArray };
      whereClause.member_status = 'active';
    }

    // Handle 'pt' filter for members with active personal training
    if (filter === 'pt') {
      const memberIdsWithActivePT = await PersonalTraining.findAll({
        attributes: ['member_id'],
        where: {
          gym_id,
          status: 'active',
          end_date: { [Op.gte]: new Date() }
        },
        group: ['member_id'],
        raw: true
      });
      const ptMemberIdsArray = memberIdsWithActivePT.map(m => m.member_id);

      whereClause.member_id = { [Op.in]: ptMemberIdsArray };
    }

    // Handle 'due' filter for members with due or partially_paid memberships
    if (filter === 'due') {
      const memberIdsWithDues = await Membership.findAll({
        attributes: ['member_id'],
        where: {
          gym_id,
          payment_status: ['due', 'partially_paid']
        },
        group: ['member_id'],
        raw: true
      });
      const dueMemberIdsArray = memberIdsWithDues.map(m => m.member_id);
      whereClause.member_id = { [Op.in]: dueMemberIdsArray };
    }

    const { count, rows: members } = await Member.findAndCountAll({
      where: whereClause, // Apply the constructed where clause
      include: [
        {
          model: Membership,
          as: 'Memberships',
          include: [{ model: MembershipPlan, attributes: ['plan_name', 'duration_months', 'price'] }],
          required: false
        }
      ],
      attributes: ['member_id', 'first_name', 'last_name', 'email', 'phone', 'member_status', 'join_date', 'photo'],
      limit: parseInt(limit),
      offset: offset,
      order: [['join_date', 'DESC']] // Order by join date, newest first
    });

    const memberIds = members.map(m => m.member_id);

    // Query for active personal training for these members
    const personalTrainings = await PersonalTraining.findAll({
      where: {
        member_id: { [Op.in]: memberIds },
        gym_id,
        status: 'active',
        end_date: { [Op.gte]: new Date() }
      },
      attributes: ['member_id'],
      group: ['member_id'],
      raw: true
    });
    const memberIdsWithPT = new Set(personalTrainings.map(pt => pt.member_id));


    const formattedMembers = members.map(member => {
      let currentMembership = null;
      if (member.Memberships && member.Memberships.length > 0) {
        // Sort memberships by end_date to find the most recent one
        currentMembership = [...member.Memberships].sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())[0];

        if (currentMembership) {
          const now = new Date();
          const endDate = new Date(currentMembership.end_date);

          if (currentMembership.status === 'active' && endDate < now) {
            currentMembership.status = 'expired';
          }
        }
      }
      return {
        member_id: member.member_id,
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        phone: member.phone,
        member_status: member.member_status,
        join_date: member.join_date,
        photo: member.photo
          ? (member.photo.startsWith('http://') || member.photo.startsWith('https://')
            ? member.photo
            : `${req.protocol}://${req.get('host')}${member.photo}`)
          : null,
        current_membership: currentMembership ? {
          membership_id: currentMembership.membership_id,
          plan_name: currentMembership.MembershipPlan?.plan_name,
          plan_price: currentMembership.MembershipPlan?.price,
          start_date: currentMembership.start_date,
          end_date: currentMembership.end_date,
          status: currentMembership.status,
          payment_status: currentMembership.payment_status,
          actual_price_paid: currentMembership.actual_price_paid,
          MembershipPlan: currentMembership.MembershipPlan ? {
            plan_name: currentMembership.MembershipPlan.plan_name,
            price: currentMembership.MembershipPlan.price
          } : null
        } : null,
        has_personal_training: memberIdsWithPT.has(member.member_id)
      };
    });

    res.json({
      total_members: count,
      current_page: parseInt(page),
      total_pages: Math.ceil(count / parseInt(limit)),
      members: formattedMembers
    });
  } catch (error) {
    logger.error('Error getting members list:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @function deactivateMember
 * @description Deactivates a member by setting their status to 'inactive'.
 * @param {Object} req - Express request object (includes member_id in params).
 * @param {Object} res - Express response object.
 */
export const deactivateMember = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    const { member_id } = req.params;
    const member = await Member.findOne({ where: { member_id, gym_id } });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    member.member_status = 'inactive';
    await member.save();
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deactivating member:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @function updateMemberInfo
 * @description Updates the personal information of an existing member.
 * @param {Object} req - Express request object (includes member_id in params and updated fields in body).
 * @param {Object} res - Express response object.
 * @returns {Object} Updated member details.
 */
export const updateMemberInfo = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    const { member_id } = req.params;
    const { first_name, last_name, phone, email } = req.body;
    const member = await Member.findOne({ where: { member_id, gym_id } });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    member.first_name = first_name ?? member.first_name;
    member.last_name = last_name ?? member.last_name;
    member.phone = phone ?? member.phone;
    member.email = email ?? member.email;
    await member.save();
    res.json({ success: true, member });
  } catch (error) {
    logger.error('Error updating member info:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @function getMemberDetailsForOwner
 * @description Retrieves comprehensive details for a specific member, including their memberships, transactions, and personal training records.
 * @param {Object} req - Express request object (includes member_id in params).
 * @param {Object} res - Express response object.
 * @returns {Object} Member details along with associated memberships, transactions, and personal trainings.
 */
export const getMemberDetailsForOwner = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    const { member_id } = req.params;
    // Only allow access to members in this gym
    const member = await Member.findOne({ where: { member_id, gym_id } });
    if (!member) return res.status(404).json({ error: 'Member not found or does not belong to your gym.' });
    // Get all memberships
    const memberships = await Membership.findAll({
      where: { member_id },
      include: [{ model: MembershipPlan }],
      order: [['start_date', 'DESC']]
    });
    // Get all transactions
    const transactions = await Transaction.findAll({
      where: { member_id },
      order: [['transaction_date', 'DESC']]
    });

    // Get all personal training records
    const personal_trainings = await PersonalTraining.findAll({
      where: { member_id, gym_id },
      include: [{ model: Staff, as: 'Trainer', attributes: ['staff_id', 'first_name', 'last_name', 'staff_role'] }],
      order: [['start_date', 'DESC']]
    });

    res.json({
      member: {
        ...member.toJSON(),
        photo: member.photo
          ? (member.photo.startsWith('http://') || member.photo.startsWith('https://')
            ? member.photo
            : `${req.protocol}://${req.get('host')}${member.photo}`)
          : null,
      },
      memberships,
      transactions,
      personal_trainings
    });
  } catch (error) {
    logger.error('Error getting member details for owner:', error);
    res.status(500).json({ error: error.message });
  }
};


/**
 * @section Membership Management (for existing members' memberships)
 * This section contains functions for managing memberships specifically for existing members.
 */

/**
 * @function addMembershipToMemberForOwner
 * @description Allows the owner to add a new membership to an existing member.
 * @param {Object} req - Express request object (includes member_id in params and new membership details in body).
 * @param {Object} res - Express response object.
 * @returns {Object} The newly created membership.
 */
export const addMembershipToMemberForOwner = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const gym_id = req.user.gym_id;
    const { member_id } = req.params;
    const { plan_id, start_date, end_date, payments = [], admission_fee = 0 } = req.body;
    if (!gym_id) {
      await transaction.rollback();
      return res.status(401).json({ error: 'Owner not associated with a gym.' });
    }
    // Validate member exists and belongs to this gym
    const member = await Member.findOne({ where: { member_id, gym_id }, transaction });
    if (!member) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Member not found or does not belong to your gym.' });
    }
    // Validate plan exists and belongs to this gym
    const plan = await MembershipPlan.findOne({ where: { plan_id, gym_id }, transaction });
    if (!plan) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Membership plan not found or does not belong to your gym.' });
    }
    // Calculate total and paid
    const planPrice = parseFloat(plan.price);
    const total = planPrice + parseFloat(admission_fee || 0);
    const paid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const due = total - paid;
    // Create membership
    const membership = await Membership.create({
      member_id,
      plan_id,
      gym_id,
      start_date,
      end_date,
      actual_price_paid: paid,
      payment_status: req.body.payment_status || (due <= 0 ? 'paid' : paid > 0 ? 'partially_paid' : 'due'),
      status: 'active',
    }, { transaction });
    // Create transactions (skip any with amount <= 0)
    for (const payment of payments) {
      if (parseFloat(payment.amount) > 0) {
        await Transaction.create({
          gym_id,
          member_id,
          membership_id: membership.membership_id,
          amount: payment.amount,
          payment_method: payment.method,
          transaction_type: payment.type,
          description: payment.description || '',
          transaction_date: payment.transaction_date || new Date(),
        }, { transaction });
      }
    }
    // If admission fee is not included in payments, create a due transaction
    if (admission_fee > 0 && !payments.some(p => p.type === 'admission_fee')) {
      await Transaction.create({
        gym_id,
        member_id,
        membership_id: membership.membership_id,
        amount: admission_fee,
        payment_method: 'cash',
        transaction_type: 'admission_fee',
        description: 'Admission fee (due)',
        transaction_date: new Date(),
      }, { transaction });
    }
    await transaction.commit();
    res.status(201).json({ membership });
  } catch (error) {
    logger.error('Error adding membership to member for owner:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @function cancelMembership
 * @description Cancels an existing membership by setting its status to 'cancelled'.
 * @param {Object} req - Express request object (includes membership_id in params).
 * @param {Object} res - Express response object.
 */
export const cancelMembership = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    const { membership_id } = req.params;
    const membership = await Membership.findOne({ where: { membership_id, gym_id } });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });
    membership.status = 'cancelled';
    await membership.save();
    res.json({ success: true });
  } catch (error) {
    logger.error('Error cancelling membership:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @function updateMembership
 * @description Updates details of an existing membership (e.g., dates, status).
 * @param {Object} req - Express request object (includes membership_id in params and updated fields in body).
 * @param {Object} res - Express response object.
 * @returns {Object} Updated membership details.
 */
export const updateMembership = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    const { membership_id } = req.params;
    const { start_date, end_date, actual_price_paid, payment_status } = req.body;

    const membership = await Membership.findOne({ 
      where: { membership_id, gym_id } 
    });

    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    // Update only provided fields
    membership.start_date = start_date ?? membership.start_date;
    membership.end_date = end_date ?? membership.end_date;
    membership.actual_price_paid = actual_price_paid ?? membership.actual_price_paid;
    membership.payment_status = payment_status ?? membership.payment_status;

    await membership.save();

    res.json({ 
      success: true, 
      message: 'Membership updated successfully',
      membership 
    });
  } catch (error) {
    logger.error('Error updating membership:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getMembership = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    const { membership_id } = req.params;

    const membership = await Membership.findOne({
      where: { membership_id, gym_id },
      include: [
        {
          model: Member,
          attributes: ['member_id', 'first_name', 'last_name', 'email', 'phone']
        },
        {
          model: MembershipPlan,
          attributes: ['plan_id', 'plan_name', 'price', 'duration_months']
        }
      ]
    });

    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    res.json(membership);
  } catch (error) {
    logger.error('Error fetching membership:', error);
    res.status(500).json({ error: error.message });
  }
};

// UPDATE THIS EXISTING ENDPOINT


/**
 * @section Personal Training Management
 * This section includes functions related to managing personal training packages for members.
 */

/**
 * @function addPersonalTrainingToMember
 * @description Allows the owner to add a personal training package to a member.
 * @param {Object} req - Express request object (includes member_id in params and PT details in body).
 * @param {Object} res - Express response object.
 * @returns {Object} The newly created personal training record.
 */
export const addPersonalTrainingToMember = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const gym_id = req.user.gym_id;
    const { member_id } = req.params;
    const { duration_months, price, staff_id, notes, payment_method = 'cash', start_date } = req.body;

    if (!gym_id) {
      await transaction.rollback();
      return res.status(401).json({ error: 'Owner not associated with a gym.' });
    }
    if (!duration_months || isNaN(parseInt(duration_months)) || parseInt(duration_months) <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Duration (months) must be a positive integer.' });
    }
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Price must be a positive number.' });
    }

    // Validate member
    const member = await Member.findOne({ where: { member_id, gym_id }, transaction });
    if (!member) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Member not found or does not belong to your gym.' });
    }

    // Validate staff if provided
    let staff = null;
    if (staff_id) {
      staff = await Staff.findOne({ where: { staff_id, gym_id }, transaction });
      if (!staff) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Staff not found or does not belong to your gym.' });
      }
    }

    // Calculate dates
    const start = start_date ? new Date(start_date) : new Date();
    let end;

    if (req.body.end_date) {
      end = new Date(req.body.end_date);
    } else {
      end = new Date(start);
      end.setMonth(end.getMonth() + parseInt(duration_months));
    }

    // Payment Logic
    const totalCost = parseFloat(price);
    const amountPaid = req.body.paid_amount !== undefined ? parseFloat(req.body.paid_amount) : totalCost; // Default to full price if not specified? Or 0? Let's assume full price if simple add, but better to check.
    // Actually, for PT usually it's paid upfront, but to support partial:
    const finalAmountPaid = req.body.paid_amount !== undefined ? parseFloat(req.body.paid_amount) : parseFloat(price);

    let calculatedStatus = 'due';
    if (finalAmountPaid >= totalCost) {
      calculatedStatus = 'paid';
    } else if (finalAmountPaid > 0) {
      calculatedStatus = 'partially_paid';
    }

    // Create personal training record
    const pt = await PersonalTraining.create({
      gym_id,
      member_id,
      staff_id: staff ? staff.staff_id : null,
      duration_months,
      price,
      start_date: start,
      end_date: end,
      status: 'active',
      notes,
      actual_price_paid: finalAmountPaid,
      payment_status: calculatedStatus
    }, { transaction });

    // Create transaction
    await Transaction.create({
      gym_id,
      member_id,
      membership_id: null,
      amount: finalAmountPaid,
      payment_method,
      transaction_type: 'personal_training',
      description: `Personal training (${duration_months} months)`,
      transaction_date: new Date()
    }, { transaction });

    await transaction.commit();
    res.status(201).json({ success: true, personal_training: pt });
  } catch (error) {
    logger.error('Error adding personal training to member:', error);
    res.status(500).json({ error: error.message });
  }
};


/**
 * @section Staff Management
 * This section provides functions for adding and retrieving staff members.
 */

/**
 * @function addStaff
 * @description Adds a new staff member, creating a user account for them.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const addStaff = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const gym_id = req.user.gym_id;
    const {
      first_name,
      last_name,
      email,
      password,
      phone,
      staff_role,
      notes
    } = req.body;

    if (!first_name || !email || !password || !phone) {
      await transaction.rollback();
      return res.status(400).json({ error: 'First name, email, phone, and password are required.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email }, transaction });
    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({ error: 'This email is already registered as a user.' });
    }

    // Create user
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      email,
      password_hash,
      role: 'staff',
      first_name,
      last_name,
      phone,
      gym_id
    }, { transaction });

    // Create staff
    const staff = await Staff.create({
      user_id: newUser.user_id,
      gym_id,
      first_name,
      last_name,
      email,
      phone,
      staff_role,
      join_date: new Date(),
      status: 'active',
      notes
    }, { transaction });

    await transaction.commit();

    cache.del(`ownerDashboard_${gym_id}`); // Invalidate cache for dashboard data

    res.status(201).json({
      success: true,
      staff_id: staff.staff_id,
      message: `Staff ${first_name} ${last_name} added successfully.`
    });
  } catch (error) {
    logger.error('Error adding staff:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @function getStaffList
 * @description Retrieves a list of all staff members associated with the owner's gym.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Array<Object>} List of staff members.
 */
export const getStaffList = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    if (!gym_id) return res.status(401).json({ error: 'Owner not associated with a gym.' });

    const { page = 1, limit = 10 } = req.query; // Get page and limit parameters
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: staff } = await Staff.findAndCountAll({
      where: { gym_id },
      attributes: ['staff_id', 'first_name', 'last_name', 'staff_role', 'email', 'phone', 'status', 'photo'],
      limit: parseInt(limit),
      offset: offset,
      order: [['first_name', 'ASC']] // Order by first name for consistent pagination
    });
    // Format staff to include full photo URL if present
    const formattedStaff = staff.map(s => ({
      ...s.toJSON(),
      photo: s.photo
        ? (s.photo.startsWith('http://') || s.photo.startsWith('https://')
          ? s.photo
          : `${req.protocol}://${req.get('host')}${s.photo}`)
        : null
    }));
    res.json({
      total_staff: count,
      current_page: parseInt(page),
      total_pages: Math.ceil(count / parseInt(limit)),
      staff: formattedStaff
    });
  } catch (error) {
    logger.error('Error getting staff list:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @section Transaction Management
 * This section includes functions for retrieving transaction summaries and detailed transaction lists.
 */

/**
 * @function getTransactionSummary
 * @description Retrieves a summary of financial transactions for the owner's gym.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Object} Transaction summary and recent transactions.
 */
export const getTransactionSummary = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    if (!gym_id) return res.status(401).json({ error: 'Owner not associated with a gym.' });
    // Total collected
    const total_collected = await Transaction.sum('amount', { where: { gym_id } }) || 0;
    // Total due (sum of due memberships)
    const dueMemberships = await Membership.findAll({
      where: { gym_id, payment_status: ['due', 'partially_paid'] },
      include: [{ model: MembershipPlan, attributes: ['price'] }]
    });
    const total_due = dueMemberships.reduce((sum, m) => {
      const price = parseFloat(m.MembershipPlan?.price || 0);
      const paid = parseFloat(m.actual_price_paid || 0);
      return sum + (price - paid);
    }, 0);
    // Membership payments
    const membership_payments = await Transaction.sum('amount', { where: { gym_id, transaction_type: 'membership_payment' } }) || 0;
    // Admission fees
    const admission_fees = await Transaction.sum('amount', { where: { gym_id, transaction_type: 'admission_fee' } }) || 0;
    // Recent transactions
    const recent = await Transaction.findAll({
      where: { gym_id },
      order: [['transaction_date', 'DESC']],
      limit: 10
    });

    cache.del(`ownerDashboard_${gym_id}`); // Invalidate cache for dashboard data

    res.json({
      summary: {
        total_collected,
        total_due,
        membership_payments,
        admission_fees
      },
      recent
    });
  } catch (error) {
    logger.error('Error getting transaction summary:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @function getTransactions
 * @description Retrieves a list of all transactions for the owner's gym, with optional filtering by member and date range.
 * @param {Object} req - Express request object (optional member_id, start_date, end_date in query).
 * @param {Object} res - Express response object.
 * @returns {Array<Object>} List of transactions.
 */
export const getTransactions = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    if (!gym_id) return res.status(401).json({ error: 'Owner not associated with a gym.' });

    const { member_id, start_date, end_date, page = 1, limit = 10 } = req.query; // Add page and limit
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = { gym_id };
    if (member_id) where.member_id = member_id;
    if (start_date && end_date) {
      where.transaction_date = { [Op.between]: [new Date(start_date), new Date(end_date)] };
    }

    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where,
      order: [['transaction_date', 'DESC']],
      limit: parseInt(limit),
      offset: offset,
      include: [
        { model: Member, attributes: ['first_name', 'last_name'] }, // Include member details
        { model: Membership, attributes: ['membership_id'] } // Include membership details
      ]
    });

    res.json({
      total_transactions: count,
      current_page: parseInt(page),
      total_pages: Math.ceil(count / parseInt(limit)),
      transactions: transactions
    });
  } catch (error) {
    logger.error('Error getting transactions:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @function getTransactionMonths
 * @description Retrieves a list of all unique year-months where transactions have occurred.
 */
export const getTransactionMonths = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    if (!gym_id) return res.status(401).json({ error: 'Owner not associated with a gym.' });

    // For Postgres (TO_CHAR)
    const results = await db.sequelize.query(
      `SELECT DISTINCT TO_CHAR(transaction_date, 'YYYY-MM') as month_year 
       FROM transactions 
       WHERE gym_id = :gym_id 
       ORDER BY month_year DESC`,
      {
        replacements: { gym_id },
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    res.json(results.map(r => r.month_year));
  } catch (error) {
    logger.error('Error getting transaction months:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @function uploadUserPhoto
 * @description Uploads a profile photo for the logged-in user (owner or staff).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const uploadUserPhoto = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const user = await db.User.findByPk(user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Read temp file
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileExt = path.extname(req.file.originalname);
    const fileName = `users/${user_id}-${Date.now()}${fileExt}`;

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('member-photos')
      .upload(fileName, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (error) throw error;

    // Get public URL
    const { data } = supabase.storage
      .from('member-photos')
      .getPublicUrl(fileName);

    // Save URL in DB
    user.photo = data.publicUrl;
    await user.save();

    // Delete temp file
    fs.unlinkSync(req.file.path);

    res.json({ success: true, photo: data.publicUrl });
  } catch (error) {
    logger.error('Error uploading user photo:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @function updateMembershipPayment
 * @description Updates the payment status and amount for a membership (pay due).
 */
export const updateMembershipPayment = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const gym_id = req.user.gym_id;
    const { membership_id } = req.params;
    const { amount, payment_method, note } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Valid payment amount is required.' });
    }

    const membership = await Membership.findOne({
      where: { membership_id, gym_id },
      include: [{ model: MembershipPlan }]
    }, { transaction });

    if (!membership) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Membership not found.' });
    }

    // Update membership payment details
    const currentPaid = parseFloat(membership.actual_price_paid) || 0;
    const totalTarget = parseFloat(membership.MembershipPlan.price);
    const dueAmount = totalTarget - currentPaid;
    const paymentAmount = parseFloat(amount);

    // Prevent overpayment
    if (paymentAmount > dueAmount + 0.01) { // Small epsilon for float precision
      await transaction.rollback();
      return res.status(400).json({ error: `Payment amount (₹${paymentAmount}) exceeds the due amount (₹${dueAmount.toFixed(2)}).` });
    }

    const newTotalPaid = currentPaid + paymentAmount;
    membership.actual_price_paid = newTotalPaid;
    if (newTotalPaid >= totalTarget - 0.01) { // Small epsilon for float precision
      membership.payment_status = 'paid';
    } else {
      membership.payment_status = 'partially_paid';
    }

    await membership.save({ transaction });

    // Create Transaction
    await Transaction.create({
      gym_id,
      member_id: membership.member_id,
      membership_id: membership.membership_id,
      amount: parseFloat(amount),
      payment_method: payment_method || 'cash',
      transaction_type: 'membership_payment',
      description: note || `Due payment for Membership #${membership_id}`,
      transaction_date: new Date()
    }, { transaction });

    await transaction.commit();
    res.json({ success: true, membership });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error updating membership payment:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @function updatePersonalTrainingPayment
 * @description Updates the payment status and amount for a personal training (pay due).
 */
export const updatePersonalTrainingPayment = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const gym_id = req.user.gym_id;
    const { pt_id } = req.params;
    const { amount, payment_method, note } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Valid payment amount is required.' });
    }

    const pt = await PersonalTraining.findOne({ where: { pt_id, gym_id } }, { transaction });

    if (!pt) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Personal Training record not found.' });
    }

    const currentPaid = parseFloat(pt.actual_price_paid) || 0;
    const totalTarget = parseFloat(pt.price);
    const dueAmount = totalTarget - currentPaid;
    const paymentAmount = parseFloat(amount);

    // Prevent overpayment
    if (paymentAmount > dueAmount + 0.01) { // Small epsilon for float precision
      await transaction.rollback();
      return res.status(400).json({ error: `Payment amount (₹${paymentAmount}) exceeds the due amount (₹${dueAmount.toFixed(2)}).` });
    }

    const newTotalPaid = currentPaid + paymentAmount;
    pt.actual_price_paid = newTotalPaid;
    if (newTotalPaid >= totalTarget - 0.01) { // Small epsilon for float precision
      pt.payment_status = 'paid';
    } else {
      pt.payment_status = 'partially_paid';
    }

    await pt.save({ transaction });

    // Create Transaction
    await Transaction.create({
      gym_id,
      member_id: pt.member_id,
      membership_id: null, // It's PT, not membership
      amount: parseFloat(amount),
      payment_method: payment_method || 'cash',
      transaction_type: 'personal_training',
      description: note || `Due payment for PT #${pt_id}`,
      transaction_date: new Date()
    }, { transaction });

    await transaction.commit();
    res.json({ success: true, personal_training: pt });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error updating PT payment:', error);
    res.status(500).json({ error: error.message });
  }
};




/**
 * @function getProfile
 * @description Returns the logged-in user's profile info (id, name, email, phone, role, gym_id, and full photo URL if present).
 */
export const getProfile = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const user = await db.User.findByPk(user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const photoUrl = user.photo
      ? (user.photo.startsWith('http://') || user.photo.startsWith('https://')
        ? user.photo
        : `${req.protocol}://${req.get('host')}${user.photo}`)
      : null;
    res.json({
      user_id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      gym_id: user.gym_id,
      photo: photoUrl
    });
  } catch (error) {
    logger.error('Error getting user profile:', error);
    res.status(500).json({ error: error.message });
  }
};

// WhatsApp integration endpoints removed

export const saveFcmToken = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { fcm_token } = req.body;
    if (!fcm_token) return res.status(400).json({ error: 'FCM token required' });
    const user = await db.User.findByPk(user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.fcm_token = fcm_token;
    await user.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * @section WhatsApp Templates Management
 * Functions for creating, reading, updating, and deleting WhatsApp templates.
 */

export const getWhatsAppTemplates = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    if (!gym_id) return res.status(401).json({ error: 'Owner not associated with a gym.' });

    let templates = await db.WhatsAppTemplate.findAll({
      where: { gym_id },
      order: [['is_default', 'DESC'], ['name', 'ASC']]
    });

    // If no templates exist, create a default one
    if (templates.length === 0) {
      const defaultTemplate = await db.WhatsAppTemplate.create({
        gym_id,
        name: 'Default',
        message: 'Hi {name},\n\n Your Gym membership is expiring soon or have expired. Please Renew immediately to continue enjoying our services!',
        is_default: true
      });
      templates = [defaultTemplate];
    }

    res.json(templates);
  } catch (error) {
    logger.error('Error fetching WhatsApp templates:', error);
    res.status(500).json({ error: error.message });
  }
};

export const createWhatsAppTemplate = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    const { name, message } = req.body;

    if (!name || !message) {
      return res.status(400).json({ error: 'Name and message are required.' });
    }

    const template = await db.WhatsAppTemplate.create({
      gym_id,
      name,
      message,
      is_default: false
    });

    res.status(201).json(template);
  } catch (error) {
    logger.error('Error creating WhatsApp template:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateWhatsAppTemplate = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    const { id } = req.params;
    const { name, message } = req.body;

    const template = await db.WhatsAppTemplate.findOne({ where: { template_id: id, gym_id } });

    if (!template) {
      return res.status(404).json({ error: 'Template not found.' });
    }

    if (template.is_default) {
       // Prevent changing name/default status of default template? Maybe just message?
       // For now, allow updating name and message.
    }

    template.name = name || template.name;
    template.message = message || template.message;
    await template.save();

    res.json(template);
  } catch (error) {
    logger.error('Error updating WhatsApp template:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteWhatsAppTemplate = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    const { id } = req.params;

    const template = await db.WhatsAppTemplate.findOne({ where: { template_id: id, gym_id } });

    if (!template) {
      return res.status(404).json({ error: 'Template not found.' });
    }

    if (template.is_default) {
      return res.status(400).json({ error: 'Cannot delete the default template.' });
    }

    await template.destroy();
    res.json({ message: 'Template deleted successfully.' });
  } catch (error) {
    logger.error('Error deleting WhatsApp template:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getBackupData = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;

    // Fetch all members with their memberships
    const members = await db.Member.findAll({
      where: { gym_id },
      attributes: ['member_id', 'first_name', 'last_name', 'phone', 'email'],
      include: [
        {
          model: db.Membership,
          attributes: ['membership_id', 'end_date', 'actual_price_paid'],
          include: [
            {
              model: db.MembershipPlan,
              attributes: ['price']
            }
          ]
        }
      ]
    });

    // Process members to add latest_membership_end_date and due_amount
    const processedMembers = members.map(member => {
      let latestEndDate = null;
      let totalDue = 0;

      if (member.Memberships && member.Memberships.length > 0) {
        // Find latest end date
        const latestMembership = member.Memberships.reduce((latest, current) => {
          const currentDate = new Date(current.end_date);
          const latestDate = new Date(latest.end_date);
          return currentDate > latestDate ? current : latest;
        });
        
        latestEndDate = latestMembership.end_date;

        // Calculate total due across all memberships
        totalDue = member.Memberships.reduce((total, membership) => {
          const planPrice = parseFloat(membership.MembershipPlan?.price || 0);
          const actualPaid = parseFloat(membership.actual_price_paid || 0);
          const membershipDue = Math.max(0, planPrice - actualPaid);
          return total + membershipDue;
        }, 0);
      }

      return {
        first_name: member.first_name,
        last_name: member.last_name,
        phone: member.phone || '',
        email: member.email || '',
        latest_membership_end_date: latestEndDate || 'N/A',
        due_amount: totalDue
      };
    });

    // Fetch transactions for monthly revenue
    const transactions = await db.Transaction.findAll({
      where: { gym_id },
      attributes: ['transaction_date', 'amount'],
      raw: true
    });

    // Group transactions by month
    const monthlyData = {};
    let totalRevenue = 0;

    transactions.forEach(transaction => {
      const date = new Date(transaction.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month_name: monthName, revenue: 0 };
      }

      monthlyData[monthKey].revenue += parseFloat(transaction.amount || 0);
      totalRevenue += parseFloat(transaction.amount || 0);
    });

    // Convert monthly data to array and sort
    const monthlyRevenue = Object.values(monthlyData)
      .sort((a, b) => {
        const dateA = new Date(a.month_name);
        const dateB = new Date(b.month_name);
        return dateB - dateA; // Most recent first
      });

    res.json({
      members: processedMembers,
      monthly_revenue: monthlyRevenue,
      total_revenue: totalRevenue.toFixed(2)
    });
  } catch (error) {
    logger.error('Error generating backup data:', error);
    res.status(500).json({ error: error.message });
  }
};