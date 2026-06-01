import express from 'express';
import {
  getOwnerDashboard,
  addMember,
  updateMemberStatus,
  getMembers,
  createMembershipPlan,
  updateMembershipPlan,
  getMembershipPlans,
  getTransactionSummary,
  getMemberDetailsForOwner,
  addMembershipToMemberForOwner,
  getMembershipPlan,
  updateMemberInfo,
  deactivateMember,
  deactivateMembershipPlan,
  updateMembership,
  getMembership,
  cancelMembership,
  getTransactions,
  addPersonalTrainingToMember,
  addStaff,
  getStaffList,
  getGymInfo,
  updateGymInfo,
  userPhotoUpload,
  uploadUserPhoto,
  getProfile,
  saveFcmToken,
  updateMembershipPayment,
  updatePersonalTrainingPayment,
  getTransactionMonths,
  getWhatsAppTemplates,
  createWhatsAppTemplate,
  updateWhatsAppTemplate,
  deleteWhatsAppTemplate,
  getBackupData
} from '../controllers/owner.controller.js';
import { updateExpiredMemberships } from '../controllers/membership.controller.js';
import { authenticateToken } from '../middlewares/auth.js';
import { ensureOwner } from '../middlewares/role.js';
import { uploadMemberPhoto, upload } from '../controllers/owner.controller.js';
import { uploadStaffPhoto, staffUpload } from '../controllers/owner.controller.js';
import { ensureOwnerOrStaff } from '../middlewares/role.js';
// import multer from 'multer';

// const upload = multer({dest: 'uploads/'})
const router = express.Router();

router.use(authenticateToken);
router.use(ensureOwnerOrStaff);
// router.use(ensureOwner);

router.get('/gym/info', getGymInfo);
router.patch('/gym/info', updateGymInfo);

// Dashboard
router.get('/dashboard', getOwnerDashboard);

// Membership Plans
router.post('/membership-plans', createMembershipPlan);
router.put('/membership-plans/:plan_id', updateMembershipPlan);
router.get('/membership-plans', getMembershipPlans);
router.get('/membership-plans/:plan_id', getMembershipPlan);
router.delete('/membership-plans/:plan_id', deactivateMembershipPlan);

// Member Management
router.post('/members', addMember); // Add member
router.post('/staff', addStaff); // Add staff 
router.get('/staff', getStaffList); // Get staff list
router.get('/memberships/:membership_id', getMembership);
router.put('/members/:member_id/status', updateMemberStatus);
router.get('/members', getMembers);
router.get('/members/:member_id/details', getMemberDetailsForOwner);
router.post('/members/:member_id/add-membership', addMembershipToMemberForOwner);
router.put('/members/:member_id', updateMemberInfo);
router.delete('/members/:member_id', deactivateMember);

router.get('/transactions', getTransactions);
router.get('/transactions/months', getTransactionMonths);
router.get('/transactions/summary', getTransactionSummary);
router.put('/members/:member_id/photo', upload.single('photo'), uploadMemberPhoto);

router.put('/memberships/:membership_id', updateMembership);
router.put('/memberships/:membership_id/payment', updateMembershipPayment);
router.delete('/memberships/:membership_id', cancelMembership);

router.post('/update-expired-memberships', async (req, res) => {
  try {
    const updatedCount = await updateExpiredMemberships();
    res.status(200).json({ message: `Successfully updated ${updatedCount} memberships to 'expired'.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/members/:member_id/personal-training', addPersonalTrainingToMember);
router.put('/personal-training/:pt_id/payment', updatePersonalTrainingPayment);
router.put('/staff/:staff_id/photo', staffUpload.single('photo'), uploadStaffPhoto);

router.put('/profile/photo', userPhotoUpload.single('photo'), uploadUserPhoto);

router.get('/profile', getProfile);


router.post('/save-fcm-token', saveFcmToken);

// WhatsApp Templates
router.get('/whatsapp-templates', getWhatsAppTemplates);
router.post('/whatsapp-templates', createWhatsAppTemplate);
router.put('/whatsapp-templates/:id', updateWhatsAppTemplate);
router.delete('/whatsapp-templates/:id', deleteWhatsAppTemplate);

// Backup Data
router.get('/backup-data', getBackupData);
export default router;